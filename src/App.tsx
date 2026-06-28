import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";
import { DEFAULT_SETTINGS, type AppSettings } from "./lib/settings/types";
import { loadSettings, saveSettings } from "./lib/settings/store";
import { getProvider, isProviderConfigured } from "./lib/translation/registry";
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

  useEffect(() => {
    loadSettings()
      .then((loaded) => {
        setSettings(loaded);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  useEffect(() => {
    const unlistenPromise = listen("navigate-settings", () => setView("settings"));
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  async function updateSettings(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
  }

  async function handleMinimize() {
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
      {view === "translate" ? (
        <>
          <header className="app__header">
            <div>
              <h1 className="app__title">
                QuickTranslate <span className="app__title-sub">תרגום מהיר</span>
              </h1>
            </div>
            <div className="app__header-actions">
              <ProviderStatusBadge settings={settings} />
              <button
                type="button"
                className="icon-button"
                title="מזער למגש המערכת"
                onClick={() => void handleMinimize()}
              >
                ─
              </button>
              <button type="button" className="icon-button" title="הגדרות" onClick={() => setView("settings")}>
                ⚙
              </button>
            </div>
          </header>
          <TranslatorView settings={settings} onUpdateSettings={updateSettings} onOpenSettings={() => setView("settings")} />
        </>
      ) : (
        <SettingsView settings={settings} onUpdateSettings={updateSettings} onBack={() => setView("translate")} />
      )}
    </main>
  );
}

export default App;
