import { encrypt } from "@/lib/encryption";
import { createOAuth2Client, GoogleProvider } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // get cookies
  const cookieStore = await cookies();
  try {
    // verify auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // parse query params
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");
    if (error) {
      return NextResponse.json({ error: "Error" }, { status: 400 });
    }
    if (!code || !state) {
      return NextResponse.json(
        { error: "Code or state not found" },
        { status: 400 },
      );
    }

    // validate csrf state
    const storedState = cookieStore.get("google_oauth_state")?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    // parse provider from state
    const { provider } = JSON.parse(
      Buffer.from(state, "base64").toString(),
    ) as { nonce: string; provider: GoogleProvider };

    if (!provider) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    // exchange the code for token

    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
      return NextResponse.json({ error: "Invalid tokens" }, { status: 400 });
    }

    // look up for user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // encrypt and store tokens in database
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        userId,
        provider,
      },
    });

    if (existingIntegration) {
      await prisma.integration.update({
        where: {
          id: existingIntegration.id,
        },
        data: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          expiresAt: new Date(tokens.expiry_date),
          scope: tokens.scope?.split(" ") || [],
        },
      });
    } else {
      await prisma.integration.create({
        data: {
          userId,
          provider,
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          expiresAt: new Date(tokens.expiry_date),
          scope: tokens.scope?.split(" ") || [],
        },
      });
    }
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "State not found" }, { status: 400 });
  }

  return new Response("response");
}
