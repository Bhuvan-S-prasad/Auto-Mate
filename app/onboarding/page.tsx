import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OnboardingInfo from "@/components/onboarding/OnboardingInfo";
import OnboardingSetup from "@/components/onboarding/OnboardingSetup";

export const metadata = {
  title: "Get Started — Auto-Mate",
  description:
    "Connect your Gmail, Calendar, and Telegram to start automating your digital life with Auto-Mate.",
};

export default async function OnboardingPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";

    user = await prisma.user.create({
      data: {
        clerkId,
        email,
        name: clerkUser?.fullName,
      },
    });
  }

  if (user.onboardingCompleted) redirect("/dashboard");

  // Fetch integrations once here, share with both panels
  const userIntegrations = await prisma.integration.findMany({
    where: { userId: user.id },
  });

  const gmailConnected = userIntegrations.some(
    (i) => i.provider === "gmail",
  );
  const calendarConnected = userIntegrations.some(
    (i) => i.provider === "google_calendar",
  );
  const telegramConnected = userIntegrations.some(
    (i) => i.provider === "telegram",
  );

  // If all three are connected, mark onboarding as completed and redirect
  if (gmailConnected && calendarConnected && telegramConnected) {
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingCompleted: true },
    });
    redirect("/dashboard");
  }

  const providers = [
    {
      key: "gmail",
      name: "Gmail",
      description: "Sync your emails and automate responses",
      icon: "/gmail.png",
      color: "from-red-500/20 to-red-600/5",
      connected: gmailConnected,
    },
    {
      key: "google_calendar",
      name: "Google Calendar",
      description: "Manage your events and schedules automatically",
      icon: "/calendar.png",
      color: "from-blue-500/20 to-blue-600/5",
      connected: calendarConnected,
    },
    {
      key: "telegram",
      name: "Telegram",
      description: "Control your assistant directly from Telegram",
      icon: "/telegram-b.png",
      color: "from-sky-500/20 to-sky-600/5",
      connected: telegramConnected,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen bg-background text-foreground">
      <OnboardingInfo />
      <OnboardingSetup providers={providers} />
    </div>
  );
}
