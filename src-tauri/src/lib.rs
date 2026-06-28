mod capture;

use capture::selected_text::{capture_selected_text, CaptureOptions};
use capture::{clipboard_fallback, CaptureMethod};
use serde::Serialize;
use std::thread;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const POPUP_LABEL: &str = "popup";
const MAIN_LABEL: &str = "main";
const DEFAULT_SHORTCUT: &str = "Ctrl+Shift+T";

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

/// "נסה לקרוא טקסט מסומן בלי להשתמש בלוח" (UI Automation). ברירת מחדל: כן.
fn capture_selected_text_without_clipboard(app: &AppHandle) -> bool {
    read_setting(app, "captureSelectedTextWithoutClipboard", |v| v.as_bool()).unwrap_or(true)
}

/// "אם לא הצליח — השתמש בלוח ההעתקה" (Ctrl+C fallback). ברירת מחדל: לא.
fn allow_clipboard_fallback_for_selected_text(app: &AppHandle) -> bool {
    read_setting(app, "allowClipboardFallbackForSelectedText", |v| v.as_bool()).unwrap_or(false)
}

/// "תרגם גם אם הלוח לא השתנה" — תקף רק כתת-הגדרה של ה-fallback ללוח.
fn allow_unchanged_clipboard_fallback(app: &AppHandle) -> bool {
    read_setting(app, "allowUnchangedClipboardFallback", |v| v.as_bool()).unwrap_or(true)
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
    #[serde(rename = "captureMethod")]
    capture_method: String,
    /// true רק כש-UI Automation נכשל/לא זמין **וגם** ה-fallback ללוח כבוי —
    /// כדי שה-popup יוכל להציג הודעה ספציפית שמכוונת להגדרות.
    #[serde(rename = "captureFailedNoFallback")]
    capture_failed_no_fallback: bool,
}

/// מציגה את חלון הפופאפ ושולחת אליו אירוע עם תוצאת הלכידה.
/// נקראת **רק אחרי** שהלכידה הסתיימה — לעולם לא לפני, כדי שהפופאפ לא יגנוב
/// פוקוס מהאפליקציה שבה המשתמש סימן טקסט.
fn show_popup_with_result(app: &AppHandle, payload: SelectedTextPayload) {
    let window = ensure_popup_window(app);
    let _ = window.center();
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.emit("selected-text", payload);
}

/// קיצור המקשים הגלובלי (Ctrl+Shift+T): מנסה SelectedTextCaptureEngine —
/// קודם UI Automation (בלי לוח), ורק אם הוגדר ע"י המשתמש — fallback ללוח.
/// לעולם לא מתרגם תוכן לוח ישן בשקט; הפופאפ מוצג רק בסוף הלכידה.
fn translate_selected_text_via_shortcut(app: &AppHandle) {
    let options = CaptureOptions {
        try_without_clipboard: capture_selected_text_without_clipboard(app),
        allow_clipboard_fallback: allow_clipboard_fallback_for_selected_text(app),
        allow_unchanged_clipboard_fallback: allow_unchanged_clipboard_fallback(app),
    };
    let allow_clipboard_fallback = options.allow_clipboard_fallback;
    let result = capture_selected_text(app, options);

    #[cfg(debug_assertions)]
    {
        eprintln!("capture method attempted: {}", result.method.as_str());
        eprintln!("capture success: {}", result.success);
        if let Some(reason) = &result.reason {
            eprintln!("capture reason: {reason}");
        }
        eprintln!("capture duration ms: {}", result.duration_ms);
    }

    let used_fallback = result.method == CaptureMethod::ClipboardFallback
        && result.reason.as_deref() == Some("unchanged_clipboard_fallback");
    let capture_failed_no_fallback = !result.success && !allow_clipboard_fallback;

    show_popup_with_result(
        app,
        SelectedTextPayload {
            text: result.text.unwrap_or_default(),
            used_fallback,
            capture_method: result.method.as_str().to_string(),
            capture_failed_no_fallback,
        },
    );
}

/// "תרגם טקסט מהלוח" (תפריט מגש) — זרימה נפרדת ומכוונת: מתרגמת את תוכן הלוח
/// הנוכחי בלי שום השוואה, כי כאן הכוונה המפורשת היא לתרגם מה שכבר בלוח.
fn translate_current_clipboard(app: &AppHandle) {
    let text = clipboard_fallback::read_current_clipboard(app);
    show_popup_with_result(
        app,
        SelectedTextPayload {
            text,
            used_fallback: false,
            capture_method: "clipboard_fallback".to_string(),
            capture_failed_no_fallback: false,
        },
    );
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
                            // בזמן הלכידה (UI Automation + אתחול COM, ואולי גם פולינג על הלוח).
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
