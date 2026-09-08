"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, ShieldAlert, Loader2, Hospital, Building2 } from "lucide-react";
import { useSosStore } from "@/store/use-sos-store";
import { useLiveLocation } from "@/hooks/use-live-location";
import { fetchSafeZones, type SafeZone } from "@/lib/geo";
import { useSpeechTranscript } from "@/lib/voice/use-speech-transcript";
import { classifyEmergencyVoice, type EmergencyVoiceResult } from "@/lib/voice/emergency-voice-client";
import { cn } from "@/lib/utils";

const CONFIDENCE_THRESHOLD = 0.8;
const CATEGORY_LABEL: Record<EmergencyVoiceResult["category"], string> = {
  harassment: "Harassment",
  stalking: "Being followed",
  kidnapping: "Kidnapping risk",
  assault: "Assault",
  panic: "Panic / distress",
  medical: "Medical emergency",
  accident: "Accident",
  unknown: "Unknown",
};

/**
 * AI Emergency Voice Detector — NOT a chatbot. Listens continuously (once
 * armed), sends each finalized sentence to Gemini for danger
 * classification, and on a confident emergency (confidence > 0.8):
 * fires the existing SOS flow (countdown/escalation/nearest-safe-haven —
 * all already built into SosOverlay), starts an on-device audio recording,
 * grabs live location, and surfaces a clear emergency banner naming the
 * detected category plus the nearest police station and hospital.
 */
export function EmergencyVoiceDetector() {
  const fire = useSosStore((s) => s.fire);
  const sosStatus = useSosStore((s) => s.status);
  const { position, getOnce } = useLiveLocation();
  const { supported, interimTranscript, finalTranscript, start, stop, clearFinalTranscript } =
    useSpeechTranscript();

  const [armed, setArmed] = React.useState(false);
  const [classifying, setClassifying] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<EmergencyVoiceResult | null>(null);
  const [detectedOpen, setDetectedOpen] = React.useState(false);
  const [nearby, setNearby] = React.useState<{ police: SafeZone | null; hospital: SafeZone | null }>({
    police: null,
    hospital: null,
  });
  const [recording, setRecording] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);

  const startRecording = React.useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.start();
        setRecording(true);
      })
      .catch(() => {
        // Mic permission denied — SOS still proceeds without an audio clip.
      });
  }, []);

  const stopRecording = React.useCallback(() => {
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const triggerEmergency = React.useCallback(() => {
    setDetectedOpen(true);
    if (sosStatus === "idle") fire("voice-detected");
    getOnce();
    startRecording();
    // "Notify guardians": the existing SOS overlay already alerts the
    // trusted circle and sends the anonymized control-room packet once
    // escalation fires — this just guarantees we have a location to share
    // as early as possible rather than waiting on that flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosStatus]);

  // Classify each finalized sentence as it lands.
  React.useEffect(() => {
    if (!finalTranscript) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off the async classification triggered by a new transcript
    setClassifying(true);
    classifyEmergencyVoice(finalTranscript).then((result) => {
      if (cancelled) return;
      setClassifying(false);
      setLastResult(result);
      if (result.emergency && result.confidence > CONFIDENCE_THRESHOLD) {
        triggerEmergency();
      }
      clearFinalTranscript();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalTranscript]);

  React.useEffect(() => {
    if (!position) return;
    let cancelled = false;
    fetchSafeZones(position, 3000).then((zones) => {
      if (cancelled) return;
      const police = zones.filter((z) => z.category === "police").sort((a, b) => a.distanceMeters - b.distanceMeters)[0] ?? null;
      const hospital = zones.filter((z) => z.category === "hospital").sort((a, b) => a.distanceMeters - b.distanceMeters)[0] ?? null;
      setNearby({ police, hospital });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng]);

  React.useEffect(() => {
    if (sosStatus === "idle" && detectedOpen) {
      // User cancelled/resolved from the SOS overlay — clear our banner too.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local banner state to the SOS store resetting externally
      setDetectedOpen(false);
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosStatus]);

  function toggleArmed() {
    if (armed) {
      setArmed(false);
      stop();
    } else {
      setArmed(true);
      start();
    }
  }

  if (!supported) return null;

  return (
    <>
      <motion.button
        onClick={toggleArmed}
        whileTap={{ scale: 0.94 }}
        className={cn(
          "fixed bottom-5 left-5 z-[110] flex size-14 items-center justify-center rounded-full text-white shadow-2xl transition-colors",
          armed ? "bg-destructive shadow-destructive/40" : "bg-gradient-brand shadow-[oklch(0.55_0.2_280_/_0.4)]"
        )}
        aria-label={armed ? "Stop AI Emergency Voice Detector" : "Start AI Emergency Voice Detector"}
      >
        {armed && (
          <motion.span
            className="absolute inset-0 rounded-full bg-destructive/50"
            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {armed ? <Mic className="relative size-6 animate-pulse" /> : <MicOff className="relative size-6" />}
      </motion.button>

      <AnimatePresence>
        {armed && !detectedOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="glass-strong fixed bottom-24 left-5 z-[110] flex w-[min(320px,calc(100vw-2.5rem))] flex-col gap-2 rounded-2xl border border-foreground/10 p-3.5 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-emerald opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-emerald" />
              </span>
              AI Emergency Voice Detector — listening
            </div>
            <div className="flex min-h-9 items-center gap-2">
              {classifying ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Analyzing…
                </span>
              ) : (
                <p className="min-h-[1.25rem] text-sm text-foreground/90">
                  {interimTranscript || <span className="text-muted-foreground">Say anything — I&apos;m only watching for danger.</span>}
                </p>
              )}
            </div>
            {lastResult && !lastResult.emergency && (
              <p className="text-[11px] text-muted-foreground">No danger detected in last phrase.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detectedOpen && lastResult && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            className="fixed bottom-24 left-5 z-[105] flex w-[min(340px,calc(100vw-2.5rem))] flex-col gap-2.5 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5 animate-pulse" />
              <p className="text-sm font-bold">Emergency detected — {CATEGORY_LABEL[lastResult.category]}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Confidence {Math.round(lastResult.confidence * 100)}% · SOS triggered · location & recording active
            </p>
            {(nearby.police || nearby.hospital) && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-foreground/10 bg-background/40 p-2.5">
                {nearby.police && (
                  <p className="flex items-center gap-1.5 text-xs">
                    <Building2 className="size-3.5 text-brand-blue" />
                    {nearby.police.label} · {Math.round(nearby.police.distanceMeters)}m
                  </p>
                )}
                {nearby.hospital && (
                  <p className="flex items-center gap-1.5 text-xs">
                    <Hospital className="size-3.5 text-brand-emerald" />
                    {nearby.hospital.label} · {Math.round(nearby.hospital.distanceMeters)}m
                  </p>
                )}
              </div>
            )}
            {recording && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-destructive">
                <Mic className="size-3 animate-pulse" /> Recording audio evidence
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
