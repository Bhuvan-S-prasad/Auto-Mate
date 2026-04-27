import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex flex-col items-center gap-4">
      <SignUp />
      <p className="text-xs text-gray-500 max-w-[400px] text-center px-4">
        By continuing, you agree to our <Link href="/terms" className="underline hover:text-white transition-colors">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-white transition-colors">Privacy Policy</Link>.
      </p>
    </div>
  );
}
