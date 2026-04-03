import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SetupClient from "./SetupClient";

export default async function SetupPage() {
  const clerkUser = await currentUser();
  const { userId: clerkId } = await auth();
  if (!clerkUser || !clerkId) {
    redirect("/sign-in");
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email,
      name: clerkUser.fullName,
    },
  });

  const userIntegrations = await prisma.integration.findMany({
    where: {
      userId: user.id,
    },
  });

  const gmailIntegration = userIntegrations.find(
    (integration) => integration.provider === "gmail",
  );
  const googleCalendarIntegration = userIntegrations.find(
    (integration) => integration.provider === "google_calendar",
  );
  const telegramIntegration = userIntegrations.find(
    (integration) => integration.provider === "telegram",
  );

  const providers = [
    {
      key: "gmail",
      name: "Gmail",
      description: "Sync your emails and automate responses",
      icon: "/gmail.png",
      color: "from-red-500/20 to-red-600/5",
      connected: !!gmailIntegration,
    },
    {
      key: "google_calendar",
      name: "Google Calendar",
      description: "Manage your events and schedules automatically",
      icon: "/calendar.png",
      color: "from-blue-500/20 to-blue-600/5",
      connected: !!googleCalendarIntegration,
    },
    {
      key: "telegram",
      name: "Telegram",
      description: "Control your assistant directly from Telegram",
      icon: "/telegram-b.png",
      color: "from-sky-500/20 to-sky-600/5",
      connected: !!telegramIntegration,
    },
  ];

  return <SetupClient providers={providers} />;
}
