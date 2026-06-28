use enigo::{Direction, Enigo, Key, Keyboard, Settings as EnigoSettings};
use serde::Serialize;
#[cfg(debug_assertions)]
use std::time::Instant;
use std::{thread, time::Duration};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const POPUP_LABEL: &str = "popup";
const MAIN_LABEL: &str = "main";
const DEFAULT_SHORTCUT: &str = "Ctrl+Shift+T";

// השהיה לפני שליחת Ctrl+C, כדי לתת לקיצור המקשים הגלובלי (Ctrl+Shift+T) "להשתקע"
// ולמקשי Ctrl/Shift הפיזיים סיכוי לעלות. אם לא נחכה, ה-Ctrl+C הסינתטי שלנו
// עלול להתערבב עם Shift שעדיין לחוץ פיזית ולהפוך בטעות ל-Ctrl+Shift+C.
const PRE_COPY_DELAY_MS: u64 = 120;
const CLIPBOARD_POLL_INTERVAL_MS: u64 = 50;
const CLIPBOARD_POLL_MAX_MS: u64 = 1400;

/// קוראת ערך בודד מתוך הגדרות האפליקציה (settings.json), אם קיים.
fn read_setting<T>(app: &AppHandle, key: &str, parse: impl Fn(&serde_json::Value) -> Option<T>) -> Option<T> {
    tauri_plugin_store::StoreBuilder::new(app, "settings.json")
        .build()
        .ok()
        .and_then(|store| store.get("settings"))
        .and_then(|settings| settings.get(key).and_then(|v| parse(v)))
}

/// קוראת את קיצור המקשים הגלובלי מקובץ ההגדרות אם קיים, אחרת ברירת המחדל.
fn configured_shortcut(app: &AppHandle) -> String {
    read_setting(app, "globalShortcut", |v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| DEFAULT_SHORTCUT.to_string())
}

/// קוראת את ההגדרה "תרגם גם אם הלוח לא השתנה".
fn allow_unchanged_clipboard_fallback(app: &AppHandle) -> bool {
    read_setting(app, "allowUnchangedClipboardFallback", |v| v.as_bool()).unwrap_or(true)
}

// בשימוש רק לדיאגנוסטיקה בבנייה debug (ראו capture_selected_text_via_shortcut).
#[cfg(windows)]
#[allow(dead_code)]
fn has_foreground_window() -> bool {
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    unsafe { !GetForegroundWindow().0.is_null() }
}

#[cfg(not(windows))]
fn has_foreground_window() -> bool {
    true
}

fn ensure_popup_window(app: &AppHandle) -> tauri::WebviewWindow {
    if let Some(window) = app.get_webview_window(POPUP_LABEL) {
        return window;
    }
    WebviewWindowBuilder::new(app, POPUP_LABEL, WebviewUrl::App("popup.html".into()))
        .title("QuickTranslate")
        .inner_size(380.0, 220.0)
        .resizable(false)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .transparent(true)
        .visible(false)
        .build()
        .expect("נכשל ביצירת חלון הפופאפ")
}

#[derive(Clone, Serialize)]
struct SelectedTextPayload {
    text: String,
    #[serde(rename = "usedFallback")]
    used_fallback: bool,
}

/// מציגה את חלון הפופאפ ושולחת אליו אירוע עם הטקסט שיתורגם.
/// נקראת **רק אחרי** שלכידת הטקסט המסומן הסתיימה — לעולם לא לפני שליחת Ctrl+C,
/// כדי שהפופאפ לא יגנוב פוקוס מהאפליקציה שבה המשתמש סימן טקסט.
fn show_popup_with_text(app: &AppHandle, text: String, used_fallback: bool) {
    let window = ensure_popup_window(app);
    let _ = window.center();
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.emit("selected-text", SelectedTextPayload { text, used_fallback });
}

/// שולחת Ctrl+C "נקי" לאפליקציה הפעילה (הפוקוס לא משתנה — לא מציגים שום חלון לפני זה).
/// משחררת קודם Shift/Alt שעלולים להיות עדיין "לחוצים" פיזית מקיצור המקשים הגלובלי
/// (Ctrl+Shift+T), כדי שהעותק הסינתטי לא ייצא בטעות Ctrl+Shift+C.
fn send_clean_copy_keystroke() {
    if let Ok(mut enigo) = Enigo::new(&EnigoSettings::default()) {
        let _ = enigo.key(Key::Shift, Direction::Release);
        let _ = enigo.key(Key::Alt, Direction::Release);
        thread::sleep(Duration::from_millis(20));
        let _ = enigo.key(Key::Control, Direction::Press);
        thread::sleep(Duration::from_millis(15));
        let _ = enigo.key(Key::Unicode('c'), Direction::Click);
        thread::sleep(Duration::from_millis(15));
        let _ = enigo.key(Key::Control, Direction::Release);
        #[cfg(debug_assertions)]
        eprintln!("copy command sent: yes");
    } else {
        #[cfg(debug_assertions)]
        eprintln!("copy command sent: no (enigo init failed)");
    }
}

/// לוכדת את הטקסט המסומן באפליקציה הפעילה — **רק** אם הלוח השתנה בפועל מאז
/// תחילת הקריאה. לעולם לא מוחקת/מאפסת/מחליפה את הלוח; רק קוראת ממנו.
/// מחזירה (הטקסט שנמצא, האם זה fallback מהלוח הישן).
fn capture_selected_text_via_shortcut(app: &AppHandle, allow_unchanged_fallback: bool) -> (Option<String>, bool) {
    #[cfg(debug_assertions)]
    let start = Instant::now();
    let old_text = app.clipboard().read_text().unwrap_or_default();

    #[cfg(debug_assertions)]
    {
        eprintln!("foreground window captured: {}", if has_foreground_window() { "yes" } else { "no" });
        eprintln!("old clipboard length: {}", old_text.chars().count());
    }

    // לא מציגים/מפוקסים שום חלון של QuickTranslate כאן — רק אחרי שהלכידה מסתיימת.
    thread::sleep(Duration::from_millis(PRE_COPY_DELAY_MS));
    send_clean_copy_keystroke();

    let mut elapsed_ms: u64 = 0;
    while elapsed_ms < CLIPBOARD_POLL_MAX_MS {
        thread::sleep(Duration::from_millis(CLIPBOARD_POLL_INTERVAL_MS));
        elapsed_ms += CLIPBOARD_POLL_INTERVAL_MS;

        let current = app.clipboard().read_text().unwrap_or_default();
        if !current.is_empty() && current != old_text {
            #[cfg(debug_assertions)]
            {
                eprintln!("clipboard changed: yes");
                eprintln!("new clipboard length: {}", current.chars().count());
                eprintln!("fallback used: no");
                eprintln!("capture duration ms: {}", start.elapsed().as_millis());
            }
            return (Some(current), false);
        }
    }

    #[cfg(debug_assertions)]
    eprintln!("clipboard changed: no");

    if allow_unchanged_fallback && !old_text.is_empty() {
        #[cfg(debug_assertions)]
        {
            eprintln!("fallback used: yes");
            eprintln!("capture duration ms: {}", start.elapsed().as_millis());
        }
        return (Some(old_text), true);
    }

    #[cfg(debug_assertions)]
    {
        eprintln!("fallback used: no");
        eprintln!("capture duration ms: {}", start.elapsed().as_millis());
    }
    (None, false)
}

/// קיצור המקשים הגלובלי (Ctrl+Shift+T): מנסה ללכוד טקסט מסומן בפועל. אם הלוח
/// לא השתנה ו-`allowUnchangedClipboardFallback` מופעל — מתרגם את תוכן הלוח
/// הקיים. אחרת מציג שגיאה ברורה בעברית. הפופאפ מוצג רק בסוף, אחרי הלכידה.
fn translate_selected_text_via_shortcut(app: &AppHandle) {
    let allow_fallback = allow_unchanged_clipboard_fallback(app);
    let (captured, used_fallback) = capture_selected_text_via_shortcut(app, allow_fallback);
    show_popup_with_text(app, captured.unwrap_or_default(), used_fallback);
}

/// "תרגם טקסט מהלוח" (תפריט מגש) — זרימה נפרדת ומכוונת: מתרגמת את תוכן הלוח
/// הנוכחי בלי שום השוואה, כי כאן הכוונה המפורשת היא לתרגם מה שכבר בלוח.
fn translate_current_clipboard(app: &AppHandle) {
    let text = app.clipboard().read_text().unwrap_or_default();
    show_popup_with_text(app, text, false);
}

#[tauri::command]
fn show_settings_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_LABEL) {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit("navigate-settings", ());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![show_settings_window])
        .setup(|app| {
            let handle = app.handle().clone();

            let open_settings = MenuItem::with_id(app, "open_settings", "פתח הגדרות", true, None::<&str>)?;
            let translate_clipboard =
                MenuItem::with_id(app, "translate_clipboard", "תרגם טקסט מהלוח", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "יציאה", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&open_settings, &translate_clipboard, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap())
                .menu(&tray_menu)
                .tooltip("QuickTranslate")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open_settings" => show_settings_window(app.clone()),
                    "translate_clipboard" => translate_current_clipboard(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            let shortcut_str = configured_shortcut(&handle);
            if let Ok(shortcut) = shortcut_str.parse::<Shortcut>() {
                let handler_handle = handle.clone();
                app.global_shortcut()
                    .on_shortcut(shortcut, move |_app, _shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            let handle_for_thread = handler_handle.clone();
                            // לרוץ על thread נפרד כדי לא לחסום את ה-event loop של global-hotkey
                            // בזמן ה-sleep/polling (עד ~1.5 שניות במקרה הגרוע).
                            thread::spawn(move || {
                                translate_selected_text_via_shortcut(&handle_for_thread);
                            });
                        }
                    })?;
            }

            // יצירה מוקדמת (מוסתרת) של חלון הפופאפ כדי שההפעלה הראשונה תהיה מהירה.
            ensure_popup_window(&handle);

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == MAIN_LABEL {
                    // לא לסגור את האפליקציה כשסוגרים את חלון ההגדרות — היא ממשיכה לרוץ במגש המערכת.
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
