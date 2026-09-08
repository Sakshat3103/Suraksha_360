import { create } from "zustand";

export type SosStatus = "idle" | "triggered" | "escalated" | "resolved";
export type SosTrigger = "manual" | "double-tap" | "shake" | "being-followed" | "voice-detected";

interface SosState {
  status: SosStatus;
  trigger: SosTrigger | null;
  triggeredAt: number | null;
  voiceRecording: boolean;
  fire: (trigger: SosTrigger) => void;
  escalate: () => void;
  cancel: () => void;
}

// A real, in-browser silent-SOS store. Escalation is time-based (see
// SosOverlay's countdown): if the traveller doesn't cancel within the
// window, status flips to "escalated" and the UI offers a one-tap call to
// emergency services (a tel: link — the browser can't place the call
// itself, only hand off to the phone's dialer).
export const useSosStore = create<SosState>((set) => ({
  status: "idle",
  trigger: null,
  triggeredAt: null,
  voiceRecording: false,
  fire: (trigger) =>
    set({ status: "triggered", trigger, triggeredAt: Date.now(), voiceRecording: true }),
  escalate: () => set({ status: "escalated" }),
  cancel: () => set({ status: "idle", trigger: null, triggeredAt: null, voiceRecording: false }),
}));
