import { encrypt } from "@/lib/encryption";
import { createOAuth2Client, GoogleProvider } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // get cookies
  const cookieStore = await cookies();
  try {
    // verify auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // parse query params
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");
    if (error) {
      return NextResponse.redirect(
        new URL("/integrations?error=consent_denied", request.url),
      );
    }
    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/integrations?error=missing_params", request.url),
      );
    }

    // validate csrf state
    const storedState = cookieStore.get("google_oauth_state")?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        new URL("/integrations?error=invalid_state", request.url),
      );
    }

    // parse provider from state
    const { provider } = JSON.parse(
      Buffer.from(state, "base64").toString(),
    ) as { nonce: string; provider: GoogleProvider };

    if (!provider) {
      return NextResponse.redirect(
        new URL("/integrations?error=invalid_state", request.url),
      );
    }

    // exchange the code for token

    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
      return NextResponse.redirect(
        new URL("/integrations?error=invalid_tokens", request.url),
      );
    }

    // look up or create user
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: clerkUser.fullName,
      },
    });

    // encrypt and store tokens in database
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        userId: user.id,
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
          userId: user.id,
          provider,
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          expiresAt: new Date(tokens.expiry_date),
          scope: tokens.scope?.split(" ") || [],
        },
      });
    }

    //clear state cookie
    cookieStore.delete("google_oauth_state");

    // redirect to dashboard
    return NextResponse.redirect(
      new URL(`/integrations?connected=${provider}`, request.url),
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    cookieStore.delete("google_oauth_state");
    return NextResponse.redirect(
      new URL(`/integrations?error=callback_error`, request.url),
    );
  }
}
