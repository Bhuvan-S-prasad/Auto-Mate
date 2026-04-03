"use client";

import { useState } from "react";
import { Settings2Icon } from "lucide-react";
import Image from "next/image";

interface Provider {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  connected: boolean;
}

interface SetupClientProps {
  providers: Provider[];
}

export default function SetupClient({ providers }: SetupClientProps) {
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/api/telegram/status");
      const data = await res.json();
      if (data.connected) {
        window.location.reload();
      } else {
        alert(
          "Not connected yet! Please send the /start message to the bot first.",
        );
      }
    } catch (error) {
      console.error("Failed to check status", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConnect = async (providerKey: string) => {
    if (providerKey === "telegram") {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
      });

      const data = await res.json();
      setTelegramCode(data.code);
      setIsChecking(false);
    } else {
      window.location.href = `/api/auth/google?provider=${providerKey}`;
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-background text-foreground flex items-center justify-center overflow-hidden selection:bg-primary/30">
      {/* Background glow */}
      <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px]" />

      <div className="max-w-xl w-full relative z-10 bg-surface/40 backdrop-blur-md border border-white/5 p-2 sm:p-4 rounded-[2.5rem] shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-5">
            <div className="p-3 bg-background rounded-xl border border-white/5 shadow-xl">
              <Settings2Icon className="w-8 h-8 text-primary" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-linear-to-b from-white to-gray-400 bg-clip-text text-transparent">
            Setup your automation
          </h1>

          <p className="text-base text-gray-400 max-w-md mx-auto">
            Connect your essential services to get started.
          </p>
        </div>

        {/* Providers */}
        <div className="flex flex-col gap-3 max-w-xl mx-auto w-full">
          {providers.map((provider) => (
            <div key={provider.key} className="group relative">
              <div className="relative bg-card/60 border border-white/5 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between hover:border-primary/25 transition-all gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-xl bg-linear-to-br ${provider.color} border border-white/10 shrink-0 shadow-inner`}
                  >
                    <Image
                      src={provider.icon}
                      alt={provider.name}
                      width={24}
                      height={24}
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold group-hover:text-primary transition">
                      {provider.name}
                    </h3>
                    <p className="text-gray-400 text-xs mt-1">
                      {provider.description}
                    </p>
                  </div>
                </div>

                {provider.connected ? (
                  <div className="w-full sm:w-auto px-6 py-2 rounded-xl bg-primary text-black text-sm font-bold hover:opacity-90 transition shrink-0">
                    Connected
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(provider.key)}
                    className="w-full sm:w-auto px-6 py-2 rounded-xl bg-primary text-black text-sm font-bold hover:opacity-90 transition shrink-0"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Telegram Modal */}
        {telegramCode && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-2xl max-w-sm w-full border border-white/10 text-center">
              <h2 className="text-lg font-semibold mb-4">Connect Telegram</h2>

              <p className="text-sm text-gray-400 mb-4">
                Click below and send the message to connect:
              </p>

              <a
                href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${telegramCode}`}
                target="_blank"
                className="block mb-4 py-2 px-4 rounded-lg bg-sky-500 text-black font-semibold hover:opacity-90"
              >
                Open Telegram Bot
              </a>

              <div className="bg-black/40 p-3 rounded-lg text-sm text-gray-300 font-mono">
                /start {telegramCode}
              </div>

              <div className="mt-8 flex flex-col gap-2">
                <button
                  onClick={checkStatus}
                  disabled={isChecking}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-black font-bold hover:opacity-90 transition disabled:opacity-50"
                >
                  {isChecking ? "Checking..." : "I've sent the message"}
                </button>

                <button
                  onClick={() => setTelegramCode(null)}
                  className="w-full py-2 px-4 text-xs text-gray-500 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2">
            <span className="w-1 h-1 bg-primary/40 rounded-full" />
            Secure Encryption Enabled
            <span className="w-1 h-1 bg-primary/40 rounded-full" />
          </p>
        </div>
      </div>
    </div>
  );
}
