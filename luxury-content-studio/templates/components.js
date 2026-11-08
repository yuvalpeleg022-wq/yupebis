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
        ${C.siteDesktop(s)}
      </div>`,

    /* Desktop website page (used inside browser window and monitor) */
    siteDesktop: (s) => `
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

/* ─── Components added for Carousel 02 ─────────────────────── */
(function () {
  const C = window.C;
  const I = C.ICON;

  Object.assign(I, {
    bolt: `<svg viewBox="0 0 32 32" fill="none"><path d="M18 3L6 18h9l-2 11 12-15h-9l2-11z" stroke="#C9A45C" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    eye: `<svg viewBox="0 0 32 32" fill="none"><path d="M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16z" stroke="#C9A45C" stroke-width="1.6"/><circle cx="16" cy="16" r="4.5" stroke="#C9A45C" stroke-width="1.6"/></svg>`,
    touch: `<svg viewBox="0 0 32 32" fill="none"><rect x="9" y="2.5" width="14" height="27" rx="3.5" stroke="#C9A45C" stroke-width="1.6"/><path d="M13.5 25.5h5" stroke="#C9A45C" stroke-width="1.6" stroke-linecap="round"/><circle cx="16" cy="13" r="3" fill="#C9A45C"/></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h12v18l-6-4.5L6 21V3z" stroke="#C9A45C" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    chevron: `<svg viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="#C9A45C" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    devices: `<svg viewBox="0 0 220 70" fill="none" stroke="#C9A45C" stroke-width="1.4">
      <rect x="128" y="6" width="90" height="56" rx="4"/><path d="M160 62v6h26v-6"/>
      <rect x="66" y="12" width="46" height="56" rx="5"/>
      <rect x="20" y="22" width="28" height="46" rx="5"/><path d="M30 63h8" stroke-linecap="round"/></svg>`,
  });

  Object.assign(C, {
    /* "01 — Title." headline. Number + dash in gold, title ivory. */
    stepHeadline: (num, title, size = "") => `<h1 class="headline step ${size}">
      <span class="step-num">${num}</span><span class="step-dash">—</span><span class="step-title">${title}</span></h1>`,

    /* Desktop monitor (Studio-display style) wrapping the desktop site */
    monitorMockup: (s, style = "") => `
      <div class="monitor" style="${style}">
        <div class="monitor-body">
          <div class="monitor-screen">
            <div class="chrome"><div class="dots"><i></i><i></i><i></i></div><div class="urlbar">${I.lock}<span></span></div></div>
            ${C.siteDesktop(s)}
            <div class="screen-glare"></div>
          </div>
        </div>
        <div class="monitor-neck"></div>
        <div class="monitor-foot"></div>
      </div>`,

    /* Tall responsive phone page: nav, hero, copy, CTA, service list */
    phoneSite: (s, style = "", variant = "home") => `
      <div class="mock-phone tall" style="${style}">
        <div class="screen site">
          <div class="notch"></div>
          <div class="status"><span>9:41</span><span class="bat"></span></div>
          ${variant === "menu" ? `
            <nav class="site-nav"><div class="site-logo">${s.logo}</div><div class="close">×</div></nav>
            <ul class="m-menu">${s.menu.map((m, i) => `<li class="${i === 0 ? "on" : ""}"><span>${m}</span>${I.chevron}</li>`).join("")}</ul>
            <div class="m-menu-cta"><span class="site-btn">${s.primary}</span></div>` : `
            <nav class="site-nav"><div class="site-logo">${s.logo}</div><div class="burger"><i></i><i></i><i></i></div></nav>
            ${C.heroVisual()}
            <div class="m-copy">
              <div class="kicker">${s.kicker}</div>
              <h3>${s.title}</h3>
              <p>${s.textShort}</p>
              <span class="site-btn">${s.primary}</span>
            </div>
            <div class="m-services">${s.services.map((x) => `<div class="m-row"><b>${x}</b>${I.chevron}</div>`).join("")}</div>`}
          <div class="home-bar"></div>
        </div>
      </div>`,

    /* Gold numbered marker (used for list ↔ mockup callouts) */
    marker: (n, style = "") => `<span class="marker" style="${style}">${n}</span>`,

    /* Question / item list with gold markers */
    markerList: (items) => `<ul class="marker-list">${items.map((t, i) => `<li>${C.marker(i + 1)}<span>${t}</span></li>`).join("")}</ul>`,

    /* Minimal hero section in a browser, with callout markers on the key elements */
    clearHero: (h, style = "") => `
      <div class="mock-desktop clear-hero" style="${style}">
        <div class="chrome"><div class="dots"><i></i><i></i><i></i></div><div class="urlbar">${I.lock}<span></span></div></div>
        <div class="site">
          <nav class="site-nav"><div class="site-logo">${h.logo}</div>
            <div class="site-links">${h.links.map((l) => `<span>${l}</span>`).join("")}<span class="pill">${h.contact}</span></div></nav>
          <div class="ch-body">
            <div class="ch-copy">
              <div class="ch-line">${C.marker(1, "")}<h3>${h.title}</h3></div>
              <div class="ch-line">${C.marker(2, "")}<p>${h.subtitle}</p></div>
              <div class="ch-line">${C.marker(3, "")}<span class="site-btn">${h.button}</span><span class="ch-phone">${h.phone}</span></div>
            </div>
            <div class="ch-visual">${C.heroVisual()}</div>
          </div>
        </div>
      </div>`,

    /* Performance gauge (thin gold arc + ticks + needle) */
    gauge: (pct = 0.92, style = "") => {
      const R = 300, cx = 340, cy = 340;
      const pt = (a, r) => [cx + r * Math.cos(Math.PI * (1 - a)), cy - r * Math.sin(Math.PI * (1 - a))];
      const arc = (a0, a1, r) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`; };
      let ticks = "";
      for (let i = 0; i <= 40; i++) {
        const a = i / 40, major = i % 5 === 0;
        const [x0, y0] = pt(a, R - 34), [x1, y1] = pt(a, R - (major ? 62 : 46));
        ticks += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${a <= pct ? "#C9A45C" : "#3a3a3a"}" stroke-width="${major ? 2 : 1}" opacity="${a <= pct ? 0.9 : 0.8}"/>`;
      }
      const [nx, ny] = pt(pct, R - 90);
      return `<svg class="gauge" viewBox="0 0 680 380" style="${style}">
        <defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="#9C7A3C"/><stop offset=".6" stop-color="#F1DDA8"/><stop offset="1" stop-color="#C9A45C"/></linearGradient>
        <filter id="gl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter></defs>
        <path d="${arc(0, 1, R)}" stroke="#262626" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="${arc(0, pct, R)}" stroke="url(#gg)" stroke-width="10" fill="none" stroke-linecap="round" filter="url(#gl)" opacity=".55"/>
        <path d="${arc(0, pct, R)}" stroke="url(#gg)" stroke-width="4" fill="none" stroke-linecap="round"/>
        ${ticks}
        <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#F1DDA8" stroke-width="3" stroke-linecap="round"/>
        <circle cx="${cx}" cy="${cy}" r="22" fill="#090909" stroke="#C9A45C" stroke-width="2"/>
        <circle cx="${cx}" cy="${cy}" r="7" fill="#C9A45C"/>
      </svg>`;
    },

    /* Row of icon + label features */
    iconRow: (items) => `<div class="icon-row">${items.map((it) =>
      `<div class="icon-item"><span class="ico">${I[it.icon]}</span><span>${it.text}</span></div>`).join("")}</div>`,

    /* Option chips (e.g. CTA paths) */
    chips: (items) => `<div class="chips">${items.map((t) => `<span class="chip">${I.chevron}<span>${t}</span></span>`).join("")}</div>`,

    /* Website contact section mockup with a clear CTA */
    contactSection: (k, style = "") => `
      <div class="mock-desktop contact-mock" style="${style}">
        <div class="chrome"><div class="dots"><i></i><i></i><i></i></div><div class="urlbar">${I.lock}<span></span></div></div>
        <div class="site cs">
          <div class="cs-info">
            <div class="kicker">${k.kicker}</div>
            <h3>${k.title}</h3>
            <p>${k.text}</p>
            <div class="cs-meta">${k.meta.map((m) => `<div><b>${m.l}</b><span dir="auto">${m.v}</span></div>`).join("")}</div>
          </div>
          <div class="cs-form">
            ${k.fields.map((f) => `<div class="field"><label>${f}</label><span></span></div>`).join("")}
            <div class="cs-actions"><span class="cs-btn">${k.button}${I.ctaArrow.replace('stroke="#C9A45C"', 'stroke="#090909"')}</span><span class="cs-alt">${k.alt}</span></div>
          </div>
        </div>
      </div>`,
  });
})();
