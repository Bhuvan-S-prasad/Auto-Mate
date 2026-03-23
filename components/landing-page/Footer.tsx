import { Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-16 px-6 bg-background">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-8 hover:rotate-12 transition-transform cursor-pointer">
          <Lock className="w-4 h-4 text-primary" />
        </div>

        <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] flex items-center justify-center gap-3 mb-6">
          <span className="w-1 h-1 bg-primary/40 rounded-full" />
          End-to-End Encrypted
          <span className="w-1 h-1 bg-primary/40 rounded-full" />
        </p>

        <p className="text-sm text-gray-600 font-medium">
          &copy; {new Date().getFullYear()} Auto-Mate. Precision Automated.
        </p>
      </div>
    </footer>
  );
}
