//! לכידת טקסט מסומן ישירות מהאלמנט הממוקד ב-Windows, בלי לגעת בלוח, באמצעות
//! Windows UI Automation (IUIAutomation / TextPattern).
//!
//! **מגבלה ידועה ומתועדת:** זה עובד רק באפליקציות שחושפות את הבקרה הממוקדת
//! עם תמיכה ב-TextPattern (ITextProvider) — רוב בקרות הטקסט הסטנדרטיות של
//! Windows, Notepad, WPF, ורוב הדפדפנים המודרניים (Chrome/Edge/Firefox) כאשר
//! יש להם focus על אזור טקסט. אפליקציות עם רינדור מותאם (canvas/custom) או
//! בקרות שלא מיישמות נכון את ה-Accessibility API לא יחזירו טקסט — וזה נכשל
//! "בנקיון" (שגיאה מפורשת), לא בשקט.

use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED};
use windows::Win32::UI::Accessibility::{CUIAutomation, IUIAutomation, IUIAutomationTextPattern, UIA_TextPatternId};
use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

/// לדיאגנוסטיקה בלבד (debug build) — האם קיים חלון בחזית כרגע. לא קוראת/מדפיסה
/// את הכותרת שלו (יכולה להכיל תוכן רגיש), רק מצב בוליאני.
#[allow(dead_code)]
pub fn has_foreground_window() -> bool {
    unsafe { !GetForegroundWindow().0.is_null() }
}

/// משחררת COM כשהיא יוצאת מהיקף (RAII) — מבטיחה ש-CoUninitialize יקרא גם
/// בנתיבי `?`/שגיאה מוקדמת.
struct ComGuard;

impl Drop for ComGuard {
    fn drop(&mut self) {
        unsafe { CoUninitialize() };
    }
}

/// מנסה ללכוד את הטקסט המסומן מהאלמנט הממוקד כרגע בכל המערכת (לא משנה איזו
/// אפליקציה זו — UI Automation עובד חוצה-תהליכים). **לא נוגעת בלוח בכלל.**
/// רצה על thread ייעודי משלה (לא ה-thread הראשי של Tauri) ומבצעת אתחול COM
/// (STA) משלה לאורך הקריאה.
pub fn try_capture_selected_text() -> Result<String, String> {
    unsafe {
        let hr = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        if hr.is_err() {
            return Err(format!("CoInitializeEx failed: 0x{:X}", hr.0));
        }
        let _com_guard = ComGuard;

        let automation: IUIAutomation = CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)
            .map_err(|e| format!("CoCreateInstance(CUIAutomation) failed: {e}"))?;

        let element = automation
            .GetFocusedElement()
            .map_err(|e| format!("GetFocusedElement failed: {e}"))?;

        let text_pattern: IUIAutomationTextPattern = element
            .GetCurrentPatternAs(UIA_TextPatternId)
            .map_err(|_| "focused element does not support TextPattern".to_string())?;

        let ranges = text_pattern
            .GetSelection()
            .map_err(|e| format!("GetSelection failed: {e}"))?;

        let count = ranges.Length().map_err(|e| format!("Length failed: {e}"))?;
        if count <= 0 {
            return Ok(String::new());
        }

        let mut combined = String::new();
        for i in 0..count {
            let range = ranges
                .GetElement(i)
                .map_err(|e| format!("GetElement({i}) failed: {e}"))?;
            let text = range.GetText(-1).map_err(|e| format!("GetText failed: {e}"))?;
            combined.push_str(&text.to_string());
        }

        Ok(combined)
    }
}
