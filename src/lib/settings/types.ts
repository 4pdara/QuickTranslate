export interface AppSettings {
  selectedProvider: string;
  providerApiKeys: Record<string, string>;
  providerServerUrls: Record<string, string>;
  sourceLanguage: string;
  targetLanguage: string;
  autoDetectDirection: boolean;
  globalShortcut: string;
  autoCopyResult: boolean;
  popupPosition: "cursor" | "center";
  /**
   * תרגם גם אם הלוח לא השתנה אחרי Ctrl+C סינתטי (קיצור מקשים).
   * ברירת מחדל: true — שימושי למי שמעתיק טקסט לפני התרגום.
   */
  allowUnchangedClipboardFallback: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  selectedProvider: "libretranslate",
  providerApiKeys: {},
  providerServerUrls: {},
  sourceLanguage: "auto",
  targetLanguage: "he",
  autoDetectDirection: true,
  globalShortcut: "Ctrl+Shift+T",
  autoCopyResult: false,
  popupPosition: "center",
  allowUnchangedClipboardFallback: true,
};
