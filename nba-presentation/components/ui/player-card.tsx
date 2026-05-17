"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string;
}

interface PlayerCardProps {
  name: string;
  title: string;
  team: string;
  era: string;
  description: string;
  stats: Stat[];
  accentColor: string;
  bgGradient: string;
  imageUrl: string;
  index: number;
}

export function PlayerCard({
  name,
  title,
  team,
  era,
  description,
  stats,
  accentColor,
  bgGradient,
  imageUrl,
  index,
}: PlayerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: "easeOut" }}
      viewport={{ once: true }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900",
        "flex flex-col md:flex-row min-h-[420px]"
      )}
    >
      {/* Image side */}
      <div className="relative md:w-2/5 min-h-[260px] md:min-h-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <div className={cn("absolute inset-0", bgGradient)} />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-slate-900 to-transparent md:hidden" />

        {/* Era badge */}
        <div className="absolute top-4 left-4 z-10">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-slate-900"
            style={{ backgroundColor: accentColor }}
          >
            {era}
          </span>
        </div>
      </div>

      {/* Content side */}
      <div className="relative flex flex-col justify-center p-8 md:w-3/5">
        <div
          className="absolute top-0 left-0 w-1 h-full rounded-l-none rounded-r-3xl"
          style={{ backgroundColor: accentColor }}
        />

        <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: accentColor }}>
          {team}
        </p>
        <h2 className="text-3xl md:text-4xl font-black text-white mb-1">{name}</h2>
        <p className="text-lg text-slate-400 font-medium mb-4">{title}</p>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">{description}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
