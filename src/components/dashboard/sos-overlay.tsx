"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LifeBuoy, Loader2, Mic, Navigation2, PhoneCall, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSosStore } from "@/store/use-sos-store";
import { useJourneyStore } from "@/store/use-journey-store";
import { useAuthorityFeedStore } from "@/store/use-authority-feed-store";
import { useContacts } from "@/hooks/use-contacts";
import { useLiveLocation } from "@/hooks/use-live-location";
import { fetchSafeZones, googleMapsDirectionsUrl, type SafeZone } from "@/lib/geo";
import { requestAI } from "@/lib/ai/client";
import { useT } from "@/lib/i18n/use-t";

// Same priority a real emergency responder would use: an actual government
// facility (police/hospital) beats a private business every time, even if
// the business happens to be a little closer.
const SAFE_HAVEN_PRIORITY: Record<SafeZone["category"], number> = {
  police: 5,
  hospital: 5,
  metro: 3,
  college: 2,
  hotel: 2,
  store: 1,
  fuel: 1,
  temple: 1,
};

function pickNearestGovtSafeHaven(zones: SafeZone[]): SafeZone | null {
  if (zones.length === 0) return null;
  return [...zones].sort((a, b) => {
    const pDiff = SAFE_HAVEN_PRIORITY[b.category] - SAFE_HAVEN_PRIORITY[a.category];
    return pDiff !== 0 ? pDiff : a.distanceMeters - b.distanceMeters;
  })[0];
}

const ESCALATION_SECONDS = 10;

// Full-screen SOS confirmation + escalation overlay. Triggered by any
// silent-SOS gesture (double-tap, shake) or the manual SOS button. Voice
// recording is simulated as an on-screen indicator — a browser tab can
// request the microphone (getUserMedia) but cannot silently record once
// the tab is backgrounded or the phone is locked, which real silent-SOS
// audio capture requires; a native app is the honest way to do that part.
export function SosOverlay() {
  const { status, trigger, cancel, escalate } = useSosStore();
  const { t } = useT();
  const [secondsLeft, setSecondsLeft] = React.useState(ESCALATION_SECONDS);
  const route = useJourneyStore((s) => s.route);
  const destination = useJourneyStore((s) => s.destination);
  const addPacket = useAuthorityFeedStore((s) => s.addPacket);
  const { data: contacts } = useContacts();
  const primaryContact = contacts?.find((c) => c.is_primary) ?? contacts?.[0];
  const { position: liveOrigin, getOnce: getLiveLocationOnce } = useLiveLocation();
  const [nearestSafeHaven, setNearestSafeHaven] = React.useState<SafeZone | null>(null);
  const [safeHavenReason, setSafeHavenReason] = React.useState<string | null>(null);
  const [loadingSafeHaven, setLoadingSafeHaven] = React.useState(false);

  const origin = route ? { lat: route.originLat, lng: route.originLng } : liveOrigin;

  React.useEffect(() => {
    if (status !== "escalated") return;
    if (!origin) {
      getLiveLocationOnce();
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with the async safe-haven fetch below
    setLoadingSafeHaven(true);
    fetchSafeZones(origin, 2000)
      .then((zones) => {
        if (cancelled) return;
        const best = pickNearestGovtSafeHaven(zones);
        setNearestSafeHaven(best);
        if (best) {
          return requestAI("safe-haven", { label: best.label, category: best.category, distanceMeters: best.distanceMeters }).then(
            (res) => { if (!cancelled) setSafeHavenReason(res.text); }
          );
        }
      })
      .finally(() => { if (!cancelled) setLoadingSafeHaven(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, origin?.lat, origin?.lng]);

  React.useEffect(() => {
    if (status !== "triggered") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the countdown at the start of each new SOS trigger
    setSecondsLeft(ESCALATION_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          escalate();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, escalate]);

  React.useEffect(() => {
    if (status === "escalated") {
      toast.error("SOS escalated — your trusted circle has been alerted with your live location");
      // Anonymous packet to the (mock) government control room — no name,
      // phone, or contact details, only rough location + risk for triage.
      addPacket({
        areaLabel: destination ? `Near ${destination}` : "Unknown area",
        lat: route?.originLat ?? 26.8408,
        lng: route?.originLng ?? 75.5581,
        riskScore: 92,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === "idle" || status === "resolved") return null;

  const triggerLabel: Record<string, string> = {
    manual: "Manual SOS",
    "double-tap": "Double-tap SOS",
    shake: "Shake SOS",
    "being-followed": "I'm being followed",
    "voice-detected": "AI detected an emergency in your voice",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-destructive/30 bg-[var(--popover)] p-6 text-center shadow-2xl"
        >
          <button
            onClick={cancel}
            className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground"
            aria-label="Cancel SOS"
          >
            <X className="size-4" />
          </button>

          <span className="flex size-16 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <ShieldAlert className="size-8 animate-pulse" />
          </span>

          <div>
            <p className="text-lg font-semibold">
              {status === "escalated" ? t("sos.escalated") : trigger ? triggerLabel[trigger] : t("sos.triggered")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {status === "escalated"
                ? "Your guardians have your live location. Call emergency services if you need immediate help."
                : "Your live location is being shared with your trusted circle. Cancel now if this was a mistake."}
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            <Mic className="size-3.5 animate-pulse" /> {t("sos.voiceRecorderOn")}
          </div>

          {status === "triggered" && (
            <>
              <div className="flex flex-col items-center gap-1">
                <p className="text-4xl font-bold tabular-nums text-destructive">{secondsLeft}</p>
                <p className="text-xs text-muted-foreground">seconds until escalation</p>
              </div>
              <Button variant="secondary" size="lg" className="w-full" onClick={cancel}>
                {t("sos.imSafeCancel")}
              </Button>
            </>
          )}

          {status === "escalated" && (
            <div className="flex w-full flex-col gap-2">
              {primaryContact && (
                <Button asChild variant="destructive" size="lg" className="w-full">
                  <a href={`tel:${primaryContact.phone}`}>
                    <PhoneCall className="size-4" /> Call {primaryContact.name} now
                  </a>
                </Button>
              )}
              <Button asChild variant={primaryContact ? "outline" : "destructive"} size="lg" className="w-full">
                <a href="tel:112">
                  <PhoneCall className="size-4" /> {t("sos.callEmergency")}
                </a>
              </Button>

              <div className="mt-1 flex flex-col gap-1.5 rounded-xl border border-brand-emerald/30 bg-brand-emerald/5 p-3 text-left">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-emerald">
                  <LifeBuoy className="size-3.5" /> {t("sos.nearestSafeLocation")}
                </p>
                {loadingSafeHaven ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Finding the nearest police station or hospital…
                  </span>
                ) : nearestSafeHaven ? (
                  <>
                    <p className="text-sm font-medium">
                      {nearestSafeHaven.label}{" "}
                      <span className="font-normal capitalize text-muted-foreground">
                        · {nearestSafeHaven.category} · {Math.round(nearestSafeHaven.distanceMeters)}m away
                      </span>
                    </p>
                    {safeHavenReason && <p className="text-xs text-muted-foreground">{safeHavenReason}</p>}
                    <Button asChild variant="outline" size="sm" className="mt-1 w-full gap-1.5">
                      <a href={googleMapsDirectionsUrl(origin!, { lat: nearestSafeHaven.lat, lng: nearestSafeHaven.lng }, "walking")} target="_blank" rel="noreferrer">
                        <Navigation2 className="size-3.5" /> {t("sos.navigateNow")}
                      </a>
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No verified safe zone found nearby yet — call 112 for the fastest response.</p>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground">
                An anonymous safety packet (location + risk level only) was sent to the control room.
              </p>
              <Button variant="secondary" size="lg" className="w-full" onClick={cancel}>
                {t("sos.imSafeResolve")}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
