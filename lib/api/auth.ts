import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/db/repository";

const fallbackUnauthorized = NextResponse.json({ error: "Unauthorized." }, { status: 401 });

export async function authenticateBearerRequest(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return {
      error: NextResponse.json({ error: "Missing bearer token." }, { status: 401 }),
      auth: null
    };
  }

  const auth = await authenticateApiKey(match[1]);

  if (!auth) {
    return {
      error: NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 }),
      auth: null
    };
  }

  return {
    error: null,
    auth
  };
}

export function authenticationErrorResponse(error: NextResponse | null) {
  return error ?? fallbackUnauthorized;
}
