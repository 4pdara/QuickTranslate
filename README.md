# QuickTranslate — תרגום מהיר מכל מקום במחשב

![QuickTranslate Logo](assets/brand/quicktranslate-logo.png)

אפליקציית Desktop קלה לתרגום טקסט — **עברית-first, RTL-first**.
בנויה על **Tauri v2 + React + TypeScript** (לא Electron).

**אתר:** https://4pdara.github.io/QuickTranslate/
**גרסאות:** https://github.com/4pdara/QuickTranslate/releases
**מאגר:** https://github.com/4pdara/QuickTranslate

---

## הורדה

| קובץ | תיאור |
|---|---|
| [QuickTranslate_0.1.0_x64-setup.exe](https://github.com/4pdara/QuickTranslate/releases/download/v0.1.0/QuickTranslate_0.1.0_x64-setup.exe) | Windows Installer (מומלץ) |
| [QuickTranslate_0.1.0_x64_en-US.msi](https://github.com/4pdara/QuickTranslate/releases/download/v0.1.0/QuickTranslate_0.1.0_x64_en-US.msi) | MSI Installer |
| [QuickTranslate_0.1.0_portable.zip](https://github.com/4pdara/QuickTranslate/releases/download/v0.1.0/QuickTranslate_0.1.0_portable.zip) | גרסה ניידת (ללא התקנה) |

> **למשתמשי קצה:** אין צורך ב-Rust, Node, npm, או כל כלי פיתוח. פשוט הורידו והריצו את ה-installer.
> הגרסה הניידת (portable) רצה ישירות ללא התקנה — דורשת WebView2 שמובנה ב-Windows 11 ו-Windows 10 מעודכן.

---

## תכונות עיקריות

- **תרגום טקסט מסומן** — סמנו טקסט בכל אפליקציה ולחצו `Ctrl+Shift+T`
- **SelectedTextCaptureEngine** — קריאת טקסט ישירה דרך Windows UI Automation (ללא גישה ללוח)
- **חלונית תרגום צפה** — פופאפ קטן שמופיע מיד, ללא החלפת חלון
- **System Tray** — רצה ברקע, זמינה בכל עת
- **תפריט מגש:** פתח מתרגם / פתח הגדרות / תרגם טקסט מהלוח / יציאה
- **ממשק עברי RTL** מלא
- **ספקים חינמיים כברירת מחדל:** Google Translate ללא API (ניסיוני), LibreTranslate, Lingva
- **ספקים מתקדמים:** Google Cloud Translation, DeepL (דורשים מפתח API)
- **קל-משקל** — Tauri (Rust + WebView2), לא Electron

## ספקי תרגום

| ספק | קטגוריה | דורש מפתח |
|---|---|---|
| Google Translate ללא API | ניסיוני | לא |
| LibreTranslate | חינמי/קוד פתוח | לא (אופציונלי) |
| Lingva Translate | ניסיוני | לא |
| Google Cloud Translation | מתקדם | כן (בתשלום) |
| DeepL | מתקדם | כן |
| Azure Translator | עתידי (stub) | — |

> ⚠️ **Google Translate ללא API** הוא endpoint ציבורי לא-רשמי ועלול להיחסם או להשתנות בכל עת.
> לשימוש יציב, מומלץ להגדיר ספק עם מפתח API.

---

## הרצה לפיתוח (Desktop App)

**דרישות:** [Rust](https://www.rust-lang.org/) + [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (C++ workload) + Node.js 20+

```bash
npm install
npm run tauri dev
```

בהרצת `tauri dev` נפתח חלון קונסולה — תקין ב-dev, לא מופיע בגרסת ההפצה.

## בנייה להפצה

```bash
npm run tauri build
```

מייצר:
- `src-tauri/target/release/bundle/nsis/QuickTranslate_0.1.0_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/QuickTranslate_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/tauri-app.exe` ← גרסה ניידת (rename ל-QuickTranslate.exe)

## אתר הנחיתה

```bash
cd site
npm install
npm run dev      # תצוגה מקומית → http://localhost:5173/QuickTranslate/
npm run build    # בנייה לייצור → site/dist/
npm run preview  # תצוגה מקדימה של ה-build
```

GitHub Pages מופעל אוטומטית ב-push ל-main (`.github/workflows/deploy-pages.yml`).
**כתובת האתר:** https://4pdara.github.io/QuickTranslate/

## web preview מקומי (UI בלבד, בלי Tauri)

```bash
npm run dev
# → http://localhost:1420
```

בדפדפן מוצג באנר "מצב תצוגת אתר". תרגום לא יעבוד (CORS) — ה-UI בלבד.

## בדיקות

```bash
npx tsc --noEmit          # TypeScript
npm run build             # Frontend build
cd src-tauri && cargo check  # Rust
```

## פרטיות ואבטחה

- ללא חשבון משתמש, ללא backend בענן, ללא טלמטריה.
- מפתחות API נשמרים מקומית ב-`%APPDATA%/com.quicktranslate.desktop/`.
- הטקסט נשלח רק לספק התרגום שנבחר.
- לוח ההעתקה של המשתמש **לא נמחק ולא מוחלף** בשום שלב.

## לפרטי ארכיטקטורה

ראו [CLAUDE.md](./CLAUDE.md) ואת תיקיית [docs/](./docs/).
