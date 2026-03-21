import { getAuthUrl, GoogleProvider } from "@/lib/google";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // verify auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // get provider from request
  const provider = request.nextUrl.searchParams.get("provider");
  if (!provider || !["gmail", "google_calendar"].includes(provider)) {
    return NextResponse.json({ error: "Provider not found" }, { status: 400 });
  }

  // generate CSRF token
  const state = Buffer.from(
    JSON.stringify({ nonce: crypto.randomUUID(), provider }),
  ).toString("base64");

  // store state in cookie
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
  });

  const authUrl = getAuthUrl(provider as GoogleProvider, state);

  return NextResponse.redirect(authUrl);
}
