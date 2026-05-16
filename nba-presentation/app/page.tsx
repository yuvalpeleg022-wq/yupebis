"use client";
import React from "react";
import { motion } from "framer-motion";
import { LampContainer } from "@/components/ui/lamp";
import { PlayerCard } from "@/components/ui/player-card";
import { Trophy, Zap, Star, TrendingUp } from "lucide-react";

const players = [
  {
    name: "Victor Wembanyama",
    title: "The Alien — Center",
    team: "San Antonio Spurs",
    era: "Now",
    accentColor: "#c8e6ff",
    bgGradient: "bg-gradient-to-r from-blue-900/60 via-transparent to-transparent",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Victor_Wembanyama_%2852978668740%29_%28cropped%29.jpg/440px-Victor_Wembanyama_%2852978668740%29_%28cropped%29.jpg",
    description:
      "At 7'4\" with an 8-foot wingspan, Wembanyama is a generational anomaly. His ability to block shots from the perimeter, shoot threes over any defender, and orchestrate offense from the post makes him unlike any player the league has ever seen. The 2024 Rookie of the Year broke records that seemed untouchable.",
    stats: [
      { label: "PTS", value: "24.0" },
      { label: "REB", value: "10.6" },
      { label: "BLK", value: "3.6" },
    ],
    index: 0,
  },
  {
    name: "Shai Gilgeous-Alexander",
    title: "SGA — Guard",
    team: "Oklahoma City Thunder",
    era: "Now",
    accentColor: "#fbbf24",
    bgGradient: "bg-gradient-to-r from-blue-800/60 via-transparent to-transparent",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Shai_Gilgeous-Alexander_2019_%28cropped%29.jpg/440px-Shai_Gilgeous-Alexander_2019_%28cropped%29.jpg",
    description:
      "SGA's fluid, deceptive style of play is a masterclass in efficiency. His ability to get to the line, create separation with his elongated frame, and command a young OKC team to the top of the Western Conference has cemented him as the game's most complete two-way guard of this generation.",
    stats: [
      { label: "PTS", value: "32.7" },
      { label: "AST", value: "6.4" },
      { label: "STL", value: "2.0" },
    ],
    index: 1,
  },
  {
    name: "Cooper Flagg",
    title: "The Next One — Forward",
    team: "Boston Celtics",
    era: "Incoming",
    accentColor: "#4ade80",
    bgGradient: "bg-gradient-to-r from-green-900/60 via-transparent to-transparent",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Cooper_Flagg_%2854400671498%29_%28cropped%29.jpg/440px-Cooper_Flagg_%2854400671498%29_%28cropped%29.jpg",
    description:
      "The 2025 #1 overall pick out of Duke. Flagg entered the NBA with astronomical expectations and immediately delivered — a rare 6'9\" forward who can defend every position, run the break, and make winning plays. His basketball IQ at age 18 rivals veterans with decade-long careers.",
    stats: [
      { label: "HT", value: "6'9\"" },
      { label: "AGE", value: "18" },
      { label: "PICK", value: "#1" },
    ],
    index: 2,
  },
  {
    name: "Michael Jordan",
    title: "His Airness — Guard",
    team: "Chicago Bulls",
    era: "Legend",
    accentColor: "#f97316",
    bgGradient: "bg-gradient-to-r from-red-900/60 via-transparent to-transparent",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Michael_Jordan_in_2014.jpg/440px-Michael_Jordan_in_2014.jpg",
    description:
      "6 championships. 6 Finals MVPs. 5 regular-season MVPs. The standard against which every great player is measured. Jordan's relentless competitive drive, unmatched clutch ability, and two-way dominance defined an era and transformed basketball into a global phenomenon. The GOAT debate starts — and often ends — with him.",
    stats: [
      { label: "PPG", value: "30.1" },
      { label: "RINGS", value: "6" },
      { label: "FMVP", value: "6" },
    ],
    index: 3,
  },
];

function FeatureStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-white/5 border border-white/10"
    >
      <div className="text-cyan-400">{icon}</div>
      <div className="text-3xl font-black text-white">{value}</div>
      <div className="text-xs text-slate-400 uppercase tracking-wider text-center">{label}</div>
    </motion.div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Hero — Lamp */}
      <LampContainer>
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="flex flex-col items-center text-center"
        >
          <span className="mb-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            NBA Legends &amp; New Blood
          </span>
          <h1 className="bg-gradient-to-br from-white via-slate-200 to-slate-500 py-4 bg-clip-text text-5xl md:text-8xl font-black tracking-tight text-transparent">
            The Game&apos;s
            <br />
            Greatest
          </h1>
          <p className="mt-4 max-w-xl text-slate-400 text-lg">
            From Michael Jordan&apos;s dynasty to Wemby&apos;s alien game — a look at the players shaping basketball history.
          </p>
        </motion.div>
      </LampContainer>

      {/* Quick stats bar */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center text-2xl font-bold text-slate-300 mb-10"
        >
          By the Numbers
        </motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FeatureStat icon={<Trophy size={24} />} label="Combined Championships" value="6+" />
          <FeatureStat icon={<Star size={24} />} label="All-Star Appearances" value="20+" />
          <FeatureStat icon={<Zap size={24} />} label="Blocks Per Game (Wemby)" value="3.6" />
          <FeatureStat icon={<TrendingUp size={24} />} label="Jordan Career PPG" value="30.1" />
        </div>
      </section>

      {/* Players */}
      <section className="px-6 pb-24 max-w-5xl mx-auto space-y-8">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center text-3xl font-black text-white mb-12"
        >
          The Players
        </motion.h2>
        {players.map((player) => (
          <PlayerCard key={player.name} {...player} />
        ))}
      </section>

      {/* GOAT comparison */}
      <section className="px-6 pb-32 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-orange-500/5" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Past vs. Present</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg mb-10">
              Jordan set the ceiling. Now a new generation is building the ladder to reach it.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { name: "Jordan", value: "30.1 PPG", label: "Career scoring" },
                { name: "SGA", value: "32.7 PPG", label: "2024-25 season" },
                { name: "Wemby", value: "3.6 BPG", label: "Blocks per game" },
                { name: "Flagg", value: "∞", label: "Potential" },
              ].map((item) => (
                <div key={item.name} className="flex flex-col gap-1">
                  <div className="text-slate-500 text-xs uppercase tracking-widest">{item.name}</div>
                  <div className="text-3xl font-black text-white">{item.value}</div>
                  <div className="text-slate-400 text-xs">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
