import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
    const user = await currentUser();
    const firstName = user?.firstName || "there";

    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";

    return (
        <div className="mt-24 max-w-7xl mx-auto p-6 space-y-8">
            <header className="mb-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    {greeting}, {firstName}
                </h1>
                <p className="text-white/50 mt-1">Here is what your agent has been up to.</p>
            </header>

            <MetricsGrid />

            {/* Middle Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                <ActivityFeed />
                
                {/* EventsList Placeholder */}
                <div className="bg-surface border border-white/5 rounded-2xl p-6 hidden lg:flex items-center justify-center h-full">
                    <span className="text-white/40 font-medium">Upcoming Events (Coming Soon)</span>
                </div>
            </div>

        </div>
    );
}