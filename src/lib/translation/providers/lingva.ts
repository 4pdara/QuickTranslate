import { fetch } from "@tauri-apps/plugin-http";
import type { TranslateInput, TranslateResult, TranslationProvider } from "../types";
import { TranslationError } from "../types";

interface LingvaResponse {
  translation: string;
}

function normalizeBaseUrl(serverUrl: string): string {
  return serverUrl.trim().replace(/\/+$/, "");
}

export const lingvaProvider: TranslationProvider = {
  id: "lingva",
  label: "Lingva Translate",
  category: "experimental",
  requiresApiKey: false,
  supportsServerUrl: true,
  defaultServerUrl: "https://lingva.ml",
  note: "ניסיוני — עלול להיחסם או להשתנות. מבוסס על מופע ציבורי של Lingva Translate, ללא צורך במפתח API. לא מומלץ להישען עליו כספק היחיד.",

  async translate({ text, sourceLanguage, targetLanguage, serverUrl }: TranslateInput): Promise<TranslateResult> {
    const base = normalizeBaseUrl(serverUrl || this.defaultServerUrl || "");
    if (!base) {
      throw new TranslationError("לא הוגדרה כתובת שרת Lingva. יש להזין כתובת במסך ההגדרות.", "lingva");
    }

    const source = sourceLanguage || "auto";
    const url = `${base}/api/v1/${encodeURIComponent(source)}/${encodeURIComponent(targetLanguage)}/${encodeURIComponent(text)}`;

    let response: Response;
    try {
      response = await fetch(url, { method: "GET" });
    } catch {
      throw new TranslationError("שגיאת תקשורת עם שרת Lingva. ייתכן שהמופע חסום או לא זמין כרגע.", "lingva");
    }

    if (response.status === 429) {
      throw new TranslationError("המופע הציבורי של Lingva חסם בקשות עקב עומס. נסה מאוחר יותר.", "lingva");
    }
    if (!response.ok) {
      throw new TranslationError(`שגיאה מצד שרת Lingva (קוד ${response.status}).`, "lingva");
    }

    const data = (await response.json()) as LingvaResponse;
    if (!data.translation) {
      throw new TranslationError("השרת לא החזיר תרגום.", "lingva");
    }

    return {
      translatedText: data.translation,
      providerId: "lingva",
      raw: data,
    };
  },

  async testConnection(_apiKey: string, serverUrl?: string): Promise<boolean> {
    const base = normalizeBaseUrl(serverUrl || this.defaultServerUrl || "");
    if (!base) return false;
    try {
      const response = await fetch(`${base}/api/v1/en/es/hello`, { method: "GET" });
      return response.ok;
    } catch {
      return false;
    }
  },
};
