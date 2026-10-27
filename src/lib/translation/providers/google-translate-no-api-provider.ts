import { fetch } from "../http";
import type { TranslateInput, TranslateResult, TranslationProvider } from "../types";
import { TranslationError } from "../types";

// קריאה ל-endpoint הציבורי שמשמש את הרחבת Google Translate (client=dict-chrome-ex).
// זה לא ה-API הרשמי בתשלום, ואין לו הסכם רמת שירות — ייתכן שיחסם או ישתנה.
// Both hosts belong to Google. The public endpoint can be unavailable on one
// host while the other still responds. Try each once, never loop or change provider.
const BASE_URLS = [
  "https://translate.google.com/translate_a/single",
  "https://translate.googleapis.com/translate_a/single",
];

const FRIENDLY_FAILURE_MESSAGE =
  "תרגום Google ללא API נכשל. ייתכן שהשירות נחסם או השתנה. נסה שוב מאוחר יותר או החלף ספק בהגדרות.";

function buildUrl(baseUrl: string, text: string, source: string, target: string): string {
  const params = new URLSearchParams({
    client: "dict-chrome-ex",
    sl: source || "auto",
    tl: target,
    dt: "t",
    q: text,
  });
  return `${baseUrl}?${params.toString()}`;
}

function parseTranslation(data: unknown): { translatedText: string; detectedSourceLanguage?: string } {
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error("Invalid translation response");
  const translatedText = data[0].map((segment: unknown) => {
    if (!Array.isArray(segment) || typeof segment[0] !== "string") throw new Error("Invalid translation segment");
    return segment[0];
  }).join("");
  if (!translatedText.trim()) throw new Error("Empty translation response");
  let detected = typeof data[2] === "string" ? data[2] : undefined;
  if (detected === "iw") detected = "he";
  return { translatedText, detectedSourceLanguage: detected };
}

async function translateText(text: string, source: string, target: string): Promise<TranslateResult> {
  let rateLimited = false;
  for (const baseUrl of BASE_URLS) {
    try {
      const response = await fetch(buildUrl(baseUrl, text, source, target), {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (response.status === 429) rateLimited = true;
      if (!response.ok) continue;
      return { ...parseTranslation(await response.json()), providerId: "google_translate_no_api" };
    } catch {
      // Network errors, timed-out requests and non-JSON responses use the next Google host.
    }
  }
  throw new TranslationError(rateLimited
    ? "Google מגביל כרגע בקשות תרגום מהרשת הזו. המתן מעט ונסה שוב. לא נדרש מפתח API."
    : FRIENDLY_FAILURE_MESSAGE, "google_translate_no_api");
}

export const googleTranslateNoApiProvider: TranslationProvider = {
  id: "google_translate_no_api",
  label: "Google Translate — ללא API",
  category: "experimental",
  requiresApiKey: false,
  supportsServerUrl: false,
  note: "ניסיוני — ללא API — עלול להיחסם או להפסיק לעבוד. אינו ה-API הרשמי של Google, והטקסט עדיין נשלח לשירות של גוגל ברשת.",

  async translate({ text, sourceLanguage, targetLanguage }: TranslateInput): Promise<TranslateResult> {
    return translateText(text, sourceLanguage, targetLanguage);
  },

  async testConnection(): Promise<boolean> {
    try {
      await translateText("Good morning", "en", "he");
      return true;
    } catch {
      return false;
    }
  },
};
