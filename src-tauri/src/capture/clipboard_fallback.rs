//! Fallback מבוסס לוח (Ctrl+C + פולינג מהיר) — בשימוש כאשר הלכידה הישירה
//! (UI Automation) נכשלה/לא נתמכת באפליקציה הפעילה (למשל דפדפנים, Word, PDF).

use std::{thread, time::Duration};
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

#[cfg(not(windows))]
use enigo::{Direction, Enigo, Key, Keyboard, Settings as EnigoSettings};

const PRE_COPY_DELAY_MS: u64 = 60;
const CLIPBOARD_POLL_INTERVAL_MS: u64 = 25;
const CLIPBOARD_POLL_MAX_MS: u64 = 400;

#[cfg(windows)]
mod win32 {
    #[link(name = "user32")]
    extern "system" {
        pub fn keybd_event(b_vk: u8, b_scan: u8, dw_flags: u32, dw_extra_info: usize);
        pub fn GetClipboardSequenceNumber() -> u32;
    }
}

/// שולחת Ctrl+C "נקי": משחררת קודם מקשי שינוי (Shift/Alt/Ctrl) שעלולים להיות עדיין לחוצים פיזית,
/// ואז שולחת סימולציית מקשים תקנית של Ctrl+C הפועלת בכל אפליקציה ב-Windows.
#[cfg(windows)]
fn send_clean_copy_keystroke() {
    const VK_SHIFT: u8 = 0x10;
    const VK_CONTROL: u8 = 0x11;
    const VK_MENU: u8 = 0x12; // Alt
    const VK_C: u8 = 0x43;
    const KEYEVENTF_KEYUP: u32 = 0x0002;

    unsafe {
        // שחרור מקשי שינוי פיזיים של קיצור הדרך
        win32::keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, 0);
        win32::keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0);
        win32::keybd_event(0x54, 0, KEYEVENTF_KEYUP, 0); // 'T'
        win32::keybd_event(0x51, 0, KEYEVENTF_KEYUP, 0); // 'Q'
        win32::keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
        thread::sleep(Duration::from_millis(25));

        // לחיצה על Ctrl
        win32::keybd_event(VK_CONTROL, 0, 0, 0);
        thread::sleep(Duration::from_millis(20));

        // לחיצה ושחרור של C (VK_C)
        win32::keybd_event(VK_C, 0, 0, 0);
        thread::sleep(Duration::from_millis(20));
        win32::keybd_event(VK_C, 0, KEYEVENTF_KEYUP, 0);
        thread::sleep(Duration::from_millis(20));

        // שחרור של Ctrl
        win32::keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
    }
}

#[cfg(not(windows))]
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
    }
}

/// שולחת Ctrl+C ובודקת האם הלוח השתנה (או לפי מספר רצף ה-Clipboard או לפי שינוי הטקסט).
pub fn capture_via_clipboard(app: &AppHandle, allow_unchanged_fallback: bool) -> (Option<String>, bool) {
    let old_text = app.clipboard().read_text().unwrap_or_default();

    #[cfg(windows)]
    let start_seq = unsafe { win32::GetClipboardSequenceNumber() };

    thread::sleep(Duration::from_millis(PRE_COPY_DELAY_MS));
    send_clean_copy_keystroke();

    let mut elapsed_ms: u64 = 0;
    while elapsed_ms < CLIPBOARD_POLL_MAX_MS {
        thread::sleep(Duration::from_millis(CLIPBOARD_POLL_INTERVAL_MS));
        elapsed_ms += CLIPBOARD_POLL_INTERVAL_MS;

        #[cfg(windows)]
        {
            let current_seq = unsafe { win32::GetClipboardSequenceNumber() };
            if current_seq != start_seq {
                let current = app.clipboard().read_text().unwrap_or_default();
                if !current.trim().is_empty() {
                    return (Some(current), false);
                }
            }
        }

        let current = app.clipboard().read_text().unwrap_or_default();
        if !current.trim().is_empty() && current != old_text {
            return (Some(current), false);
        }
    }

    if allow_unchanged_fallback && !old_text.trim().is_empty() {
        return (Some(old_text), true);
    }

    (None, false)
}

/// "תרגם טקסט מהלוח" (תפריט מגש) — קוראת את הלוח הנוכחי בכוונה, בלי השוואה.
pub fn read_current_clipboard(app: &AppHandle) -> String {
    app.clipboard().read_text().unwrap_or_default()
}
