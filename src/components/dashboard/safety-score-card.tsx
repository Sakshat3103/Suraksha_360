"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Check, ChevronDown, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requestAI } from "@/lib/ai/client";
import type { RiskResult } from "@/lib/risk-engine";
import { scoreBand } from "@/lib/risk-engine";
import { ML_MODEL_METRICS } from "@/lib/ml-safety-model";
import { useT } from "@/lib/i18n/use-t";

const RADIUS = 42;
const CIRC = 2 * Math.PI * RADIUS;

export function SafetyScoreCard({ risk, destination }: { risk: RiskResult; destination: string }) {
  const { score, reasons, confidence } = risk;
  const band = scoreBand(score);
  const [explanation, setExplanation] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showModelInfo, setShowModelInfo] = React.useState(false);
  const { t } = useT();

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
          {t("dashboard.aiSafetyScore")}
        </CardTitle>
        <span className="text-[11px] text-muted-foreground">{t("dashboard.confidence")} {confidence}%</span>
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
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">{t("dashboard.why")}</p>
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
              "border-foreground/10 bg-foreground/[0.03] text-muted-foreground"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3 animate-pulse text-brand-violet" /> {t("dashboard.aiReasoning")}
              </span>
            ) : (
              explanation
            )}
          </div>

          <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/5">
            <button
              type="button"
              onClick={() => setShowModelInfo((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-brand-blue">
                <BrainCircuit className="size-3.5" />
                Powered by a trained ML model
              </span>
              <ChevronDown className={cn("size-3.5 text-brand-blue transition-transform", showModelInfo && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {showModelInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-3 pb-3 text-[11px] text-muted-foreground">
                    <div>
                      <span className="font-semibold text-foreground">{Math.round(ML_MODEL_METRICS.recall * 100)}%</span> risk-detection recall
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">{Math.round(ML_MODEL_METRICS.accuracy * 100)}%</span> test accuracy
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">{ML_MODEL_METRICS.rfR2.toFixed(2)}</span> R² (score regressor)
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">{ML_MODEL_METRICS.trainingSize.toLocaleString()}</span> training samples
                    </div>
                    <div className="col-span-2 pt-1 leading-relaxed">
                      Logistic regression + random forest, cross-validated, blending a real NCRB
                      (National Crime Records Bureau) crime-index feature with journey behavior signals.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
