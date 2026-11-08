/* Reusable slide components. Each returns an HTML string.
 * All visible copy is passed in from slides.js (Hebrew, RTL). */
(function () {
  const ICON = {
    mark: `<svg class="brand-mark" viewBox="0 0 48 48" fill="none">
      <defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#9C7A3C"/><stop offset=".5" stop-color="#F1DDA8"/><stop offset="1" stop-color="#C9A45C"/></linearGradient></defs>
      <rect x="6" y="6" width="36" height="36" transform="rotate(45 24 24)" stroke="url(#gm)" stroke-width="1.5"/>
      <rect x="15" y="15" width="18" height="18" transform="rotate(45 24 24)" fill="url(#gm)"/>
    </svg>`,
    arrowLeft: (c = "#C9A45C") => `<svg viewBox="0 0 44 16" fill="none"><path d="M43 8H2M2 8L9 1M2 8l7 7" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    ctaArrow: `<svg viewBox="0 0 32 32" fill="none"><path d="M27 16H5M5 16l9-9M5 16l9 9" stroke="#C9A45C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    lock: `<svg viewBox="0 0 12 12"><rect x="2" y="5" width="8" height="6" rx="1.2" fill="#C9A45C"/><path d="M4 5V3.6a2 2 0 0 1 4 0V5" stroke="#C9A45C" stroke-width="1.2" fill="none"/></svg>`,
  };

  const C = {
    ICON,

    /* Slide frame: background, chrome, counter, progress + swipe hint */
    frame({ index, total, brand, swipeLabel, inner, decor = "" }) {
      const pad = (n) => String(n).padStart(2, "0");
      const bars = Array.from({ length: total }, (_, i) => `<span class="${i + 1 === index ? "on" : ""}"></span>`).join("");
      const swipe = index < total && swipeLabel
        ? `<div class="swipe"><span>${swipeLabel}</span>${ICON.arrowLeft()}</div>` : `<div></div>`;
      return `
      <section class="slide" data-index="${index}">
        ${decor}
        <div class="frame-line"></div>
        <header class="topbar">
          <div class="brand">${ICON.mark}<span class="brand-name">${brand}</span></div>
          <div class="counter"><b>${pad(index)}</b> / ${pad(total)}</div>
        </header>
        <div class="content">${inner}</div>
        <footer class="footer">
          <div class="progress">${bars}</div>
          ${swipe}
        </footer>
      </section>`;
    },

    eyebrow: (text) => `<div class="eyebrow">${text}</div>`,

    /* lines: array of strings (may contain <span class="gold-text">) */
    headline: (lines, size = "") => `<h1 class="headline ${size}">${lines.join("<br>")}</h1>`,

    body: (paragraphs, size = "") =>
      [].concat(paragraphs).map((p) => `<p class="body-text ${size}">${p}</p>`).join(""),

    separator: (variant = "") =>
      `<div class="separator ${variant}"><span class="diamond"></span><span class="line"></span></div>`,

    numberedList: (items) => `<ol class="num-list">${items.map((it) => `
      <li class="num-item">
        <span class="num">${it.num}</span>
        <span class="dash"></span>
        <span class="label">${it.text}</span>
      </li>`).join("")}</ol>`,

    cta: (label) => `<div class="cta-block">
      <div class="cta-button"><span>${label}</span><span class="arrow">${ICON.ctaArrow}</span></div>
    </div>`,

    /* Premium desktop website mockup. s = site copy object */
    desktopMockup: (s, style = "") => `
      <div class="mock-desktop" style="${style}">
        <div class="chrome">
          <div class="dots"><i></i><i></i><i></i></div>
          <div class="urlbar">${ICON.lock}<span></span></div>
        </div>
        <div class="site">
          <nav class="site-nav">
            <div class="site-logo">${s.logo}</div>
            <div class="site-links">${s.links.map((l) => `<span>${l}</span>`).join("")}<span class="pill">${s.contact}</span></div>
          </nav>
          <div class="site-hero">
            <div class="copy">
              <div class="kicker">${s.kicker}</div>
              <h3>${s.title}</h3>
              <p>${s.text}</p>
              <div class="btns"><span class="site-btn">${s.primary}</span><span class="site-btn ghost">${s.secondary}</span></div>
            </div>
            ${C.heroVisual()}
          </div>
          <div class="site-strip">${s.stats.map((st) => `<div class="card"><b>${st.n}</b><span>${st.l}</span></div>`).join("")}</div>
        </div>
      </div>`,

    /* Premium smartphone website mockup */
    phoneMockup: (s, style = "") => `
      <div class="mock-phone" style="${style}">
        <div class="screen site">
          <div class="notch"></div>
          <nav class="site-nav">
            <div class="site-logo">${s.logo}</div>
            <div class="burger"><i></i><i></i><i></i></div>
          </nav>
          ${C.heroVisual()}
          <div class="m-copy">
            <div class="kicker">${s.kicker}</div>
            <h3>${s.title}</h3>
            <p>${s.textShort}</p>
            <span class="site-btn">${s.primary}</span>
          </div>
          <div class="home-bar"></div>
        </div>
      </div>`,

    heroVisual: () => `<div class="hero-visual"><div class="sun"></div>
      <div class="arch a3"></div><div class="arch a2"></div><div class="arch a1"></div><div class="floor"></div></div>`,

    /* Loading "first visit" browser skeleton (slide 2) */
    skeletonBrowser: (style = "") => `
      <div class="mock-desktop skeleton" style="${style}">
        <div class="chrome"><div class="dots"><i></i><i></i><i></i></div><div class="urlbar">${ICON.lock}<span></span></div></div>
        <div class="loadbar"></div>
        <div style="padding:36px 40px; display:flex; flex-direction:column; gap:22px;">
          <div style="display:flex; justify-content:space-between;"><div class="sk" style="width:120px;height:22px"></div><div class="sk" style="width:300px;height:14px"></div></div>
          <div style="display:flex; gap:30px; margin-top:20px;">
            <div style="flex:1; display:flex; flex-direction:column; gap:16px;">
              <div class="sk" style="width:85%;height:34px"></div><div class="sk" style="width:60%;height:34px"></div>
              <div class="sk" style="width:90%;height:12px;margin-top:10px"></div><div class="sk" style="width:75%;height:12px"></div>
              <div class="sk" style="width:140px;height:38px;border-radius:99px;margin-top:12px;background:rgba(201,164,92,0.35)"></div>
            </div>
            <div class="sk" style="flex:1; height:260px; border-radius:10px"></div>
          </div>
        </div>
      </div>`,
  };

  window.C = C;
})();
