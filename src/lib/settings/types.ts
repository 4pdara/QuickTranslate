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
   * נסה לקרוא טקסט מסומן ישירות מהאפליקציה הפעילה (Windows UI Automation),
   * בלי לגעת בלוח. ברירת מחדל: true. זו השיטה הראשית של SelectedTextCaptureEngine.
   */
  captureSelectedTextWithoutClipboard: boolean;
  /**
   * אם הקריאה הישירה נכשלה — להשתמש ב-fallback מבוסס לוח (Ctrl+C)?
   * ברירת מחדל: false, כי זה יכול לשנות את הלוח.
   */
  allowClipboardFallbackForSelectedText: boolean;
  /**
   * תקף רק כתת-הגדרה בתוך ה-fallback ללוח: תרגם גם אם הלוח לא השתנה כלל.
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
  captureSelectedTextWithoutClipboard: true,
  allowClipboardFallbackForSelectedText: false,
  allowUnchangedClipboardFallback: true,
};
