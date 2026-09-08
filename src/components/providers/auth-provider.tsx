"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/use-auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);

  React.useEffect(() => {
    const supabase = createClient();

    const loadProfile = async (userId: string) => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      setProfile(data ?? null);
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) loadProfile(user.id);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return <>{children}</>;
}
