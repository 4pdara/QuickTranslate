//! SelectedTextCaptureEngine — לכידת טקסט מסומן מאפליקציה פעילה.
//!
//! מנסה קודם לקרוא את הטקסט המסומן ישירות (Windows UI Automation), בלי לגעת
//! בלוח. רק אם זה נכשל, ובהתאם להגדרות המשתמש, עוברים ל-fallback מבוסס לוח
//! (Ctrl+C + פולינג). שתי השיטות לעולם לא מוחקות/מאפסות/מחליפות את הלוח —
//! רק קוראות ממנו.

pub mod clipboard_fallback;
pub mod selected_text;
#[cfg(windows)]
pub mod windows_ui_automation;

/// השיטה שבה בפועל נלכד הטקסט (או נכשל).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CaptureMethod {
    UiAutomation,
    ClipboardFallback,
    Failed,
}

impl CaptureMethod {
    pub fn as_str(&self) -> &'static str {
        match self {
            CaptureMethod::UiAutomation => "ui_automation",
            CaptureMethod::ClipboardFallback => "clipboard_fallback",
            CaptureMethod::Failed => "failed",
        }
    }
}

/// תוצאת לכידה — לעולם לא מכילה לוג של הטקסט המלא (`text` עצמו לא נרשם ביומן,
/// רק האורך שלו אם נדרש דיאגנוסטיקה).
#[derive(Debug, Clone)]
pub struct CaptureResult {
    pub success: bool,
    pub text: Option<String>,
    pub method: CaptureMethod,
    pub reason: Option<String>,
    /// לדיאגנוסטיקה (debug build) בלבד — לכן ייתכן "never read" ב-release.
    #[allow(dead_code)]
    pub duration_ms: u128,
}
