import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";
import { DEFAULT_SETTINGS, type AppSettings } from "./lib/settings/types";
import { loadSettings, saveSettings } from "./lib/settings/store";
import { getProvider, isProviderConfigured } from "./lib/translation/registry";
import { isTauri } from "./lib/isTauri";
import TranslatorView from "./TranslatorView";
import SettingsView from "./SettingsView";

type View = "translate" | "settings";

function ProviderStatusBadge({ settings }: { settings: AppSettings }) {
  const provider = getProvider(settings.selectedProvider);
  const configured = provider ? isProviderConfigured(provider, settings) : false;
  return (
    <span className="provider-status" title={configured ? "הספק מוכן לשימוש" : "הספק דורש הגדרה"}>
      <span className={`provider-status__dot ${configured ? "provider-status__dot--ok" : "provider-status__dot--warn"}`} />
      {provider?.label ?? "לא נבחר ספק"}
    </span>
  );
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("translate");
  const [notice, setNotice] = useState<string | null>(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    loadSettings()
      .then((loaded) => {
        setSettings(loaded);
        settingsRef.current = loaded;
        setReady(true);
      })
      .catch(() => {
        setNotice("לא ניתן לטעון את ההגדרות. בדוק הרשאות גישה ונסה להפעיל מחדש.");
        setReady(true);
      });
    if (isTauri()) {
      void invoke<{ error: string | null }>("get_shortcut_status").then((status) => {
        if (status.error) setNotice(status.error);
      }).catch(() => setNotice("לא ניתן לבדוק את קיצור המקשים."));
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    const unlistenSettings = listen("navigate-settings", () => setView("settings"));
    const unlistenTranslator = listen("navigate-translator", () => setView("translate"));
    return () => {
      void unlistenSettings.then((u) => u());
      void unlistenTranslator.then((u) => u());
    };
  }, []);

  async function updateSettings(patch: Partial<AppSettings>) {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    try {
      await saveSettings(next);
    } catch {
      setNotice("שמירת ההגדרות נכשלה. השינויים עלולים לא להישמר לאחר סגירת התוכנה.");
    }
  }

  async function applyShortcut(shortcut: string) {
    if (isTauri()) await invoke("set_global_shortcut", { shortcut });
    setNotice(null);
    await updateSettings({ globalShortcut: shortcut.trim() });
  }

  async function handleMinimize() {
    if (!isTauri()) return;
    await getCurrentWindow().hide();
  }

  if (!ready) {
    return (
      <main className="app">
        <p>טוען…</p>
      </main>
    );
  }

  return (
    <main className="app">
      {!isTauri() && (
        <div className="web-preview-banner">
          מצב תצוגת אתר — קיצורי מקשים ושורת משימות זמינים רק באפליקציית Desktop.
        </div>
      )}
      {notice && <div className="banner" role="alert">{notice}</div>}
      <div hidden={view !== "translate"}>
          <header className="app__header">
            <div>
              <h1 className="app__title">
                QuickTranslate <span className="app__title-sub">תרגום מהיר</span>
              </h1>
            </div>
            <div className="app__header-actions">
              <ProviderStatusBadge settings={settings} />
              {isTauri() && (
                <button
                  type="button"
                  className="icon-button"
                  title="מזער למגש המערכת"
                  onClick={() => void handleMinimize()}
                >
                  ─
                </button>
              )}
              <button type="button" className="icon-button" title="הגדרות" onClick={() => setView("settings")}>
                ⚙
              </button>
            </div>
          </header>
          <TranslatorView settings={settings} onUpdateSettings={updateSettings} onOpenSettings={() => setView("settings")} />
      </div>
      {view === "settings" && (
        <SettingsView settings={settings} onUpdateSettings={updateSettings} onApplyShortcut={applyShortcut} onBack={() => setView("translate")} />
      )}
    </main>
  );
}

export default App;
