// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { fetch as nativeFetch } from "@tauri-apps/plugin-http";
import { fetch, REQUEST_TIMEOUT_MS } from "../src/lib/translation/http";
import { getProvider, isProviderConfigured } from "../src/lib/translation/registry";
import { DEFAULT_SETTINGS } from "../src/lib/settings/types";
import { translateWithSettings } from "../src/lib/translation/translate";

vi.mock("@tauri-apps/plugin-http", () => ({ fetch: vi.fn() }));
afterEach(() => { vi.useRealTimers(); vi.mocked(nativeFetch).mockReset(); });

test("an unresponsive provider times out and aborts the native request", async () => {
  vi.useFakeTimers();
  vi.mocked(nativeFetch).mockImplementation(() => new Promise(() => {}));
  const check = expect(fetch("https://example.com")).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
  await check;
  expect(vi.mocked(nativeFetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
});

test("timeout also covers a response whose body never completes", async () => {
  vi.useFakeTimers();
  vi.mocked(nativeFetch).mockResolvedValue(new Response(new ReadableStream({start(){}})));
  const check=expect(fetch("https://example.com")).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
  await check;
});

test("provider configuration rejects invalid URLs, whitespace keys and Azure stub", () => {
  expect(isProviderConfigured(getProvider("libretranslate")!, DEFAULT_SETTINGS)).toBe(false);
  for(const url of [" ","file:///secret","not a URL"]){
    expect(isProviderConfigured(getProvider("libretranslate")!, {...DEFAULT_SETTINGS,providerServerUrls:{libretranslate:url}})).toBe(false);
  }
  expect(isProviderConfigured(getProvider("deepl")!,{...DEFAULT_SETTINGS,providerApiKeys:{deepl:" "}})).toBe(false);
  expect(isProviderConfigured(getProvider("azure")!,{...DEFAULT_SETTINGS,providerApiKeys:{azure:"key"}})).toBe(false);
  expect(isProviderConfigured(getProvider("google_translate_no_api")!,DEFAULT_SETTINGS)).toBe(true);
});

test("Google no-key provider combines translated segments", async () => {
  vi.mocked(nativeFetch).mockResolvedValue(Response.json([[["שלום", "Hello"],[" עולם"," world"]],null,"en"]));
  const result=await translateWithSettings({...DEFAULT_SETTINGS,selectedProvider:"google_translate_no_api"},"Hello world","auto","he");
  expect(result.translatedText).toBe("שלום עולם");
});

test("HTTP failure becomes a user-facing provider error", async () => {
  vi.mocked(nativeFetch).mockImplementation(async () => new Response("Rate limited",{status:429}));
  await expect(translateWithSettings({...DEFAULT_SETTINGS,selectedProvider:"google_translate_no_api"},"Hello","auto","he")).rejects.toThrow("Google מגביל כרגע");
  expect(nativeFetch).toHaveBeenCalledTimes(2);
});

test("Google falls back once to its other host when the first is blocked", async () => {
  vi.mocked(nativeFetch).mockResolvedValueOnce(new Response("Rate limited",{status:429}))
    .mockResolvedValueOnce(Response.json([[["בוקר טוב","Good morning"]],null,"en"]));
  const output=await translateWithSettings({...DEFAULT_SETTINGS,selectedProvider:"google_translate_no_api"},"Good morning","en","he");
  expect(output.translatedText).toBe("בוקר טוב");
  const hosts=vi.mocked(nativeFetch).mock.calls.map(([url])=>new URL(url as string).hostname);
  expect(hosts).toEqual(["translate.google.com","translate.googleapis.com"]);
  for(const [url] of vi.mocked(nativeFetch).mock.calls) expect(new URL(url as string).searchParams.has("key")).toBe(false);
});

test("Google malformed responses try the other host without displaying garbage", async () => {
  vi.mocked(nativeFetch).mockResolvedValueOnce(Response.json([[null]]))
    .mockResolvedValueOnce(Response.json([[["Hello","שלום"]],null,"he"]));
  const output=await translateWithSettings({...DEFAULT_SETTINGS,selectedProvider:"google_translate_no_api"},"שלום","auto","en");
  expect(output.translatedText).toBe("Hello");
  expect(output.detectedSourceLanguage).toBe("he");
});

test("Google translates with dict-chrome-ex and normalizes iw language code to he", async () => {
  vi.mocked(nativeFetch).mockResolvedValue(Response.json([[["peace","שלום"]],null,"iw"]));
  const result=await translateWithSettings({...DEFAULT_SETTINGS,selectedProvider:"google_translate_no_api"},"שלום","auto","en");
  expect(result.translatedText).toBe("peace");
  expect(result.detectedSourceLanguage).toBe("he");
  const callUrl = new URL(vi.mocked(nativeFetch).mock.calls[0][0] as string);
  expect(callUrl.searchParams.get("client")).toBe("dict-chrome-ex");
});

test("Google connection check requires an actual parsed translation", async () => {
  vi.mocked(nativeFetch).mockImplementation(async () => new Response("not JSON",{status:200}));
  expect(await getProvider("google_translate_no_api")!.testConnection("")).toBe(false);
  expect(nativeFetch).toHaveBeenCalledTimes(2);
});

test("LibreTranslate receives its optional API key and normalized URL", async () => {
  vi.mocked(nativeFetch).mockResolvedValue(Response.json({translatedText:"שלום"}));
  await translateWithSettings({...DEFAULT_SETTINGS,providerApiKeys:{libretranslate:" test-key "},providerServerUrls:{libretranslate:" https://example.com/ "}},"Hello","en","he");
  const [url, options]=vi.mocked(nativeFetch).mock.calls[0];
  expect(url).toBe("https://example.com/translate");
  expect(JSON.parse(options!.body as string).api_key).toBe("test-key");
});
