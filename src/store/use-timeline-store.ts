import { create } from "zustand";

export interface TimelineEvent {
  id: string;
  time: string; // ISO
  label: string;
  risk?: number;
  kind: "start" | "risk" | "stop" | "deviation" | "report" | "recommendation" | "guardian" | "end";
}

interface TimelineState {
  events: TimelineEvent[];
  addEvent: (label: string, kind: TimelineEvent["kind"], risk?: number) => void;
  reset: () => void;
}

// Powers Feature 7 (AI Journey Timeline) and doubles as the event feed the
// Guardian Dashboard reads "intelligent alerts" from — one source of truth
// for "what happened during this journey and when".
export const useTimelineStore = create<TimelineState>((set) => ({
  events: [],
  addEvent: (label, kind, risk) =>
    set((s) => ({
      events: [...s.events, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: new Date().toISOString(), label, kind, risk }],
    })),
  reset: () => set({ events: [] }),
}));
