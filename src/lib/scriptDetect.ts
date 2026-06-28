const HEBREW_RANGE = new RegExp("[\\u0590-\\u05FF]", "g");
const LATIN_RANGE = new RegExp("[A-Za-z]", "g");

/** מזהה אם טקסט הוא ברובו עברית, ברובו אנגלית, או לא חד-משמעי. */
export function detectScript(text: string): "he" | "en" | "other" {
  const hebrewCount = (text.match(HEBREW_RANGE) ?? []).length;
  const latinCount = (text.match(LATIN_RANGE) ?? []).length;
  if (hebrewCount === 0 && latinCount === 0) return "other";
  return hebrewCount >= latinCount ? "he" : "en";
}

/** בוחרת שפת יעד אוטומטית: עברית -> אנגלית, אנגלית -> עברית, אחרת ברירת המחדל הקיימת. */
export function autoTargetLanguage(text: string, fallbackTarget: string): string {
  const script = detectScript(text);
  if (script === "he") return "en";
  if (script === "en") return "he";
  return fallbackTarget;
}
