"use client";

import { motion } from "framer-motion";
import { ChevronRight, MapPinned, ShieldAlert, Users2 } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/use-t";

const routes = [
  { name: "Via MG Road", eta: "12 min", score: 92, tone: "safe" as const },
  { name: "Via Ring Road", eta: "9 min", score: 61, tone: "warn" as const },
];

export function ProductShowcase() {
  const { t } = useT();
  return (
    <section id="product" className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <SectionHeading
        eyebrow={t("landing.productEyebrow")}
        title={t("landing.productTitle")}
        description={t("landing.productDesc")}
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
              <p className="text-xs text-muted-foreground">{t("landing.goodEvening")}</p>
              <p className="text-lg font-semibold">Shreya S.</p>
            </div>
            <Badge variant="success">{t("landing.guardianOnline")}</Badge>
          </div>

          <div className="mt-6 space-y-3">
            {routes.map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4"
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
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("landing.safetyScore")}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-brand/10 border border-foreground/10 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-gradient-brand text-white">
                <ShieldAlert className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium">{t("landing.safetyCheckIn")}</p>
                <p className="text-xs text-muted-foreground">{t("landing.escalatesAutomatically")}</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            {t("landing.tapForSilentSos")}
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
              title: t("landing.featureRouteTitle"),
              body: t("landing.featureRouteBody"),
            },
            {
              icon: Users2,
              title: t("landing.featureCircleTitle"),
              body: t("landing.featureCircleBody"),
            },
            {
              icon: ShieldAlert,
              title: t("landing.featureSosTitle"),
              body: t("landing.featureSosBody"),
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
