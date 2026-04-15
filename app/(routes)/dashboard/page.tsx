import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { EventsList } from "@/components/dashboard/EventsList";
import { SuggestionsPanel } from "@/components/dashboard/SuggestionsPanel";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
    const { userId: clerkId } = await auth();
    if (!clerkId) redirect("/sign-in");

    const userRecord = await prisma.user.findUnique({
        where: { clerkId }
    });

    if (!userRecord?.onboardingCompleted) {
        redirect("/onboarding");
    }

    let firstName = "there";
    if (userRecord?.name) {
        firstName = userRecord.name.split(" ")[0] || "there";
    }

    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";

    return (
        <div className="relative min-h-screen">
            {/* Ambient Background Glows */}
            <div className="fixed top-[-5%] left-[-5%] w-[30%] h-[30%] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />
            <div className="fixed bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />

            <div className="max-w-7xl mx-auto p-6 space-y-8 relative z-10">
                <header className="mb-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                        {greeting}, {firstName}
                    </h1>
                    <p className="text-white/50 mt-1">Here is what your agent has been up to.</p>
                </header>

                <MetricsGrid />

            {/* Middle Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-[400px]">
                <div className="h-[400px] lg:h-full">
                    <ActivityFeed />
                </div>
                <div className="h-[400px] lg:h-full">
                    <EventsList />
                </div>
            </div>

            {/* Bottom: Suggested Actions */}
            <div className="w-full relative z-10">
                <SuggestionsPanel />
            </div>
        </div>
        </div>
    )
}