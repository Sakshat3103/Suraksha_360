import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LocaleCode = "en" | "hi" | "bn" | "ta" | "te" | "mr";

export const SUPPORTED_LOCALES: { code: LocaleCode; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
];

interface LocaleState {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
}

// Persisted so the traveller's language choice survives a reload — an
// AI-translated safety app that forgets your language every refresh isn't
// actually usable in an emergency.
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (l) => set({ locale: l }),
    }),
    { name: "suraksha360-locale" }
  )
);
