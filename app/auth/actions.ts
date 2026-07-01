"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured, isSupabaseServiceConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { clearMockSession, setMockSession } from "@/lib/auth/session";

function readString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function isUserAlreadyRegisteredError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("already registered") || normalized.includes("already been registered");
}

async function confirmPendingUser(email: string, password: string, fullName: string) {
  const serviceClient = createSupabaseServiceClient();
  const usersResponse = await serviceClient?.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (usersResponse?.error) {
    return usersResponse.error.message;
  }

  const existingUser = usersResponse?.data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );

  if (!existingUser?.id || existingUser.email_confirmed_at || existingUser.confirmed_at) {
    return null;
  }

  const updateResponse = await serviceClient?.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...existingUser.user_metadata,
      full_name: fullName
    }
  });

  return updateResponse?.error?.message ?? null;
}

export async function signUpAction(formData: FormData) {
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const fullName = readString(formData, "fullName");

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient();

    if (isSupabaseServiceConfigured()) {
      const serviceClient = createSupabaseServiceClient();
      const createResponse = await serviceClient?.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      });

      if (createResponse?.error) {
        if (!isUserAlreadyRegisteredError(createResponse.error.message)) {
          redirect(`/auth/signup?error=${encodeURIComponent(createResponse.error.message)}`);
        }

        const pendingUserError = await confirmPendingUser(email, password, fullName);
        if (pendingUserError) {
          redirect(`/auth/signup?error=${encodeURIComponent(pendingUserError)}`);
        }
      }

      const loginResponse = await supabase?.auth.signInWithPassword({
        email,
        password
      });

      if (loginResponse?.error) {
        const message = createResponse?.error
          ? "Account already exists. Log in with the password you used before."
          : loginResponse.error.message;
        redirect(`/auth/login?error=${encodeURIComponent(message)}`);
      }
    } else {
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
