import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/lib/settings/types";
import TranslatorView from "../src/TranslatorView";
import App from "../src/App";
import PopupApp from "../src/PopupApp";
import { translateWithSettings } from "../src/lib/translation/translate";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

const { listeners, invoke } = vi.hoisted(() => ({ listeners: new Map<string, (event: {payload: unknown}) => void>(), invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async (name, callback) => { listeners.set(name, callback); return () => listeners.delete(name); }) }));
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => ({ hide: vi.fn() }) }));
vi.mock("@tauri-apps/api/app", () => ({ getVersion: async () => "0.1.1" }));
vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({ writeText: vi.fn(async () => {}) }));
vi.mock("../src/lib/isTauri", () => ({ isTauri: () => true }));
vi.mock("../src/lib/settings/store", () => ({ loadSettings: async () => ({ ...DEFAULT_SETTINGS, selectedProvider: "google_translate_no_api" }), saveSettings: vi.fn(async () => {}) }));
vi.mock("../src/lib/translation/translate", () => ({ translateWithSettings: vi.fn() }));

const settings = { ...DEFAULT_SETTINGS, selectedProvider: "google_translate_no_api" };
const result = (text: string) => ({ translatedText: text, providerId: settings.selectedProvider });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
beforeEach(() => { invoke.mockResolvedValue({ active: "Ctrl+Shift+T", error: null }); });
afterEach(() => { cleanup(); listeners.clear(); vi.mocked(translateWithSettings).mockReset(); vi.mocked(writeText).mockReset(); });

test("clear while translating prevents an old result from reappearing", async () => {
  const pending = deferred<ReturnType<typeof result>>();
  vi.mocked(translateWithSettings).mockReturnValue(pending.promise);
  render(<TranslatorView settings={settings} onUpdateSettings={vi.fn()} onOpenSettings={vi.fn()} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hello" } });
  fireEvent.click(screen.getByRole("button", { name: "תרגם" }));
  fireEvent.click(screen.getByRole("button", { name: "נקה" }));
  await act(async () => { pending.resolve(result("תוצאה ישנה")); });
  expect(screen.queryByText("תוצאה ישנה")).toBeNull();
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
});

test("clipboard failure keeps the successful translation visible", async () => {
  vi.mocked(translateWithSettings).mockResolvedValue(result("שלום"));
  vi.mocked(writeText).mockRejectedValue(new Error("Clipboard busy"));
  render(<TranslatorView settings={{...settings, autoCopyResult:true}} onUpdateSettings={vi.fn()} onOpenSettings={vi.fn()} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hello" } });
  fireEvent.click(screen.getByRole("button", { name: "תרגם" }));
  expect(await screen.findByText("שלום")).toBeTruthy();
  expect(await screen.findByRole("status")).toBeTruthy();
});

test("opening settings and returning keeps source text and translation", async () => {
  vi.mocked(translateWithSettings).mockResolvedValue(result("שלום"));
  render(<App />);
  fireEvent.change(await screen.findByRole("textbox"), { target: { value: "Hello" } });
  fireEvent.click(screen.getByRole("button", { name: "תרגם" }));
  await screen.findByText("שלום");
  fireEvent.click(screen.getByTitle("הגדרות"));
  fireEvent.click(screen.getByRole("button", { name: /חזרה למתרגם/ }));
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Hello");
  expect(screen.getByText("שלום")).toBeTruthy();
});

test("startup shortcut conflict is visible without preventing translation", async () => {
  invoke.mockResolvedValue({ active:null,error:"קיצור המקשים תפוס בתוכנה אחרת." });
  render(<App />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(await screen.findByRole("button", {name:"תרגם"})).toBeTruthy();
});

test("a failed shortcut change keeps the saved shortcut", async () => {
  render(<App />);
  fireEvent.click(await screen.findByTitle("הגדרות"));
  fireEvent.change(screen.getByLabelText("קיצור מקשים גלובלי"), { target:{value:"Ctrl+Q"} });
  invoke.mockRejectedValue("קיצור המקשים תפוס בתוכנה אחרת.");
  fireEvent.click(screen.getByRole("button", {name:"החל קיצור מקשים"}));
  await screen.findByText("קיצור המקשים תפוס בתוכנה אחרת.");
  fireEvent.click(screen.getByRole("button", {name:/חזרה למתרגם/}));
  expect(screen.getByText(/אפשר גם לסמן/).textContent).toContain("Ctrl+Shift+T");
});

test("popup ignores an earlier request that finishes after the latest one", async () => {
  const first=deferred<ReturnType<typeof result>>();
  const second=deferred<ReturnType<typeof result>>();
  vi.mocked(translateWithSettings).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  render(<PopupApp />);
  await waitFor(() => expect(listeners.has("selected-text")).toBe(true));
  const emit = (text:string) => listeners.get("selected-text")!({payload:{text,usedFallback:false,captureFailedNoFallback:false}});
  await act(async () => { emit("First"); });
  await act(async () => { emit("Second"); });
  await act(async () => { second.resolve(result("תרגום חדש")); });
  await act(async () => { first.resolve(result("תרגום ישן")); });
  expect(screen.getByText("תרגום חדש")).toBeTruthy();
  expect(screen.queryByText("תרגום ישן")).toBeNull();
});

test("closing popup discards a pending translation", async () => {
  const pending=deferred<ReturnType<typeof result>>();
  vi.mocked(translateWithSettings).mockReturnValue(pending.promise);
  render(<PopupApp />);
  await act(async () => { listeners.get("selected-text")!({payload:{text:"Hello"}}); });
  fireEvent.click(screen.getByRole("button",{name:"סגור"}));
  await act(async () => { pending.resolve(result("תוצאה מאוחרת")); });
  expect(screen.queryByText("תוצאה מאוחרת")).toBeNull();
});
