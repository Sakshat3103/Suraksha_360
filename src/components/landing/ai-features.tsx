"use client";

import { motion } from "framer-motion";
import {
  Route,
  Mic,
  Brain,
  Users,
  Bus,
  ScanEye,
  Eye,
} from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { useT } from "@/lib/i18n/use-t";

export function AiFeatures() {
  const { t } = useT();
  const features = [
    { icon: Route, title: t("landing.aiFeature1Title"), body: t("landing.aiFeature1Body") },
    { icon: ScanEye, title: t("landing.aiFeature2Title"), body: t("landing.aiFeature2Body") },
    { icon: Mic, title: t("landing.aiFeature3Title"), body: t("landing.aiFeature3Body") },
    { icon: Brain, title: t("landing.aiFeature4Title"), body: t("landing.aiFeature4Body") },
    { icon: Users, title: t("landing.aiFeature5Title"), body: t("landing.aiFeature5Body") },
    { icon: Bus, title: t("landing.aiFeature6Title"), body: t("landing.aiFeature6Body") },
    { icon: Eye, title: t("landing.aiFeature7Title"), body: t("landing.aiFeature7Body") },
  ];
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <SectionHeading
        eyebrow={t("landing.aiEyebrow")}
        title={t("landing.aiTitle")}
        description={t("landing.aiDesc")}
        className="mb-16"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            className="glass group relative overflow-hidden rounded-2xl p-6 transition-transform hover:-translate-y-1"
          >
            <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-brand-blue/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-0" />
            <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-lg shadow-[oklch(0.55_0.2_280_/_0.35)]">
              <f.icon className="size-5" />
            </span>
            <p className="font-medium">{f.title}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
