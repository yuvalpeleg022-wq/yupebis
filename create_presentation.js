const PptxGenJS = require("pptxgenjs");

const pptx = new PptxGenJS();

// ── Color palette ──────────────────────────────────────────────────────────
const C = {
  navy:       "0A1628",
  navyMid:    "112244",
  navyLight:  "1A3560",
  accent:     "4A9EFF",
  accentAlt:  "00C8FF",
  white:      "FFFFFF",
  lightGray:  "C8D8F0",
  dimGray:    "7A9CC0",
  gold:       "FFD166",
};

// ── Slide dimensions (default 10×7.5 in) ──────────────────────────────────
const W = 10, H = 7.5;

// ── Helper: add a gradient background rect ────────────────────────────────
function addBg(slide) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { type: "solid", color: C.navy },
    line: { type: "none" },
  });
  // subtle top stripe
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.06,
    fill: { type: "solid", color: C.accent },
    line: { type: "none" },
  });
}

// ── Helper: accent bar ─────────────────────────────────────────────────────
function accentBar(slide, y, color = C.accent) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5, y, w: 0.07, h: 0.6,
    fill: { type: "solid", color },
    line: { type: "none" },
  });
}

// ── Helper: section label ──────────────────────────────────────────────────
function sectionLabel(slide, text, x, y, w = 3) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.32, rectRadius: 0.06,
    fill: { type: "solid", color: C.navyLight },
    line: { color: C.accent, width: 1 },
  });
  slide.addText(text, {
    x, y, w, h: 0.32,
    fontSize: 9, bold: true, color: C.accent,
    align: "center", valign: "middle",
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Title
// ══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);

  // diagonal decorative block
  s.addShape(pptx.ShapeType.rect, {
    x: 6.2, y: 0, w: 3.8, h: H,
    fill: { type: "solid", color: C.navyMid },
    line: { type: "none" },
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 5.9, y: 0, w: 0.08, h: H,
    fill: { type: "solid", color: C.accent },
    line: { type: "none" },
  });

  // Tagline chip
  sectionLabel(s, "ANNUAL TRENDS REPORT  ·  2026", 0.5, 1.5, 3.4);

  // Title
  s.addText("Technology\nTrends 2026", {
    x: 0.5, y: 1.95, w: 5.2, h: 2.5,
    fontSize: 46, bold: true, color: C.white,
    lineSpacingMultiple: 1.1,
  });

  // Subtitle
  s.addText(
    "Artificial Intelligence · Quantum Computing\nCybersecurity · Sustainable Tech",
    { x: 0.5, y: 4.55, w: 5.2, h: 1.1, fontSize: 13, color: C.dimGray, lineSpacingMultiple: 1.4 }
  );

  // Bottom divider
  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 5.8, w: 5.2, h: 0.03,
    fill: { type: "solid", color: C.navyLight },
    line: { type: "none" },
  });
  s.addText("Prepared by Strategy & Innovation · May 2026", {
    x: 0.5, y: 5.9, w: 5.2, h: 0.4, fontSize: 9, color: C.dimGray,
  });

  // Right-side icon area
  s.addText("◈", { x: 6.5, y: 1.8, w: 3, h: 1.5, fontSize: 72, color: C.accent, align: "center", valign: "middle" });
  s.addText("Innovation  ·  Insight  ·  Impact", {
    x: 6.5, y: 3.5, w: 3, h: 0.5, fontSize: 10, color: C.dimGray, align: "center",
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Agenda
// ══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  accentBar(s, 0.55);

  s.addText("Agenda", { x: 0.65, y: 0.5, w: 8, h: 0.7, fontSize: 30, bold: true, color: C.white });
  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 1.25, w: 9, h: 0.03,
    fill: { type: "solid", color: C.navyLight }, line: { type: "none" },
  });

  const items = [
    ["01", "Executive Summary",         "Key takeaways from this year's landscape scan"],
    ["02", "AI & Generative Models",    "From assistants to autonomous agents"],
    ["03", "Quantum Computing",         "Practical milestones and enterprise readiness"],
    ["04", "Cybersecurity",             "Threat vectors and zero-trust adoption"],
    ["05", "Sustainable Technology",    "Green datacenters and energy-efficient chips"],
    ["06", "Edge & 5G Convergence",     "Latency, bandwidth, and new use-cases"],
    ["07", "Strategic Recommendations", "Prioritized action plan for 2026–2027"],
  ];

  items.forEach(([num, title, sub], i) => {
    const y = 1.4 + i * 0.82;
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5, y, w: 0.55, h: 0.55,
      fill: { type: "solid", color: C.navyLight }, line: { color: C.accent, width: 1 },
    });
    s.addText(num, { x: 0.5, y, w: 0.55, h: 0.55, fontSize: 11, bold: true, color: C.accent, align: "center", valign: "middle" });
    s.addText(title, { x: 1.2, y: y + 0.04, w: 3.8, h: 0.28, fontSize: 13, bold: true, color: C.white });
    s.addText(sub,   { x: 1.2, y: y + 0.3,  w: 7.5, h: 0.22, fontSize: 9,  color: C.dimGray });
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Executive Summary
// ══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  accentBar(s, 0.55);

  s.addText("Executive Summary", { x: 0.65, y: 0.5, w: 8, h: 0.7, fontSize: 28, bold: true, color: C.white });
  sectionLabel(s, "SLIDE 02 OF 10", 8.2, 0.55);

  const stats = [
    ["$4.8T",  "Global tech spending\nprojected in 2026"],
    ["68%",    "Enterprises deploying\nAI in production"],
    ["3.5×",   "ROI on cybersecurity\ninvestment"],
    ["42 ZB",  "Global data generated\nby year end"],
  ];

  stats.forEach(([val, label], i) => {
    const x = 0.5 + i * 2.35;
    s.addShape(pptx.ShapeType.rect, {
      x, y: 1.4, w: 2.1, h: 1.8,
      fill: { type: "solid", color: C.navyMid },
      line: { color: C.navyLight, width: 1 },
    });
    s.addShape(pptx.ShapeType.rect, {
      x, y: 1.4, w: 2.1, h: 0.07,
      fill: { type: "solid", color: i % 2 === 0 ? C.accent : C.gold },
      line: { type: "none" },
    });
    s.addText(val,   { x, y: 1.55, w: 2.1, h: 0.8, fontSize: 32, bold: true, color: C.white, align: "center" });
    s.addText(label, { x, y: 2.35, w: 2.1, h: 0.7, fontSize: 9.5, color: C.lightGray, align: "center" });
  });

  s.addText("Key Insight", { x: 0.5, y: 3.45, w: 2, h: 0.35, fontSize: 10, bold: true, color: C.gold });
  s.addText(
    "2026 marks an inflection point where AI transitions from a competitive advantage to a baseline expectation. Organizations that delay adoption risk structural disadvantages that compound year-over-year. The window for first-mover gains is narrowing rapidly across all technology domains.",
    { x: 0.5, y: 3.8, w: 9, h: 1.4, fontSize: 11.5, color: C.lightGray, lineSpacingMultiple: 1.5 }
  );

  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 3.7, w: 9, h: 0.03,
    fill: { type: "solid", color: C.navyLight }, line: { type: "none" },
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 4 — AI & Generative Models
// ══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  accentBar(s, 0.55);

  s.addText("AI & Generative Models", { x: 0.65, y: 0.5, w: 7, h: 0.7, fontSize: 28, bold: true, color: C.white });
  sectionLabel(s, "SLIDE 03 OF 10", 8.2, 0.55);

  // Left column
  const points = [
    ["Autonomous Agents",   "Multi-step reasoning agents handle end-to-end workflows without human intervention, reducing task completion time by up to 70%."],
    ["Multimodal Fusion",   "Models now seamlessly process text, image, audio, and video simultaneously, enabling richer and more contextual applications."],
    ["On-Device Inference", "Compact models running on edge hardware eliminate latency and privacy concerns associated with cloud-based inference."],
    ["Regulation Horizon",  "The EU AI Act and similar frameworks require explainability logs, bias audits, and incident reporting from 2026 onwards."],
  ];

  points.forEach(([title, body], i) => {
    const y = 1.45 + i * 1.45;
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5, y, w: 5.5, h: 1.25,
      fill: { type: "solid", color: C.navyMid },
      line: { color: C.navyLight, width: 1 },
    });
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5, y, w: 0.06, h: 1.25,
      fill: { type: "solid", color: i % 2 === 0 ? C.accent : C.accentAlt },
      line: { type: "none" },
    });
    s.addText(title, { x: 0.7, y: y + 0.12, w: 5.1, h: 0.3, fontSize: 12, bold: true, color: C.white });
    s.addText(body,  { x: 0.7, y: y + 0.45, w: 5.1, h: 0.7, fontSize: 9.5, color: C.lightGray, lineSpacingMultiple: 1.3 });
  });

  // Right stat panel
  s.addShape(pptx.ShapeType.rect, {
    x: 6.2, y: 1.45, w: 3.3, h: 5.6,
    fill: { type: "solid", color: C.navyMid }, line: { color: C.navyLight, width: 1 },
  });
  s.addText("By the Numbers", { x: 6.3, y: 1.6, w: 3.1, h: 0.4, fontSize: 11, bold: true, color: C.accent, align: "center" });

  const rstats = [
    ["$1.3T", "AI market size\nby 2028"],
    ["340M",  "Knowledge workers\naugmented by AI"],
    ["89%",   "Developers using\nAI coding tools"],
  ];
  rstats.forEach(([val, lbl], i) => {
    const y = 2.15 + i * 1.6;
    s.addShape(pptx.ShapeType.rect, {
      x: 6.4, y, w: 2.9, h: 1.3,
      fill: { type: "solid", color: C.navyLight }, line: { type: "none" },
    });
    s.addText(val, { x: 6.4, y: y + 0.05, w: 2.9, h: 0.65, fontSize: 28, bold: true, color: C.accent, align: "center" });
    s.addText(lbl, { x: 6.4, y: y + 0.65, w: 2.9, h: 0.55, fontSize: 9.5, color: C.lightGray, align: "center" });
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Quantum Computing
// ══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  accentBar(s, 0.55, C.gold);

  s.addText("Quantum Computing", { x: 0.65, y: 0.5, w: 7, h: 0.7, fontSize: 28, bold: true, color: C.white });
  sectionLabel(s, "SLIDE 04 OF 10", 8.2, 0.55);

  // Timeline
  s.addText("Adoption Timeline", { x: 0.5, y: 1.4, w: 9, h: 0.35, fontSize: 12, bold: true, color: C.lightGray });

  const timeline = [
    ["2024", "1000+ qubit\nprocessors debut",     C.dimGray],
    ["2025", "Error correction\nbreakthroughs",   C.dimGray],
    ["2026", "Cloud QC APIs\nwidely available",   C.accent],
    ["2027", "Hybrid classical-\nquantum pipelines", C.accentAlt],
    ["2028", "Pharmaceutical &\nfinance use-cases", C.gold],
  ];

  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 2.25, w: 9, h: 0.04,
    fill: { type: "solid", color: C.navyLight }, line: { type: "none" },
  });

  timeline.forEach(([year, label, color], i) => {
    const x = 0.5 + i * 1.8;
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.62, y: 2.16, w: 0.2, h: 0.2,
      fill: { type: "solid", color }, line: { type: "none" },
    });
    s.addText(year,  { x, y: 1.8, w: 1.6, h: 0.3, fontSize: 11, bold: true, color, align: "center" });
    s.addText(label, { x, y: 2.45, w: 1.6, h: 0.7, fontSize: 9, color: C.lightGray, align: "center" });
  });

  // Key areas
  const areas = [
    ["Cryptography", "Post-quantum encryption standards (NIST PQC) are becoming mandatory for government and financial systems."],
    ["Drug Discovery", "Quantum simulations cut molecular modeling time from years to hours, accelerating pipeline timelines."],
    ["Optimization",  "Logistics, supply chain, and portfolio optimization problems yield 1000× speed-up on quantum hardware."],
    ["Materials Science", "Discovery of room-temperature superconductors and novel battery chemistries accelerated by quantum models."],
  ];

  areas.forEach(([title, body], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + col * 4.7, y = 3.4 + row * 1.55;
    s.addShape(pptx.ShapeType.rect, {
      x, y, w: 4.4, h: 1.35,
      fill: { type: "solid", color: C.navyMid }, line: { color: C.navyLight, width: 1 },
    });
    s.addText(title, { x: x + 0.15, y: y + 0.1, w: 4.1, h: 0.3, fontSize: 11, bold: true, color: C.gold });
    s.addText(body,  { x: x + 0.15, y: y + 0.42, w: 4.1, h: 0.75, fontSize: 9.5, color: C.lightGray, lineSpacingMultiple: 1.3 });
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Cybersecurity
// ══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  accentBar(s, 0.55, "#FF6B6B");

  s.addText("Cybersecurity", { x: 0.65, y: 0.5, w: 7, h: 0.7, fontSize: 28, bold: true, color: C.white });
  sectionLabel(s, "SLIDE 05 OF 10", 8.2, 0.55);

  // Threat landscape
  s.addText("Top Threat Vectors in 2026", { x: 0.5, y: 1.35, w: 9, h: 0.4, fontSize: 13, bold: true, color: C.lightGray });

  const threats = [
    ["AI-Powered Phishing",     85, "#FF6B6B"],
    ["Supply Chain Attacks",    72, "#FF9F43"],
    ["Ransomware-as-a-Service", 68, "#FF6B6B"],
    ["Deepfake Social Eng.",    61, "#FF9F43"],
    ["Zero-Day Exploits",       54, C.accent],
  ];

  threats.forEach(([label, pct, color], i) => {
    const y = 1.9 + i * 0.85;
    s.addText(label, { x: 0.5, y, w: 3.2, h: 0.35, fontSize: 10.5, color: C.lightGray });
    s.addShape(pptx.ShapeType.rect, {
      x: 3.7, y: y + 0.05, w: 5.2, h: 0.25,
      fill: { type: "solid", color: C.navyLight }, line: { type: "none" },
    });
    s.addShape(pptx.ShapeType.rect, {
      x: 3.7, y: y + 0.05, w: 5.2 * pct / 100, h: 0.25,
      fill: { type: "solid", color }, line: { type: "none" },
    });
    s.addText(`${pct}%`, { x: 9.0, y, w: 0.7, h: 0.35, fontSize: 10, bold: true, color, align: "right" });
  });

  // Defense pillars
  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 6.2, w: 9, h: 0.03,
    fill: { type: "solid", color: C.navyLight }, line: { type: "none" },
  });
  const pillars = ["Zero Trust Architecture", "AI-Driven SOC", "Quantum-Safe Crypto", "Supply Chain SBOM"];
  pillars.forEach((p, i) => {
    const x = 0.5 + i * 2.3;
    s.addShape(pptx.ShapeType.rect, {
      x, y: 6.3, w: 2.1, h: 0.8,
      fill: { type: "solid", color: C.navyMid }, line: { color: C.accent, width: 1 },
    });
    s.addText(p, { x, y: 6.3, w: 2.1, h: 0.8, fontSize: 8.5, bold: true, color: C.accent, align: "center", valign: "middle" });
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Sustainable Technology
// ══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  accentBar(s, 0.55, "#06D6A0");

  s.addText("Sustainable Technology", { x: 0.65, y: 0.5, w: 7, h: 0.7, fontSize: 28, bold: true, color: C.white });
  sectionLabel(s, "SLIDE 06 OF 10", 8.2, 0.55);

  const cards = [
    ["Green Datacenters",    "#06D6A0", "Hyperscalers commit to 100% renewable energy by 2025; liquid cooling cuts PUE to below 1.1 in next-gen facilities."],
    ["Energy-Efficient AI",  "#06D6A0", "Neuromorphic chips and sparse model architectures reduce inference energy by 10–100× vs. traditional GPUs."],
    ["Circular Electronics", "#06D6A0", "Right-to-repair legislation and modular hardware design extend device lifespans and reduce e-waste by 35%."],
    ["Carbon-Aware Compute", "#06D6A0", "Workload schedulers shift batch processing to regions and times with the lowest grid carbon intensity automatically."],
    ["Sustainable Software",  "#06D6A0", "Green coding standards measure software carbon footprint; CarbonOps becomes a new DevOps discipline."],
    ["Water-Neutral Cooling", "#06D6A0", "Closed-loop immersion cooling eliminates evaporative water use in datacenters located in water-stressed regions."],
  ];

  cards.forEach(([title, color, body], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.5 + col * 3.1, y = 1.45 + row * 2.8;
    s.addShape(pptx.ShapeType.rect, {
      x, y, w: 2.9, h: 2.55,
      fill: { type: "solid", color: C.navyMid }, line: { color: C.navyLight, width: 1 },
    });
    s.addShape(pptx.ShapeType.rect, {
      x, y, w: 2.9, h: 0.06, fill: { type: "solid", color }, line: { type: "none" },
    });
    s.addText(title, { x: x + 0.12, y: y + 0.15, w: 2.65, h: 0.4, fontSize: 11, bold: true, color: C.white });
    s.addText(body,  { x: x + 0.12, y: y + 0.6,  w: 2.65, h: 1.7, fontSize: 9, color: C.lightGray, lineSpacingMultiple: 1.35 });
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Edge & 5G Convergence
// ══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  accentBar(s, 0.55, C.accentAlt);

  s.addText("Edge & 5G Convergence", { x: 0.65, y: 0.5, w: 7, h: 0.7, fontSize: 28, bold: true, color: C.white });
  sectionLabel(s, "SLIDE 07 OF 10", 8.2, 0.55);

  // Central diagram label
  s.addText("Connected Ecosystem", { x: 3, y: 1.35, w: 4, h: 0.4, fontSize: 12, bold: true, color: C.lightGray, align: "center" });

  const nodes = [
    { label: "Industrial\nIoT", x: 0.4,  y: 2.2,  color: C.accentAlt },
    { label: "Smart\nCities",   x: 4.1,  y: 1.9,  color: C.accentAlt },
    { label: "Autonomous\nVehicles", x: 7.5, y: 2.2, color: C.gold },
    { label: "AR / XR",         x: 0.4,  y: 4.8,  color: C.gold },
    { label: "Edge\nAI",        x: 4.1,  y: 5.1,  color: C.accent },
    { label: "Remote\nSurgery", x: 7.5,  y: 4.8,  color: "#FF6B6B" },
  ];

  // Center 5G node
  s.addShape(pptx.ShapeType.ellipse, {
    x: 3.9, y: 3.0, w: 2.2, h: 1.5,
    fill: { type: "solid", color: C.navyLight }, line: { color: C.accent, width: 2 },
  });
  s.addText("5G + Edge\nInfrastructure", { x: 3.9, y: 3.0, w: 2.2, h: 1.5, fontSize: 10, bold: true, color: C.accent, align: "center", valign: "middle" });

  nodes.forEach(({ label, x, y, color }) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 1.8, h: 1.0, rectRadius: 0.1,
      fill: { type: "solid", color: C.navyMid }, line: { color, width: 1.5 },
    });
    s.addText(label, { x, y, w: 1.8, h: 1.0, fontSize: 9.5, bold: true, color, align: "center", valign: "middle" });
  });

  // Caption
  s.addText(
    "5G standalone networks paired with distributed edge compute reduce round-trip latency to under 1 ms, enabling a new generation of real-time, mission-critical applications across every industry vertical.",
    { x: 0.5, y: 6.2, w: 9, h: 1.0, fontSize: 9.5, color: C.dimGray, lineSpacingMultiple: 1.4 }
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Data & Analytics
// ══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  accentBar(s, 0.55);

  s.addText("Data & Analytics", { x: 0.65, y: 0.5, w: 7, h: 0.7, fontSize: 28, bold: true, color: C.white });
  sectionLabel(s, "SLIDE 08 OF 10", 8.2, 0.55);

  // Horizontal bar chart simulation
  s.addText("Enterprise Data Maturity Distribution (2026)", {
    x: 0.5, y: 1.4, w: 9, h: 0.4, fontSize: 12, bold: true, color: C.lightGray,
  });

  const bars = [
    ["Predictive Analytics",   62, C.accent],
    ["Real-Time Streaming",    48, C.accentAlt],
    ["Data Mesh Architecture", 34, C.gold],
    ["AI-Augmented BI",        71, C.accent],
    ["Federated Learning",     22, "#06D6A0"],
    ["Synthetic Data Gen.",    39, C.accentAlt],
  ];

  bars.forEach(([label, pct, color], i) => {
    const y = 2.0 + i * 0.77;
    s.addText(label, { x: 0.5, y, w: 3.0, h: 0.3, fontSize: 10, color: C.lightGray });
    // track
    s.addShape(pptx.ShapeType.rect, {
      x: 3.6, y: y + 0.04, w: 5.5, h: 0.22,
      fill: { type: "solid", color: C.navyLight }, line: { type: "none" },
    });
    // fill
    s.addShape(pptx.ShapeType.rect, {
      x: 3.6, y: y + 0.04, w: 5.5 * pct / 100, h: 0.22,
      fill: { type: "solid", color }, line: { type: "none" },
    });
    s.addText(`${pct}%`, { x: 9.2, y, w: 0.5, h: 0.3, fontSize: 9.5, bold: true, color, align: "right" });
  });

  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 6.7, w: 9, h: 0.04,
    fill: { type: "solid", color: C.navyLight }, line: { type: "none" },
  });
  s.addText("Source: Global CIO Survey 2026, n = 4,200 enterprises across 38 countries", {
    x: 0.5, y: 6.8, w: 9, h: 0.35, fontSize: 8, color: C.dimGray,
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 10 — Strategic Recommendations
// ══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  accentBar(s, 0.55, C.gold);

  s.addText("Strategic Recommendations", { x: 0.65, y: 0.5, w: 8, h: 0.7, fontSize: 26, bold: true, color: C.white });
  sectionLabel(s, "SLIDE 09 OF 10", 8.2, 0.55);

  const recs = [
    {
      priority: "IMMEDIATE",
      color: "#FF6B6B",
      title: "Establish an AI Governance Framework",
      body: "Form a cross-functional AI council with clear ownership of ethics, compliance, and deployment standards before scaling AI initiatives.",
    },
    {
      priority: "SHORT-TERM",
      color: C.gold,
      title: "Invest in Post-Quantum Cryptography Migration",
      body: "Audit all encryption in use and begin migrating critical systems to NIST-approved PQC algorithms; target completion by end of 2027.",
    },
    {
      priority: "SHORT-TERM",
      color: C.gold,
      title: "Build Edge Computing Infrastructure",
      body: "Partner with telecom providers to co-locate edge nodes and reduce application latency for customer-facing products.",
    },
    {
      priority: "MEDIUM-TERM",
      color: C.accent,
      title: "Adopt Carbon-Aware Engineering Practices",
      body: "Integrate carbon intensity APIs into CI/CD pipelines and shift non-urgent compute to greener time windows.",
    },
    {
      priority: "ONGOING",
      color: "#06D6A0",
      title: "Upskill Workforce in AI & Data Literacy",
      body: "Launch company-wide AI fluency training; target 80% of knowledge workers completing foundations curriculum within 12 months.",
    },
  ];

  recs.forEach(({ priority, color, title, body }, i) => {
    const y = 1.45 + i * 1.17;
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5, y, w: 9, h: 1.05,
      fill: { type: "solid", color: C.navyMid }, line: { color: C.navyLight, width: 1 },
    });
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5, y, w: 0.06, h: 1.05,
      fill: { type: "solid", color }, line: { type: "none" },
    });
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: y + 0.1, w: 1.35, h: 0.28, rectRadius: 0.05,
      fill: { type: "solid", color: C.navyLight }, line: { color, width: 1 },
    });
    s.addText(priority, { x: 0.65, y: y + 0.1, w: 1.35, h: 0.28, fontSize: 7.5, bold: true, color, align: "center", valign: "middle" });
    s.addText(title, { x: 2.1, y: y + 0.08, w: 7.2, h: 0.32, fontSize: 11.5, bold: true, color: C.white });
    s.addText(body,  { x: 2.1, y: y + 0.42, w: 7.2, h: 0.52, fontSize: 9.5, color: C.lightGray, lineSpacingMultiple: 1.25 });
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Key Takeaways
// ══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);
  accentBar(s, 0.55);

  s.addText("Key Takeaways", { x: 0.65, y: 0.5, w: 7, h: 0.7, fontSize: 28, bold: true, color: C.white });
  sectionLabel(s, "SLIDE 10 OF 10", 8.2, 0.55);

  const takeaways = [
    ["AI is Infrastructure", "By 2026, AI is no longer a feature — it is the foundation. Treat it with the same rigor as cloud and security."],
    ["Quantum Risk is Real Now", "Harvest-now-decrypt-later attacks demand cryptographic migration today, even before quantum hardware matures."],
    ["Sustainability = Efficiency", "Green technology reduces operating costs while meeting regulatory and ESG obligations. It is a business win."],
    ["Edge Enables New Markets", "Sub-millisecond compute unlocks product categories that simply did not exist in a cloud-only architecture."],
    ["Talent is the Bottleneck", "Technology is ready. The limiting factor is human capital — hire, train, and retain aggressively."],
  ];

  takeaways.forEach(([title, body], i) => {
    const y = 1.45 + i * 1.1;
    s.addText(`${String(i + 1).padStart(2, "0")}`, {
      x: 0.5, y, w: 0.55, h: 0.5, fontSize: 20, bold: true, color: C.navyLight, align: "center",
    });
    s.addText(title, { x: 1.2, y: y + 0.02, w: 8, h: 0.3, fontSize: 12, bold: true, color: C.white });
    s.addText(body,  { x: 1.2, y: y + 0.36, w: 8, h: 0.55, fontSize: 9.5, color: C.lightGray, lineSpacingMultiple: 1.3 });
    if (i < takeaways.length - 1) {
      s.addShape(pptx.ShapeType.rect, {
        x: 1.2, y: y + 0.98, w: 8, h: 0.02,
        fill: { type: "solid", color: C.navyLight }, line: { type: "none" },
      });
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 12 — Thank You / Closing
// ══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addBg(s);

  // Right decorative panel
  s.addShape(pptx.ShapeType.rect, {
    x: 6.2, y: 0, w: 3.8, h: H,
    fill: { type: "solid", color: C.navyMid }, line: { type: "none" },
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 5.9, y: 0, w: 0.08, h: H,
    fill: { type: "solid", color: C.accent }, line: { type: "none" },
  });

  s.addText("Thank You", {
    x: 0.5, y: 1.8, w: 5.2, h: 1.2, fontSize: 48, bold: true, color: C.white,
  });

  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 3.05, w: 3.5, h: 0.05,
    fill: { type: "solid", color: C.accent }, line: { type: "none" },
  });

  s.addText("Strategy & Innovation Group\nGlobal Technology Report · May 2026", {
    x: 0.5, y: 3.25, w: 5.2, h: 0.9, fontSize: 12, color: C.lightGray, lineSpacingMultiple: 1.5,
  });

  s.addText("Questions & Discussion", {
    x: 0.5, y: 4.3, w: 5.2, h: 0.5, fontSize: 14, bold: true, color: C.accent,
  });

  s.addText("For follow-up: strategy@company.com\nVisit our knowledge hub at insights.company.com", {
    x: 0.5, y: 4.95, w: 5.2, h: 0.8, fontSize: 10, color: C.dimGray, lineSpacingMultiple: 1.5,
  });

  // Right panel content
  s.addText("◈", { x: 6.5, y: 1.8, w: 3, h: 1.5, fontSize: 72, color: C.accent, align: "center", valign: "middle" });
  s.addText("Technology Trends\n2026", {
    x: 6.5, y: 3.5, w: 3, h: 0.9, fontSize: 13, bold: true, color: C.lightGray, align: "center",
  });
  s.addText("Strategy & Innovation", {
    x: 6.5, y: 4.55, w: 3, h: 0.4, fontSize: 9, color: C.dimGray, align: "center",
  });
}

// ── Save ──────────────────────────────────────────────────────────────────
pptx.writeFile({ fileName: "output.pptx" })
  .then(() => console.log("✅  output.pptx saved successfully"))
  .catch(err => { console.error(err); process.exit(1); });
