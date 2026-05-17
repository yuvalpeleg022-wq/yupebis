"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ─── slide data ─── */
const slides = [
  {
    id: "intro",
    type: "title",
  },
  {
    id: "wemby",
    type: "player",
    name: "Victor Wembanyama",
    nickname: "The Alien",
    team: "San Antonio Spurs",
    number: "1",
    era: "NOW",
    accent: "#7dd3fc",
    glow: "#38bdf8",
    bg: "from-[#0a1628] via-[#0f2744] to-[#0a1628]",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Victor_Wembanyama_%2852978668740%29_%28cropped%29.jpg/440px-Victor_Wembanyama_%2852978668740%29_%28cropped%29.jpg",
    stats: [
      { label: "PPG", value: "24.0" },
      { label: "RPG", value: "10.6" },
      { label: "BPG", value: "3.6" },
      { label: "3P%", value: "32%" },
    ],
    quote: "There's only one Wembanyama.",
    quoteBy: "LeBron James",
    description:
      "7'4\" wingspan of 8 ft. Blocks threes, shoots threes. A generational unicorn the NBA has never seen.",
  },
  {
    id: "sga",
    type: "player",
    name: "Shai Gilgeous-Alexander",
    nickname: "SGA",
    team: "Oklahoma City Thunder",
    number: "2",
    era: "NOW",
    accent: "#fbbf24",
    glow: "#f59e0b",
    bg: "from-[#1a1200] via-[#2a1f00] to-[#1a1200]",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Shai_Gilgeous-Alexander_2019_%28cropped%29.jpg/440px-Shai_Gilgeous-Alexander_2019_%28cropped%29.jpg",
    stats: [
      { label: "PPG", value: "32.7" },
      { label: "APG", value: "6.4" },
      { label: "SPG", value: "2.0" },
      { label: "FG%", value: "53%" },
    ],
    quote: "He's going to be one of the best players in the world for a long time.",
    quoteBy: "Kevin Durant",
    description:
      "Effortless, deceptive, lethal. The smoothest scorer in the game leads OKC to elite status.",
  },
  {
    id: "flagg",
    type: "player",
    name: "Cooper Flagg",
    nickname: "The Next One",
    team: "Boston Celtics",
    number: "3",
    era: "INCOMING",
    accent: "#4ade80",
    glow: "#22c55e",
    bg: "from-[#001a0a] via-[#002a10] to-[#001a0a]",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Cooper_Flagg_%2854400671498%29_%28cropped%29.jpg/440px-Cooper_Flagg_%2854400671498%29_%28cropped%29.jpg",
    stats: [
      { label: "PICK", value: "#1" },
      { label: "AGE", value: "18" },
      { label: "HT", value: "6'9\"" },
      { label: "IQ", value: "∞" },
    ],
    quote: "He's the most complete prospect I've ever evaluated.",
    quoteBy: "NBA Scout",
    description:
      "2025 #1 draft pick out of Duke. Defends all 5 positions, orchestrates offense. The future is now.",
  },
  {
    id: "jordan",
    type: "player",
    name: "Michael Jordan",
    nickname: "His Airness",
    team: "Chicago Bulls",
    number: "23",
    era: "LEGEND",
    accent: "#f97316",
    glow: "#ea580c",
    bg: "from-[#1a0500] via-[#2d0a00] to-[#1a0500]",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Michael_Jordan_in_2014.jpg/440px-Michael_Jordan_in_2014.jpg",
    stats: [
      { label: "PPG", value: "30.1" },
      { label: "RINGS", value: "6" },
      { label: "FMVP", value: "6" },
      { label: "DPOY", value: "1×" },
    ],
    quote: "I've missed more than 9,000 shots. That's why I succeed.",
    quoteBy: "Michael Jordan",
    description:
      "6 titles. 6 Finals MVPs. 5 league MVPs. The GOAT debate starts and ends here.",
  },
  {
    id: "compare",
    type: "compare",
  },
];

/* ─── 3D slide variants ─── */
const variants = {
  enter: (dir: number) => ({
    rotateY: dir > 0 ? 90 : -90,
    translateZ: -600,
    opacity: 0,
    scale: 0.7,
  }),
  center: {
    rotateY: 0,
    translateZ: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (dir: number) => ({
    rotateY: dir > 0 ? -90 : 90,
    translateZ: -600,
    opacity: 0,
    scale: 0.7,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

/* ─── sub-components ─── */
function TitleSlide() {
  return (
    <div className="relative flex flex-col items-center justify-center h-full text-center px-8 overflow-hidden">
      {/* animated background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff22 1px, transparent 1px), linear-gradient(90deg, #ffffff22 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* glowing orb */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 60, rotateX: 30 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <p className="text-cyan-400 font-bold uppercase tracking-[0.4em] text-sm mb-6">
          NBA — Past &amp; Present
        </p>
        <h1
          className="text-7xl md:text-9xl font-black tracking-tight mb-6 leading-none"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #94a3b8 50%, #475569 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          THE
          <br />
          GREATEST
        </h1>
        <p className="text-slate-400 text-xl max-w-lg mx-auto">
          Wembanyama · SGA · Cooper Flagg · Michael Jordan
        </p>
      </motion.div>

      <motion.div
        className="absolute bottom-12 flex items-center gap-3 text-slate-500 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <ChevronRight size={16} />
        <span>Navigate with arrows or keyboard</span>
      </motion.div>
    </div>
  );
}

function PlayerSlide({ slide }: { slide: (typeof slides)[number] & { type: "player" } }) {
  return (
    <div
      className={`relative flex h-full w-full bg-gradient-to-br ${slide.bg} overflow-hidden`}
    >
      {/* background glow blobs */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[160px] opacity-20"
        style={{ backgroundColor: slide.glow }}
      />
      <div
        className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[120px] opacity-10"
        style={{ backgroundColor: slide.glow }}
      />

      {/* jersey number watermark */}
      <div
        className="absolute right-8 top-1/2 -translate-y-1/2 font-black select-none pointer-events-none"
        style={{
          fontSize: "28rem",
          lineHeight: 1,
          color: slide.accent,
          opacity: 0.04,
        }}
      >
        {slide.number}
      </div>

      {/* left — info */}
      <div className="relative z-10 flex flex-col justify-center pl-12 pr-6 w-1/2">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4 text-black"
            style={{ backgroundColor: slide.accent }}
          >
            {slide.era}
          </span>
          <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-1">
            {slide.team}
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-1">
            {slide.name}
          </h2>
          <p className="font-bold text-lg mb-6" style={{ color: slide.accent }}>
            "{slide.nickname}"
          </p>
          <p className="text-slate-300 text-sm leading-relaxed mb-8 max-w-sm">
            {slide.description}
          </p>

          {/* stats row */}
          <div className="flex gap-6">
            {slide.stats.map((s) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col"
              >
                <span className="text-3xl font-black text-white">{s.value}</span>
                <span className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 border-l-2 pl-4"
          style={{ borderColor: slide.accent }}
        >
          <p className="text-slate-300 italic text-sm">"{slide.quote}"</p>
          <p className="text-xs text-slate-500 mt-1">— {slide.quoteBy}</p>
        </motion.div>
      </div>

      {/* right — player image */}
      <div className="relative w-1/2 flex items-end justify-center overflow-hidden">
        {/* image glow base */}
        <div
          className="absolute bottom-0 w-72 h-72 rounded-full blur-[80px] opacity-40"
          style={{ backgroundColor: slide.glow }}
        />
        <motion.img
          src={slide.image}
          alt={slide.name}
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 h-full max-h-[85%] w-auto object-cover object-top"
          style={{
            filter: `drop-shadow(0 0 40px ${slide.glow}88)`,
          }}
        />
        {/* bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent z-20" />
      </div>
    </div>
  );
}

const compareData = [
  {
    name: "Jordan",
    color: "#f97316",
    rows: ["30.1 PPG", "6 Rings", "1 DPOY", "Legend"],
  },
  {
    name: "SGA",
    color: "#fbbf24",
    rows: ["32.7 PPG", "0 Rings", "2× All-Star", "Peak Now"],
  },
  {
    name: "Wemby",
    color: "#7dd3fc",
    rows: ["24.0 PPG", "0 Rings", "3.6 BPG", "Just Started"],
  },
  {
    name: "Flagg",
    color: "#4ade80",
    rows: ["TBD", "TBD", "TBD", "∞ Potential"],
  },
];

function CompareSlide() {
  return (
    <div className="relative flex flex-col items-center justify-center h-full px-12 overflow-hidden">
      <div className="absolute w-[800px] h-[400px] rounded-full bg-purple-500/5 blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <motion.h2
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl font-black text-white mb-2"
      >
        Past vs. Present
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-slate-400 mb-12"
      >
        Jordan set the ceiling — the new generation is climbing
      </motion.p>

      <div className="grid grid-cols-4 gap-4 w-full max-w-4xl">
        {compareData.map((col, i) => (
          <motion.div
            key={col.name}
            initial={{ opacity: 0, y: 40, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.1 * i + 0.3, duration: 0.6 }}
            style={{ transformStyle: "preserve-3d" }}
            className="flex flex-col rounded-2xl overflow-hidden border border-white/10"
          >
            <div
              className="text-center py-4 font-black text-black text-lg"
              style={{ backgroundColor: col.color }}
            >
              {col.name}
            </div>
            {col.rows.map((row, j) => (
              <div
                key={j}
                className={`text-center py-3 text-sm font-semibold ${
                  j % 2 === 0 ? "bg-white/5" : "bg-white/[0.02]"
                } text-slate-200`}
              >
                {row}
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── main presentation ─── */
export default function Presentation() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = useCallback(
    (dir: number) => {
      const next = current + dir;
      if (next < 0 || next >= slides.length) return;
      setDirection(dir);
      setCurrent(next);
    },
    [current]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go]);

  const slide = slides[current];

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col"
      style={{ perspective: "1200px" }}
    >
      {/* slide area */}
      <div className="flex-1 relative overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            {slide.type === "title" && <TitleSlide />}
            {slide.type === "player" && (
              <PlayerSlide slide={slide as (typeof slides)[number] & { type: "player" }} />
            )}
            {slide.type === "compare" && <CompareSlide />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* bottom nav bar */}
      <div className="relative z-50 flex items-center justify-between px-10 py-5 bg-black/60 backdrop-blur-md border-t border-white/5">
        {/* prev */}
        <button
          onClick={() => go(-1)}
          disabled={current === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={18} />
          Prev
        </button>

        {/* dot indicators */}
        <div className="flex items-center gap-3">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                setDirection(i > current ? 1 : -1);
                setCurrent(i);
              }}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === current ? 28 : 8,
                height: 8,
                backgroundColor:
                  i === current
                    ? slide.type === "player"
                      ? (slide as { accent?: string }).accent ?? "#fff"
                      : "#ffffff"
                    : "#334155",
              }}
            />
          ))}
        </div>

        {/* slide counter + next */}
        <div className="flex items-center gap-4">
          <span className="text-slate-500 text-sm tabular-nums">
            {current + 1} / {slides.length}
          </span>
          <button
            onClick={() => go(1)}
            disabled={current === slides.length - 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
