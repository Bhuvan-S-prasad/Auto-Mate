import PersonalitySettings from "@/components/settings/PersonalitySettings";

export default async function SettingsPage() {
  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      <div className="fixed top-[-5%] left-[-5%] w-[30%] h-[30%] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10 w-full mb-10 pt-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground bg-linear-to-br from-white to-white/40 bg-clip-text inline-block">
            Personality Settings
          </h1>
          <p className="text-white/50 mt-2 text-sm max-w-lg">
            Configure how your agent interacts with you across Telegram and
            other services. Choose a preset or define your exact custom style.
          </p>
        </header>

        <PersonalitySettings />
      </div>
    </div>
  );
}
