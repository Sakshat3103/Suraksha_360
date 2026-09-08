import { create } from "zustand";

// Anonymized packets pushed toward the (mock) government control room when
// a traveller's SOS escalates. Deliberately carries NO name/phone/contact
// info — only what a real dispatch triage would need: rough area, risk
// level, timestamp. In production this would be a real POST to a police
// dispatch API; here it's an in-memory store the Authority dashboard reads
// from directly, so the "send to govt" flow is demoable end-to-end.
export interface AnonymousSosPacket {
  id: string;
  areaLabel: string;
  lat: number;
  lng: number;
  riskScore: number;
  createdAt: string; // ISO
}

interface AuthorityFeedState {
  packets: AnonymousSosPacket[];
  addPacket: (p: Omit<AnonymousSosPacket, "id" | "createdAt">) => void;
  clear: () => void;
}

export const useAuthorityFeedStore = create<AuthorityFeedState>((set) => ({
  packets: [],
  addPacket: (p) =>
    set((s) => ({
      packets: [{ ...p, id: `pkt-${Date.now()}`, createdAt: new Date().toISOString() }, ...s.packets].slice(0, 20),
    })),
  clear: () => set({ packets: [] }),
}));
