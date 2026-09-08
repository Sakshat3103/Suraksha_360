import { create } from "zustand";

export const AUTHORITY_DEMO_PASSWORD = "patrol360";

interface AuthorityState {
  isAuthed: boolean;
  officerId: string | null;
  login: (officerId: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthorityStore = create<AuthorityState>((set) => ({
  isAuthed: false,
  officerId: null,
  login: (officerId, password) => {
    if (!officerId.trim() || password !== AUTHORITY_DEMO_PASSWORD) return false;
    set({ isAuthed: true, officerId: officerId.trim() });
    return true;
  },
  logout: () => set({ isAuthed: false, officerId: null }),
}));
