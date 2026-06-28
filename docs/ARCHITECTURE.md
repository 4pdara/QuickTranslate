# ארכיטקטורה — QuickTranslate Desktop

## סקירה כללית

```
┌──────────────────────────────────────────────────────────────────┐
│                         Tauri Shell (Rust)                        │
│                                                                    │
│  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│  │ Global        │   │ Clipboard         │   │ System Tray       │   │
│  │ Shortcut       │──▶│ Read (enigo +     │   │ פתח הגדרות /       │   │
│  │ (Ctrl+Shift+T) │   │ clipboard-manager) │   │ תרגם מהלוח / יציאה │   │
│  └──────────────┘   └─────────┬─────────┘   └──────────────────┘   │
│                                │ emit("selected-text")              │
│                                ▼                                   │
│                     ┌────────────────────┐                         │
│                     │  חלון popup          │                         │
│                     └────────────────────┘                         │
│                                                                    │
│  emit("navigate-settings") ──────────────▶ חלון main                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              Frontend חלון main (React + TypeScript)               │
│                                                                    │
│   App.tsx (view: "translate" | "settings")                        │
│        │                                          │                │
│        ▼                                          ▼                │
│   TranslatorView                              SettingsView          │
│   (מסך פתיחה, שני פאנלים)                  (ספקים, שפות, קיצור)      │
│        │                                          │                │
│        └───────────────┬──────────────────────────┘                │
│                         ▼                                          │
│         lib/translation/translate.ts (translateWithSettings)       │
│                         │                                          │
│                         ▼                                          │
│         lib/translation/registry.ts → TranslationProvider          │
│                         │ @tauri-apps/plugin-http (fetch)           │
└─────────────────────────┼──────────────────────────────────────────┘
                          ▼
              ספק תרגום חיצוני (LibreTranslate /
              Google ללא API / Lingva / Google Cloud / DeepL)
```

## עקרונות מפתח

- **כל קריאת HTTP לספק התרגום מתבצעת מ-TypeScript ב-frontend**, באמצעות
  `@tauri-apps/plugin-http` (לא `fetch` רגיל של הדפדפן, ולא Rust). הפלאגין
  מבצע את הבקשה בפועל ע"י Rust מתחת למכסה המנוע, כך שאין בעיית CORS, אבל
  הלוגיקה והפענוח נשארים ב-TypeScript. הוספת ספק תרגום היא עבודת TypeScript
  טהורה — אין צורך לכתוב/לקמפל קוד Rust חדש.
- ה-frontend מתקשר עם Rust דרך **Tauri commands** (`invoke`) רק לפעולות
  OS-level: `show_settings_window`. כל שאר התרגום קורה ב-TS.
- הגדרות נשמרות במקום מקומי בלבד באמצעות `tauri-plugin-store`
  (`settings.json` בתיקיית הנתונים של האפליקציה). אין סנכרון רשת.
- חלונות: חלון `main` (מסך התרגום הראשי + מסך ההגדרות כ-view פנימי, גלוי
  כברירת מחדל), וחלון `popup` (תרגום צף מקיצור מקשים/תפריט מגש, נוצר מוסתר
  מראש, ללא decorations, transparent).
- ניווט בין מסך התרגום למסך ההגדרות הוא **state פנימי בתוך חלון `main`**
  (`App.tsx`), לא חלון Tauri נפרד. Rust שולח אירוע `navigate-settings` לחלון
  כדי לפתוח את מסך ההגדרות מבחוץ (תפריט מגש, או כפתור "הגדרות" בפופאפ דרך
  הפקודה `show_settings_window`).

## זרימת תרגום ידנית (מסך התרגום הראשי)

1. המשתמש מקליד/מדביק טקסט בפאנל המקור ב-`TranslatorView`.
2. בלחיצה על "תרגם": אם `autoDetectDirection` פעיל, נבדק כיוון הטקסט
   (`lib/scriptDetect.ts`) ושפת היעד מתעדכנת אוטומטית (עברית→אנגלית או להפך).
3. `translateWithSettings` (ב-`lib/translation/translate.ts`) בוחר את הספק
   הפעיל מה-registry, מאמת שהוא מוגדר (`isProviderConfigured`), ומבצע את
   הבקשה.
4. התוצאה (או שגיאה בעברית) מוצגת בפאנל היעד. אם `autoCopyResult` פעיל,
   התרגום מועתק אוטומטית ללוח.

## זרימת תרגום מטקסט מסומן (קיצור מקשים גלובלי)

**עקרון יסוד: לעולם לא מוחקים/מאפסים/מחליפים את הלוח של המשתמש — רק קוראים ממנו.**

1. המשתמש מסמן טקסט באפליקציה כלשהי במחשב.
2. המשתמש לוחץ על קיצור המקשים הגלובלי (ברירת מחדל `Ctrl+Shift+T`), הנרשם
   ע"י Rust דרך `tauri-plugin-global-shortcut`.
3. `capture_selected_text_via_shortcut` ב-Rust:
   a. קוראת את הלוח הנוכחי (`old_text`) **לפני** כל פעולה.
   b. שולחת `Ctrl+C` סינתטי (`enigo`).
   c. עושה פולינג קצר על הלוח — כל 50ms, עד 700ms בסך הכול — ובודקת אם
      התוכן השתנה לעומת `old_text`.
   d. אם נמצא תוכן שונה ולא ריק — זה הטקסט שסומן, מוחזר ומשמש לתרגום.
   e. אם הלוח לא השתנה בזמן הפולינג — **לא** מתורגם `old_text` כברירת מחדל
      (זה היה ה-bug — תרגום בטעות של תוכן לוח ישן). אם המשתמש הפעיל את
      ההגדרה `allowUnchangedClipboardFallback` ("תרגם גם אם הלוח לא השתנה")
      והלוח הישן לא היה ריק — רק אז מוחזר `old_text`.
4. Rust מציג את חלון ה-popup ושולח אירוע `selected-text` עם הטקסט (או מחרוזת
   ריקה, אם לא נמצא טקסט מסומן).
5. `PopupApp` (React) מקבל את האירוע. טקסט ריק → "לא נמצא טקסט מסומן לתרגום.
   סמן טקסט ונסה שוב." טקסט לא ריק → קורא ל-`translateWithSettings` (אותה
   פונקציה משותפת עם מסך התרגום הראשי) ומציג תוצאה/שגיאה.
6. המשתמש יכול להעתיק את התרגום, לסגור את הפופאפ, או לפתוח הגדרות (פותח את
   חלון `main` ושולח אליו `navigate-settings`).

**זרימה נפרדת ומכוונת:** "תרגם טקסט מהלוח" בתפריט המגש קוראת ל-
`translate_current_clipboard` — מתרגמת את תוכן הלוח הנוכחי **בלי** שום
השוואה, כי כאן הכוונה היחידה היא לתרגם מה שכבר בלוח. שתי הזרימות נפרדות
בקוד בכוונה כדי שהקיצור הגלובלי לא "ידלוף" התנהגות של תרגום-לוח-ישן.

## הפשטת ספק תרגום

ראו [../CLAUDE.md](../CLAUDE.md) סעיף 5 לממשק המלא (`TranslationProvider`,
`TranslateInput`, `TranslateResult`, `ProviderCategory`). כל ספק הוא קובץ
עצמאי תחת `src/lib/translation/providers/`, רשום ב-`registry.ts`. הוספת ספק
חדש: ליצור קובץ חדש שמייצא `TranslationProvider`, ולהוסיף אותו למערך
`providers` ב-`registry.ts` — אין צורך לשנות Rust, App.tsx, או SettingsView
(הם generic לכל ספק לפי המטא-דאטה שלו: `category`, `requiresApiKey`,
`supportsServerUrl`).

## אחסון הגדרות

מבנה הגדרות (ראו גם CLAUDE.md):

```ts
interface AppSettings {
  selectedProvider: string;
  providerApiKeys: Record<string, string>;      // ממופה לפי providerId
  providerServerUrls: Record<string, string>;     // ממופה לפי providerId
  sourceLanguage: string;   // default: "auto"
  targetLanguage: string;    // default: "he"
  autoDetectDirection: boolean; // default: true
  globalShortcut: string;     // default: "Ctrl+Shift+T"
  autoCopyResult: boolean;
  popupPosition: "cursor" | "center";
  allowUnchangedClipboardFallback: boolean; // default: false — ראו זרימת קיצור המקשים למעלה
}
```

האחסון בפועל הוא `tauri-plugin-store` (`settings.json`) בתיקיית הנתונים של
האפליקציה (`%APPDATA%/com.quicktranslate.desktop/` ב-Windows). לא קובץ env,
לא registry, לא cloud.

## רשת והרשאות (capabilities)

מכיוון ש-LibreTranslate ו-Lingva תומכים בכתובת שרת מותאמת (כל כתובת
שהמשתמש יזין, כולל self-hosted/localhost), `capabilities/default.json` כולל
הרשאת `http:default` עם `allow` רחב (`http://*/*`, `https://*/*`) בנוסף
לרשימת הדומיינים הספציפיים של DeepL/Google. זה **trade-off מודע**: אי אפשר
להגביל דינמית לפי קלט משתמש בזמן ריצה במודל ההרשאות הסטטי של Tauri, אז
ה-frontend יכול עקרונית לבצע fetch לכל כתובת. זה דומה להתנהגות דפדפן רגיל,
ולא חריג מהמקובל לאפליקציות שמאפשרות "שרת מותאם".

## טכנולוגיות Tauri בפועל

- `tauri-plugin-global-shortcut` — קיצור מקשים גלובלי
- `tauri-plugin-clipboard-manager` — קריאה/כתיבה לקליפבורד
- `tauri-plugin-store` — הגדרות מקומיות
- `tauri-plugin-http` — קריאות HTTP מה-frontend (כל הספקים)
- `enigo` — סימולציית Ctrl+C ללכידת טקסט מסומן
- Tray API מובנה ב-Tauri v2 (`tauri::tray`)
