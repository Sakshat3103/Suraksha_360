"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, ShieldCheck, Radio, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.6, ease: "easeOut" as const },
  }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-40 pb-24 sm:pt-48 sm:pb-32">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-brand-violet/25 blur-[120px]" />
      <div className="pointer-events-none absolute top-40 -right-20 h-96 w-96 rounded-full bg-brand-blue/20 blur-[100px] animate-float" />
      <div className="pointer-events-none absolute top-20 -left-20 h-72 w-72 rounded-full bg-brand-emerald/15 blur-[100px] animate-float [animation-delay:-3s]" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 text-center">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
          <Badge className="glass gap-1.5 border-foreground/10 bg-foreground/[0.04] px-3.5 py-1.5 text-xs font-medium text-foreground">
            <Sparkles className="size-3.5 text-brand-emerald" />
            AI risk prediction · live in 40+ cities
          </Badge>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="mt-7 text-balance text-4xl font-semibold tracking-tight sm:text-6xl md:text-7xl"
        >
          Safety that predicts
          <br />
          <span className="text-gradient bg-[length:200%_auto] animate-gradient-x">
            the danger before it arrives.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg"
        >
          Suraksha360 is the AI-powered urban safety platform that scores every route before you
          walk it, watches over your commute in real time, and closes the loop from silent SOS to
          verified police response — in under 90 seconds.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button size="lg" variant="glow" asChild>
            <Link href="/signup">
              Start a safe journey
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#product">See it in action</Link>
          </Button>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={4}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-brand-emerald" /> AES-256 encrypted evidence
          </span>
          <span className="flex items-center gap-1.5">
            <Radio className="size-3.5 text-brand-blue" /> 24/7 control room monitoring
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-brand-violet" /> Route + transit safety scoring
          </span>
        </motion.div>
      </div>
    </section>
  );
}
