import type { GeoPoint } from "@/lib/geo";

export type TravellerStatus = "normal" | "deviated" | "overdue" | "escalated";

export interface TrackedTraveller {
  id: string;
  label: string;
  position: GeoPoint;
  status: TravellerStatus;
  mode: string;
  lastPing: string;
}

export const MOCK_TRACKED_TRAVELLERS: TrackedTraveller[] = [
  { id: "A17", label: "Traveller #A17", position: { lat: 26.8408, lng: 75.5622 }, status: "normal", mode: "walking", lastPing: "just now" },
  { id: "B04", label: "Traveller #B04", position: { lat: 26.8362, lng: 75.5541 }, status: "deviated", mode: "bus", lastPing: "40s ago" },
  { id: "C29", label: "Traveller #C29", position: { lat: 26.8391, lng: 75.5488 }, status: "overdue", mode: "cab", lastPing: "3 min ago" },
];

export const STATUS_META: Record<TravellerStatus, { color: string; label: string }> = {
  normal: { color: "#4FD9B4", label: "On track" },
  deviated: { color: "#FBBF24", label: "Route deviation" },
  overdue: { color: "#F97316", label: "Overdue check-in" },
  escalated: { color: "#F87171", label: "SOS escalated" },
};
