'use client'
import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      {/* Soft floating orbs for Neumorphic feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Navbar */}
      <nav className="w-[95%] sm:w-[90%] max-w-6xl mx-auto mt-6 px-6 py-4 flex justify-between items-center relative z-10 clay-panel-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Nomihub Logo" className="w-10 h-10 object-cover rounded-xl shadow-sm border border-black/5 dark:border-white/5" />
          <h1 className="font-bold text-2xl tracking-tight text-primary">
            Nomihub
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <ThemeToggle />
          <Link href="/login" className="text-text font-medium px-4 py-2 hover:text-primary transition-colors">
            Log in
          </Link>
          <Link href="/register" className="clay-button-primary">
            Sign up
          </Link>
        </div>
        <div className="sm:hidden flex items-center gap-2">
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:p-6 text-center relative z-10">
        <div className="max-w-4xl mx-auto mt-[-8vh] flex flex-col items-center">
          
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full clay-panel-sm text-xs sm:text-sm font-bold text-primary mb-8 animate-float">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Welcome to the future of messaging
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-tight mb-8 text-text drop-shadow-sm">
            Connect fluidly with <br className="hidden sm:block" />
            <span className="text-primary">
              Tactile Design
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-text-muted max-w-2xl mx-auto leading-relaxed px-2 mb-10">
            Nomihub is a next-generation chat platform designed for those who value premium aesthetics, blazing fast performance, and deeply satisfying soft UI interactions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full px-4 sm:px-0">
            <Link 
              href="/register" 
              className="group clay-button-primary text-base sm:text-lg px-8 py-4 w-full sm:w-auto"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link 
              href="/login" 
              className="clay-button text-base sm:text-lg px-8 py-4 w-full sm:w-auto text-primary"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
