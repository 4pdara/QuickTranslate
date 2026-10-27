use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

#[derive(Clone, Default, Serialize)]
pub struct ShortcutStatus {
    pub active: Option<String>,
    pub error: Option<String>,
}

#[derive(Default)]
pub struct ShortcutManager(pub Mutex<ShortcutStatus>);

fn parse_shortcut(value: &str) -> Result<Shortcut, String> {
    let shortcut = value.trim().parse::<Shortcut>()
        .map_err(|_| "קיצור המקשים אינו תקין. לדוגמה: Ctrl+Shift+T".to_string())?;
    if shortcut.mods.is_empty() {
        return Err("יש לכלול Ctrl, Alt או Shift בקיצור המקשים.".into());
    }
    Ok(shortcut)
}

pub fn apply(app: &AppHandle, value: &str) -> Result<ShortcutStatus, String> {
    let next = parse_shortcut(value)?;
    let manager = app.state::<ShortcutManager>();
    let mut status = manager.0.lock().map_err(|_| "לא ניתן לעדכן את קיצור המקשים.".to_string())?;
    let previous = status.active.as_deref().and_then(|s| s.parse::<Shortcut>().ok());
    if previous.as_ref().map(|s| s.id()) == Some(next.id()) {
        return Ok(status.clone());
    }
    // Register first: a conflict must leave the previous working shortcut intact.
    app.global_shortcut().register(next)
        .map_err(|_| "קיצור המקשים תפוס בתוכנה אחרת. בחר קיצור אחר.".to_string())?;
    if let Some(previous) = previous {
        if app.global_shortcut().unregister(previous).is_err() {
            let _ = app.global_shortcut().unregister(next);
            return Err("לא ניתן להחליף את קיצור המקשים. הקיצור הקודם נשאר פעיל.".into());
        }
    }
    status.active = Some(value.trim().to_string());
    status.error = None;
    Ok(status.clone())
}

pub fn initialize(app: &AppHandle, value: &str) {
    if let Err(error) = apply(app, value) {
        // A shortcut conflict must never prevent manual translation or tray access.
        if let Ok(mut status) = app.state::<ShortcutManager>().0.lock() {
            status.error = Some(error);
        }
    }
}

#[tauri::command]
pub fn get_shortcut_status(app: AppHandle) -> ShortcutStatus {
    app.state::<ShortcutManager>().0.lock().unwrap().clone()
}

#[tauri::command]
pub fn set_global_shortcut(app: AppHandle, shortcut: String) -> Result<ShortcutStatus, String> {
    apply(&app, &shortcut)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_modified_shortcuts_and_rejects_invalid_or_plain_keys() {
        assert!(parse_shortcut("Ctrl+Shift+T").is_ok());
        assert!(parse_shortcut(" Ctrl+Alt+Q ").is_ok());
        assert!(parse_shortcut("").is_err());
        assert!(parse_shortcut("Ctrl+").is_err());
        assert!(parse_shortcut("T").is_err());
    }
}
