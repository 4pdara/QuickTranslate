export interface LanguageOption {
  code: string;
  label: string;
}

export const SOURCE_LANGUAGES: LanguageOption[] = [
  { code: "auto", label: "זיהוי אוטומטי" },
  { code: "he", label: "עברית" },
  { code: "en", label: "אנגלית" },
  { code: "ar", label: "ערבית" },
  { code: "ru", label: "רוסית" },
  { code: "fr", label: "צרפתית" },
  { code: "es", label: "ספרדית" },
  { code: "de", label: "גרמנית" },
];

export const TARGET_LANGUAGES: LanguageOption[] = SOURCE_LANGUAGES.filter((l) => l.code !== "auto");
