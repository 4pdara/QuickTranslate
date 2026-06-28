import { fetch } from "@tauri-apps/plugin-http";
import type { TranslateInput, TranslateResult, TranslationProvider } from "../types";
import { TranslationError } from "../types";

// קריאה ל-endpoint הציבורי שמשמש את אתר Google Translate עצמו (client=gtx).
// זה לא ה-API הרשמי בתשלום, ואין לו הסכם רמת שירות — ייתכן שיחסם או ישתנה.
const BASE_URL = "https://translate.googleapis.com/translate_a/single";

const FRIENDLY_FAILURE_MESSAGE =
  "תרגום Google ללא API נכשל. ייתכן שהשירות נחסם או השתנה. נסה שוב מאוחר יותר או החלף ספק בהגדרות.";

type RawSegment = [string, string, ...unknown[]];
type RawResponse = [RawSegment[] | null, unknown, string?];

function buildUrl(text: string, source: string, target: string): string {
  const params = new URLSearchParams({
    client: "gtx",
    sl: source || "auto",
    tl: target,
    dt: "t",
    q: text,
  });
  return `${BASE_URL}?${params.toString()}`;
}

export const googleTranslateNoApiProvider: TranslationProvider = {
  id: "google_translate_no_api",
  label: "Google Translate — ללא API",
  category: "experimental",
  requiresApiKey: false,
  supportsServerUrl: false,
  note: "ניסיוני — ללא API — עלול להיחסם או להפסיק לעבוד. אינו ה-API הרשמי של Google, והטקסט עדיין נשלח לשירות של גוגל ברשת.",

  async translate({ text, sourceLanguage, targetLanguage }: TranslateInput): Promise<TranslateResult> {
    let response: Response;
    try {
      response = await fetch(buildUrl(text, sourceLanguage, targetLanguage), { method: "GET" });
    } catch {
      throw new TranslationError(FRIENDLY_FAILURE_MESSAGE, "google_translate_no_api");
    }

    if (!response.ok) {
      throw new TranslationError(FRIENDLY_FAILURE_MESSAGE, "google_translate_no_api");
    }

    let data: RawResponse;
    try {
      data = (await response.json()) as RawResponse;
    } catch {
      throw new TranslationError(FRIENDLY_FAILURE_MESSAGE, "google_translate_no_api");
    }

    const segments = data[0] ?? [];
    const translatedText = segments.map((segment) => segment[0]).join("");
    if (!translatedText) {
      throw new TranslationError(FRIENDLY_FAILURE_MESSAGE, "google_translate_no_api");
    }

    return {
      translatedText,
      detectedSourceLanguage: typeof data[2] === "string" ? data[2] : undefined,
      providerId: "google_translate_no_api",
    };
  },

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(buildUrl("hello", "en", "he"), { method: "GET" });
      if (!response.ok) return false;
      const data = (await response.json()) as RawResponse;
      return Boolean(data[0]?.[0]?.[0]);
    } catch {
      return false;
    }
  },
};
