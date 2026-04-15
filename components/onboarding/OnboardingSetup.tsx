import SetupClient from "@/app/(routes)/integrations/SetupClient";
import Link from "next/link";

interface Provider {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  connected: boolean;
}

interface OnboardingSetupProps {
  providers: Provider[];
}

export default function OnboardingSetup({ providers }: OnboardingSetupProps) {
  const allConnected = providers.every((p) => p.connected);

  return (
    <section className="relative flex items-center justify-center p-6 md:p-10 bg-white/1.5 min-h-screen md:min-h-0 md:sticky md:top-0 md:h-screen md:self-start">
      {/* Ambient glow */}
      <div
        className="absolute -bottom-[20%] -right-[20%] w-[50%] h-[50%] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)",
        }}
      />

      <div
        className="w-full max-w-[460px] flex flex-col items-center gap-6 opacity-0 animate-premium-fade-in"
        style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
      >
        {allConnected ? (
          <div className="w-full bg-background border border-white/5 rounded-[20px] overflow-hidden p-8 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-3">You are all set!</h2>
            <p className="text-white/50 text-sm mb-8 px-4">
              You are completely onboarded. Head over to your dashboard or start
              chatting directly with your Auto-Mate bot in Telegram.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-[300px]">
              <Link
                href="/dashboard"
                className="w-full py-3 px-4 rounded-xl bg-primary text-black text-sm font-bold hover:opacity-90 transition flex justify-center items-center"
              >
                Go to Dashboard
              </Link>
              <a
                href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#185FA5] text-white text-sm font-bold hover:opacity-90 transition flex justify-center items-center"
              >
                Open Telegram Bot
              </a>
            </div>
          </div>
        ) : (
          <div className="w-full bg-background border border-white/5 rounded-[20px] overflow-hidden [&>div]:min-h-0! [&>div]:bg-transparent! [&>div>.absolute]:hidden! [&>div>div]:bg-transparent! [&>div>div]:border-none! [&>div>div]:shadow-none! [&>div>div]:rounded-none! [&>div>div]:p-5!">
            <SetupClient providers={providers} />
          </div>
        )}
      </div>
    </section>
  );
}
