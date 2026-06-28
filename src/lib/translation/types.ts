export interface TranslateInput {
  text: string;
  sourceLanguage: string; // "auto" או קוד שפה (he, en, ...)
  targetLanguage: string; // קוד שפה
  apiKey: string; // ריק אם הספק לא דורש מפתח
  serverUrl?: string; // כתובת שרת מותאמת (LibreTranslate / Lingva)
}

export interface TranslateResult {
  translatedText: string;
  detectedSourceLanguage?: string;
  providerId: string;
  raw?: unknown; // ל-debug בלבד — אסור לשמור או ללוג
}

export class TranslationError extends Error {
  constructor(
    message: string,
    public providerId: string,
  ) {
    super(message);
    this.name = "TranslationError";
  }
}

/** קטגוריית הספק לצורך קיבוץ בממשק המשתמש. */
export type ProviderCategory = "free" | "experimental" | "advanced";

export interface TranslationProvider {
  id: string;
  label: string;
  category: ProviderCategory;
  /** האם הספק דורש מפתח API כדי לעבוד. */
  requiresApiKey: boolean;
  /** האם הספק תומך/דורש כתובת שרת מותאמת (LibreTranslate, Lingva). */
  supportsServerUrl: boolean;
  /** כתובת שרת לדוגמה/ברירת מחדל המוצגת בממשק (לא מוזרקת בכפייה). */
  defaultServerUrl?: string;
  /** הערה קצרה בעברית להצגה בממשק (אזהרת מגבלות, עלות וכו'). */
  note?: string;
  translate(input: TranslateInput): Promise<TranslateResult>;
  testConnection(apiKey: string, serverUrl?: string): Promise<boolean>;
}
