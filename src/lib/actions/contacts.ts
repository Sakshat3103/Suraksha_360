"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EmergencyContact } from "@/types/database";

export async function getContactsAction(): Promise<EmergencyContact[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface ContactInput {
  name: string;
  relation: string;
  phone: string;
  email?: string;
  is_primary?: boolean;
  notify_sms?: boolean;
  notify_call?: boolean;
}

export async function createContactAction(input: ContactInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("emergency_contacts").insert({
    user_id: user.id,
    ...input,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
}

export async function deleteContactAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
}

export async function updateContactAction(id: string, input: Partial<ContactInput>) {
  const supabase = await createClient();
  const { error } = await supabase.from("emergency_contacts").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
}
