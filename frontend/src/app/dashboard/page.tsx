// empty state for dashboard

export default function DashboardHome() {
  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-transparent">
      {/* Background soft glowing orb for premium feel */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-8 relative">
          {/* Subtle animated ring around logo */}
          <div className="absolute inset-0 border-2 border-primary/20 rounded-[2rem] animate-[spin_10s_linear_infinite] scale-110" />
          <div className="absolute inset-0 border-2 border-primary/10 rounded-[2rem] animate-[spin_15s_linear_infinite_reverse] scale-125" />
          
          <img 
            src="/logo.png" 
            alt="Nomihub Logo" 
            className="w-24 h-24 object-cover rounded-[2rem] shadow-[var(--clay-shadow-md)] border border-black/5 dark:border-white/5 bg-surface transition-all duration-300 invert dark:invert-0" 
          />
        </div>
        
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary mb-4">
          Welcome to Nomihub
        </h2>
        
        <p className="text-text-muted font-medium max-w-sm leading-relaxed">
          Select a conversation from the sidebar to start connecting, or use the search bar to find new friends.
        </p>

        {/* Decorative subtle element below */}
        <div className="mt-12 flex gap-2 justify-center opacity-70">
          <div className="w-2.5 h-2.5 rounded-full bg-primary/80 animate-pulse shadow-[var(--clay-shadow-sm)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-pulse delay-100 shadow-[var(--clay-shadow-sm)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary/80 animate-pulse delay-200 shadow-[var(--clay-shadow-sm)]" />
        </div>
      </div>
    </div>
  );
}
