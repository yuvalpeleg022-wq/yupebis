"use strict";
const PptxGenJS = require("pptxgenjs");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE"; // 13.3" x 7.5"

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  primary:   "0A0E1A",
  secondary: "1A2744",
  accent:    "C8A84B",
  hot:       "E84040",
  textPrimary: "FFFFFF",
  textMuted:   "8A9BB5",
};

const makeShadow = (blur = 16, offset = 6) => ({
  type: "outer",
  blur,
  offset,
  angle: 135,
  color: "000000",
  opacity: 0.5,
});

const cardShadow = () => makeShadow(20, 8);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function bgRect(slide, color = C.primary) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { color },
    line: { color, width: 0 },
  });
}

function title(slide, text, x, y, w, color = C.accent, size = 36) {
  slide.addText(text, {
    x, y, w, h: 0.65,
    fontSize: size,
    fontFace: "Georgia",
    bold: true,
    italic: true,
    color,
    align: "left",
  });
}

function goldLine(slide, x, y, w) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h: 0.03,
    fill: { color: C.accent },
    line: { color: C.accent, width: 0 },
  });
}

function orb(slide, x, y, size, color = C.accent, transparency = 85) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x, y, w: size, h: size,
    fill: { color, transparency },
    line: { color, width: 0 },
  });
}

// ─── SLIDE 1 – TITLE ──────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgRect(s);

  // Background orbs for depth
  orb(s, -1.5, -1.0, 5.5, C.accent, 85);
  orb(s,  9.5,  3.5, 5.0, C.accent, 88);
  orb(s,  4.5,  5.0, 3.0, C.secondary, 70);

  // Giant NBA
  s.addText("NBA", {
    x: 0, y: 0.9, w: "100%", h: 2.2,
    fontSize: 96,
    fontFace: "Georgia",
    bold: true,
    italic: true,
    color: C.accent,
    align: "center",
    shadow: cardShadow(),
  });

  // Thin gold separators
  goldLine(s, 3.0, 3.3, 7.3);
  goldLine(s, 3.5, 3.45, 6.3);
  goldLine(s, 3.0, 3.6,  7.3);

  // Subtitle
  s.addText("2024–25 Season in Review", {
    x: 0, y: 3.8, w: "100%", h: 0.5,
    fontSize: 28,
    fontFace: "Calibri",
    color: C.textMuted,
    align: "center",
    charSpacing: 2,
  });

  // Byline
  s.addText("PRESENTED BY YOUR NAME", {
    x: 0, y: 6.6, w: "100%", h: 0.4,
    fontSize: 12,
    fontFace: "Calibri",
    color: C.textMuted,
    align: "center",
    charSpacing: 8,
  });
}

// ─── SLIDE 2 – LEAGUE OVERVIEW ────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgRect(s, C.secondary);

  // Raised background panel
  s.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 0.3, w: 12.5, h: 6.9,
    fill: { color: C.primary, transparency: 15 },
    line: { color: C.primary, width: 0 },
    shadow: makeShadow(30, 12),
  });

  title(s, "THE SEASON AT A GLANCE", 0.6, 0.45, 12, C.accent, 36);
  goldLine(s, 0.6, 1.15, 9);

  const stats = [
    { num: "30",    label: "TEAMS" },
    { num: "1,230", label: "GAMES PLAYED" },
    { num: "450+",  label: "PLAYERS" },
    { num: "82",    label: "GAMES PER TEAM" },
  ];

  stats.forEach((st, i) => {
    const cx = 0.65 + i * 3.05;
    const cy = 1.5;
    // Card
    s.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: cy, w: 2.85, h: 3.8,
      rectRadius: 0.18,
      fill: { color: C.primary },
      line: { color: C.accent, width: 1 },
      shadow: { type: "outer", blur: 16, offset: 6, angle: 135, color: "000000", opacity: 0.5 },
    });
    // Big number
    s.addText(st.num, {
      x: cx, y: cy + 0.7, w: 2.85, h: 1.3,
      fontSize: 52,
      fontFace: "Georgia",
      bold: true,
      color: C.textPrimary,
      align: "center",
    });
    // Gold accent line under number
    s.addShape(pptx.ShapeType.rect, {
      x: cx + 0.9, y: cy + 2.05, w: 1.05, h: 0.04,
      fill: { color: C.accent },
      line: { color: C.accent, width: 0 },
    });
    // Label
    s.addText(st.label, {
      x: cx, y: cy + 2.2, w: 2.85, h: 0.5,
      fontSize: 11,
      fontFace: "Calibri",
      color: C.textMuted,
      align: "center",
      charSpacing: 6,
      bold: true,
    });
  });
}

// ─── SLIDE 3 – EASTERN CONFERENCE ─────────────────────────────────────────────
function confSlide(pptx, teams, confName, accentColor) {
  const s = pptx.addSlide();
  bgRect(s, C.primary);

  // Watermark conference name
  s.addText(confName, {
    x: 5.2, y: 0.4, w: 7.8, h: 4.5,
    fontSize: 88,
    fontFace: "Georgia",
    bold: true,
    italic: true,
    color: C.secondary,
    align: "left",
  });

  const confLabel = confName === "EAST" ? "EASTERN CONFERENCE" : "WESTERN CONFERENCE";
  title(s, confLabel, 0.55, 0.45, 6.5, C.accent, 28);
  goldLine(s, 0.55, 1.05, 6.2);

  // Table header
  const tableX = 0.5;
  const tableY = 1.25;
  const colW = [0.5, 2.5, 0.75, 0.75, 0.9];
  const headers = ["#", "TEAM", "W", "L", "PCT"];

  s.addShape(pptx.ShapeType.rect, {
    x: tableX, y: tableY, w: 5.5, h: 0.42,
    fill: { color: C.secondary },
    line: { color: C.secondary, width: 0 },
  });

  let cx = tableX + 0.1;
  headers.forEach((h, i) => {
    s.addText(h, {
      x: cx, y: tableY + 0.04, w: colW[i], h: 0.34,
      fontSize: 11,
      fontFace: "Calibri",
      bold: true,
      color: C.accent,
      align: i === 0 ? "center" : "left",
      charSpacing: 4,
    });
    cx += colW[i];
  });

  teams.forEach((team, idx) => {
    const rowY = tableY + 0.42 + idx * 0.38;
    const rowFill = idx % 2 === 0 ? C.primary : "111827";

    s.addShape(pptx.ShapeType.rect, {
      x: tableX, y: rowY, w: 5.5, h: 0.38,
      fill: { color: rowFill },
      line: { color: rowFill, width: 0 },
    });

    // Top 3 left accent bar
    if (idx < 3) {
      s.addShape(pptx.ShapeType.rect, {
        x: tableX, y: rowY + 0.04, w: 0.05, h: 0.3,
        fill: { color: accentColor },
        line: { color: accentColor, width: 0 },
      });
    }

    const vals = [String(idx + 1), team.name, String(team.w), String(team.l), team.pct];
    let vcx = tableX + 0.1;
    vals.forEach((v, i) => {
      s.addText(v, {
        x: vcx, y: rowY + 0.04, w: colW[i], h: 0.3,
        fontSize: 11,
        fontFace: "Calibri",
        color: i === 1 ? C.textPrimary : C.textMuted,
        bold: i === 1,
        align: i === 0 ? "center" : "left",
      });
      vcx += colW[i];
    });
  });

  // #1 seed callout card (right side)
  const cardX = 7.0, cardY = 1.4;
  s.addShape(pptx.ShapeType.roundRect, {
    x: cardX, y: cardY, w: 5.8, h: 4.8,
    rectRadius: 0.2,
    fill: { color: C.secondary },
    line: { color: accentColor, width: 2 },
    shadow: { type: "outer", blur: 20, offset: 8, angle: 135, color: "000000", opacity: 0.6 },
  });

  s.addText("#1 SEED", {
    x: cardX + 0.3, y: cardY + 0.35, w: 5.2, h: 0.4,
    fontSize: 12,
    fontFace: "Calibri",
    bold: true,
    color: accentColor,
    charSpacing: 8,
  });
  s.addText(teams[0].name, {
    x: cardX + 0.3, y: cardY + 0.85, w: 5.2, h: 1.0,
    fontSize: 36,
    fontFace: "Georgia",
    bold: true,
    italic: true,
    color: C.textPrimary,
  });

  const seedStats = [
    { label: "WINS", val: String(teams[0].w) },
    { label: "LOSSES", val: String(teams[0].l) },
    { label: "WIN %", val: teams[0].pct },
  ];
  seedStats.forEach((ss, i) => {
    const bx = cardX + 0.3 + i * 1.8;
    s.addShape(pptx.ShapeType.roundRect, {
      x: bx, y: cardY + 2.1, w: 1.6, h: 1.7,
      rectRadius: 0.12,
      fill: { color: C.primary },
      line: { color: C.primary, width: 0 },
      shadow: { type: "outer", blur: 10, offset: 4, angle: 135, color: "000000", opacity: 0.4 },
    });
    s.addText(ss.val, {
      x: bx, y: cardY + 2.3, w: 1.6, h: 0.7,
      fontSize: 32,
      fontFace: "Georgia",
      bold: true,
      color: accentColor,
      align: "center",
    });
    s.addText(ss.label, {
      x: bx, y: cardY + 3.1, w: 1.6, h: 0.3,
      fontSize: 10,
      fontFace: "Calibri",
      color: C.textMuted,
      align: "center",
      charSpacing: 4,
    });
  });

  s.addText(teams[0].note || "Conference Leaders", {
    x: cardX + 0.3, y: cardY + 4.1, w: 5.2, h: 0.35,
    fontSize: 11,
    fontFace: "Calibri",
    italic: true,
    color: C.textMuted,
  });

  return s;
}

const eastTeams = [
  { name: "Boston Celtics",       w: 61, l: 21, pct: ".744", note: "Back-to-back title contenders" },
  { name: "Cleveland Cavaliers",  w: 57, l: 25, pct: ".695", note: "" },
  { name: "New York Knicks",      w: 51, l: 31, pct: ".622", note: "" },
  { name: "Milwaukee Bucks",      w: 49, l: 33, pct: ".598", note: "" },
  { name: "Indiana Pacers",       w: 46, l: 36, pct: ".561", note: "" },
  { name: "Miami Heat",           w: 44, l: 38, pct: ".537", note: "" },
  { name: "Orlando Magic",        w: 43, l: 39, pct: ".524", note: "" },
  { name: "Philadelphia 76ers",   w: 41, l: 41, pct: ".500", note: "" },
];

const westTeams = [
  { name: "Oklahoma City Thunder",w: 63, l: 19, pct: ".768", note: "League's best record" },
  { name: "Denver Nuggets",       w: 55, l: 27, pct: ".671", note: "" },
  { name: "Minnesota Timberwolves",w:52, l: 30, pct: ".634", note: "" },
  { name: "LA Clippers",          w: 49, l: 33, pct: ".598", note: "" },
  { name: "Phoenix Suns",         w: 47, l: 35, pct: ".573", note: "" },
  { name: "Sacramento Kings",     w: 45, l: 37, pct: ".549", note: "" },
  { name: "Golden State Warriors",w: 44, l: 38, pct: ".537", note: "" },
  { name: "Dallas Mavericks",     w: 42, l: 40, pct: ".512", note: "" },
];

confSlide(pptx, eastTeams, "EAST", C.accent);   // Slide 3
confSlide(pptx, westTeams, "WEST", C.hot);       // Slide 4

// ─── SLIDE 5 – MVP RACE ───────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgRect(s, C.secondary);

  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { color: C.primary, transparency: 20 },
    line: { color: C.primary, width: 0 },
  });

  title(s, "MVP CANDIDATES", 0.6, 0.35, 10, C.accent, 36);
  goldLine(s, 0.6, 1.0, 9);

  const candidates = [
    {
      name: "Shai Gilgeous-Alexander",
      team: "Oklahoma City Thunder",
      ppg: "32.7", rpg: "5.5", apg: "6.4",
      front: true,
    },
    {
      name: "Nikola Jokic",
      team: "Denver Nuggets",
      ppg: "29.6", rpg: "13.0", apg: "10.2",
      front: false,
    },
    {
      name: "Giannis Antetokounmpo",
      team: "Milwaukee Bucks",
      ppg: "30.4", rpg: "11.9", apg: "6.5",
      front: false,
    },
  ];

  candidates.forEach((p, i) => {
    const cx = 0.6 + i * 4.15;
    const cy = 1.25;
    const cw = 3.9;
    const ch = 5.6;

    // Card
    s.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: cy, w: cw, h: ch,
      rectRadius: 0.2,
      fill: { color: C.primary },
      line: { color: p.front ? C.accent : C.secondary, width: p.front ? 2 : 1 },
      shadow: { type: "outer", blur: 20, offset: 8, angle: 135, color: "000000", opacity: 0.6 },
    });

    // Avatar circle
    s.addShape(pptx.ShapeType.ellipse, {
      x: cx + 1.1, y: cy + 0.3, w: 1.7, h: 1.7,
      fill: { color: C.textMuted },
      line: { color: p.front ? C.accent : C.secondary, width: 2 },
    });

    // Name
    s.addText(p.name, {
      x: cx + 0.15, y: cy + 2.15, w: cw - 0.3, h: 0.65,
      fontSize: 15,
      fontFace: "Georgia",
      bold: true,
      color: C.textPrimary,
      align: "center",
    });

    // Team
    s.addText(p.team, {
      x: cx + 0.15, y: cy + 2.85, w: cw - 0.3, h: 0.3,
      fontSize: 11,
      fontFace: "Calibri",
      color: C.accent,
      align: "center",
    });

    // Stats row
    const statItems = [
      { label: "PPG", val: p.ppg },
      { label: "RPG", val: p.rpg },
      { label: "APG", val: p.apg },
    ];
    statItems.forEach((st, j) => {
      const sx = cx + 0.15 + j * 1.2;
      s.addText(st.val, {
        x: sx, y: cy + 3.4, w: 1.1, h: 0.7,
        fontSize: 22,
        fontFace: "Georgia",
        bold: true,
        color: C.textPrimary,
        align: "center",
      });
      s.addText(st.label, {
        x: sx, y: cy + 4.15, w: 1.1, h: 0.3,
        fontSize: 10,
        fontFace: "Calibri",
        color: C.textMuted,
        align: "center",
        charSpacing: 4,
      });
    });

    // "FRONTRUNNER" badge
    if (p.front) {
      s.addShape(pptx.ShapeType.roundRect, {
        x: cx + 0.55, y: cy + 4.7, w: 2.8, h: 0.38,
        rectRadius: 0.1,
        fill: { color: C.accent },
        line: { color: C.accent, width: 0 },
      });
      s.addText("FRONTRUNNER", {
        x: cx + 0.55, y: cy + 4.74, w: 2.8, h: 0.3,
        fontSize: 9,
        fontFace: "Calibri",
        bold: true,
        color: C.primary,
        align: "center",
        charSpacing: 4,
      });
    }
  });
}

// ─── SLIDE 6 – SCORING LEADERS ────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgRect(s, C.primary);

  title(s, "SCORING ELITE", 0.6, 0.35, 8, C.accent, 36);
  goldLine(s, 0.6, 1.0, 8.5);

  const scorers = [
    { name: "Shai Gilgeous-Alexander", ppg: 32.7 },
    { name: "Giannis Antetokounmpo",   ppg: 30.4 },
    { name: "Nikola Jokic",            ppg: 29.6 },
    { name: "Karl-Anthony Towns",      ppg: 27.5 },
    { name: "Donovan Mitchell",        ppg: 26.9 },
    { name: "Ja Morant",               ppg: 26.2 },
    { name: "Devin Booker",            ppg: 25.7 },
    { name: "LaMelo Ball",             ppg: 24.9 },
  ];

  s.addChart(pptx.ChartType.bar, [
    {
      name: "PPG",
      labels: scorers.map(sc => sc.name),
      values: scorers.map(sc => sc.ppg),
    },
  ], {
    x: 0.5, y: 1.2, w: 8.8, h: 5.8,
    barDir: "bar",
    chartColors: ["C8A84B","C8A84B","C8A84B","8A9BB5","8A9BB5","8A9BB5","8A9BB5","8A9BB5"],
    chartArea: { fill: { color: C.primary } },
    plotArea: { fill: { color: C.primary } },
    catAxisLabelColor: C.textMuted,
    catAxisLabelFontSize: 10,
    valAxisLabelColor: C.textMuted,
    valAxisLabelFontSize: 10,
    valGridLine: { color: C.secondary, style: "solid", size: 1 },
    showValue: true,
    dataLabelColor: "FFFFFF",
    dataLabelFontSize: 10,
    dataLabelFontBold: true,
    valAxisMinVal: 20,
    valAxisMaxVal: 36,
    showLegend: false,
  });

  // Right callout cards
  const callouts = [
    { label: "PPG LEADER",       val: "32.7", sub: "Shai Gilgeous-Alexander" },
    { label: "HIGHEST SINGLE",   val: "71 PTS", sub: "Giannis vs. Cavs (Jan 2025)" },
    { label: "ROOKIE LEADER",    val: "23.4", sub: "Alexandre Sarr, Wizards" },
  ];

  callouts.forEach((c, i) => {
    const cy = 1.25 + i * 2.05;
    s.addShape(pptx.ShapeType.roundRect, {
      x: 9.55, y: cy, w: 3.2, h: 1.8,
      rectRadius: 0.15,
      fill: { color: C.secondary },
      line: { color: C.accent, width: 1 },
      shadow: { type: "outer", blur: 16, offset: 6, angle: 135, color: "000000", opacity: 0.5 },
    });
    s.addText(c.label, {
      x: 9.65, y: cy + 0.12, w: 3.0, h: 0.28,
      fontSize: 9,
      fontFace: "Calibri",
      bold: true,
      color: C.accent,
      charSpacing: 5,
    });
    s.addText(c.val, {
      x: 9.65, y: cy + 0.42, w: 3.0, h: 0.7,
      fontSize: 28,
      fontFace: "Georgia",
      bold: true,
      color: C.textPrimary,
    });
    s.addText(c.sub, {
      x: 9.65, y: cy + 1.2, w: 3.0, h: 0.35,
      fontSize: 9,
      fontFace: "Calibri",
      color: C.textMuted,
      italic: true,
    });
  });
}

// ─── SLIDE 7 – PLAYOFFS PICTURE ───────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgRect(s, C.primary);

  // PLAYOFFS watermark
  s.addText("PLAYOFFS", {
    x: -0.5, y: 1.5, w: 14.5, h: 4.5,
    fontSize: 96,
    fontFace: "Georgia",
    bold: true,
    italic: true,
    color: C.hot,
    align: "center",
    transparency: 90,
  });

  title(s, "ROAD TO THE FINALS", 0.55, 0.3, 12, C.hot, 32);
  goldLine(s, 0.55, 0.95, 12.2);

  const eastSlots = eastTeams.slice(0, 8);
  const westSlots = westTeams.slice(0, 8);

  function bracket(teams, startX, accentCol) {
    const slotH = 0.55;
    const slotW = 2.6;
    const slotGap = 0.18;
    teams.forEach((t, i) => {
      const sy = 1.15 + i * (slotH + slotGap);
      s.addShape(pptx.ShapeType.roundRect, {
        x: startX, y: sy, w: slotW, h: slotH,
        rectRadius: 0.08,
        fill: { color: C.secondary },
        line: { color: i < 3 ? accentCol : C.secondary, width: i < 3 ? 1.5 : 1 },
        shadow: { type: "outer", blur: 10, offset: 4, angle: 135, color: "000000", opacity: 0.4 },
      });
      s.addText(`${i + 1}`, {
        x: startX + 0.05, y: sy + 0.05, w: 0.35, h: 0.4,
        fontSize: 10,
        fontFace: "Calibri",
        bold: true,
        color: i < 3 ? accentCol : C.textMuted,
        align: "center",
      });
      // Clip team name
      const short = t.name.length > 22 ? t.name.substring(0, 21) + "…" : t.name;
      s.addText(short, {
        x: startX + 0.42, y: sy + 0.07, w: slotW - 0.5, h: 0.38,
        fontSize: 10,
        fontFace: "Calibri",
        color: C.textPrimary,
        bold: i === 0,
      });
    });

    // Connecting lines for round 1 matchups (visual only)
    for (let i = 0; i < 4; i++) {
      const y1 = 1.15 + (i * 2) * (slotH + slotGap) + slotH / 2;
      const y2 = 1.15 + (i * 2 + 1) * (slotH + slotGap) + slotH / 2;
      const lineX = startX + slotW;
      s.addShape(pptx.ShapeType.line, {
        x: lineX, y: y1, w: 0.3, h: 0,
        line: { color: accentCol, width: 1.5 },
      });
      s.addShape(pptx.ShapeType.line, {
        x: lineX, y: y2, w: 0.3, h: 0,
        line: { color: accentCol, width: 1.5 },
      });
      s.addShape(pptx.ShapeType.line, {
        x: lineX + 0.3, y: y1, w: 0, h: y2 - y1,
        line: { color: accentCol, width: 1.5 },
      });
    }
  }

  bracket(eastSlots, 0.5, C.accent);
  bracket(westSlots, 9.95, C.hot);

  // EAST / WEST labels
  s.addText("EASTERN", {
    x: 0.5, y: 6.85, w: 2.6, h: 0.35,
    fontSize: 10, fontFace: "Calibri", bold: true, color: C.accent, charSpacing: 4, align: "center",
  });
  s.addText("WESTERN", {
    x: 9.95, y: 6.85, w: 2.6, h: 0.35,
    fontSize: 10, fontFace: "Calibri", bold: true, color: C.hot, charSpacing: 4, align: "center",
  });

  // Finals center card
  s.addShape(pptx.ShapeType.roundRect, {
    x: 4.75, y: 2.6, w: 3.8, h: 2.3,
    rectRadius: 0.2,
    fill: { color: C.secondary },
    line: { color: C.accent, width: 2.5 },
    shadow: { type: "outer", blur: 24, offset: 10, angle: 135, color: "000000", opacity: 0.7 },
  });
  s.addText("NBA FINALS", {
    x: 4.75, y: 2.8, w: 3.8, h: 0.5,
    fontSize: 14,
    fontFace: "Georgia",
    bold: true,
    italic: true,
    color: C.accent,
    align: "center",
    charSpacing: 4,
  });
  s.addText("June 2025", {
    x: 4.75, y: 3.4, w: 3.8, h: 0.4,
    fontSize: 12,
    fontFace: "Calibri",
    color: C.textMuted,
    align: "center",
  });
  s.addText("TBD", {
    x: 4.75, y: 3.85, w: 3.8, h: 0.65,
    fontSize: 28,
    fontFace: "Georgia",
    bold: true,
    color: C.textPrimary,
    align: "center",
  });

  // Connector lines from brackets to center
  s.addShape(pptx.ShapeType.line, {
    x: 3.4, y: 3.72, w: 1.35, h: 0,
    line: { color: C.accent, width: 1.5, dashType: "dash" },
  });
  s.addShape(pptx.ShapeType.line, {
    x: 8.55, y: 3.72, w: 1.4, h: 0,
    line: { color: C.hot, width: 1.5, dashType: "dash" },
  });
}

// ─── SLIDE 8 – TEAM OF THE YEAR ───────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgRect(s, C.secondary);

  // Left panel
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 5.0, h: 7.5,
    fill: { color: C.primary },
    line: { color: C.primary, width: 0 },
  });

  s.addText("TEAM", {
    x: 0.3, y: 0.6, w: 4.4, h: 0.7,
    fontSize: 14,
    fontFace: "Calibri",
    bold: true,
    color: C.accent,
    charSpacing: 10,
  });
  s.addText("OF THE\nYEAR", {
    x: 0.3, y: 1.3, w: 4.4, h: 2.0,
    fontSize: 42,
    fontFace: "Georgia",
    bold: true,
    italic: true,
    color: C.textPrimary,
  });

  s.addShape(pptx.ShapeType.rect, {
    x: 0.3, y: 3.45, w: 3.5, h: 0.04,
    fill: { color: C.accent },
    line: { color: C.accent, width: 0 },
  });

  s.addText("Oklahoma City\nThunder", {
    x: 0.3, y: 3.6, w: 4.4, h: 1.8,
    fontSize: 32,
    fontFace: "Georgia",
    bold: true,
    italic: true,
    color: C.accent,
  });

  s.addText("2024–25 NBA Season", {
    x: 0.3, y: 5.55, w: 4.4, h: 0.4,
    fontSize: 11,
    fontFace: "Calibri",
    color: C.textMuted,
    italic: true,
  });

  // Right stats grid 2×3
  const teamStats = [
    { label: "RECORD",      val: "63-19" },
    { label: "PPG",         val: "118.3" },
    { label: "DEF RATING",  val: "107.2" },
    { label: "NET RATING",  val: "+8.4" },
    { label: "PACE",        val: "99.7" },
    { label: "HOME RECORD", val: "35-6" },
  ];

  teamStats.forEach((st, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = 5.4 + col * 3.85;
    const sy = 0.7 + row * 2.15;

    s.addShape(pptx.ShapeType.roundRect, {
      x: sx, y: sy, w: 3.5, h: 1.85,
      rectRadius: 0.15,
      fill: { color: C.primary },
      line: { color: C.secondary, width: 1 },
      shadow: { type: "outer", blur: 16, offset: 6, angle: 135, color: "000000", opacity: 0.5 },
    });
    s.addText(st.val, {
      x: sx, y: sy + 0.15, w: 3.5, h: 0.9,
      fontSize: 44,
      fontFace: "Georgia",
      bold: true,
      color: C.accent,
      align: "center",
    });
    s.addText(st.label, {
      x: sx, y: sy + 1.15, w: 3.5, h: 0.35,
      fontSize: 11,
      fontFace: "Calibri",
      bold: true,
      color: C.textMuted,
      align: "center",
      charSpacing: 5,
    });
  });

  // Bottom ticker bar
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.05, w: "100%", h: 0.42,
    fill: { color: C.primary },
    line: { color: C.primary, width: 0 },
  });
  s.addText(
    "LEAGUE-BEST RECORD  ·  #1 SEED WEST  ·  SGA MVP FRONTRUNNER  ·  DEFENSIVE POWERHOUSE  ·  60+ WIN SEASONS",
    {
      x: 0.3, y: 7.07, w: 13.0, h: 0.35,
      fontSize: 9,
      fontFace: "Calibri",
      color: C.accent,
      charSpacing: 2,
    }
  );
}

// ─── SLIDE 9 – DATA & ANALYTICS ───────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgRect(s, C.primary);

  title(s, "BY THE NUMBERS", 0.6, 0.3, 10, C.accent, 36);
  goldLine(s, 0.6, 0.95, 10);

  // Combo chart
  const teams8 = [
    "OKC","DEN","BOS","CLE","NYK","MIN","MIL","LAC"
  ];
  const wins8   = [63, 55, 61, 57, 51, 52, 49, 49];
  const ppg8    = [118.3, 116.1, 120.5, 112.3, 113.8, 111.2, 115.6, 110.7];

  s.addChart(
    [
      {
        type: pptx.ChartType.bar,
        data: [{ name: "Wins", labels: teams8, values: wins8 }],
        options: { chartColors: ["1A2744"], barGrouping: "clustered" },
      },
      {
        type: pptx.ChartType.line,
        data: [{ name: "PPG",  labels: teams8, values: ppg8  }],
        options: {
          chartColors: ["C8A84B"],
          lineSize: 3,
          lineDataSymbol: "circle",
          lineDataSymbolSize: 7,
          secondaryValAxis: true,
          secondaryCatAxis: true,
        },
      },
    ],
    {
      x: 0.5, y: 1.15, w: 12.3, h: 4.2,
      chartArea: { fill: { color: C.primary } },
      plotArea: { fill: { color: C.primary } },
      catAxisLabelColor: C.textMuted,
      catAxisLabelFontSize: 11,
      valAxisLabelColor: C.textMuted,
      valAxisLabelFontSize: 10,
      valGridLine: { color: C.secondary, style: "solid" },
      showLegend: true,
      legendPos: "t",
      legendFontColor: C.textMuted,
      legendFontSize: 10,
      showValue: false,
    }
  );

  // Insight cards
  const insights = [
    { icon: "↑",  stat: "+4.2", desc: "Avg PPG increase league-wide vs. 2023–24" },
    { icon: "🏀", stat: "31.2%", desc: "Three-point attempt rate (all-time high)" },
    { icon: "⚡", stat: "1.08",  desc: "Avg points per possession (new era efficiency)" },
  ];

  insights.forEach((ins, i) => {
    const ix = 0.5 + i * 4.25;
    const iy = 5.65;

    s.addShape(pptx.ShapeType.roundRect, {
      x: ix, y: iy, w: 4.0, h: 1.55,
      rectRadius: 0.15,
      fill: { color: C.secondary },
      line: { color: C.secondary, width: 0 },
      shadow: { type: "outer", blur: 16, offset: 6, angle: 135, color: "000000", opacity: 0.5 },
    });

    // Icon circle
    s.addShape(pptx.ShapeType.ellipse, {
      x: ix + 0.18, y: iy + 0.22, w: 0.75, h: 0.75,
      fill: { color: C.accent },
      line: { color: C.accent, width: 0 },
    });
    s.addText(ins.icon, {
      x: ix + 0.18, y: iy + 0.24, w: 0.75, h: 0.65,
      fontSize: 14,
      fontFace: "Calibri",
      color: C.primary,
      align: "center",
      bold: true,
    });

    s.addText(ins.stat, {
      x: ix + 1.05, y: iy + 0.1, w: 2.7, h: 0.6,
      fontSize: 26,
      fontFace: "Georgia",
      bold: true,
      color: C.textPrimary,
    });
    s.addText(ins.desc, {
      x: ix + 1.05, y: iy + 0.72, w: 2.7, h: 0.55,
      fontSize: 10,
      fontFace: "Calibri",
      color: C.textMuted,
    });
  });
}

// ─── SLIDE 10 – CLOSING ───────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  bgRect(s, C.primary);

  // Large depth orbs
  orb(s, -2.0, -1.5, 7.0, C.accent, 88);
  orb(s,  8.5,  4.0, 6.5, C.accent, 90);
  orb(s,  3.0, -0.5, 4.0, C.secondary, 75);
  orb(s, -0.5,  5.0, 4.5, C.secondary, 80);

  // Gold thin separators
  goldLine(s, 2.5, 1.8, 8.3);
  goldLine(s, 2.5, 2.0, 8.3);

  // Main headline
  s.addText("THE GAME\nNEVER STOPS", {
    x: 0.5, y: 2.1, w: 12.3, h: 3.0,
    fontSize: 52,
    fontFace: "Georgia",
    bold: true,
    italic: true,
    color: C.accent,
    align: "center",
    shadow: cardShadow(),
  });

  goldLine(s, 2.5, 5.3, 8.3);
  goldLine(s, 2.5, 5.5, 8.3);

  // Year
  s.addText("2 0 2 4  —  2 5", {
    x: 0.5, y: 5.7, w: 12.3, h: 0.55,
    fontSize: 18,
    fontFace: "Calibri",
    color: C.textMuted,
    align: "center",
    charSpacing: 6,
  });

  // Logo placeholder + NBA text
  s.addShape(pptx.ShapeType.ellipse, {
    x: 6.05, y: 6.45, w: 0.65, h: 0.65,
    fill: { color: C.secondary },
    line: { color: C.accent, width: 1.5 },
  });
  s.addText("NBA", {
    x: 6.8, y: 6.5, w: 1.5, h: 0.55,
    fontSize: 14,
    fontFace: "Georgia",
    bold: true,
    italic: true,
    color: C.accent,
  });
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────
pptx.writeFile({ fileName: "NBA_Presentation_4K.pptx" })
  .then(() => console.log("DONE: NBA_Presentation_4K.pptx"))
  .catch(err => { console.error(err); process.exit(1); });
