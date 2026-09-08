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

const features = [
  {
    icon: Route,
    title: "AI Risk Prediction",
    body: "Every street segment is scored hour by hour from lighting, incident density, and crowd history.",
  },
  {
    icon: ScanEye,
    title: "Safe Route Recommendation",
    body: "Routes ranked by a blend of safety and speed, with a plain-language reason for every score.",
  },
  {
    icon: Mic,
    title: "Voice Emergency Detection",
    body: "On-device duress-phrase and scream detection — no need to touch your phone to trigger help.",
  },
  {
    icon: Brain,
    title: "Incident Classification",
    body: "Sensor fusion auto-tags an alert as harassment, medical, or accident to route the right responder.",
  },
  {
    icon: Users,
    title: "Crowd Density Prediction",
    body: "Privacy-preserving crowd estimation flags isolation risk and over-crowding on transit routes.",
  },
  {
    icon: Bus,
    title: "Public Transport Monitoring",
    body: "Bus and metro lines scored at the route, coach, and time-slot level — the industry's first.",
  },
  {
    icon: Eye,
    title: "Explainable AI",
    body: "Every score and escalation decision decomposes into factors a person — or a judge — can verify.",
  },
];

export function AiFeatures() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <SectionHeading
        eyebrow="AI safety engine"
        title="Seven models, one goal: a human reaches you fast."
        description="Suraksha360 doesn't wait for a panic button. It predicts risk before you walk into it, and explains every decision it makes."
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
