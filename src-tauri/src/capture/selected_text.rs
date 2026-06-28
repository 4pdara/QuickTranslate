//! נקודת הכניסה המאוחדת ל-SelectedTextCaptureEngine: מנסה קודם UI Automation
//! (בלי לוח), ורק אם זה נכשל/לא זמין — ובהתאם להגדרות המשתמש — עובר ל-fallback
//! מבוסס לוח. ראו `super::CaptureResult` למבנה התשובה.

use std::time::Instant;
use tauri::AppHandle;

use super::clipboard_fallback;
#[cfg(windows)]
use super::windows_ui_automation;
use super::{CaptureMethod, CaptureResult};

pub struct CaptureOptions {
    /// לנסות קודם לקרוא טקסט מסומן ישירות, בלי לגעת בלוח (UI Automation).
    pub try_without_clipboard: bool,
    /// אם הקריאה הישירה נכשלה — האם להשתמש ב-fallback מבוסס לוח (Ctrl+C)?
    pub allow_clipboard_fallback: bool,
    /// תקף רק בתוך ה-fallback מבוסס לוח: לתרגם גם אם הלוח לא השתנה כלל.
    pub allow_unchanged_clipboard_fallback: bool,
}

pub fn capture_selected_text(app: &AppHandle, options: CaptureOptions) -> CaptureResult {
    let start = Instant::now();

    if options.try_without_clipboard {
        #[cfg(windows)]
        {
            #[cfg(debug_assertions)]
            eprintln!(
                "foreground window captured: {}",
                if windows_ui_automation::has_foreground_window() { "yes" } else { "no" }
            );
            match windows_ui_automation::try_capture_selected_text() {
                Ok(text) if !text.trim().is_empty() => {
                    #[cfg(debug_assertions)]
                    eprintln!("selected text length: {}", text.chars().count());
                    return CaptureResult {
                        success: true,
                        text: Some(text),
                        method: CaptureMethod::UiAutomation,
                        reason: None,
                        duration_ms: start.elapsed().as_millis(),
                    };
                }
                Ok(_) => {
                    #[cfg(debug_assertions)]
                    eprintln!("ui_automation: no active selection found");
                }
                #[cfg_attr(not(debug_assertions), allow(unused_variables))]
                Err(reason) => {
                    #[cfg(debug_assertions)]
                    eprintln!("ui_automation failure reason: {reason}");
                }
            }
        }
        #[cfg(not(windows))]
        {
            #[cfg(debug_assertions)]
            eprintln!("ui_automation: not supported on this OS");
        }
    }

    if options.allow_clipboard_fallback {
        let (captured, used_unchanged_fallback) =
            clipboard_fallback::capture_via_clipboard(app, options.allow_unchanged_clipboard_fallback);
        if let Some(text) = captured {
            #[cfg(debug_assertions)]
            eprintln!("selected text length: {}", text.chars().count());
            return CaptureResult {
                success: true,
                text: Some(text),
                method: CaptureMethod::ClipboardFallback,
                reason: if used_unchanged_fallback {
                    Some("unchanged_clipboard_fallback".to_string())
                } else {
                    None
                },
                duration_ms: start.elapsed().as_millis(),
            };
        }
    }

    CaptureResult {
        success: false,
        text: None,
        method: CaptureMethod::Failed,
        reason: Some("no_selected_text".to_string()),
        duration_ms: start.elapsed().as_millis(),
    }
}
