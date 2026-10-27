import { useEffect, useRef, useState } from "react";
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
  | { kind: "empty"; noFallback: boolean }
  | { kind: "success"; text: string; usedFallback: boolean }
  | { kind: "error"; message: string };

interface SelectedTextPayload {
  text: string;
  usedFallback: boolean;
  captureMethod: "ui_automation" | "clipboard_fallback" | "failed";
  captureFailedNoFallback: boolean;
}

function PopupApp() {
  const [state, setState] = useState<PopupState>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const requestId = useRef(0);
  const [copyError, setCopyError] = useState("");

  useEffect(() => {
    const unlistenPromise = listen<SelectedTextPayload>("selected-text", (event) => {
      void runTranslation(event.payload.text, event.payload.usedFallback, event.payload.captureFailedNoFallback);
    });
    return () => {
      requestId.current += 1;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  async function runTranslation(rawText: string, usedFallback: boolean, noFallback: boolean) {
    const currentRequest = ++requestId.current;
    const text = rawText.trim();
    setCopied(false);
    setCopyError("");

    if (!text) {
      setState({ kind: "empty", noFallback });
      return;
    }

    setState({ kind: "loading" });

    try {
      const settings = await loadSettings();
      if (currentRequest !== requestId.current) return;
      const effectiveTarget = settings.autoDetectDirection
        ? autoTargetLanguage(text, settings.targetLanguage)
        : settings.targetLanguage;
      const result = await translateWithSettings(settings, text, settings.sourceLanguage, effectiveTarget);
      if (currentRequest !== requestId.current) return;

      setState({ kind: "success", text: result.translatedText, usedFallback });

      if (settings.autoCopyResult) {
        try {
          await writeText(result.translatedText);
          if (currentRequest === requestId.current) setCopied(true);
        } catch {
          if (currentRequest === requestId.current) setCopyError("התרגום הושלם, אך ההעתקה ללוח נכשלה.");
        }
      }
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      const message = err instanceof TranslationError ? err.message : "אירעה שגיאה לא צפויה בתרגום. נסה שוב.";
      setState({ kind: "error", message });
    }
  }

  async function handleCopy() {
    if (state.kind !== "success") return;
    try {
      await writeText(state.text);
      setCopied(true);
      setCopyError("");
    } catch { setCopyError("ההעתקה ללוח נכשלה. נסה שוב."); }
  }

  async function handleClose() {
    requestId.current += 1;
    setState({ kind: "idle" });
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
        {state.kind === "empty" &&
          (state.noFallback ? (
            <p className="popup__error">
              לא הצלחתי לקרוא את הטקסט המסומן באפליקציה הזו. אפשר להפעיל fallback ללוח בהגדרות.
            </p>
          ) : (
            <p className="popup__error">לא נמצא טקסט מסומן לתרגום. סמן טקסט ונסה שוב.</p>
          ))}
        {state.kind === "error" && <p className="popup__error">{state.message}</p>}
        {state.kind === "success" && (
          <>
            <p className="popup__result" dir="auto">{state.text}</p>
            {state.usedFallback && (
              <p className="popup__hint">הטקסט תורגם מהלוח כי הלוח לא השתנה.</p>
            )}
            {copied && <p className="popup__copied">הועתק ללוח ✓</p>}
          </>
        )}
      </div>

      {copyError && <p role="status" className="popup__error">{copyError}</p>}

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
