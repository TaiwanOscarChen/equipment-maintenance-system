import { ReactNode } from "react";
import { motion } from "motion/react";

interface MetricCardProps {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  subtitle: string;
  icon: ReactNode;
  trend?: string;
  trendType?: "positive" | "negative" | "neutral";
  color: "cyan" | "amber" | "rose" | "emerald";
}

export default function MetricCard({
  id,
  title,
  value,
  unit = "",
  subtitle,
  icon,
  trend,
  trendType = "neutral",
  color,
}: MetricCardProps) {
  // Color configuration mapping for deep cyber-industrial UI
  const colorMap = {
    cyan: {
      border: "border-cyan-500/30",
      bg: "bg-cyan-500/5",
      text: "text-cyan-400",
      glow: "shadow-cyan-500/10",
      accent: "bg-cyan-500",
    },
    amber: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/5",
      text: "text-amber-400",
      glow: "shadow-amber-500/10",
      accent: "bg-amber-500",
    },
    rose: {
      border: "border-rose-500/30",
      bg: "bg-rose-500/5",
      text: "text-rose-400",
      glow: "shadow-rose-500/10",
      accent: "bg-rose-500",
    },
    emerald: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/5",
      text: "text-emerald-400",
      glow: "shadow-emerald-500/10",
      accent: "bg-emerald-500",
    },
  };

  const style = colorMap[color];

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ duration: 0.35 }}
      className={`relative overflow-hidden rounded-2xl border ${style.border} ${style.bg} p-6 shadow-xl ${style.glow} duration-300 backdrop-blur-md`}
    >
      {/* Laser highlight line accent */}
      <div className={`absolute top-0 left-0 right-0 h-[2.5px] ${style.accent}`} />
      
      {/* Decorative cybernetic dot patterns background on the cards */}
      <div className="absolute right-0 bottom-0 top-0 w-24 bg-[radial-gradient(#1e293b_1.2px,transparent_1.2px)] bg-[size:10px_10px] opacity-15 pointer-events-none" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-slate-400 font-display">
            {title}
          </p>
          <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {value}
            </span>
            {unit && (
              <span className="ml-1 text-base font-semibold text-slate-400">
                {unit}
              </span>
            )}
          </div>
        </div>
        <div className={`rounded-lg p-2.5 bg-slate-900/60 ${style.text} border border-slate-800`}>
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-900/60 pt-3">
        <span className="text-xs text-slate-400">{subtitle}</span>
        {trend && (
          <span
            className={`text-xs font-medium font-mono ${
              trendType === "positive"
                ? "text-emerald-400"
                : trendType === "negative"
                ? "text-rose-400"
                : "text-slate-400"
            }`}
          >
            {trend}
          </span>
        )}
      </div>
    </motion.div>
  );
}
