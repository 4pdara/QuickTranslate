import { useState } from "react";

const BASE = import.meta.env.BASE_URL;
const GITHUB = "https://github.com/4pdara/QuickTranslate";
const RELEASES = `${GITHUB}/releases`;
const DL_BASE = `${GITHUB}/releases/download/v0.1.3`;
const DL_SETUP = `${DL_BASE}/QuickTranslate_0.1.3_x64-setup.exe`;
const DL_MSI = `${DL_BASE}/QuickTranslate_0.1.3_x64_en-US.msi`;
const DL_PORTABLE = `${DL_BASE}/QuickTranslate_0.1.3_portable.zip`;
const SHORTCUT = "Ctrl+Shift+T";

// דוגמאות טקסט מוכנות לתרגום אינטראקטיבי
interface DemoScenario {
  id: string;
  appTitle: string;
  appIcon: string;
  category: string;
  en: string;
  he: string;
  contextDesc: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "chrome",
    appTitle: "Google Chrome — TechCrunch",
    appIcon: "🌐",
    category: "דפדפן אינטרנט",
    en: "Deep learning models require optimized inference pipelines for low-latency desktop execution.",
    he: "מודלי למידה עמוקה דורשים צינורות הסקה מותאמים לביצועים מהירים בשולחן העבודה.",
    contextDesc: "קריאת מאמר מקצועי באנגלית בדפדפן"
  },
  {
    id: "vscode",
    appTitle: "Visual Studio Code — README.md",
    appIcon: "💻",
    category: "סביבת פיתוח (IDE)",
    en: "QuickTranslate is built with Tauri, Rust, and React for minimal memory overhead and ultra-fast startup.",
    he: "QuickTranslate בנויה עם Tauri, Rust ו-React לצריכת זיכרון מינימלית והפעלה סופר-מהירה.",
    contextDesc: "בדיקת תיעוד וקוד מקור"
  },
  {
    id: "outlook",
    appTitle: "Microsoft Outlook — לקוח עסקי",
    appIcon: "✉️",
    category: "דוא״ל ותקשורת",
    en: "Thank you for your prompt response. We would like to schedule a product demonstration next week.",
    he: "תודה על המענה המהיר שלך. נשמח לתאם הדגמת מוצר בשבוע הבא.",
    contextDesc: "מענה למיילים מלקוחות וספקים מחו״ל"
  },
  {
    id: "pdf",
    appTitle: "Adobe Acrobat — מסמך טכני PDF",
    appIcon: "📄",
    category: "מסמך PDF / Word",
    en: "This software is distributed under the MIT license without any telemetry or remote data collection.",
    he: "תוכנה זו מופצת תחת רישיון MIT ללא שום טלמטריה או איסוף נתונים מרחוק.",
    contextDesc: "עיון במסמכים ומפרטים טכניים"
  }
];

// מילון מובנה עשיר להדמיה חיה מיידית ללא השהייה
const QUICK_DICT: Record<string, string> = {
  "hello world": "שלום עולם",
  "speed and simplicity": "מהירות ופשטות",
  "artificial intelligence": "בינה מלאכותית",
  "break a leg": "בהצלחה רבה (שבור רגל)",
  "open source": "קוד פתוח",
  "machine learning": "למידת מכונה",
  "desktop application": "אפליקציית שולחן עבודה",
  "privacy first": "פרטיות במקום הראשון",
  "good morning": "בוקר טוב",
  "thank you very much": "תודה רבה",
  "welcome to quicktranslate": "ברוכים הבאים ל-QuickTranslate",
  "fastest desktop translation": "תרגום שולחן העבודה המהיר ביותר"
};

// ==================== רכיב ניווט עליון ====================
function Navbar() {
  return (
    <header className="nav">
      <div className="container nav__inner">
        <a href="#" className="nav__logo" aria-label="QuickTranslate — דף הבית">
          <img src={`${BASE}brand/quicktranslate-logo.png`} alt="QuickTranslate Logo" className="nav__logo-img" />
          <span className="nav__version-pill">v0.1.3 קומפקטי</span>
        </a>

        <nav className="nav__links" aria-label="ניווט ראשי">
          <a href="#simulator">הדמיה אינטראקטיבית</a>
          <a href="#screenshots">צילומי מסך מהתוכנה</a>
          <a href="#features">יתרונות</a>
          <a href="#how">איך זה עובד</a>
          <a href="#comparison">השוואת ביצועים</a>
          <a href="#download">הורדה</a>
          <a href="#faq">שאלות</a>
        </nav>

        <div className="nav__actions">
          <a href={GITHUB} target="_blank" rel="noopener noreferrer" className="btn btn-github-nav" title="קוד מקור ב-GitHub">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span>GitHub</span>
          </a>
          <a href="#download" className="btn btn-primary-nav">
            ⬇ הורדה חינם
          </a>
        </div>
      </div>
    </header>
  );
}

// ==================== אזור Hero הראשי ====================
function Hero() {
  return (
    <section className="hero">
      <div className="hero__background-glow" aria-hidden="true" />
      <div className="container hero__content">
        <div className="hero__badge">
          <span className="hero__badge-pulse" />
          <span>QuickTranslate Desktop v0.1.3 · עיצוב קומפקטי · Windows 10 & 11</span>
        </div>

        <h1 className="hero__title">
          תרגום מיידי מכל מקום במחשב<br />
          <span className="hero__gradient-text">בדיוק כשאתם צריכים אותו</span>
        </h1>

        <p className="hero__subtitle">
          סמנו טקסט בכל אפליקציה — בדפדפן, בוורד, בקוד או במייל — לחצו על קיצור המקשים 
          <span className="shortcut-inline">{SHORTCUT}</span> 
          וקבלו תרגום מיידי בחלונית אלגנטית, בלי לפתוח דפדפן ובלי להעתיק ידנית.
        </p>

        <div className="hero__actions">
          <a href={DL_SETUP} className="btn btn-hero-primary" download>
            <span className="btn-icon">⬇</span>
            <div className="btn-hero-text">
              <span className="btn-hero-main">הורדה חינם ל-Windows</span>
              <span className="btn-hero-sub">קובץ התקנה Setup.exe · פחות מ-4MB</span>
            </div>
          </a>

          <a href="#simulator" className="btn btn-hero-secondary">
            <span className="btn-icon">▶</span>
            <span>צפו בהדמיה אינטראקטיבית</span>
          </a>
        </div>

        <div className="hero__pill-strip">
          <div className="pill-item">⚡ <strong>0 השהייה</strong> — פופאפ תרגום צף מיידי</div>
          <div className="pill-item">🔒 <strong>100% פרטי</strong> — ללא חשבון וללא טלמטריה</div>
          <div className="pill-item">🆓 <strong>קוד פתוח</strong> — חופשי לשימוש אישי ועסקי</div>
          <div className="pill-item">🪶 <strong>Tauri + Rust</strong> — צריכת זיכרון אפסית (~15MB)</div>
        </div>
      </div>
    </section>
  );
}

// ==================== הדמיה אינטראקטיבית זזה של פעולת התוכנה ====================
function InteractiveSimulator() {
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario>(DEMO_SCENARIOS[0]);
  const [isKeyPressed, setIsKeyPressed] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [customText, setCustomText] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  // אנימציה אוטומטית בעת החלפת תרחיש
  function triggerAnimation(scenario: DemoScenario) {
    setSelectedScenario(scenario);
    setIsCustomMode(false);
    setIsPopupVisible(false);
    setIsKeyPressed(false);
    setCopied(false);

    // שלב 1: הדגשת טקסט
    setTimeout(() => {
      // שלב 2: לחיצה על המקלדת
      setIsKeyPressed(true);
      setTimeout(() => {
        setIsKeyPressed(false);
        // שלב 3: הפופאפ נפתח
        setIsPopupVisible(true);
      }, 550);
    }, 400);
  }

  function handleCopy() {
    const textToCopy = isCustomMode ? (QUICK_DICT[customText.toLowerCase()] || "תרגום: " + customText) : selectedScenario.he;
    navigator.clipboard?.writeText?.(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const currentSource = isCustomMode ? customText : selectedScenario.en;
  const currentTarget = isCustomMode 
    ? (QUICK_DICT[customText.trim().toLowerCase()] || "תרגום מיידי: " + customText)
    : selectedScenario.he;

  return (
    <section className="section section--simulator" id="simulator">
      <div className="container">
        <div className="section__header">
          <div className="section__eyebrow">הדמיה אינטראקטיבית חיה</div>
          <h2 className="section__title">איך זה מרגיש במחשב שלך?</h2>
          <p className="section__subtitle">
            נסו בעצמכם! בחרו תרחיש שימוש או הקלידו טקסט, וראו כיצד QuickTranslate צצה מעל האפליקציה ומציגה תרגום מיידי.
          </p>
        </div>

        {/* בחירת תרחיש */}
        <div className="scenario-selector" role="tablist">
          {DEMO_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              role="tab"
              aria-selected={selectedScenario.id === sc.id && !isCustomMode}
              className={`scenario-btn ${selectedScenario.id === sc.id && !isCustomMode ? "active" : ""}`}
              onClick={() => triggerAnimation(sc)}
            >
              <span className="scenario-btn-icon">{sc.appIcon}</span>
              <div className="scenario-btn-info">
                <span className="scenario-btn-title">{sc.category}</span>
                <span className="scenario-btn-app">{sc.appTitle.split("—")[0]}</span>
              </div>
            </button>
          ))}
        </div>

        {/* חלון המחשב המדומה */}
        <div className="desktop-canvas">
          {/* סרגל עליון של האפליקציה המארחת */}
          <div className="app-window-frame">
            <div className="window-titlebar">
              <div className="window-dots">
                <span className="dot dot--red" />
                <span className="dot dot--yellow" />
                <span className="dot dot--green" />
              </div>
              <div className="window-title-text">
                <span className="window-app-icon">{selectedScenario.appIcon}</span>
                <span>{selectedScenario.appTitle}</span>
              </div>
              <div className="window-meta-tag">{selectedScenario.contextDesc}</div>
            </div>

            {/* תוכן האפליקציה עם הטקסט המסומן */}
            <div className="window-viewport">
              <div className="fake-article">
                <div className="fake-article-meta">
                  <div className="fake-avatar" />
                  <div className="fake-lines">
                    <span className="fake-line fake-line--short" />
                    <span className="fake-line fake-line--micro" />
                  </div>
                </div>

                <p className="fake-paragraph">
                  During daily workflow on Windows, developers and power users encounter documentation, technical issues, and foreign correspondence. 
                  <span className="highlighted-text-selection">
                    {currentSource}
                    <span className="selection-cursor-pulse" />
                  </span>
                  {" "}Working efficiently without switching browser tabs saves valuable minutes every hour.
                </p>

                {/* חלונית הקיצור המוקפץ */}
                <div className="keyboard-trigger-bar">
                  <span className="keyboard-hint">קיצור המקשים שנלחץ:</span>
                  <div className={`keycap-group ${isKeyPressed ? "keycap-group--active" : ""}`}>
                    <span className="keycap">Ctrl</span>
                    <span className="keycap-plus">+</span>
                    <span className="keycap">Shift</span>
                    <span className="keycap-plus">+</span>
                    <span className="keycap keycap--accent">T</span>
                  </div>
                  <button 
                    className="btn-replay"
                    onClick={() => triggerAnimation(selectedScenario)}
                    title="הפעל אנימציה מחדש"
                  >
                    🔄 שחזר פעולה
                  </button>
                </div>
              </div>

              {/* הפופאפ הצף של QuickTranslate */}
              <div className={`quicktranslate-popup-sim ${isPopupVisible ? "quicktranslate-popup-sim--visible" : ""}`}>
                <div className="popup-header">
                  <div className="popup-brand">
                    <img src={`${BASE}brand/quicktranslate-app-icon.png`} alt="" className="popup-icon" />
                    <strong>QuickTranslate</strong>
                    <span className="popup-provider-badge">Google Translate ✓</span>
                  </div>
                  <div className="popup-controls">
                    <span className="popup-esc-hint">ESC לסגירה</span>
                    <button className="popup-close-x" onClick={() => setIsPopupVisible(false)}>×</button>
                  </div>
                </div>

                <div className="popup-body">
                  <div className="popup-field popup-field--source">
                    <div className="field-tag">אנגלית (מקור שסומן)</div>
                    <div className="field-content">{currentSource}</div>
                  </div>

                  <div className="popup-divider">
                    <span className="divider-arrow">▼</span>
                  </div>

                  <div className="popup-field popup-field--target">
                    <div className="field-tag field-tag--target">עברית (תרגום מהיר)</div>
                    <div className="field-content field-content--hebrew">
                      {currentTarget}
                    </div>
                  </div>
                </div>

                <div className="popup-footer">
                  <button 
                    className={`btn-popup-copy ${copied ? "btn-popup-copy--copied" : ""}`}
                    onClick={handleCopy}
                  >
                    {copied ? "✓ הועתק ללוח!" : "📋 העתק תרגום"}
                  </button>
                  <span className="popup-auto-copy-label">העתקה אוטומטית פעילה</span>
                  <div className="popup-footer-actions">
                    <button className="btn-popup-icon" title="פתח חלון מלא">⛶</button>
                    <button className="btn-popup-icon" title="הגדרות">⚙</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* אפשרות להתנסות עם טקסט חופשי */}
        <div className="live-tester-card">
          <div className="live-tester-header">
            <span className="live-tester-icon">💡</span>
            <div>
              <strong>רוצים לנסות טקסט אחר בהדמיה?</strong>
              <p>הקלידו ביטוי באנגלית או בחרו מטה וראו כיצד הפופאפ יתרגם אותו מיד:</p>
            </div>
          </div>
          <div className="live-tester-chips">
            {Object.keys(QUICK_DICT).slice(0, 6).map((phrase) => (
              <button 
                key={phrase} 
                className="chip-btn"
                onClick={() => {
                  setCustomText(phrase);
                  setIsCustomMode(true);
                  setIsPopupVisible(true);
                }}
              >
                "{phrase}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== צילומי מסך מהתוכנה (Showcase & Deep Dives) ====================
function SoftwareScreenshots() {
  const [activeTab, setActiveTab] = useState<"main" | "popup" | "settings" | "tray">("main");

  return (
    <section className="section section--alt" id="screenshots">
      <div className="container">
        <div className="section__header">
          <div className="section__eyebrow">צילומי מסך והדגמות מתוך האפליקציה</div>
          <h2 className="section__title">ממשק נקי, מהיר ואינטואיטיבי</h2>
          <p className="section__subtitle">
            עוצב במיוחד עבור סביבת Windows 10 ו-11 — פריסה מימין לשמאל (RTL), ניגודיות גבוהה, ותמיכה מלאה בכל אפליקציה.
          </p>
        </div>

        {/* כפתורי מעבר בין מסכים */}
        <div className="screenshot-tabs" role="tablist">
          <button 
            role="tab"
            aria-selected={activeTab === "main"}
            className={`screenshot-tab-btn ${activeTab === "main" ? "active" : ""}`}
            onClick={() => setActiveTab("main")}
          >
            🪟 חלון התרגום הראשי
          </button>
          <button 
            role="tab"
            aria-selected={activeTab === "popup"}
            className={`screenshot-tab-btn ${activeTab === "popup" ? "active" : ""}`}
            onClick={() => setActiveTab("popup")}
          >
            💬 פופאפ צף מהיר (Popup)
          </button>
          <button 
            role="tab"
            aria-selected={activeTab === "settings"}
            className={`screenshot-tab-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            ⚙️ מסך הגדרות וספקים
          </button>
          <button 
            role="tab"
            aria-selected={activeTab === "tray"}
            className={`screenshot-tab-btn ${activeTab === "tray" ? "active" : ""}`}
            onClick={() => setActiveTab("tray")}
          >
            🛎️ מגש המערכת (System Tray)
          </button>
        </div>

        {/* תצוגת המסך הפעיל */}
        <div className="screenshot-display-area">
          {activeTab === "main" && (
            <div className="mock-window-card">
              <div className="mock-window-header">
                <div className="mock-window-title">
                  <img src={`${BASE}brand/quicktranslate-app-icon.png`} alt="" className="mock-app-icon" />
                  <strong>QuickTranslate — תרגום מהיר</strong>
                  <span className="badge-pill">חלון ראשי</span>
                </div>
                <div className="mock-window-buttons">
                  <span className="win-btn">─</span>
                  <span className="win-btn">□</span>
                  <span className="win-btn win-btn--close">✕</span>
                </div>
              </div>

              <div className="mock-window-body">
                {/* סרגל כלי תרגום עליון */}
                <div className="mock-toolbar">
                  <div className="mock-lang-selectors">
                    <div className="mock-select-box">
                      <span className="mock-label">שפת מקור</span>
                      <strong>אנגלית (Auto-Detect)</strong>
                    </div>
                    <button className="mock-swap-btn" title="החלף שפות">⇄</button>
                    <div className="mock-select-box">
                      <span className="mock-label">שפת יעד</span>
                      <strong>עברית (Hebrew)</strong>
                    </div>
                  </div>

                  <div className="mock-provider-status">
                    <span className="provider-dot" />
                    <span>Google Translate (גרסה חופשית ללא צורך במפתח)</span>
                  </div>
                </div>

                {/* שני פאנלים של תרגום */}
                <div className="mock-panels-grid">
                  <div className="mock-panel mock-panel--input">
                    <div className="mock-panel-header">
                      <span>טקסט מקור</span>
                      <span className="mock-char-counter">64 תווים</span>
                    </div>
                    <div className="mock-panel-text">
                      The software operates natively on Windows with zero background telemetry.
                    </div>
                    <div className="mock-panel-actions">
                      <button className="btn-mock-sec">🗑 נקה</button>
                    </div>
                  </div>

                  <div className="mock-panel mock-panel--output">
                    <div className="mock-panel-header">
                      <span>תרגום</span>
                      <span className="badge-ready">מוכן ✓</span>
                    </div>
                    <div className="mock-panel-text mock-panel-text--target">
                      התוכנה פועלת באופן טבעי ב-Windows ללא שום טלמטריה ברקע.
                    </div>
                    <div className="mock-panel-actions">
                      <button className="btn-mock-primary">📋 העתק תרגום</button>
                    </div>
                  </div>
                </div>

                {/* סרגל פעולות תחתון */}
                <div className="mock-window-footer">
                  <button className="btn-mock-action-main">⚡ תרגם עכשיו (Enter)</button>
                  <span className="mock-footer-hint">קיצור דרך גלובלי פעיל: <strong>Ctrl+Shift+T</strong></span>
                  <button className="btn-mock-gear">⚙ הגדרות</button>
                </div>
              </div>

              {/* נקודות עניין מוסברות */}
              <div className="feature-callouts">
                <div className="callout-item">
                  <span className="callout-number">1</span>
                  <div>
                    <strong>זיהוי כיוון אוטומטי</strong>
                    <p>מקלידים בעברית? האפליקציה מזהה אוטומטית ומתרגמת לאנגלית ולהיפך.</p>
                  </div>
                </div>
                <div className="callout-item">
                  <span className="callout-number">2</span>
                  <div>
                    <strong>העתקה אוטומטית ללוח</strong>
                    <p>התרגום יכול לעבור ישירות ל-Clipboard שלכם ללא לחיצה נוספת.</p>
                  </div>
                </div>
                <div className="callout-item">
                  <span className="callout-number">3</span>
                  <div>
                    <strong>ספק חופשי מעודכן</strong>
                    <p>מנוע תרגום Google חופשי שאינו מצריך כרטיס אשראי או רישום מפתח API.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "popup" && (
            <div className="mock-window-card">
              <div className="mock-window-header">
                <div className="mock-window-title">
                  <img src={`${BASE}brand/quicktranslate-app-icon.png`} alt="" className="mock-app-icon" />
                  <strong>חלונית הפופאפ הצפה (Floating Mini-Window)</strong>
                  <span className="badge-pill">צף מעל כל חלון</span>
                </div>
              </div>

              <div className="mock-popup-container">
                <div className="mock-backdrop-sample">
                  <div className="sample-code-line"><span>const</span> client = <span>new</span> TranslationService();</div>
                  <div className="sample-code-line"><span className="highlight-sample">// Rapid desktop translation for active text selections</span></div>
                  <div className="sample-code-line">await client.translate(selectedText);</div>
                </div>

                <div className="mock-floating-box">
                  <div className="floating-header">
                    <span className="floating-title">QuickTranslate</span>
                    <span className="floating-badge">Ctrl+Shift+T</span>
                    <span className="floating-close">ESC</span>
                  </div>
                  <div className="floating-body">
                    <div className="floating-orig">Rapid desktop translation for active text selections</div>
                    <div className="floating-arrow">➜</div>
                    <div className="floating-trans">תרגום מהיר בשולחן העבודה עבור קטעי טקסט מסומנים</div>
                  </div>
                  <div className="floating-footer">
                    <span className="floating-copy-btn">✓ הועתק ללוח</span>
                    <span className="floating-tip">נעלם אוטומטית בעת לחיצה מחוץ לחלון</span>
                  </div>
                </div>
              </div>

              <div className="feature-callouts">
                <div className="callout-item">
                  <span className="callout-number">1</span>
                  <div>
                    <strong>ללא מעבר חלונות</strong>
                    <p>החלונית קופצת מעל החלון הפעיל מבלי לאבד את הפוקוס בעבודה שלכם.</p>
                  </div>
                </div>
                <div className="callout-item">
                  <span className="callout-number">2</span>
                  <div>
                    <strong>סגירה בלחיצה על ESC</strong>
                    <p>קראתם את התרגום? הקשה על מקש Escape או לחיצה מחוץ לחלונית סוגרת אותה מיידית.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="mock-window-card">
              <div className="mock-window-header">
                <div className="mock-window-title">
                  <img src={`${BASE}brand/quicktranslate-app-icon.png`} alt="" className="mock-app-icon" />
                  <strong>הגדרות מתקדמות וספקי תרגום</strong>
                  <span className="badge-pill">התאמה אישית מלאה</span>
                </div>
              </div>

              <div className="mock-settings-grid">
                <div className="mock-settings-section">
                  <h4>ספק תרגום נבחר</h4>
                  <div className="mock-radio-group">
                    <label className="mock-radio mock-radio--selected">
                      <input type="radio" checked readOnly />
                      <div>
                        <strong>Google Translate (ללא צורך ב-API)</strong>
                        <span>חינמי, מהיר, ללא הגדרות וללא עלות (ברירת מחדל)</span>
                      </div>
                    </label>
                    <label className="mock-radio">
                      <input type="radio" disabled />
                      <div>
                        <strong>DeepL API</strong>
                        <span>תרגום מקצועי ואיכותי בעזרת מפתח אישי של DeepL</span>
                      </div>
                    </label>
                    <label className="mock-radio">
                      <input type="radio" disabled />
                      <div>
                        <strong>Google Cloud Translation</strong>
                        <span>חיבור ישיר לחשבון ה-GCP הרשמי שלכם</span>
                      </div>
                    </label>
                    <label className="mock-radio">
                      <input type="radio" disabled />
                      <div>
                        <strong>LibreTranslate (שרת עצמי)</strong>
                        <span>פרטיות מרבית על שרת מקומי ללא שליחת מידע החוצה</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mock-settings-section">
                  <h4>העדפות התנהגות ומקלדת</h4>
                  <div className="mock-setting-row">
                    <span>קיצור מקשים גלובלי:</span>
                    <span className="shortcut-badge">Ctrl+Shift+T</span>
                  </div>
                  <div className="mock-setting-row">
                    <span>העתקה אוטומטית של התרגום ללוח:</span>
                    <span className="toggle-badge toggle-badge--on">פעיל ✓</span>
                  </div>
                  <div className="mock-setting-row">
                    <span>גיבוי לוח (Fallback לתוכנות שלא חושפות טקסט):</span>
                    <span className="toggle-badge toggle-badge--on">פעיל ✓</span>
                  </div>
                  <div className="mock-setting-row">
                    <span>הפעל ממוזער למגש המערכת (Tray):</span>
                    <span className="toggle-badge toggle-badge--on">פעיל ✓</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tray" && (
            <div className="mock-window-card">
              <div className="mock-window-header">
                <div className="mock-window-title">
                  <img src={`${BASE}brand/quicktranslate-app-icon.png`} alt="" className="mock-app-icon" />
                  <strong>פעולה חרישית במגש המערכת של Windows (Tray)</strong>
                  <span className="badge-pill">זמין 24/7 ללא עומס</span>
                </div>
              </div>

              <div className="mock-tray-container">
                <div className="mock-taskbar">
                  <div className="taskbar-apps">
                    <span className="taskbar-icon">🪟</span>
                    <span className="taskbar-icon">📁</span>
                    <span className="taskbar-icon">🌐</span>
                  </div>
                  <div className="taskbar-tray">
                    <span className="tray-icon">🔊</span>
                    <span className="tray-icon">📶</span>
                    <div className="tray-app-active" title="QuickTranslate פועל ברקע">
                      <img src={`${BASE}brand/quicktranslate-app-icon.png`} alt="" className="tray-qt-logo" />
                      <div className="tray-popup-menu">
                        <div className="tray-menu-header">QuickTranslate v0.1.3</div>
                        <div className="tray-menu-item">🪟 פתח חלון ראשי</div>
                        <div className="tray-menu-item">⚙ הגדרות תוכנה</div>
                        <div className="tray-menu-divider" />
                        <div className="tray-menu-item">⏸ השהה קיצור דרך</div>
                        <div className="tray-menu-item tray-menu-item--danger">✕ יציאה</div>
                      </div>
                    </div>
                    <span className="taskbar-clock">18:45</span>
                  </div>
                </div>
              </div>

              <div className="feature-callouts">
                <div className="callout-item">
                  <span className="callout-number">1</span>
                  <div>
                    <strong>אינו תופס מקום בסרגל המשימות</strong>
                    <p>כאשר אינכם משתמשים בו, הוא נח במגש השעון ואינו מפריע לסדר העבודה.</p>
                  </div>
                </div>
                <div className="callout-item">
                  <span className="callout-number">2</span>
                  <div>
                    <strong>תגובה במיקרו-שניות</strong>
                    <p>בזכות ארכיטקטורת Tauri + Rust, התוכנה מתעוררת מיד בלחיצה ללא השהיית עליה.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ==================== השוואת ביצועים מול פתרונות קיימים ====================
function ComparisonSection() {
  return (
    <section className="section section--comparison" id="comparison">
      <div className="container">
        <div className="section__header">
          <div className="section__eyebrow">מהירות ומשאבים</div>
          <h2 className="section__title">למה QuickTranslate מנצחת את הדפדפן?</h2>
          <p className="section__subtitle">
            השוואת ביצועים אמיתית מול פתיחת Google Translate ידנית בדפדפן או תוספים כבדים.
          </p>
        </div>

        <div className="benchmark-grid">
          {/* מהירות תרגום */}
          <div className="benchmark-card">
            <h3 className="benchmark-card-title">⏱️ זמן מהרגע שסימנת טקסט ועד שקיבלת תרגום</h3>
            
            <div className="benchmark-row highlight-winner">
              <div className="benchmark-label">
                <strong>QuickTranslate Desktop (Tauri)</strong>
                <span className="benchmark-badge">פי 40 יותר מהיר!</span>
              </div>
              <div className="benchmark-bar-wrapper">
                <div className="benchmark-bar benchmark-bar--qt" style={{width: "15%"}}>0.15 שניות ⚡</div>
              </div>
            </div>

            <div className="benchmark-row">
              <div className="benchmark-label">תוסף דפדפן (Chrome Extension)</div>
              <div className="benchmark-bar-wrapper">
                <div className="benchmark-bar benchmark-bar--ext" style={{width: "45%"}}>1.5 שניות</div>
              </div>
            </div>

            <div className="benchmark-row">
              <div className="benchmark-label">פתיחת Google Translate בדפדפן ידנית</div>
              <div className="benchmark-bar-wrapper">
                <div className="benchmark-bar benchmark-bar--manual" style={{width: "95%"}}>6.5 שניות (טאב חדש, העתקה, הדבקה)</div>
              </div>
            </div>
          </div>

          {/* צריכת זיכרון RAM */}
          <div className="benchmark-card">
            <h3 className="benchmark-card-title">🪶 צריכת זיכרון RAM ברקע</h3>
            
            <div className="benchmark-row highlight-winner">
              <div className="benchmark-label">
                <strong>QuickTranslate (Rust + Tauri)</strong>
                <span className="benchmark-badge">חיסכון של 94% בזיכרון</span>
              </div>
              <div className="benchmark-bar-wrapper">
                <div className="benchmark-bar benchmark-bar--qt" style={{width: "10%"}}>~15 MB RAM 🍃</div>
              </div>
            </div>

            <div className="benchmark-row">
              <div className="benchmark-label">אפליקציית Electron טיפוסית</div>
              <div className="benchmark-bar-wrapper">
                <div className="benchmark-bar benchmark-bar--ext" style={{width: "65%"}}>~160 MB RAM</div>
              </div>
            </div>

            <div className="benchmark-row">
              <div className="benchmark-label">טאב פתוח של דפדפן כרום</div>
              <div className="benchmark-bar-wrapper">
                <div className="benchmark-bar benchmark-bar--manual" style={{width: "100%"}}>~280 MB RAM</div>
              </div>
            </div>
          </div>
        </div>

        {/* טבלת השוואת פיצ'רים */}
        <div className="table-responsive">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>תכונה</th>
                <th className="highlight-col">QuickTranslate Desktop</th>
                <th>תוסף דפדפן</th>
                <th>אתר Google Translate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>עובד מחוץ לדפדפן (Word, VS Code, PDF, Outlook)</strong></td>
                <td className="highlight-col"><span className="icon-check">✓</span> כן, גלובלי בכל Windows</td>
                <td><span className="icon-x">✕</span> רק בתוך הדפדפן</td>
                <td><span className="icon-x">✕</span> רק באתר הדפדפן</td>
              </tr>
              <tr>
                <td><strong>קיצור מקשים גלובלי ישיר</strong></td>
                <td className="highlight-col"><span className="icon-check">✓</span> Ctrl+Shift+T</td>
                <td><span className="icon-partial">~</span> תלוי דפדפן פעיל</td>
                <td><span className="icon-x">✕</span> אין</td>
              </tr>
              <tr>
                <td><strong>העתקה אוטומטית ללוח</strong></td>
                <td className="highlight-col"><span className="icon-check">✓</span> מובנה ומוגדר</td>
                <td><span className="icon-partial">~</span> לפעמים</td>
                <td><span className="icon-x">✕</span> דורש לחיצה ידנית</td>
              </tr>
              <tr>
                <td><strong>פרטיות וקוד פתוח ללא פרסומות</strong></td>
                <td className="highlight-col"><span className="icon-check">✓</span> 100% קוד פתוח MIT</td>
                <td><span className="icon-x">✕</span> מעקב ופרסומות ברובם</td>
                <td><span className="icon-x">✕</span> מעקב Google</td>
              </tr>
              <tr>
                <td><strong>גודל התקנה כולל</strong></td>
                <td className="highlight-col"><span className="icon-check">✓</span> פחות מ-4MB</td>
                <td>משתנה (10-30MB)</td>
                <td>דורש דפדפן כבד</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ==================== 3 שלבים פשוטים ====================
function HowItWorks() {
  const steps = [
    {
      num: "1",
      icon: "🖱️",
      title: "סמנו טקסט בכל מקום",
      desc: "דפדפן, Word, קוד, הודעת שגיאה במסך או דוא״ל. פשוט מסמנים עם העכבר."
    },
    {
      num: "2",
      icon: "⌨️",
      title: "לחצו Ctrl + Shift + T",
      desc: "קיצור מקשים גלובלי שנלכד מכל תוכנה. אין צורך לעבור חלון או לפתוח טאב."
    },
    {
      num: "3",
      icon: "✨",
      title: "קבלו תרגום מיידי",
      desc: "חלונית צפה נפתחת לידכם עם התרגום המוכן. אפשר להעתיק בלחיצה או לסגור ב-ESC."
    }
  ];

  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section__header">
          <div className="section__eyebrow">פשוט ומהיר</div>
          <h2 className="section__title">איך זה עובד? ב-3 צעדים</h2>
          <p className="section__subtitle">ללא התקנות מסורבלות וללא צורך בהרשמה לחשבון.</p>
        </div>

        <div className="how-grid">
          {steps.map((st) => (
            <div key={st.num} className="how-card">
              <div className="how-badge">{st.num}</div>
              <div className="how-icon">{st.icon}</div>
              <h3 className="how-title">{st.title}</h3>
              <p className="how-desc">{st.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== יתרונות עיקריים ====================
function Features() {
  const feats = [
    {
      icon: "⚡",
      title: "מהירות תגובה עילאית",
      desc: "בנוי עם Rust ו-WebView2. קל משקל, מתעורר מיד ואינו מעמיס על המעבד או הזיכרון."
    },
    {
      icon: "🇮🇱",
      title: "תמיכה מושלמת בעברית (RTL)",
      desc: "עוצב במיוחד עבור השפה העברית — יישור טקסט תקני, פונטים מותאמים וזיהוי שפה חכם."
    },
    {
      icon: "🌐",
      title: "Google Translate חופשי ללא מפתח",
      desc: "גרסה v0.1.3 כוללת תמיכה משופרת בהעתקה מהירה בכל תוכנה ודפדפן, עיצוב קומפקטי ומנוע מעודכן לתרגום גוגל חופשי."
    },
    {
      icon: "🔒",
      title: "פרטיות מקומית מלאה",
      desc: "אין שרת מתווך, אין רישום, אין מעקב טלמטריה. מפתחות ה-API נשמרים מקומית בלבד."
    },
    {
      icon: "🧩",
      title: "מגוון ספקי תרגום",
      desc: "תמיכה מובנית ב-DeepL, Google Cloud Translation, LibreTranslate ו-Google Free."
    },
    {
      icon: "📋",
      title: "גיבוי לוח (Fallback Mode)",
      desc: "עובד גם באפליקציות מוגנות שאינן חושפות טקסט מסומן ישירות דרך מנגנון Clipboard חכם."
    }
  ];

  return (
    <section className="section section--alt" id="features">
      <div className="container">
        <div className="section__header">
          <div className="section__eyebrow">תכונות ויכולות</div>
          <h2 className="section__title">נבנה כדי להיות הכלי האולטימטיבי</h2>
          <p className="section__subtitle">כלי עבודה נקי, אמין ומהיר שמשתלב באופן טבעי בשגרת העבודה שלכם ב-Windows.</p>
        </div>

        <div className="features-cards-grid">
          {feats.map((f) => (
            <div key={f.title} className="feat-box">
              <div className="feat-box-icon">{f.icon}</div>
              <h3 className="feat-box-title">{f.title}</h3>
              <p className="feat-box-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== אזור הורדה ====================
function DownloadSection() {
  return (
    <section className="section section--download" id="download">
      <div className="container">
        <div className="download-cta-card">
          <div className="download-badge">גרסה חדשה v0.1.3 — קיצור מקשים אוניברסלי ומסך קומפקטי 🚀</div>
          <h2 className="download-title">הורידו את QuickTranslate בחינם</h2>
          <p className="download-sub">
            האפליקציה חופשית לחלוטין, קוד פתוח, ללא הרשמה וללא פרסומות. בחרו את פורמט ההתקנה המועדף עליכם:
          </p>

          <div className="download-grid">
            {/* Setup EXE */}
            <a href={DL_SETUP} className="dl-card dl-card--featured" download>
              <div className="dl-card-tag">מומלץ ביותר ⭐</div>
              <div className="dl-card-icon">⬇</div>
              <h3 className="dl-card-name">Windows Installer (.exe)</h3>
              <p className="dl-card-desc">התקנה פשוטה ומהירה עם קיצור דרך לשולחן העבודה וסרגל המשימות.</p>
              <span className="dl-card-btn">הורדת Installer (3.8 MB)</span>
            </a>

            {/* MSI */}
            <a href={DL_MSI} className="dl-card" download>
              <div className="dl-card-tag">ארגונים ו-IT</div>
              <div className="dl-card-icon">🏢</div>
              <h3 className="dl-card-name">MSI Package (.msi)</h3>
              <p className="dl-card-desc">חבילת התקנה סטנדרטית של Windows Installer המותאמת לפריסה ארגונית.</p>
              <span className="dl-card-btn">הורדת חבילת MSI</span>
            </a>

            {/* Portable ZIP */}
            <a href={DL_PORTABLE} className="dl-card" download>
              <div className="dl-card-tag">ללא התקנה</div>
              <div className="dl-card-icon">📦</div>
              <h3 className="dl-card-name">גרסה ניידת (.zip)</h3>
              <p className="dl-card-desc">הורד, חלץ והפעל מיד מכל תיקייה או דיסק-און-קי, ללא צורך בהרשאות מנהל.</p>
              <span className="dl-card-btn">הורדת ZIP נייד</span>
            </a>
          </div>

          <div className="download-meta-footer">
            <span>דורש Windows 10 או 11 (64-bit)</span>
            <span className="dot-sep">•</span>
            <a href={RELEASES} target="_blank" rel="noopener noreferrer">
              צפייה בכל הגרסאות ויומן השינויים ב-GitHub Releases ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==================== שאלות נפוצות (FAQ) ====================
function FAQ() {
  const faqs = [
    {
      q: "האם השימוש בתוכנה עולה כסף או דורש מנוי?",
      a: "לא. QuickTranslate היא תוכנה חינמית לחלוטין בקוד פתוח (MIT License). אין תשלומים, אין מנויים, ואין פרסומות."
    },
    {
      q: "האם אני צריך מפתח API כדי לתרגם?",
      a: "לא! ברירת המחדל באפליקציה היא ספק Google Translate חופשי שאינו מצריך שום מפתח או הרשמה. אם תרצו, תוכלו לחבר מפתח אישי של DeepL או Google Cloud בהגדרות."
    },
    {
      q: "האם התוכנה עובדת בכל אפליקציה במחשב?",
      a: "כן, ברוב המכריע של האפליקציות ב-Windows: דפדפנים (Chrome, Edge, Firefox), עורכי טקסט (Word, Notepad, VS Code), מסמכי PDF, תוכנות דוא״ל ועוד. עבור אפליקציות מיוחדות קיים מצב Fallback חכם ללוח."
    },
    {
      q: "מה קורה לטקסט שאני מתרגם? האם יש לכם גישה אליו?",
      a: "ממש לא! אין לנו שום שרת Backend. התוכנה פועלת באופן ישיר מהמחשב שלכם מול ספק התרגום שבחרתם. אין איסוף נתונים, אין שמירת היסטוריה בענן, ואין מעקב."
    },
    {
      q: "איך משנים את קיצור המקשים ברירת המחדל (Ctrl+Shift+T)?",
      a: "פשוט פותחים את מסך ההגדרות (Settings) מתוך האפליקציה או דרך מגש המערכת, ושם ניתן להגדיר כל שילוב מקשים שנוח לכם."
    }
  ];

  return (
    <section className="section section--alt" id="faq">
      <div className="container">
        <div className="section__header">
          <div className="section__eyebrow">יש שאלות? יש תשובות</div>
          <h2 className="section__title">שאלות נפוצות</h2>
        </div>

        <div className="faq-accordion">
          {faqs.map((f) => (
            <details key={f.q} className="faq-item">
              <summary className="faq-question">
                <span>{f.q}</span>
                <span className="faq-chevron">▼</span>
              </summary>
              <div className="faq-answer">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== Footer ====================
function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__container">
        <div className="footer__top">
          <div className="footer__brand-block">
            <div className="footer__logo">
              <img src={`${BASE}brand/quicktranslate-logo.png`} alt="QuickTranslate" className="footer__logo-img" />
            </div>
            <p className="footer__tagline">
              אפליקציית שולחן עבודה מודרנית וקלת משקל לתרגום מיידי של טקסט מסומן ב-Windows.
            </p>
          </div>

          <div className="footer__links-col">
            <h4>ניווט מהיר</h4>
            <a href="#simulator">הדמיה אינטראקטיבית</a>
            <a href="#screenshots">צילומי מסך מהתוכנה</a>
            <a href="#comparison">השוואת ביצועים</a>
            <a href="#download">הורדה חינם</a>
          </div>

          <div className="footer__links-col">
            <h4>קוד פתוח וקהילה</h4>
            <a href={GITHUB} target="_blank" rel="noopener noreferrer">GitHub Repository ↗</a>
            <a href={RELEASES} target="_blank" rel="noopener noreferrer">Release Notes ↗</a>
            <a href={`${GITHUB}/issues`} target="_blank" rel="noopener noreferrer">דיווח על תקלה (Issues) ↗</a>
            <a href={`${GITHUB}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">רישיון MIT ↗</a>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} QuickTranslate Desktop · קוד פתוח תחת רישיון MIT.</p>
          <p className="footer__disclaimer">
            מנוע Google Translate החופשי הינו שירות צד-שלישי. סימני המסחר של Google ו-Windows שייכים לבעליהם בהתאמה.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ==================== רכיב האפליקציה הראשי ====================
export default function App() {
  return (
    <div className="site-wrapper">
      <Navbar />
      <main>
        <Hero />
        <InteractiveSimulator />
        <SoftwareScreenshots />
        <ComparisonSection />
        <HowItWorks />
        <Features />
        <DownloadSection />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
