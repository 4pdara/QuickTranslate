import { fetch } from "@tauri-apps/plugin-http";
import type { TranslateInput, TranslateResult, TranslationProvider } from "../types";
import { TranslationError } from "../types";

// מפתחות חינמיים של DeepL מסתיימים ב-":fx" ופונים ל-endpoint נפרד.
function baseUrlFor(apiKey: string): string {
  return apiKey.trim().endsWith(":fx")
    ? "https://api-free.deepl.com/v2"
    : "https://api.deepl.com/v2";
}

interface DeepLTranslateResponse {
  translations: { detected_source_language: string; text: string }[];
}

export const deeplProvider: TranslationProvider = {
  id: "deepl",
  label: "DeepL",
  category: "advanced",
  requiresApiKey: true,
  supportsServerUrl: false,
  note: "ספק מתקדם — דורש מפתח API. יש ל-DeepL שכבה חינמית מוגבלת (מפתחות המסתיימים ב-:fx), אך לרוב נדרש חיוב.",

  async translate({ text, sourceLanguage, targetLanguage, apiKey }: TranslateInput): Promise<TranslateResult> {
    if (!apiKey) {
      throw new TranslationError("לא הוגדר מפתח API עבור DeepL. יש להזין מפתח במסך ההגדרות.", "deepl");
    }

    const body = new URLSearchParams();
    body.set("text", text);
    body.set("target_lang", targetLanguage.toUpperCase());
    if (sourceLanguage && sourceLanguage !== "auto") {
      body.set("source_lang", sourceLanguage.toUpperCase());
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrlFor(apiKey)}/translate`, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
    } catch {
      throw new TranslationError("שגיאת תקשורת עם שירות DeepL. בדוק את החיבור לאינטרנט.", "deepl");
    }

    if (response.status === 403) {
      throw new TranslationError("מפתח ה-API של DeepL שגוי או לא תקף.", "deepl");
    }
    if (response.status === 456) {
      throw new TranslationError("חריגה ממכסת התרגום החודשית של DeepL.", "deepl");
    }
    if (!response.ok) {
      throw new TranslationError(`שגיאה מצד DeepL (קוד ${response.status}).`, "deepl");
    }

    const data = (await response.json()) as DeepLTranslateResponse;
    const translation = data.translations[0];
    if (!translation) {
      throw new TranslationError("DeepL לא החזיר תרגום.", "deepl");
    }

    return {
      translatedText: translation.text,
      detectedSourceLanguage: translation.detected_source_language?.toLowerCase(),
      providerId: "deepl",
      raw: data,
    };
  },

  async testConnection(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    try {
      const response = await fetch(`${baseUrlFor(apiKey)}/usage`, {
        method: "GET",
        headers: { Authorization: `DeepL-Auth-Key ${apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
