# QuickTranslate v0.1.0 — גרסה ראשונה

## מה זה QuickTranslate?

אפליקציית Desktop קלה לתרגום טקסט — עברית-first, RTL-first.
בנויה על **Tauri v2 + React + TypeScript** (לא Electron).

## מה כלול בגרסה הזאת

### תרגום ידני
- מסך תרגום ראשי: הדבקת/הקלדת טקסט → לחיצת "תרגם" → תוצאה בפאנל ימני.
- בחירת שפת מקור/יעד + כפתור החלפה.
- זיהוי כיוון עברית/אנגלית אוטומטי (`autoDetectDirection`).

### תרגום טקסט מסומן — קיצור מקשים גלובלי (`Ctrl+Shift+T`)
- **SelectedTextCaptureEngine**: קריאה ישירה של הטקסט המסומן דרך Windows UI Automation — **בלי לגעת בלוח בכלל**.
- עובד ב-Notepad, Chrome, Edge, Firefox, Word, ורוב האפליקציות הסטנדרטיות.
- אם האפליקציה לא תומכת ב-TextPattern (canvas, חלק מ-Electron/Qt) — שגיאה ברורה, לא תרגום שקט שגוי.
- Fallback ללוח ההעתקה (Ctrl+C + polling) — כבוי כברירת מחדל, ניתן להפעיל בהגדרות.

### System Tray
- אייקון במגש המערכת — האפליקציה רצה ברקע.
- תפריט מגש: **פתח מתרגם** → **פתח הגדרות** → **תרגם טקסט מהלוח** → **יציאה**.
- "פתח מתרגם" תמיד מנווט למסך התרגום, גם אם האפליקציה הייתה על מסך ההגדרות.

### ספקי תרגום
| ספק | קטגוריה | דורש מפתח |
|---|---|---|
| Google Translate ללא API | ניסיוני | לא |
| LibreTranslate | חינמי/קוד פתוח | לא (אופציונלי) |
| Lingva Translate | ניסיוני | לא |
| Google Cloud Translation | מתקדם | כן (בתשלום) |
| DeepL | מתקדם | כן |
| Azure Translator | stub עתידי | — |

### ממשק עברי RTL
- כל ה-UI בעברית, פריסה מימין לשמאל.
- עיצוב מודרני: כרטיסים, צללים, badge-ים.
- מסך תרגום נפתח כברירת מחדל (לא מסך הגדרות).

## הורדה

| קובץ | גרסה | סוג |
|---|---|---|
| `QuickTranslate_0.1.0_x64-setup.exe` | 0.1.0 | NSIS Installer (מומלץ) |
| `QuickTranslate_0.1.0_x64_en-US.msi` | 0.1.0 | MSI Installer |
| `QuickTranslate_0.1.0_portable.zip` | 0.1.0 | Portable (ללא התקנה) |

**דרישות מערכת:** Windows 10/11 64-bit. WebView2 Runtime (מותקן אוטומטית ע"י ה-installer; נדרש מראש לגרסה הניידת — מובנה ב-Windows 11).

## הגבלות ידועות

- Windows בלבד בגרסה זו.
- Google Translate ללא API הוא endpoint לא-רשמי ועלול להשתנות/להיחסם.
- UI Automation לא עובד בכל אפליקציה (canvas, חלק מ-Electron/Qt).
- גרסת macOS/Linux לא מתוכננת לעתיד הקרוב.

## אבטחה ופרטיות

- ללא חשבון משתמש, ללא backend, ללא סנכרון ענן.
- מפתחות API נשמרים מקומית בלבד (`%APPDATA%/com.quicktranslate.desktop/`).
- ללא טלמטריה.

## קוד פתוח

https://github.com/4pdara/QuickTranslate
