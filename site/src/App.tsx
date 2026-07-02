const BASE = import.meta.env.BASE_URL;
const GITHUB = "https://github.com/4pdara/QuickTranslate";
const RELEASES = `${GITHUB}/releases`;
const DL_BASE = `${GITHUB}/releases/download/v0.1.0`;
const DL_SETUP = `${DL_BASE}/QuickTranslate_0.1.0_x64-setup.exe`;
const DL_MSI = `${DL_BASE}/QuickTranslate_0.1.0_x64_en-US.msi`;
const DL_PORTABLE = `${DL_BASE}/QuickTranslate_0.1.0_portable.zip`;
const SHORTCUT = "Ctrl+Shift+T";

function Nav() {
  return (
    <nav className="nav" aria-label="ניווט ראשי">
      <div className="container nav__inner">
        <a href="#" className="nav__logo" aria-label="QuickTranslate — דף הבית">
          <img src={`${BASE}brand/quicktranslate-logo.png`} alt="QuickTranslate לוגו" className="nav__logo-img" />
          <span className="nav__logo-name sr-only">QuickTranslate</span>
        </a>
        <div className="nav__links" role="list">
          <a href="#features" role="listitem">יתרונות</a>
          <a href="#how" role="listitem">איך זה עובד</a>
          <a href="#download" role="listitem">הורדה</a>
          <a href="#faq" role="listitem">שאלות נפוצות</a>
          <a href={GITHUB} target="_blank" rel="noopener noreferrer" role="listitem">GitHub</a>
        </div>
        <div className="nav__cta">
          <a href="#download" className="btn btn-primary">הורדה</a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="hero" aria-label="כותרת ראשית">
      <div className="container">
        <div className="hero__eyebrow">Windows Desktop App · Tauri · חינמי וקוד פתוח</div>
        <h1 className="hero__title">
          QuickTranslate<br />
          <span>תרגום מהיר מכל מקום במחשב</span>
        </h1>
        <p className="hero__subtitle">
          סמנו טקסט, לחצו קיצור מקשים, וקבלו תרגום מיידי בחלונית קטנה ונוחה —
          בלי לפתוח דפדפן ובלי להעתיק ידנית.
        </p>
        <div className="hero__actions">
          <a href={DL_SETUP} className="btn btn-primary" aria-label="הורדת Windows Installer">
            ⬇ הורדה ל-Windows
          </a>
          <a href={GITHUB} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            צפייה בקוד ב-GitHub ↗
          </a>
        </div>
        <p className="hero__note">
          אפליקציית Desktop קלה מבוססת Tauri · Windows 10/11 · x64
        </p>
        <div className="hero__preview" aria-hidden="true">
          <div className="hero__window" role="presentation">
            <div className="hero__window-bar">
              <span className="hero__window-title">QuickTranslate — תרגום מהיר</span>
              <span className="hero__window-badge">Google Translate</span>
              <div className="hero__window-actions">
                <div className="hero__window-btn" aria-hidden="true">─</div>
                <div className="hero__window-btn" aria-hidden="true">⚙</div>
              </div>
            </div>
            <div className="hero__window-body">
              <div className="hero__panel">The quick brown fox jumps over the lazy dog.</div>
              <div className="hero__panel hero__panel--output">השועל החום המהיר קופץ מעל הכלב העצלן.</div>
            </div>
            <div className="hero__window-footer">
              <div className="hero__window-footer-btn hero__window-footer-btn--primary">תרגם</div>
              <div className="hero__window-footer-btn hero__window-footer-btn--sec">העתק תרגום</div>
              <div className="hero__window-footer-btn hero__window-footer-btn--sec">נקה</div>
              <div className="hero__window-hint">או לחץ <strong>{SHORTCUT}</strong> מכל מקום</div>
            </div>
          </div>
        </div>
        <p style={{textAlign:"center",fontSize:".72rem",color:"#555978",marginTop:".75rem"}}>
          תצוגה מדגמית — לא צילום מסך אמיתי. TODO: להחליף בצילומי מסך אמיתיים.
        </p>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: "🖱️", title: "תרגום טקסט מסומן", desc: "סמנו טקסט בכל אפליקציה — דפדפן, Word, Notepad — ותרגמו בלחיצה אחת." },
    { icon: "⌨️", title: "קיצור מקשים גלובלי", desc: `לחצו ${SHORTCUT} מכל מקום במחשב. ללא פוקוס מיוחד, ללא החלפת חלון.` },
    { icon: "💬", title: "חלונית תרגום מהירה", desc: "פופאפ קטן ונוח שמופיע מיד עם התרגום, וסוגרים אותו בלחיצה." },
    { icon: "🌐", title: "ממשק עברי ו-RTL", desc: "כל הממשק בעברית, פריסה מימין לשמאל. מיועד למשתמשים דוברי עברית." },
    { icon: "⚡", title: "קלה ומהירה", desc: "מבוססת Tauri (Rust + WebView2) — לא Electron. זיכרון ומשאבים מינימליים." },
    { icon: "🔒", title: "פרטיות — ללא חשבון", desc: "אין צורך להירשם. מפתחות API, אם מוסיפים, נשמרים מקומית בלבד." },
    { icon: "⚙️", title: "הגדרות פשוטות", desc: "ספקי תרגום מרובים: Google ללא API, LibreTranslate, DeepL, Google Cloud ועוד." },
    { icon: "📋", title: "תמיכת fallback ללוח", desc: "באפליקציות שלא חושפות טקסט ישירות, ניתן להפעיל fallback ללוח ההעתקה.", warning: true },
  ];
  return (
    <section className="section section--alt" id="features" aria-labelledby="feat-title">
      <div className="container">
        <header className="section__header">
          <p className="section__label">יתרונות</p>
          <h2 className="section__title" id="feat-title">למה QuickTranslate?</h2>
          <p className="section__subtitle">אפליקציה שנבנתה להיות כלי — לא פלטפורמה. מהירה, פשוטה, ופרטית.</p>
        </header>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className={`feature-card${f.warning ? " feature-card--warning" : ""}`}>
              <div className="feature-icon" aria-hidden="true">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { title: "מסמנים טקסט", desc: `בחרו טקסט בכל אפליקציה פעילה — Notepad, Chrome, Outlook, Word.` },
    { title: "לוחצים על הקיצור", desc: `לוחצים ${SHORTCUT}. האפליקציה קוראת את הטקסט המסומן ישירות.` },
    { title: "מקבלים תרגום מיידי", desc: "חלונית קטנה נפתחת עם התרגום — ניתן להעתיק וסוגרים." },
  ];
  return (
    <section className="section section--dark" id="how" aria-labelledby="how-title">
      <div className="container">
        <header className="section__header">
          <p className="section__label" style={{color:"#7c9dfc"}}>תהליך</p>
          <h2 className="section__title" id="how-title">איך זה עובד?</h2>
          <p className="section__subtitle">שלושה צעדים פשוטים, ללא הגדרה מיוחדת.</p>
        </header>
        <div className="steps">
          {steps.map((s, i) => (
            <div key={s.title} className="step">
              <div className="step__num" aria-hidden="true">{i + 1}</div>
              <h3 className="step__title">{s.title}</h3>
              <p className="step__desc">{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:"2.5rem"}}>
          <p style={{color:"#8a8db8",fontSize:".9rem",marginBlock:"0 1rem"}}>קיצור ברירת המחדל:</p>
          <span className="shortcut-badge" aria-label={`קיצור מקשים: ${SHORTCUT}`}>{SHORTCUT}</span>
          <p style={{color:"#555978",fontSize:".78rem",marginTop:".75rem"}}>
            (ניתן לשנות קיצור מקשים בהגדרות האפליקציה)
          </p>
        </div>
      </div>
    </section>
  );
}

function Download() {
  return (
    <section className="section" id="download" aria-labelledby="dl-title">
      <div className="container">
        <div className="download-box">
          <img src={`${BASE}brand/quicktranslate-app-icon.png`} alt="" aria-hidden="true"
            style={{width:72,height:72,borderRadius:16,marginBlockEnd:"1rem",display:"block",marginInline:"auto"}} />
          <h2 className="download-box__title" id="dl-title">הורידו את QuickTranslate</h2>
          <p className="download-box__sub">חינמי, קוד פתוח, ללא חשבון.</p>
          <div className="download-buttons">
            <a href={DL_SETUP} className="btn btn-download" aria-label="הורדת Windows Installer exe">
              <span className="btn-icon" aria-hidden="true">⬇</span>
              <span>
                Windows Installer
                <span className="btn-sub">.exe · מומלץ</span>
              </span>
            </a>
            <a href={DL_MSI} className="btn btn-download" aria-label="הורדת MSI Installer">
              <span className="btn-icon" aria-hidden="true">⬇</span>
              <span>
                MSI Installer
                <span className="btn-sub">.msi · Enterprise</span>
              </span>
            </a>
            <a href={DL_PORTABLE} className="btn btn-download" aria-label="הורדת גרסה ניידת ZIP">
              <span className="btn-icon" aria-hidden="true">📦</span>
              <span>
                גרסה ניידת
                <span className="btn-sub">.zip · ללא התקנה</span>
              </span>
            </a>
          </div>
          <p className="download-box__releases">
            כל הגרסאות וה-changelogs:{" "}
            <a href={RELEASES} target="_blank" rel="noopener noreferrer">GitHub Releases ↗</a>
          </p>
          <p className="download-box__note">
            דורש Windows 10/11 (64-bit). WebView2 Runtime מותקן אוטומטית ע"י ה-installer.
            הגרסה הניידת לא מצריכה התקנה אך דורשת WebView2 מותקן מראש.
          </p>
        </div>
      </div>
    </section>
  );
}

function Privacy() {
  const items = [
    { icon: "🔑", title: "ללא חשבון", desc: "אין צורך להירשם, להזין אימייל, או ליצור חשבון. האפליקציה עובדת מהרגע הראשון." },
    { icon: "💾", title: "מפתחות API מקומיים", desc: "אם מוסיפים מפתח API (DeepL, Google Cloud), הוא נשמר מקומית בלבד ב-%APPDATA%." },
    { icon: "🌐", title: "טקסט נשלח לספק בלבד", desc: "הטקסט לתרגום נשלח רק לספק שבחרתם — לא ל-backend שלנו כי כזה לא קיים." },
    { icon: "🚫", title: "ללא טלמטריה", desc: "אין איסוף נתוני שימוש, אין לוגים בענן, אין crashes sent anywhere." },
  ];
  return (
    <section className="section section--alt" id="privacy" aria-labelledby="privacy-title">
      <div className="container">
        <header className="section__header">
          <p className="section__label">פרטיות ואבטחה</p>
          <h2 className="section__title" id="privacy-title">הנתונים שלכם נשארים אצלכם</h2>
        </header>
        <div className="privacy-list">
          {items.map((i) => (
            <div key={i.title} className="privacy-item">
              <span className="privacy-icon" aria-hidden="true">{i.icon}</span>
              <div className="privacy-text">
                <strong>{i.title}</strong>
                <span>{i.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="privacy-warning" role="note">
          <strong>שקיפות לגבי Google Translate ללא API:</strong>{" "}
          במצב זה, הטקסט שלכם נשלח ל-endpoint ציבורי לא-רשמי של Google (לא API רשמי).
          זה שירות ניסיוני שעלול להשתנות או להיחסם בכל עת — הוא לא תחת הסכם שירות.
          לשימוש יציב ורשמי, מומלץ להגדיר ספק עם API מפתח (Google Cloud Translation, DeepL).
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "האם צריך מפתח API?",
      a: `לא, ברירת המחדל היא Google Translate ללא API — ניסיוני, ללא מפתח. אבל זה endpoint לא-רשמי ועלול להשתנות.
         לשימוש יציב יש ספקים רשמיים (Google Cloud Translation, DeepL) שדורשים מפתח API.`,
    },
    {
      q: "האם זה עובד בלי אינטרנט?",
      a: "לא כרגע. התרגום מתבצע דרך ספקים חיצוניים ודורש חיבור לאינטרנט.",
    },
    {
      q: "האם זה עובד בכל תוכנה?",
      a: `ברוב המקומות שבהם Windows מאפשר לקרוא טקסט מסומן (Notepad, Chrome, Edge, Firefox, Word וכו').
         באפליקציות עם רינדור מותאם (Canvas, חלק מ-Electron/Qt) ייתכן שיהיה צורך להפעיל fallback ללוח בהגדרות.`,
    },
    {
      q: "האם צריך להתקין 7GB כמו Electron?",
      a: `לא. האפליקציה בנויה על Tauri ומשתמשת ב-WebView2 המובנה ב-Windows 10/11.
         ה-installer שוקל פחות מ-5MB. הסביבת הפיתוח של Rust/Node נדרשת רק למפתחים.`,
    },
    {
      q: "האם זה עובד על Mac/Linux?",
      a: `המיקוד הנוכחי הוא Windows. Tauri תומך ב-macOS ו-Linux מבחינת טכנולוגיה,
         אך לכידת טקסט מסומן דרך UI Automation היא Windows-בלבד כרגע.`,
    },
    {
      q: "האם ניתן להשתמש בלוגו/קוד?",
      a: "הקוד מוצע עם רישיון MIT. ראו את ה-repository ב-GitHub לפרטים.",
    },
  ];
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="container">
        <header className="section__header">
          <p className="section__label">שאלות נפוצות</p>
          <h2 className="section__title" id="faq-title">יש שאלות?</h2>
        </header>
        <div className="faq-list" role="list">
          {items.map((item) => (
            <details key={item.q} className="faq-item" role="listitem">
              <summary className="faq-q">
                <span>{item.q}</span>
                <span className="faq-arrow" aria-hidden="true">▼</span>
              </summary>
              <p className="faq-a">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <span className="footer__brand">QuickTranslate</span>
        <nav className="footer__links" aria-label="קישורי footer">
          <a href={RELEASES} target="_blank" rel="noopener noreferrer">הורדה</a>
          <a href={GITHUB} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="#privacy">פרטיות</a>
          <a href="#faq">שאלות נפוצות</a>
        </nav>
        <p className="footer__disclaimer">
          Google Translate ללא API הוא מצב ניסיוני ואינו API רשמי של Google Inc.
          השימוש כפוף לתנאי השירות של Google. שם המוצר ולוגו Google הם סימנים מסחריים של Google LLC.
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Download />
        <Privacy />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
