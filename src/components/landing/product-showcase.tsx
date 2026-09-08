"use client";

import { motion } from "framer-motion";
import { ChevronRight, MapPinned, ShieldAlert, Users2 } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";

const routes = [
  { name: "Via MG Road", eta: "12 min", score: 92, tone: "safe" as const },
  { name: "Via Ring Road", eta: "9 min", score: 61, tone: "warn" as const },
];

export function ProductShowcase() {
  return (
    <section id="product" className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Inside the app"
        title="One journey, three people watching."
        description="The traveller, their trusted circle, and the control room all see the same journey unfold live — with only the access each of them needs."
        className="mb-16"
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Phone-style mock */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="glass relative overflow-hidden rounded-2xl p-6 shadow-2xl shadow-black/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Good evening</p>
              <p className="text-lg font-semibold">Shreya S.</p>
            </div>
            <Badge variant="success">Guardian online</Badge>
          </div>

          <div className="mt-6 space-y-3">
            {routes.map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      "flex size-10 items-center justify-center rounded-lg " +
                      (r.tone === "safe"
                        ? "bg-brand-emerald/15 text-brand-emerald"
                        : "bg-amber-400/15 text-amber-300")
                    }
                  >
                    <MapPinned className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.eta} · Bus</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{r.score}<span className="text-muted-foreground">/100</span></p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">safety score</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-brand/10 border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-gradient-brand text-white">
                <ShieldAlert className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Safety check in 4:30</p>
                <p className="text-xs text-muted-foreground">Escalates automatically if unanswered</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            tap phone back ×2 for silent SOS
          </p>
        </motion.div>

        {/* Feature bullets beside it */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col gap-4"
        >
          {[
            {
              icon: MapPinned,
              title: "AI safe route recommendation",
              body: "Every route is scored on lighting, crowd history, and time of day — not just distance and speed.",
            },
            {
              icon: Users2,
              title: "Trusted circle, time-boxed",
              body: "Guardians see your live journey only while it's active — automatically revoked the moment you're safe.",
            },
            {
              icon: ShieldAlert,
              title: "Silent, gesture-based SOS",
              body: "A double-tap or a quiet phrase escalates instantly — no need to unlock or even look at your phone.",
            },
          ].map((f) => (
            <div key={f.title} className="glass flex gap-4 rounded-2xl p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white">
                <f.icon className="size-5" />
              </span>
              <div>
                <p className="font-medium">{f.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
