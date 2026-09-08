"use server";

import { createClient } from "@/lib/supabase/server";

export interface AuthResult {
  success: boolean;
  message?: string;
}

export async function signInAction(email: string, password: string): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true };
}

export async function signUpAction(
  fullName: string,
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true };
}

export async function signOutAction(): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function requestPasswordResetAction(email: string): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  if (error) return { success: false, message: error.message };
  return { success: true };
}
