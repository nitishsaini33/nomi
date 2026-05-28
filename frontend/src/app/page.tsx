import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-8 bg-background relative overflow-hidden">
      {/* Decorative shapes – hidden on tiny screens so they don't clutter */}
      <div className="hidden sm:block absolute top-8 left-8 w-20 h-20 md:w-32 md:h-32 bg-[#ff5900] border-4 border-text shadow-[8px_8px_0px_0px_#111111] transform -rotate-12 pointer-events-none" />
      <div className="hidden sm:block absolute bottom-16 right-8 md:right-16 w-28 h-28 md:w-48 md:h-48 bg-white border-4 border-text shadow-[8px_8px_0px_0px_#111111] rounded-full pointer-events-none" />

      <div className="relative z-10 brutal-box p-6 sm:p-10 md:p-12 w-full max-w-2xl text-center space-y-6 sm:space-y-8 bg-white/90 backdrop-blur-sm">
        <div className="flex justify-center">
          <div className="p-3 sm:p-4 bg-primary border-4 border-text shadow-brutal inline-block transform rotate-6">
            <MessageSquare size={36} className="text-text sm:hidden" />
            <MessageSquare size={48} className="text-text hidden sm:block" />
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight text-text leading-tight">
          Talk <br />
          <span className="text-primary bg-text px-4 py-1 inline-block -rotate-2 transform">
            Loud.
          </span>
        </h1>

        <p className="text-base sm:text-xl md:text-2xl font-medium border-l-4 border-primary pl-4 text-left">
          A high-contrast, anti-corporate chatting application for those who
          want to be heard.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-2 sm:pt-6">
          <Link
            href="/login"
            className="brutal-btn text-lg sm:text-xl py-3 sm:py-4 px-8 bg-white w-full sm:w-auto"
          >
            LOGIN
          </Link>
          <Link
            href="/register"
            className="brutal-btn text-lg sm:text-xl py-3 sm:py-4 px-8 bg-primary w-full sm:w-auto"
          >
            REGISTER
          </Link>
        </div>
      </div>
    </div>
  );
}
