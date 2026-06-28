import { fetch } from "@tauri-apps/plugin-http";
import type { TranslateInput, TranslateResult, TranslationProvider } from "../types";
import { TranslationError } from "../types";

interface LibreTranslateResponse {
  translatedText: string;
  detectedLanguage?: { language?: string };
}

function normalizeServerUrl(serverUrl: string): string {
  const trimmed = serverUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/translate") ? trimmed : `${trimmed}/translate`;
}

export const libreTranslateProvider: TranslationProvider = {
  id: "libretranslate",
  label: "LibreTranslate",
  category: "free",
  requiresApiKey: false,
  supportsServerUrl: true,
  note: "ספק חינמי וקוד פתוח. יש להזין כתובת שרת LibreTranslate (מופע ציבורי שתמצאו, או שרת self-hosted משלכם) — אין כתובת ברירת מחדל מובנית כי מופעים ציבוריים עולים ונופלים. בדקו 'בדוק חיבור' לפני שימוש.",

  async translate({ text, sourceLanguage, targetLanguage, apiKey, serverUrl }: TranslateInput): Promise<TranslateResult> {
    const url = normalizeServerUrl(serverUrl || this.defaultServerUrl || "");
    if (!serverUrl && !this.defaultServerUrl) {
      throw new TranslationError("לא הוגדרה כתובת שרת LibreTranslate. יש להזין כתובת במסך ההגדרות.", "libretranslate");
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: sourceLanguage || "auto",
          target: targetLanguage,
          format: "text",
          ...(apiKey ? { api_key: apiKey } : {}),
        }),
      });
    } catch {
      throw new TranslationError("שגיאת תקשורת עם שרת LibreTranslate. בדוק את כתובת השרת ואת החיבור לאינטרנט.", "libretranslate");
    }

    if (response.status === 403) {
      throw new TranslationError("השרת דרש מפתח API או שהמפתח שגוי.", "libretranslate");
    }
    if (response.status === 429) {
      throw new TranslationError("השרת הציבורי חסם בקשות עקב עומס. נסה שרת אחר או מאוחר יותר.", "libretranslate");
    }
    if (!response.ok) {
      throw new TranslationError(`שגיאה מצד שרת LibreTranslate (קוד ${response.status}).`, "libretranslate");
    }

    const data = (await response.json()) as LibreTranslateResponse;
    if (!data.translatedText) {
      throw new TranslationError("השרת לא החזיר תרגום.", "libretranslate");
    }

    return {
      translatedText: data.translatedText,
      detectedSourceLanguage: data.detectedLanguage?.language,
      providerId: "libretranslate",
      raw: data,
    };
  },

  async testConnection(apiKey: string, serverUrl?: string): Promise<boolean> {
    const url = normalizeServerUrl(serverUrl || this.defaultServerUrl || "");
    if (!serverUrl && !this.defaultServerUrl) return false;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: "hello",
          source: "en",
          target: "es",
          format: "text",
          ...(apiKey ? { api_key: apiKey } : {}),
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
