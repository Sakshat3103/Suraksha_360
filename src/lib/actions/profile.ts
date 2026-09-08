"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UserSettings } from "@/types/database";

export interface ProfileInput {
  full_name?: string;
  phone?: string;
  city?: string;
  bio?: string;
}

export async function updateProfileAction(input: ProfileInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}

export async function getSettingsAction(): Promise<UserSettings | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
  return data;
}

export async function updateSettingsAction(input: Partial<UserSettings>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("user_settings")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}
