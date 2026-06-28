import { fetch } from "@tauri-apps/plugin-http";
import type { TranslateInput, TranslateResult, TranslationProvider } from "../types";
import { TranslationError } from "../types";

const BASE_URL = "https://translation.googleapis.com/language/translate/v2";

interface GoogleTranslateResponse {
  data: {
    translations: { translatedText: string; detectedSourceLanguage?: string }[];
  };
}

export const googleProvider: TranslationProvider = {
  id: "google",
  label: "Google Cloud Translation",
  category: "advanced",
  requiresApiKey: true,
  supportsServerUrl: false,
  note: "ספק מתקדם — דורש מפתח API בתשלום (חשבון Google Cloud עם billing מופעל).",

  async translate({ text, sourceLanguage, targetLanguage, apiKey }: TranslateInput): Promise<TranslateResult> {
    if (!apiKey) {
      throw new TranslationError("לא הוגדר מפתח API עבור Google Cloud Translation. יש להזין מפתח במסך ההגדרות.", "google");
    }

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          source: sourceLanguage !== "auto" ? sourceLanguage : undefined,
          format: "text",
        }),
      });
    } catch {
      throw new TranslationError("שגיאת תקשורת עם שירות Google Translate. בדוק את החיבור לאינטרנט.", "google");
    }

    if (response.status === 400 || response.status === 403) {
      throw new TranslationError("מפתח ה-API של Google שגוי או לא תקף.", "google");
    }
    if (!response.ok) {
      throw new TranslationError(`שגיאה מצד Google Translate (קוד ${response.status}).`, "google");
    }

    const data = (await response.json()) as GoogleTranslateResponse;
    const translation = data.data?.translations?.[0];
    if (!translation) {
      throw new TranslationError("Google Translate לא החזיר תרגום.", "google");
    }

    return {
      translatedText: translation.translatedText,
      detectedSourceLanguage: translation.detectedSourceLanguage,
      providerId: "google",
      raw: data,
    };
  },

  async testConnection(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    try {
      const response = await fetch(`${BASE_URL}/languages?key=${encodeURIComponent(apiKey)}`, {
        method: "GET",
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
