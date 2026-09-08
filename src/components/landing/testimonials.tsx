"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useT } from "@/lib/i18n/use-t";

export function Testimonials() {
  const { t } = useT();
  const testimonials = [
    { name: "Ananya Mehta", role: t("landing.t1Role"), quote: t("landing.t1Quote") },
    { name: "Priya Sharma", role: t("landing.t2Role"), quote: t("landing.t2Quote") },
    { name: "Insp. R. Verma", role: t("landing.t3Role"), quote: t("landing.t3Quote") },
    { name: "Meera Iyer", role: t("landing.t4Role"), quote: t("landing.t4Quote") },
  ];
  return (
    <section id="testimonials" className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <SectionHeading
        eyebrow={t("landing.testimonialsEyebrow")}
        title={t("landing.testimonialsTitle")}
        className="mb-16"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 2) * 0.1 }}
            className="glass flex flex-col gap-4 rounded-2xl p-6"
          >
            <div className="flex gap-0.5 text-amber-300">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star key={idx} className="size-3.5 fill-current" />
              ))}
            </div>
            <p className="text-pretty text-sm leading-relaxed text-foreground/90">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-auto flex items-center gap-3 pt-2">
              <Avatar>
                <AvatarFallback>
                  {t.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
