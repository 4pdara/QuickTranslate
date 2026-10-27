import { useEffect, useRef, useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { AppSettings } from "./lib/settings/types";
import { getProvider, isProviderConfigured } from "./lib/translation/registry";
import { translateWithSettings } from "./lib/translation/translate";
import { TranslationError } from "./lib/translation/types";
import { autoTargetLanguage } from "./lib/scriptDetect";
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from "./lib/languages";

interface TranslatorViewProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onOpenSettings: () => void;
}

function TranslatorView({ settings, onUpdateSettings, onOpenSettings }: TranslatorViewProps) {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const requestId = useRef(0);
  const [copyError, setCopyError] = useState("");

  useEffect(() => () => { requestId.current += 1; }, []);

  function cancelPending() {
    requestId.current += 1;
    setIsLoading(false);
    setCopied(false);
    setCopyError("");
  }

  const provider = getProvider(settings.selectedProvider);
  const configured = provider ? isProviderConfigured(provider, settings) : false;

  async function handleTranslate() {
    const currentRequest = ++requestId.current;
    const text = sourceText.trim();
    setCopied(false);
    setCopyError("");

    if (!text) {
      setError("יש להקליד או להדביק טקסט לתרגום.");
      setTranslatedText("");
      return;
    }

    const effectiveTarget = settings.autoDetectDirection
      ? autoTargetLanguage(text, settings.targetLanguage)
      : settings.targetLanguage;

    if (effectiveTarget !== settings.targetLanguage) {
      onUpdateSettings({ targetLanguage: effectiveTarget });
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await translateWithSettings(settings, text, settings.sourceLanguage, effectiveTarget);
      if (currentRequest !== requestId.current) return;
      setTranslatedText(result.translatedText);
      if (settings.autoCopyResult) {
        try {
          await writeText(result.translatedText);
          if (currentRequest === requestId.current) setCopied(true);
        } catch {
          if (currentRequest === requestId.current) setCopyError("התרגום הושלם, אך ההעתקה ללוח נכשלה. אפשר לנסות שוב.");
        }
      }
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      const message = err instanceof TranslationError ? err.message : "אירעה שגיאה לא צפויה בתרגום. נסה שוב.";
      setError(message);
      setTranslatedText("");
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }

  function handleSwap() {
    cancelPending();
    if (settings.sourceLanguage === "auto") return;
    onUpdateSettings({ sourceLanguage: settings.targetLanguage, targetLanguage: settings.sourceLanguage });
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  }

  async function handleCopy() {
    if (!translatedText) return;
    try {
      await writeText(translatedText);
      setCopied(true);
      setCopyError("");
    } catch { setCopyError("ההעתקה ללוח נכשלה. נסה שוב."); }
  }

  function handleClear() {
    cancelPending();
    setSourceText("");
    setTranslatedText("");
    setError(null);
    setCopied(false);
  }

  return (
    <div className="translator">
      {!configured && (
        <div className="banner">
          <span>כדי לתרגם צריך לבחור ספק תרגום בהגדרות.</span>
          <button type="button" className="banner__action" onClick={onOpenSettings}>
            פתח הגדרות
          </button>
        </div>
      )}

      <div className="lang-row">
        <select
          className="lang-select"
          value={settings.sourceLanguage}
          onChange={(e) => { cancelPending(); onUpdateSettings({ sourceLanguage: e.target.value }); }}
          aria-label="שפת מקור"
        >
          {SOURCE_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="swap-button"
          onClick={handleSwap}
          disabled={settings.sourceLanguage === "auto"}
          title={settings.sourceLanguage === "auto" ? "אי אפשר להחליף כשזיהוי השפה אוטומטי" : "החלף שפות"}
          aria-label="החלף שפות"
        >
          ⇄
        </button>

        <select
          className="lang-select"
          value={settings.targetLanguage}
          onChange={(e) => { cancelPending(); onUpdateSettings({ targetLanguage: e.target.value }); }}
          aria-label="שפת יעד"
        >
          {TARGET_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="panels">
        <div className="panel">
          <textarea
            aria-label="טקסט לתרגום"
            dir="auto"
            className="panel__textarea"
            placeholder="הקלידו או הדביקו טקסט לתרגום…"
            value={sourceText}
            onChange={(e) => { cancelPending(); setSourceText(e.target.value); }}
          />
        </div>
        <div className="panel panel--output">
          {isLoading ? (
            <p className="panel__hint">מתרגם…</p>
          ) : error ? (
            <p className="panel__error">{error}</p>
          ) : translatedText ? (
            <p className="panel__result" dir="auto">{translatedText}</p>
          ) : (
            <p className="panel__hint">התרגום יופיע כאן</p>
          )}
        </div>
      </div>

      <div className="actions-row">
        <button type="button" onClick={() => void handleTranslate()} disabled={isLoading}>
          תרגם
        </button>
        <button type="button" className="secondary" onClick={() => void handleCopy()} disabled={!translatedText}>
          {copied ? "הועתק ✓" : "העתק תרגום"}
        </button>
        <button type="button" className="secondary" onClick={handleClear}>
          נקה
        </button>
      </div>

      {copyError && <p role="status" className="panel__error">{copyError}</p>}
      <p className="shortcut-hint">אפשר גם לסמן טקסט בכל מקום במחשב וללחוץ {settings.globalShortcut}</p>
    </div>
  );
}

export default TranslatorView;
