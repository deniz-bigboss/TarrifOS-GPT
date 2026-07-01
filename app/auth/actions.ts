"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearMockSession, setMockSession } from "@/lib/auth/session";

function readString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function signUpAction(formData: FormData) {
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const fullName = readString(formData, "fullName");

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient();
    const response = await supabase?.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (response?.error) {
      redirect(`/auth/signup?error=${encodeURIComponent(response.error.message)}`);
    }
  } else {
    await setMockSession(email || "demo@tariffos.local");
  }

  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = readString(formData, "email");
  const password = readString(formData, "password");

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient();
    const response = await supabase?.auth.signInWithPassword({
      email,
      password
    });

    if (response?.error) {
      redirect(`/auth/login?error=${encodeURIComponent(response.error.message)}`);
    }
  } else {
    await setMockSession(email || "demo@tariffos.local");
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient();
    await supabase?.auth.signOut();
  }

  await clearMockSession();
  redirect("/");
}
