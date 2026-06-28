//! Fallback מבוסס לוח (Ctrl+C + פולינג) — בשימוש רק כשהלכידה הישירה
//! (UI Automation) נכשלה/לא זמינה, ורק אם המשתמש אישר זאת בהגדרות.
//! לעולם לא מוחק/מאפס/מחליף את הלוח — רק קורא ממנו.

use enigo::{Direction, Enigo, Key, Keyboard, Settings as EnigoSettings};
use std::{thread, time::Duration};
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

// השהיה לפני שליחת Ctrl+C, כדי לתת לקיצור המקשים הגלובלי (Ctrl+Shift+T)
// "להשתקע" ולמקשי Ctrl/Shift הפיזיים סיכוי לעלות, כדי שה-Ctrl+C הסינתטי
// לא יתערבב איתם ויהפוך בטעות ל-Ctrl+Shift+C.
const PRE_COPY_DELAY_MS: u64 = 120;
const CLIPBOARD_POLL_INTERVAL_MS: u64 = 50;
const CLIPBOARD_POLL_MAX_MS: u64 = 1400;

/// שולחת Ctrl+C "נקי": משחררת קודם Shift/Alt שעלולים להיות עדיין "לחוצים"
/// פיזית מקיצור המקשים הגלובלי, ואז Ctrl+C אמיתי.
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

/// שולחת Ctrl+C ובודקת אם הלוח השתנה בפועל. מחזירה (הטקסט שנמצא, האם זה
/// fallback מתוכן לוח שלא השתנה — `allow_unchanged_fallback`).
pub fn capture_via_clipboard(app: &AppHandle, allow_unchanged_fallback: bool) -> (Option<String>, bool) {
    let old_text = app.clipboard().read_text().unwrap_or_default();

    #[cfg(debug_assertions)]
    eprintln!("old clipboard length: {}", old_text.chars().count());

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
            }
            return (Some(current), false);
        }
    }

    #[cfg(debug_assertions)]
    eprintln!("clipboard changed: no");

    if allow_unchanged_fallback && !old_text.is_empty() {
        return (Some(old_text), true);
    }

    (None, false)
}

/// "תרגם טקסט מהלוח" (תפריט מגש) — קוראת את הלוח הנוכחי בכוונה, בלי השוואה.
pub fn read_current_clipboard(app: &AppHandle) -> String {
    app.clipboard().read_text().unwrap_or_default()
}
