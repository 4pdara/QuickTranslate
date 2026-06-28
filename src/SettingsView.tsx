import { useEffect, useState } from "react";
import type { AppSettings } from "./lib/settings/types";
import { providers, getEffectiveServerUrl } from "./lib/translation/registry";
import type { TranslationProvider } from "./lib/translation/types";
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from "./lib/languages";
import { getVersion } from "@tauri-apps/api/app";

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onBack: () => void;
}

type ConnectionStatus = "idle" | "testing" | "ok" | "error";

function ProviderCard({
  provider,
  selected,
  settings,
  onSelect,
  onUpdateSettings,
}: {
  provider: TranslationProvider;
  selected: boolean;
  settings: AppSettings;
  onSelect: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
}) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");

  const apiKey = settings.providerApiKeys[provider.id] ?? "";
  const serverUrl = settings.providerServerUrls[provider.id] ?? "";

  async function handleTest() {
    setStatus("testing");
    try {
      const ok = await provider.testConnection(apiKey, getEffectiveServerUrl(provider, settings));
      setStatus(ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={`provider-card ${selected ? "provider-card--selected" : ""}`}>
      <label className="provider-card__header">
        <input type="radio" name="provider" checked={selected} onChange={onSelect} />
        <span className="provider-card__label">{provider.label}</span>
        {provider.category === "experimental" && <span className="badge badge--experimental">ניסיוני</span>}
        {provider.category === "advanced" && <span className="badge badge--advanced">בתשלום</span>}
      </label>

      {provider.note && (
        <p className={provider.category === "experimental" ? "provider-warning" : "provider-card__note"}>
          {provider.note}
        </p>
      )}

      {selected && (
        <div className="provider-card__body">
          {provider.supportsServerUrl && (
            <div className="field">
              <label className="field__label" htmlFor={`server-url-${provider.id}`}>
                כתובת שרת
              </label>
              <input
                id={`server-url-${provider.id}`}
                type="text"
                value={serverUrl}
                placeholder={provider.defaultServerUrl ?? "https://..."}
                onChange={(e) =>
                  onUpdateSettings({
                    providerServerUrls: { ...settings.providerServerUrls, [provider.id]: e.target.value },
                  })
                }
              />
            </div>
          )}

          {provider.requiresApiKey && (
            <div className="field">
              <label className="field__label" htmlFor={`api-key-${provider.id}`}>
                מפתח API
              </label>
              <div className="input-with-action">
                <input
                  id={`api-key-${provider.id}`}
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  placeholder="הדבק כאן את מפתח ה-API"
                  onChange={(e) =>
                    onUpdateSettings({
                      providerApiKeys: { ...settings.providerApiKeys, [provider.id]: e.target.value },
                    })
                  }
                />
                <button type="button" className="secondary" onClick={() => setShowApiKey((v) => !v)}>
                  {showApiKey ? "הסתר" : "הצג"}
                </button>
              </div>
            </div>
          )}

          <div className="input-with-action">
            <button type="button" className="secondary" onClick={() => void handleTest()}>
              בדוק חיבור
            </button>
            {status === "testing" && <span className="status-line">בודק…</span>}
            {status === "ok" && <span className="status-line status-line--ok">החיבור תקין ✓</span>}
            {status === "error" && <span className="status-line status-line--error">החיבור נכשל.</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView({ settings, onUpdateSettings, onBack }: SettingsViewProps) {
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion(""));
  }, []);

  const freeProviders = providers.filter((p) => p.category === "free" || p.category === "experimental");
  const advancedProviders = providers.filter((p) => p.category === "advanced");

  return (
    <div className="settings">
      <button type="button" className="back-button" onClick={onBack}>
        → חזרה למתרגם
      </button>

      <section className="card">
        <h2 className="card__title">ספק תרגום — חינמי / קוד פתוח</h2>
        {freeProviders.map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            selected={settings.selectedProvider === p.id}
            settings={settings}
            onSelect={() => onUpdateSettings({ selectedProvider: p.id })}
            onUpdateSettings={onUpdateSettings}
          />
        ))}
      </section>

      <details className="card">
        <summary className="card__title card__title--summary">ספקים מתקדמים (בתשלום)</summary>
        {advancedProviders.map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            selected={settings.selectedProvider === p.id}
            settings={settings}
            onSelect={() => onUpdateSettings({ selectedProvider: p.id })}
            onUpdateSettings={onUpdateSettings}
          />
        ))}
      </details>

      <section className="card">
        <h2 className="card__title">שפות וזיהוי כיוון</h2>

        <div className="checkbox-row">
          <input
            id="auto-detect-direction"
            type="checkbox"
            checked={settings.autoDetectDirection}
            onChange={(e) => onUpdateSettings({ autoDetectDirection: e.target.checked })}
          />
          <label htmlFor="auto-detect-direction">זיהוי אוטומטי: טקסט בעברית יתורגם לאנגלית ולהפך</label>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="source-lang">
            שפת מקור (ברירת מחדל)
          </label>
          <select
            id="source-lang"
            value={settings.sourceLanguage}
            onChange={(e) => onUpdateSettings({ sourceLanguage: e.target.value })}
          >
            {SOURCE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="target-lang">
            שפת יעד (ברירת מחדל)
          </label>
          <select
            id="target-lang"
            value={settings.targetLanguage}
            onChange={(e) => onUpdateSettings({ targetLanguage: e.target.value })}
          >
            {TARGET_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">קיצור מקשים והתנהגות</h2>

        <div className="field">
          <label className="field__label" htmlFor="shortcut-input">
            קיצור מקשים גלובלי
          </label>
          <input
            id="shortcut-input"
            type="text"
            value={settings.globalShortcut}
            onChange={(e) => onUpdateSettings({ globalShortcut: e.target.value })}
          />
          <span className="field__hint">לדוגמה: Ctrl+Shift+T. דורש הפעלה מחדש של האפליקציה כדי לחול.</span>
        </div>

        <div className="checkbox-row">
          <input
            id="auto-copy"
            type="checkbox"
            checked={settings.autoCopyResult}
            onChange={(e) => onUpdateSettings({ autoCopyResult: e.target.checked })}
          />
          <label htmlFor="auto-copy">העתק אוטומטית את התרגום ללוח</label>
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">לכידת טקסט מסומן</h2>
        <p className="field__hint">
          ב-Windows לא כל אפליקציה מאפשרת לקרוא טקסט מסומן ישירות. במקומות שלא תומכים
          בזה, אפשר להפעיל fallback ללוח ההעתקה.
        </p>

        <div className="checkbox-row">
          <input
            id="capture-without-clipboard"
            type="checkbox"
            checked={settings.captureSelectedTextWithoutClipboard}
            onChange={(e) => onUpdateSettings({ captureSelectedTextWithoutClipboard: e.target.checked })}
          />
          <label htmlFor="capture-without-clipboard">נסה לקרוא טקסט מסומן בלי להשתמש בלוח</label>
        </div>
        <span className="field__hint">
          התוכנה תנסה לקרוא את הטקסט המסומן ישירות מהאפליקציה הפעילה, בלי לשנות את לוח
          ההעתקה.
        </span>

        <div className="checkbox-row checkbox-row--spaced">
          <input
            id="allow-clipboard-fallback"
            type="checkbox"
            checked={settings.allowClipboardFallbackForSelectedText}
            onChange={(e) => onUpdateSettings({ allowClipboardFallbackForSelectedText: e.target.checked })}
          />
          <label htmlFor="allow-clipboard-fallback">אם לא הצליח — השתמש בלוח ההעתקה</label>
        </div>
        <span className="field__hint">
          כאשר קריאה ישירה של הטקסט המסומן נכשלת, התוכנה תוכל להשתמש בשיטת Ctrl+C. זה
          יכול לשנות את הלוח ולכן כבוי כברירת מחדל.
        </span>

        {settings.allowClipboardFallbackForSelectedText && (
          <div className="nested-option">
            <div className="checkbox-row">
              <input
                id="allow-unchanged-clipboard"
                type="checkbox"
                checked={settings.allowUnchangedClipboardFallback}
                onChange={(e) => onUpdateSettings({ allowUnchangedClipboardFallback: e.target.checked })}
              />
              <label htmlFor="allow-unchanged-clipboard">תרגם גם אם הלוח לא השתנה</label>
            </div>
            <span className="field__hint">
              אם קיצור המקשים לא הצליח לזהות שינוי בלוח, התוכנה תתרגם את הטקסט שכבר נמצא
              בלוח. שימושי למי שמעתיק טקסט לפני התרגום.
            </span>
          </div>
        )}
      </section>

      <section className="privacy-note">
        הטקסט שאתם מתרגמים נשלח ישירות לספק התרגום שבחרתם בלבד (כולל כתובת שרת מותאמת
        שתזינו), ולשום מקום אחר. מפתחות ה-API נשמרים במכשיר שלכם בלבד ולא נרשמים ביומן
        (log) של האפליקציה. ספקים ללא מפתח API (כמו "Google ללא API" או Lingva) שולחים
        את הטקסט לשירות חיצוני ציבורי שאינו בשליטתנו.
      </section>

      <section className="about-note">
        <p>QuickTranslate{appVersion ? ` — גרסה ${appVersion}` : ""}</p>
      </section>
    </div>
  );
}

export default SettingsView;
