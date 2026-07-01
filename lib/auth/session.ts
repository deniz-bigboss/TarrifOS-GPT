import { cookies } from "next/headers";
import { isSupabaseConfigured, isSupabaseServiceConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSupabaseWorkspaceForUser } from "@/lib/db/supabase-repository";
import { getMockWorkspace } from "@/lib/db/mock-store";
import type { WorkspaceSession } from "@/lib/db/domain";

const mockSessionCookie = "tariffos_mock_email";

export async function getCurrentWorkspace(): Promise<WorkspaceSession> {
  if (isSupabaseConfigured() && isSupabaseServiceConfigured()) {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

    if (user) {
      return ensureSupabaseWorkspaceForUser(user);
    }
  }

  const email = cookies().get(mockSessionCookie)?.value ?? "demo@tariffos.local";
  return getMockWorkspace(email);
}

export async function setMockSession(email: string) {
  cookies().set(mockSessionCookie, email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearMockSession() {
  cookies().delete(mockSessionCookie);
}
