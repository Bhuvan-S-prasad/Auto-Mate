import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/telegram/webhook(.*)",
  "/api/cron(.*)",
  "/",
]);

const isApiRoute = createRouteMatcher(["/api/(.*)"]);
const isWebhookOrCron = createRouteMatcher([
  "/api/telegram/webhook(.*)",
  "/api/cron(.*)"
]);

// In-memory rate limiting map for middleware operations
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_API_CALLS_PER_WINDOW = 30; // Maximum API calls

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Apply rate limiting to all standard APIs (except webhooks which have specific logic, and cron)
  if (isApiRoute(req) && !isWebhookOrCron(req)) {
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    let identifier = ip;

    try {
      const authObj = await auth();
      if (authObj.userId) {
        identifier = authObj.userId;
      }
    } catch {
      // fallback to IP if auth fails
    }

    const now = Date.now();
    const timestamps = rateLimitMap.get(identifier) || [];
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

    if (recent.length >= MAX_API_CALLS_PER_WINDOW) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests" }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    recent.push(now);
    rateLimitMap.set(identifier, recent);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
