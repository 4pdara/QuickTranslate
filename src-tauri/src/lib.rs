use enigo::{Direction, Enigo, Key, Keyboard, Settings as EnigoSettings};
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

// פולינג קצר על הלוח אחרי Ctrl+C סינתטי — לא מוחקים/מאפסים את הלוח בשום שלב.
const CLIPBOARD_POLL_INTERVAL_MS: u64 = 50;
const CLIPBOARD_POLL_MAX_MS: u64 = 700;

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

/// קוראת את ההגדרה "תרגם גם אם הלוח לא השתנה" (ברירת מחדל: false).
fn allow_unchanged_clipboard_fallback(app: &AppHandle) -> bool {
    read_setting(app, "allowUnchangedClipboardFallback", |v| v.as_bool()).unwrap_or(false)
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

/// מציגה את חלון הפופאפ ושולחת אליו אירוע עם הטקסט שיתורגם.
fn show_popup_with_text(app: &AppHandle, text: String) {
    let window = ensure_popup_window(app);
    let _ = window.center();
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.emit("selected-text", text);
}

/// מדמה Ctrl+C ומחזירה את הטקסט שנלכד — **רק** אם הלוח השתנה בפועל מאז תחילת הקריאה.
/// לעולם לא מוחקת/מאפסת/מחליפה את הלוח; רק קוראת ממנו.
/// אם הלוח לא השתנה (למשל: לא היה טקסט מסומן), מוחזר `None` — אלא אם
/// `allow_unchanged_fallback` הופעל במפורש בהגדרות, ואז מוחזר התוכן הישן.
fn capture_selected_text_via_shortcut(app: &AppHandle, allow_unchanged_fallback: bool) -> Option<String> {
    let old_text = app.clipboard().read_text().unwrap_or_default();

    if let Ok(mut enigo) = Enigo::new(&EnigoSettings::default()) {
        let _ = enigo.key(Key::Control, Direction::Press);
        let _ = enigo.key(Key::Unicode('c'), Direction::Click);
        let _ = enigo.key(Key::Control, Direction::Release);
    }

    let mut elapsed_ms: u64 = 0;
    while elapsed_ms < CLIPBOARD_POLL_MAX_MS {
        thread::sleep(Duration::from_millis(CLIPBOARD_POLL_INTERVAL_MS));
        elapsed_ms += CLIPBOARD_POLL_INTERVAL_MS;

        let current = app.clipboard().read_text().unwrap_or_default();
        if !current.is_empty() && current != old_text {
            #[cfg(debug_assertions)]
            eprintln!("captured selected text length: {}", current.chars().count());
            return Some(current);
        }
    }

    if allow_unchanged_fallback && !old_text.is_empty() {
        return Some(old_text);
    }

    None
}

/// קיצור המקשים הגלובלי (Ctrl+Shift+T): מתרגם **רק** טקסט שנמצא נבחר בפועל.
/// לא מתרגם תוכן ישן/קיים בלוח כברירת מחדל — ראו `capture_selected_text_via_shortcut`.
fn translate_selected_text_via_shortcut(app: &AppHandle) {
    let allow_fallback = allow_unchanged_clipboard_fallback(app);
    let text = capture_selected_text_via_shortcut(app, allow_fallback).unwrap_or_default();
    show_popup_with_text(app, text);
}

/// "תרגם טקסט מהלוח" (תפריט מגש) — מתרגם בכוונה את תוכן הלוח הנוכחי, בלי השוואה.
fn translate_current_clipboard(app: &AppHandle) {
    let text = app.clipboard().read_text().unwrap_or_default();
    show_popup_with_text(app, text);
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
                            translate_selected_text_via_shortcut(&handler_handle);
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
