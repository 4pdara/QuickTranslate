import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import "./PopupApp.css";
import { loadSettings } from "./lib/settings/store";
import { translateWithSettings } from "./lib/translation/translate";
import { TranslationError } from "./lib/translation/types";
import { autoTargetLanguage } from "./lib/scriptDetect";

type PopupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "success"; text: string; usedFallback: boolean }
  | { kind: "error"; message: string };

interface SelectedTextPayload {
  text: string;
  usedFallback: boolean;
}

function PopupApp() {
  const [state, setState] = useState<PopupState>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unlistenPromise = listen<SelectedTextPayload>("selected-text", (event) => {
      void runTranslation(event.payload.text, event.payload.usedFallback);
    });
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  async function runTranslation(rawText: string, usedFallback: boolean) {
    const text = rawText.trim();
    setCopied(false);

    if (!text) {
      setState({ kind: "empty" });
      return;
    }

    setState({ kind: "loading" });

    try {
      const settings = await loadSettings();
      const effectiveTarget = settings.autoDetectDirection
        ? autoTargetLanguage(text, settings.targetLanguage)
        : settings.targetLanguage;
      const result = await translateWithSettings(settings, text, settings.sourceLanguage, effectiveTarget);

      setState({ kind: "success", text: result.translatedText, usedFallback });

      if (settings.autoCopyResult) {
        await writeText(result.translatedText);
        setCopied(true);
      }
    } catch (err) {
      const message = err instanceof TranslationError ? err.message : "אירעה שגיאה לא צפויה בתרגום. נסה שוב.";
      setState({ kind: "error", message });
    }
  }

  async function handleCopy() {
    if (state.kind !== "success") return;
    await writeText(state.text);
    setCopied(true);
  }

  async function handleClose() {
    await getCurrentWindow().hide();
  }

  async function handleOpenSettings() {
    await invoke("show_settings_window");
  }

  return (
    <main className="popup" dir="rtl">
      <div className="popup__body">
        {state.kind === "idle" && <p className="popup__hint">סמן טקסט בכל אפליקציה ולחץ על קיצור המקשים.</p>}
        {state.kind === "loading" && <p className="popup__hint">מתרגם…</p>}
        {state.kind === "empty" && <p className="popup__error">לא נמצא טקסט מסומן לתרגום. סמן טקסט ונסה שוב.</p>}
        {state.kind === "error" && <p className="popup__error">{state.message}</p>}
        {state.kind === "success" && (
          <>
            <p className="popup__result">{state.text}</p>
            {state.usedFallback && (
              <p className="popup__hint">הטקסט תורגם מהלוח כי הלוח לא השתנה.</p>
            )}
            {copied && <p className="popup__copied">הועתק ללוח ✓</p>}
          </>
        )}
      </div>

      <div className="popup__actions">
        {state.kind === "success" && (
          <button type="button" onClick={handleCopy}>
            העתק
          </button>
        )}
        <button type="button" className="secondary" onClick={handleOpenSettings}>
          הגדרות
        </button>
        <button type="button" className="secondary" onClick={handleClose}>
          סגור
        </button>
      </div>
    </main>
  );
}

export default PopupApp;
