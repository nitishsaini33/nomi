import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden bg-[#0B0F19] text-white font-sans">
      {/* Background Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Navbar */}
      <nav className="w-full px-6 py-4 sm:px-12 flex justify-between items-center relative z-10 border-b border-white/5 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Nomihub Logo" className="w-10 h-10 object-cover rounded-xl shadow-sm border border-white/10" />
          <h1 className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Nomihub
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <Link href="/login" className="text-gray-300 hover:text-white font-medium transition-colors px-4 py-2">
            Log in
          </Link>
          <Link href="/register" className="bg-indigo-500/20 border border-indigo-500/50 hover:bg-indigo-500 hover:text-white text-indigo-300 font-medium px-6 py-2 rounded-full transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:p-6 text-center relative z-10">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 sm:mt-[-5vh]">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm font-medium text-indigo-300 mb-2 shadow-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Welcome to the future of messaging
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-tight drop-shadow-2xl">
            Connect fluidly with <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Flowing Energy
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed px-2">
            Nomihub is a next-generation chat platform designed for those who value premium aesthetics, blazing fast performance, and seamless real-time connections.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 sm:pt-8 w-full px-4 sm:px-0">
            <Link 
              href="/register" 
              className="group flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-base sm:text-lg px-6 py-3 sm:px-8 sm:py-4 rounded-full transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] hover:scale-105"
            >
              Get Started
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link 
              href="/login" 
              className="flex items-center justify-center gap-2 w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-base sm:text-lg px-6 py-3 sm:px-8 sm:py-4 rounded-full transition-all backdrop-blur-md hover:border-white/20"
            >
              <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Decorative Bottom Wave/Line */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
    </div>
  );
}
