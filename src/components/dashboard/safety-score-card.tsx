"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requestAI } from "@/lib/ai/client";
import type { RiskResult } from "@/lib/risk-engine";
import { scoreBand } from "@/lib/risk-engine";

const RADIUS = 42;
const CIRC = 2 * Math.PI * RADIUS;

export function SafetyScoreCard({ risk, destination }: { risk: RiskResult; destination: string }) {
  const { score, reasons, confidence } = risk;
  const band = scoreBand(score);
  const [explanation, setExplanation] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing the loading flag with the async AI call below
    setLoading(true);
    requestAI("risk", { score, reasons, destination, confidence }).then((res) => {
      if (!cancelled) {
        setExplanation(res.text);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const toneColor =
    band.tone === "safe" ? "#4FD9B4" : band.tone === "moderate" ? "#FBBF24" : "#F87171";

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 -left-16 size-56 rounded-full bg-brand-violet/10 blur-3xl" />
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4.5 text-brand-violet" />
          AI Safety Score
        </CardTitle>
        <span className="text-[11px] text-muted-foreground">Confidence {confidence}%</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative mx-auto flex size-32 shrink-0 items-center justify-center">
          <svg viewBox="0 0 96 96" className="size-32 -rotate-90">
            <circle cx="48" cy="48" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <motion.circle
              cx="48"
              cy="48"
              r={RADIUS}
              fill="none"
              stroke={toneColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC }}
              animate={{ strokeDashoffset: CIRC - (score / 100) * CIRC }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={score}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-3xl font-bold tabular-nums"
              >
                {score}%
              </motion.span>
            </AnimatePresence>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{band.label}</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Why?</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {reasons.map((r) => (
                <li key={r.label} className="flex items-center gap-2 text-sm">
                  {r.positive ? (
                    <Check className="size-3.5 shrink-0 text-brand-emerald" />
                  ) : (
                    <X className="size-3.5 shrink-0 text-destructive" />
                  )}
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-xs leading-relaxed",
              "border-white/10 bg-white/[0.03] text-muted-foreground"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3 animate-pulse text-brand-violet" /> AI is reasoning about your score…
              </span>
            ) : (
              explanation
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
