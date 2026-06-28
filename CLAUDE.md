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

### 4א. זרימת לכידת טקסט מסומן (Ctrl+Shift+T) — חשוב, אל תשנה בלי לקרוא

**עקרון יסוד: קיצור המקשים הגלובלי לעולם לא מוחק, מאפס, או מחליף את הלוח של
המשתמש.** הוא רק קורא ממנו. שמירה על היסטוריית הלוח של המשתמש היא דרישת
מוצר קשה (hard requirement), לא Nice-to-have.

**גרסה שנייה של התיקון (חשובה):** הגרסה הראשונה (Ctrl+C מיידי + פולינג
700ms) עדיין נכשלה במקרים רבים. הסיבה: ברגע שה-hotkey `Ctrl+Shift+T` נדלק,
המשתמש עדיין מחזיק פיזית Ctrl+Shift. אם שולחים Ctrl+C סינתטי באותו רגע, ה-OS
עלול לפרש את זה כ-**Ctrl+Shift+C** (כי ה-Shift הפיזי עדיין למעלה) — שזה לא
"העתק" באף אפליקציה. התיקון:

1. `capture_selected_text_via_shortcut(app, allow_unchanged_fallback)`
   (רץ ב-thread נפרד, לא חוסם את ה-event loop של ה-hotkey):
   - קוראת את הלוח **לפני** הכל (`old_text`).
   - **לא מציגה/מפוקסת שום חלון** — הפוקוס באפליקציה החיצונית לא משתנה.
   - מחכה `PRE_COPY_DELAY_MS`=120ms (לתת ל-hotkey "להשתקע").
   - `send_clean_copy_keystroke()`: משחררת קודם Shift ו-Alt באופן סינתטי
     (כדי לנקות מצב "לחוץ" שעלול להישאר מה-hotkey), ואז שולחת Ctrl+C אמיתי.
   - עושה **פולינג** על הלוח (כל `CLIPBOARD_POLL_INTERVAL_MS`=50ms, עד
     `CLIPBOARD_POLL_MAX_MS`=1400ms בסך הכול) ובודקת אם התוכן השתנה.
   - אם נמצא תוכן חדש ולא ריק — זה הטקסט שסומן, מוחזר עם `usedFallback=false`.
   - אם הלוח **לא** השתנה: אם `allowUnchangedClipboardFallback` מופעל (ברירת
     המחדל **כן**, ראו למטה) והלוח הישן לא ריק — מוחזר הלוח הישן עם
     `usedFallback=true`. אחרת מוחזר `None`.
2. `translate_selected_text_via_shortcut(app)` — ה-handler של Ctrl+Shift+T.
   קורא לפונקציה הנ"ל **ורק אז** מציג את הפופאפ (`SelectedTextPayload { text,
   usedFallback }`). אם `text` ריק, `PopupApp` מציג "לא נמצא טקסט מסומן
   לתרגום. סמן טקסט ונסה שוב." אם `usedFallback=true`, מוצגת הערה: "הטקסט
   תורגם מהלוח כי הלוח לא השתנה."
3. `translate_current_clipboard(app)` — **זרימה נפרדת ומכוונת**, בשימוש
   "תרגם טקסט מהלוח" בתפריט המגש. קוראת את הלוח הנוכחי **בלי השוואה** —
   כי כאן הכוונה המפורשת היא לתרגם מה שכבר בלוח.

**`allowUnchangedClipboardFallback` ברירת מחדל = `true`** (שונה מהגרסה
הקודמת). זה כי המשתמש מעדיף שהקיצור "יעבוד" ויתרגם את הלוח הקיים כש-Ctrl+C
הסינתטי לא תפס שינוי, על פני שגיאה. ההגדרה עדיין גלויה וניתנת לכיבוי
בהגדרות ("תרגם גם אם הלוח לא השתנה").

**אסור:** לכתוב marker/placeholder לתוך הלוח כדי "לבדוק" אם הוא השתנה, לאפס
את הלוח אחרי הקריאה, או להוסיף שום מנגנון restore שיכול לפגוע בהיסטוריית
לוח (clipboard history) של Windows. אם בעתיד תרצה "שמירת לוח מקורי לאחר
קיצור מקשים" (`preserveClipboardAfterShortcut`) — הוסף הגדרה חדשה,
default `false`, ותממש רק אם זה מאומת כבטוח (לא יוצר flicker/delay/נזק
להיסטוריה). זה **לא** מומש כרגע, בכוונה.

תלות חדשה: `windows` crate (`target.'cfg(windows)'.dependencies` ב-
`Cargo.toml`) עבור `GetForegroundWindow` — לדיאגנוסטיקה בלבד (debug build),
לא לשינוי פוקוס.

לוגים (debug build בלבד, `#[cfg(debug_assertions)]`): `foreground window
captured`, `old/new clipboard length` (אורך בלבד, לא תוכן), `copy command
sent`, `clipboard changed`, `fallback used`, `capture duration ms`. לעולם
לא לוג של הטקסט המלא או מפתחות API.

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
  lib/settings/               # מודל הגדרות וגישה אליהן (tauri-plugin-store)
  lib/scriptDetect.ts          # זיהוי כיוון עברית/אנגלית אוטומטי
src-tauri/
  src/lib.rs                   # tray, קיצור מקשים, קליפבורד, חלונות, אירועים
  src/main.rs                   # entry point + windows_subsystem
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
- [ ] בדיקה ידנית מלאה עם מפתח API/שרת אמיתי לכל ספק
- [ ] בדיקה ידנית של הקיצור מול דפדפן/Notepad בפועל (זמין רק למשתמש, לא לסוכן —
      ראו 3 תרחישי בדיקה מדויקים ב-`docs/NEXT_ACTIONS.md`)
- [ ] קיצור מקשים דינמי בלי הפעלה מחדש
- [ ] פופאפ סמוך לעכבר
- [ ] `preserveClipboardAfterShortcut` (שמירת לוח מקורי) — נדחה בכוונה, ראו סעיף 4א
