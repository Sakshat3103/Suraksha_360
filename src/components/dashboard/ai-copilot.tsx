"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageCircleHeart, Send, ShieldHalf, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJourneyStore } from "@/store/use-journey-store";
import { useCommunityStore } from "@/store/use-community-store";
import { fetchSafeZones, haversineMeters, type SafeZone } from "@/lib/geo";
import { requestAI } from "@/lib/ai/client";
import { computeSafetyScore } from "@/lib/risk-engine";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-t";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function AICopilot() {
  const { t } = useT();
  const SUGGESTIONS = [
    t("copilot.sugAmISafe"),
    t("copilot.sugFollowed"),
    t("copilot.sugNearestPolice"),
    t("copilot.sugSaferRoute"),
  ];
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { role: "assistant", text: t("copilot.welcomeMessage") },
  ]);
  const [battery, setBattery] = React.useState<number | null>(null);
  const [safeZones, setSafeZones] = React.useState<SafeZone[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const { status, destination, route } = useJourneyStore();
  const reports = useCommunityStore((s) => s.reports);

  React.useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
    nav.getBattery?.().then((b) => setBattery(Math.round(b.level * 100)));
  }, []);

  React.useEffect(() => {
    if (!route) return;
    let cancelled = false;
    fetchSafeZones({ lat: route.originLat, lng: route.originLng }).then((zones) => {
      if (!cancelled) setSafeZones(zones);
    });
    return () => {
      cancelled = true;
    };
  }, [route]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const safetyScore = React.useMemo(() => {
    if (!route) return null;
    return computeSafetyScore({
      hour: new Date().getHours(),
      distanceRemainingMeters: haversineMeters(
        { lat: route.originLat, lng: route.originLng },
        { lat: route.destinationLat, lng: route.destinationLng }
      ),
      totalDistanceMeters: Math.max(1, route.durationSeconds * 1.3),
      elapsedSeconds: 0,
      expectedDurationSeconds: route.durationSeconds,
      routeDeviationMeters: 0,
      unexpectedStopSeconds: 0,
      nearbySafeZoneCount: safeZones.length,
      nearbyPoliceOrHospital: safeZones.some((z) => z.category === "police" || z.category === "hospital"),
      communityReportsNearby: reports.length,
      isEscalated: status === "escalated",
    }).score;
  }, [route, safeZones, reports.length, status]);

  const etaMinutes = route ? Math.round(route.durationSeconds / 60) : null;

  async function handleSend(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setSending(true);

    const res = await requestAI("copilot", {
      journeyActive: status !== "idle",
      destination,
      etaMinutes,
      safetyScore,
      batteryPercent: battery,
      nearbySafeZones: safeZones.map((z) => ({ label: z.label, category: z.category, distanceMeters: z.distanceMeters })),
      recentReportsNearby: reports.length,
      message,
    });

    setMessages((m) => [...m, { role: "assistant", text: res.text }]);
    setSending(false);
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.94 }}
        className="fixed right-5 bottom-5 z-[110] flex size-14 items-center justify-center rounded-full bg-gradient-brand text-white shadow-2xl shadow-[oklch(0.55_0.2_280_/_0.4)]"
        aria-label="Open AI Safety Copilot"
      >
        {open ? <X className="size-6" /> : <MessageCircleHeart className="size-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="glass-strong fixed right-5 bottom-24 z-[110] flex h-[520px] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-foreground/10 shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-gradient-brand text-white">
                <ShieldHalf className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t("copilot.title")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {status !== "idle" ? `${t("copilot.trackingJourney")} ${destination}` : t("copilot.noActiveJourney")}
                </p>
              </div>
            </div>

            <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "self-end bg-gradient-brand text-white"
                      : "self-start border border-foreground/10 bg-foreground/[0.04]"
                  )}
                >
                  {m.text}
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-1.5 self-start text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> {t("copilot.thinking")}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 border-t border-foreground/10 px-3 pt-2.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("copilot.inputPlaceholder")}
                className="flex-1 rounded-full border border-foreground/10 bg-foreground/[0.04] px-3.5 py-2 text-sm outline-none focus:border-brand-blue/50"
              />
              <Button type="submit" size="icon" variant="glow" disabled={sending}>
                <Send className="size-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
