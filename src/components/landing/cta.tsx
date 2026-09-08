"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-t";

export function Cta() {
  const { t } = useT();
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="glass-strong relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16"
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-violet/30 blur-[100px]" />
        <h2 className="relative text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("landing.ctaTitle")}
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
          {t("landing.ctaDesc")}
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="glow" asChild>
            <Link href="/signup">
              {t("landing.createAccount")} <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">{t("landing.alreadyHaveOne")}</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
