"use client";

import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/use-t";

const STAT_DEFS = [
  { value: 40, suffix: "+", labelKey: "landing.statCities" },
  { value: 90, suffix: "s", labelKey: "landing.statDispatch" },
  { value: 2.4, suffix: "M", labelKey: "landing.statScores" },
  { value: 99.9, suffix: "%", labelKey: "landing.statReliability" },
];

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 1.4, bounce: 0 });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  useEffect(() => {
    const unsub = springValue.on("change", (latest) => {
      if (!ref.current) return;
      const decimals = value % 1 !== 0 ? 1 : 0;
      ref.current.textContent = latest.toFixed(decimals) + suffix;
    });
    return unsub;
  }, [springValue, suffix, value]);

  return <span ref={ref}>0{suffix}</span>;
}

export function Stats() {
  const { t } = useT();
  const stats = STAT_DEFS.map((s) => ({ ...s, label: t(s.labelKey) }));
  return (
    <section id="stats" className="relative mx-auto max-w-6xl px-4 py-20">
      <div className="glass-strong grid grid-cols-2 gap-8 rounded-3xl px-6 py-12 sm:grid-cols-4 sm:px-12">
        {stats.map((s, i) => (
          <motion.div
            key={s.labelKey}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="flex flex-col items-center text-center gap-1.5"
          >
            <span className="text-gradient text-3xl font-bold tabular-nums sm:text-4xl">
              <Counter value={s.value} suffix={s.suffix} />
            </span>
            <span className="text-xs text-muted-foreground sm:text-sm">{s.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
