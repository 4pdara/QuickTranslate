# CLAUDE.md — זיכרון פרויקט QuickTranslate Desktop

קובץ זה הוא זיכרון הקבע של Claude Code לפרויקט הזה. קרא אותו בתחילת כל סשן עבודה,
ושמור אותו מעודכן בכל החלטה ארכיטקטונית חשובה.

## 1. מטרת הפרויקט

QuickTranslate Desktop היא אפליקציית שולחן עבודה **קלה ופשוטה** לתרגום טקסט.

- עברית-first ו-RTL-first — כל ה-UI בעברית, פריסה מימין לשמאל.
- מתרגמת טקסט מסומן מכל מקום במחשב (כל אפליקציה, כל חלון), וגם טקסט שמוקלד/מודבק ישירות באפליקציה.
- רצה ברקע, עם אייקון ב-System Tray וקיצור מקשים גלובלי.
- Windows ראשון; נתיב נקי להרחבה ל-macOS/Linux בעתיד (לא כרגע).

## 2. עקרונות מוצר (לא להתפשר עליהם)

- **פשוט, מהיר, קל-משקל.** לא פלטפורמה כבדה.
- UX מעשי לפני פיצ'רים מורכבים.
- **לא Electron.** רק Tauri.
- **בלי** חשבונות משתמש, backend, billing, סנכרון בענן.
- **כיוון ברירת מחדל: ספקי תרגום חינמיים/קוד פתוח**, לא ספקים בתשלום (ראו סעיף 5).
- אם פיצ'ר לא ב-MVP — הוא לא נכנס בלי אישור מפורש, גם אם "קל להוסיף".

## 3. סטאק טכנולוגי

| שכבה | טכנולוגיה |
|---|---|
| Shell desktop | Tauri v2 |
| Frontend | React + TypeScript + Vite |
| Backend מקומי | Rust (Tauri commands, tray, קיצור מקשים, קליפבורד) |
| אחסון הגדרות | מקומי בלבד (`tauri-plugin-store`) — אין שום cloud sync |

מנהל חבילות: npm. תבנית: `react-ts`.

## 4. מסכי האפליקציה

**חשוב: מסך הפתיחה הוא מסך התרגום, לא מסך ההגדרות.**

- **מסך תרגום (ראשי, `TranslatorView`)** — זה המסך שנפתח כברירת מחדל. כולל:
  שורת כותרת עם לוגו/שם, סטטוס ספק, כפתור מזעור למגש, וכפתור הגדרות (גלגל
  שיניים); שורת בחירת שפות (מקור/יעד) עם כפתור החלפה; שני פאנלים — טקסט מקור
  וטקסט מתורגם; שורת פעולות (תרגם / העתק / נקה); רמז קצר על קיצור המקשים
  הגלובלי. אם אין ספק מוגדר כראוי, מוצג באנר עם כפתור "פתח הגדרות" — המסך
  עצמו ממשיך להיות גלוי וזמין.
- **מסך הגדרות (`SettingsView`)** — מסך נפרד שנפתח **רק** בלחיצה על כפתור
  ההגדרות (או מתפריט המגש, או מכפתור "הגדרות" בפופאפ). כולל כפתור "חזרה
  למתרגם". אין לפתוח את מסך ההגדרות אוטומטית בעלייה, אלא אם תתבקש שינוי
  מפורש בעתיד.
- **פופאפ תרגום צף (`PopupApp`, חלון Rust נפרד)** — נפתח רק בעת הפעלת קיצור
  המקשים הגלובלי או "תרגם מהלוח" מתפריט המגש.

ניווט בין מסכי האפליקציה הוא ניהול state פנימי ב-`App.tsx` (`view: "translate" | "settings"`),
**לא** חלונות Tauri נפרדים. Rust שולח אירוע `navigate-settings` לחלון הראשי
כשצריך לפתוח את מסך ההגדרות מבחוץ (תפריט מגש / פופאפ).

### 4א. SelectedTextCaptureEngine — לכידת טקסט מסומן (Ctrl+Shift+T) — חשוב, אל תשנה בלי לקרוא

**עקרון יסוד: קיצור המקשים הגלובלי לעולם לא מוחק, מאפס, או מחליף את הלוח של
המשתמש.** הוא רק קורא ממנו (ורק אם בכלל מגיע לשלב הקריאה מהלוח). שמירה על
היסטוריית הלוח של המשתמש היא דרישת מוצר קשה (hard requirement).

**היסטוריה קצרה (חשובה כדי לא לחזור על טעויות):**
1. גרסה 1: Ctrl+C מיידי + פולינג 700ms על הלוח — נכשלה כי Shift הפיזי עדיין
   היה לחוץ ברגע שליחת ה-Ctrl+C, וה-OS קלט בפועל Ctrl+Shift+C.
2. גרסה 2: השהיה 120ms + שחרור סינתטי של Shift/Alt לפני Ctrl+C + פולינג
   1400ms — שיפרה אבל **עדיין מבוססת לוח**, ועדיין יכולה לפספס באפליקציות
   שאיטיות להגיב להעתקה.
3. **גרסה 3 (נוכחית) — `SelectedTextCaptureEngine`:** במקום לדלג ישר ל-Ctrl+C,
   מנסים קודם לקרוא את הטקסט המסומן **ישירות מהאלמנט הממוקד**, בלי לגעת
   בלוח בכלל, באמצעות Windows UI Automation. רק אם זה נכשל/לא נתמך, ולפי
   הגדרות המשתמש, עוברים ל-fallback מבוסס לוח (אותה לוגיקה מגרסה 2, ללא
   שינוי).

**מבנה הקוד:** `src-tauri/src/capture/`
- `mod.rs` — `CaptureMethod` (`UiAutomation`/`ClipboardFallback`/`Failed`),
  `CaptureResult { success, text, method, reason, duration_ms }`.
- `selected_text.rs` — `capture_selected_text(app, CaptureOptions) -> CaptureResult`,
  נקודת הכניסה היחידה. מנסה UI Automation, ואז (אם מורשה) clipboard fallback.
- `windows_ui_automation.rs` (`#[cfg(windows)]`) — `try_capture_selected_text()`:
  פותח COM (`CoInitializeEx`/STA) על ה-thread הנוכחי, `IUIAutomation::GetFocusedElement()`,
  `GetCurrentPatternAs::<IUIAutomationTextPattern>(UIA_TextPatternId)`,
  `GetSelection()` → `IUIAutomationTextRangeArray` → `GetText(-1)` על כל טווח.
  **לא נוגעת בלוח בכלל.** אם האלמנט הממוקד לא תומך ב-TextPattern (controls
  מותאמים/canvas/חלק מ-Electron) — נכשלת בנקיון עם הודעת שגיאה מפורשת,
  **לא** מתחזה להצלחה ע"י קריאה מהלוח.
- `clipboard_fallback.rs` — `capture_via_clipboard` (השהיה+שחרור מקשים+פולינג,
  כמו בגרסה 2) ו-`read_current_clipboard` (לתפריט המגש).

**זרימה ב-`lib.rs` (`translate_selected_text_via_shortcut`, רצה ב-thread נפרד):**
1. בונה `CaptureOptions` מההגדרות: `try_without_clipboard`
   (`captureSelectedTextWithoutClipboard`, default **true**),
   `allow_clipboard_fallback` (`allowClipboardFallbackForSelectedText`,
   default **false**), `allow_unchanged_clipboard_fallback`
   (`allowUnchangedClipboardFallback`, default **true**, תקף רק כתת-הגדרה
   בתוך ה-fallback).
2. קוראת ל-`capture_selected_text`. **לא מציגה/מפוקסת שום חלון לפני זה** —
   הפוקוס באפליקציה החיצונית לא משתנה עד שהלכידה מסתיימת.
3. אם הצליחה (כל שיטה) — מציגה פופאפ עם `SelectedTextPayload { text,
   usedFallback, captureMethod, captureFailedNoFallback }`.
4. אם נכשלה **וגם** `allowClipboardFallbackForSelectedText=false` —
   `captureFailedNoFallback=true`, ו-`PopupApp` מציג: "לא הצלחתי לקרוא את
   הטקסט המסומן באפליקציה הזו. אפשר להפעיל fallback ללוח בהגדרות." (עם כפתור
   "הגדרות" שכבר קיים בפופאפ).
5. אם נכשלה אחרי שגם ה-fallback ללוח נוסה ולא מצא כלום — הודעה גנרית:
   "לא נמצא טקסט מסומן לתרגום. סמן טקסט ונסה שוב."
6. `translate_current_clipboard(app)` — **זרימה נפרדת ומכוונת** (תפריט מגש
   "תרגם טקסט מהלוח"), קוראת את הלוח הנוכחי בלי שום השוואה/לוגיקת capture.

**מגבלה ידועה ומתועדת — לא הבטחה אוניברסלית:** UI Automation עובד רק
באלמנטים שמיישמים `ITextProvider`/`TextPattern`. עובד היטב ב-Notepad, רוב
תיבות טקסט סטנדרטיות של Windows, WPF, ורוב הדפדפנים המודרניים (Chrome/Edge/
Firefox) על אזורי טקסט/contenteditable. **לא יעבוד** באפליקציות עם רינדור
מותאם (canvas, חלק מ-Electron/Qt/משחקים) — שם, אם המשתמש הפעיל את ה-fallback
ללוח, עדיין יש רשת ביטחון; אם לא — תוצג שגיאה ברורה, לא "תרגום שקט" שגוי.

**אסור:** לכתוב marker/placeholder לתוך הלוח, לאפס את הלוח אחרי קריאה, או
להוסיף מנגנון restore שיכול לפגוע בהיסטוריית לוח (clipboard history) של
Windows. `preserveClipboardAfterShortcut` **לא** מומש כרגע, בכוונה — רק אם
ימצא מימוש בטוח שלא פוגע ב-flicker/בהיסטוריה.

תלות חדשה: `windows` crate, `target.'cfg(windows)'.dependencies` ב-
`Cargo.toml`, פיצ'רים: `Win32_UI_WindowsAndMessaging`, `Win32_Foundation`,
`Win32_UI_Accessibility`, `Win32_System_Com`.

לוגים (debug build בלבד, `#[cfg(debug_assertions)]`, לעולם לא טקסט מלא/מפתחות):
`foreground window captured` (בוליאני בלבד, לא הכותרת — יכולה להכיל תוכן
רגיש), `capture method attempted`, `capture success`, `selected text length`,
`capture reason` (סיבת כשל טכנית, לא תוכן), `capture duration ms`.

## 5. ארכיטקטורת ספקי תרגום

ממוקם ב-`src/lib/translation/`. ממשק אחיד, אסור לתפור קוד לספק יחיד.

```ts
type ProviderCategory = "free" | "experimental" | "advanced";

interface TranslationProvider {
  id: string;
  label: string;
  category: ProviderCategory;
  requiresApiKey: boolean;
  supportsServerUrl: boolean;
  defaultServerUrl?: string;
  note?: string; // הערה בעברית להצגה בממשק
  translate(input: TranslateInput): Promise<TranslateResult>;
  testConnection(apiKey: string, serverUrl?: string): Promise<boolean>;
}

interface TranslateInput {
  text: string;
  sourceLanguage: string; // "auto" או קוד שפה
  targetLanguage: string; // קוד שפה
  apiKey: string; // ריק אם הספק לא דורש מפתח
  serverUrl?: string; // כתובת שרת מותאמת (LibreTranslate / Lingva)
}

interface TranslateResult {
  translatedText: string;
  detectedSourceLanguage?: string;
  providerId: string;
  raw?: unknown; // ל-debug בלבד, לא לשמירה/לוג
}
```

**כיוון ברירת מחדל: חינמי/קוד פתוח, לא בתשלום.** סדר הספקים בממשק (וב-
`registry.ts`):

1. **Google Translate — ללא API** (`google_translate_no_api`) — ניסיוני, ללא מפתח.
   קורא ל-endpoint הציבורי הלא-רשמי שמשמש את אתר Google Translate
   (`translate.googleapis.com/translate_a/single?client=gtx`). זה **לא** ה-API
   הרשמי בתשלום, אין הסכם רמת שירות, ועלול להיחסם או להשתנות בכל עת. נבדק
   ידנית ועובד (עברית↔אנגלית) בזמן הכתיבה. מסומן בממשק כ"ניסיוני — ללא API —
   עלול להיחסם או להפסיק לעבוד".
2. **LibreTranslate** (`libretranslate`) — חינמי וקוד פתוח, ברירת המחדל
   ה"רשמית" של הפרויקט (`DEFAULT_SETTINGS.selectedProvider`). **אין כתובת
   שרת ברירת מחדל מובנית** — מופעים ציבוריים (כמו `translate.argosopentech.com`)
   נופלים/קמים בלי התראה, אז המשתמש חייב להזין כתובת שרת בעצמו (מופע ציבורי
   שמצא, או שרת self-hosted). כל עוד לא הוזנה כתובת — מוצג באנר "צריך לבחור
   ספק תרגום בהגדרות", וזה מצופה, לא באג.
3. **Lingva Translate** (`lingva`) — ניסיוני, חינמי, ברירת מחדל
   `https://lingva.ml` (נבדק ועובד בזמן הכתיבה). מסומן "ניסיוני — עלול
   להיחסם או להשתנות".
4. **Google Cloud Translation** (`google`) — **מתקדם/רשמי**, דורש מפתח API
   בתשלום (billing מופעל בחשבון Google Cloud).
5. **DeepL** (`deepl`) — מתקדם, דורש מפתח API (יש שכבה חינמית מוגבלת
   במפתחות המסתיימים ב-`:fx`).
6. **Azure Translator** (`azure`) — stub בלבד, עתידי, ידרוש מפתח API בתשלום.

ב-UI: ספקים מקטגוריה `free`/`experimental` מוצגים בכרטיס "ספק תרגום — חינמי
/ קוד פתוח" כברירת מחדל גלויה; ספקים מקטגוריה `advanced` ממוקמים בתוך
`<details>` מתקפל "ספקים מתקדמים (בתשלום)" — **לא** ברירת המחדל הנגלית
ראשונה.

**החלטה ארכיטקטונית:** המימוש בפועל של כל ספק (`translate`, `testConnection`)
נמצא ב-**TypeScript** תחת `src/lib/translation/providers/`, וקריאות ה-HTTP
מתבצעות באמצעות `@tauri-apps/plugin-http` (לא `fetch` רגיל של הדפדפן) — זה
מבוצע בפועל ע"י Rust מתחת למכסה המנוע, כך שאין בעיית CORS ואין צורך לכתוב
קוד Rust חדש בכל פעם שמוסיפים ספק. כך הוספת ספק תרגום היא עבודת TypeScript
טהורה. Rust מטפל רק ב-OS-level: קיצור מקשים גלובלי, קליפבורד, tray, חלונות,
ואחסון הגדרות. כתובות שרת מותאמות (LibreTranslate/Lingva) מחייבות הרשאת
`http` רחבה (`http://*/*`, `https://*/*`) ב-`capabilities/default.json`, כי
המשתמש יכול להזין כל כתובת — זה trade-off מתועד, לא פיקוח.

לוגיקת תרגום משותפת (בחירת ספק, בדיקת תצורה, איסוף `apiKey`/`serverUrl`)
ממורכזת ב-`src/lib/translation/translate.ts` (`translateWithSettings`) —
גם מסך התרגום וגם הפופאפ קוראים לפונקציה הזו, ולא כופלים לוגיקה.

זיהוי כיוון עברית/אנגלית אוטומטי נמצא ב-`src/lib/scriptDetect.ts`
(`detectScript`, `autoTargetLanguage`) — אם `settings.autoDetectDirection`
פעיל, טקסט שרובו עברית מתורגם כברירת מחדל לאנגלית ולהפך.

## 6. אבטחה ופרטיות

- מפתחות API נשמרים **מקומית בלבד**.
- **לעולם לא** לכתוב מפתח API או טקסט מתורגם מלא ל-log (גם לא ב-debug).
- במסך ההגדרות מציגים מפתח API ממוסך (input מסוג password עם כפתור הצג/הסתר).
- טקסט המשתמש נשלח **רק** לספק התרגום שנבחר (כולל כתובת שרת מותאמת שהוזנה).
- ספקים ללא מפתח API (Google ללא API, Lingva, LibreTranslate ציבורי) שולחים
  טקסט לשירות חיצוני **שאינו בשליטתנו** — יש לציין זאת בבירור בממשק ובתיעוד.
- הערת פרטיות קצרה בעברית מוצגת במסך ההגדרות.
- בלי טלמטריה, אלא אם יתבקש מפורשות בעתיד.

## 7. כללי UX

- ממשק בעברית כברירת מחדל, RTL מלא (`dir="rtl"`, `lang="he"`).
- שימוש בתכונות CSS לוגיות (`margin-inline-start` וכו') במקום `left/right`.
- עיצוב מודרני: כרטיסים מעוגלים, צללים עדינים, טיפוגרפיה ברורה, מצב בהיר —
  לא טופס HTML שטוח. ראו `src/App.css` (CSS משתנים תחת `:root`).
- מצבי טעינה, הצלחה, ריק, ושגיאה — ברורים, בעברית, בכל המסכים (מתרגם, הגדרות, פופאפ).
- האפליקציה צריכה להיות שמישה בלי ידע טכני.
- מרגישה כמו utility קטן ומלוטש, לא דשבורד מורכב.

## 8. הפצה והרצה (Build & Distribution)

- **Build רגיל לפיתוח:** `npm run tauri dev` — פותח חלון טרמינל/קונסולה
  (זה תקין ומצופה ב-dev; ה-binary בפרופיל debug לא מדכא קונסולה).
- **Build להפצה:** `npm run tauri build` — מייצר installer (NSIS `.exe` ו/או
  MSI) תחת `src-tauri/target/release/bundle/`. ה-exe הסופי **לא** פותח חלון
  CMD/קונסולה — זה מובטח ע"י
  `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`
  ב-`src-tauri/src/main.rs`. **אסור להסיר את השורה הזו.**
- משתמש קצה מתקין ע"י הרצת קובץ ה-installer בלבד. הוא **לא** צריך Rust,
  Node, npm, או Visual Studio Build Tools — אלה נדרשים רק לסביבת הפיתוח/בנייה.
- WebView2 Runtime (חלק ממערכת Windows 10/11 מודרנית) נדרש בזמן ריצה; ה-NSIS
  installer של Tauri בודק/מתקין אותו אוטומטית אם חסר.
- משתמש קצה **לא** צריך את תיקיית הפרויקט המלאה (כולל `node_modules`,
  `target/` וכו') — רק את קובץ ה-installer.

## 9. תהליך עבודה (Development Workflow)

- לעבוד באבני דרך (milestones) קטנות.
- לפני שינוי ארכיטקטוני — לעדכן את CLAUDE.md.
- לפני הוספת פיצ'ר — לבדוק אם הוא בתחום ה-MVP או למילסטון עתידי. אם לא MVP, לשאול לפני מימוש.
- בסוף כל milestone — לעדכן תיעוד ו-CLAUDE.md.
- בכל סוף עבודה לדווח למשתמש **בעברית**:
  1. מה נבנה
  2. אילו קבצים נוצרו/השתנו
  3. איך להריץ
  4. מה נשאר
  5. המלצה לצעד הבא

## 10. מחוץ לתחום ה-MVP (Out of Scope)

OCR, חשבונות משתמש, backend בענן, billing, היסטוריית תרגום כבדה, סנכרון בין
מכשירים, תוסף דפדפן, אפליקציית מובייל, מעבר ל-Electron, אוטומציית דפדפן
(Selenium/Puppeteer/Playwright) לשום ספק תרגום.

## 11. אבני דרך עתידיות

- קיצור מקשים דינמי בלי הפעלה מחדש
- היסטוריית תרגום מקומית קטנה
- החלפת הטקסט המסומן בתרגום במקום
- פופאפ סמוך לעכבר (cursor-anchored) — כרגע ממורכז בלבד
- OCR לתמונות/צילומי מסך
- ספקי תרגום נוספים
- קיצורי מקשים מתקדמים והתאמה אישית

## 12. מבנה קבצים עיקרי

```
src/
  App.tsx                  # מעטפת + ניהול תצוגה (translate/settings)
  TranslatorView.tsx        # מסך תרגום ראשי
  SettingsView.tsx           # מסך הגדרות (ספקים, שפות, קיצור, פרטיות, אודות)
  PopupApp.tsx               # חלון הפופאפ הצף
  lib/translation/           # הפשטת ספקים + מימושים + translate.ts המשותף
    providers/
      google-translate-no-api-provider.ts
      libretranslate.ts
      lingva.ts
      google.ts
      deepl.ts
      azure.ts
  lib/settings/               # מודל הגדרות וגישה אליהן (tauri-plugin-store / localStorage)
  lib/isTauri.ts               # זיהוי Tauri vs. browser (web preview)
  lib/scriptDetect.ts          # זיהוי כיוון עברית/אנגלית אוטומטי
src-tauri/
  src/lib.rs                   # tray, קיצור מקשים, חלונות, אירועים, הגדרות
  src/main.rs                   # entry point + windows_subsystem
  src/capture/                  # SelectedTextCaptureEngine (ראו סעיף 4א)
    mod.rs
    selected_text.rs
    windows_ui_automation.rs    # #[cfg(windows)]
    clipboard_fallback.rs
  tauri.conf.json
  capabilities/default.json
docs/
  PROJECT_PLAN.md
  ARCHITECTURE.md
  MVP_SCOPE.md
  NEXT_ACTIONS.md
CLAUDE.md                  # קובץ זה
```

## 13. מצב נוכחי

עדכן סעיף זה בסוף כל milestone.

- [x] Bootstrap: Tauri v2 + React + TS + Vite
- [x] מודל הגדרות ושמירה מקומית, כולל `providerServerUrls` ו-`autoDetectDirection`
- [x] הפשטת ספק תרגום עם קטגוריות (`free`/`experimental`/`advanced`)
- [x] ספקים: Google ללא API, LibreTranslate, Lingva, Google Cloud, DeepL, Azure (stub)
- [x] מסך תרגום ראשי (`TranslatorView`) — נפתח כברירת מחדל
- [x] מסך הגדרות נפרד (`SettingsView`) — נפתח רק בלחיצה מפורשת
- [x] באנר "ספק חסר" במסך התרגום + כפתור "פתח הגדרות"
- [x] עיצוב מחודש — כרטיסים, צללים, badge-ים, אזהרות ניסיוני/בתשלום
- [x] System tray + קיצור מקשים גלובלי + פופאפ — ללא שינוי ארכיטקטוני
- [x] `tsc --noEmit`, `npm run build`, `cargo check` עוברים
- [x] אומת שה-release build לא פותח חלון CMD (ראו `docs/NEXT_ACTIONS.md`)
- [x] תיקון באג קיצור המקשים (סיבוב 1): השוואת לוח ישן/חדש לפני תרגום, בלי
      למחוק/לאפס את הלוח
- [x] תיקון באג קיצור המקשים (סיבוב 2 — השורש האמיתי): שחרור Shift/Alt
      סינתטי לפני Ctrl+C (מנע התנגשות עם Ctrl+Shift+C), השהיה 120ms,
      פולינג עד 1400ms, לכידה ב-thread נפרד, פופאפ מוצג רק אחרי הלכידה
- [x] `allowUnchangedClipboardFallback` — ברירת מחדל **שונתה ל-true**, עם
      הערה "הטקסט תורגם מהלוח כי הלוח לא השתנה" כשבשימוש
- [x] דיאגנוסטיקת debug build (אורכים בלבד, לא תוכן/מפתחות)
- [x] **SelectedTextCaptureEngine** (סיבוב 3): לכידה ישירה ללא לוח באמצעות
      Windows UI Automation (`src-tauri/src/capture/windows_ui_automation.rs`),
      עם clipboard fallback אופציונלי (כבוי כברירת מחדל) רק כשהלכידה הישירה נכשלת
- [x] הגדרות חדשות: `captureSelectedTextWithoutClipboard` (default true),
      `allowClipboardFallbackForSelectedText` (default false); סקשן הגדרות
      "לכידת טקסט מסומן" ב-`SettingsView`
- [x] הודעת שגיאה ספציפית כש-UI Automation נכשל וה-fallback כבוי: "לא הצלחתי
      לקרוא את הטקסט המסומן באפליקציה הזו. אפשר להפעיל fallback ללוח בהגדרות."
- [x] `cargo check`/`cargo check --release` נקיים מאזהרות; `npm run tauri build` עובר
- [x] תפריט מגש: "פתח מתרגם" (ראש התפריט) + `show_main_window` command. סדר:
      פתח מתרגם → פתח הגדרות → תרגם טקסט מהלוח → יציאה.
- [x] חלון קומפקטי: ברירת מחדל 720×520, minHeight 440; CSS מוכווץ (panel
      min-height 160px, padding/gap מוקטנים, הוסר min-height: 100vh).
- [x] web preview mode: `src/lib/isTauri.ts`, localStorage fallback בהגדרות,
      באנר "מצב תצוגת אתר" בדפדפן, כפתור מזעור מוסתר בדפדפן. UI עובד בדפדפן;
      תרגום נחסם CORS כי `plugin-http` דורש Tauri runtime.
- [x] **תיקון באג ניווט מגש:** `show_main_window` עכשיו שולח `navigate-translator`.
      "פתח מתרגם" תמיד מנווט למסך התרגום. "פתח הגדרות" תמיד למסך הגדרות.
      `App.tsx` מאזין גם ל-`navigate-translator` וגם ל-`navigate-settings`.
- [x] **אייקוני Brand:** כל קבצי `src-tauri/icons/` נוצרו מ-`assets/brand/quicktranslate-app-icon.png`
      (1254×1254 px) בעזרת `npm run tauri -- icon`. כולל `.ico`, `.icns`, `32x32`, `128x128` ועוד.
- [x] **אתר נחיתה Hebrew:** `site/` — Vite + React + TS. קישורי הורדה ל-GitHub Releases.
      GitHub Pages workflow: `.github/workflows/deploy-pages.yml`.
      כתובת: `https://4pdara.github.io/QuickTranslate/`
- [x] `RELEASE_NOTES_v0.1.0.md` — רשימת שינויים לגרסה 0.1.0.
- [ ] בדיקה ידנית מלאה עם מפתח API/שרת אמיתי לכל ספק
- [ ] בדיקה ידנית של הקיצור מול דפדפן/Notepad בפועל (זמין רק למשתמש, לא לסוכן —
      ראו 5 תרחישי בדיקה מדויקים ב-`docs/NEXT_ACTIONS.md`)
- [ ] קיצור מקשים דינמי בלי הפעלה מחדש
- [ ] פופאפ סמוך לעכבר
- [ ] `preserveClipboardAfterShortcut` (שמירת לוח מקורי) — נדחה בכוונה, ראו סעיף 4א
