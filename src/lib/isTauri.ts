/**
 * מחזירה true אם הקוד רץ בתוך Tauri (אפליקציית Desktop).
 * false אם רץ ישירות בדפדפן (web preview, פיתוח UI בלבד).
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
