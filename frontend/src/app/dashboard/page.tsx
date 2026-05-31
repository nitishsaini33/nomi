// empty state for dashboard

export default function DashboardHome() {
  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      {/* Background glowing orb for premium feel */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-8 relative">
          {/* Subtle animated ring around logo */}
          <div className="absolute inset-0 border-2 border-indigo-400/20 rounded-3xl animate-[spin_10s_linear_infinite] scale-110" />
          <div className="absolute inset-0 border-2 border-purple-400/20 rounded-3xl animate-[spin_15s_linear_infinite_reverse] scale-125" />
          
          <img 
            src="/logo.png" 
            alt="Nomihub Logo" 
            className="w-24 h-24 object-cover rounded-3xl shadow-[0_0_40px_rgba(99,102,241,0.3)] border border-white/10" 
          />
        </div>
        
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-4 drop-shadow-sm">
          Welcome to Nomihub
        </h2>
        
        <p className="text-gray-400 font-medium max-w-sm leading-relaxed">
          Select a conversation from the sidebar to start connecting, or use the search bar to find new friends.
        </p>

        {/* Decorative subtle element below */}
        <div className="mt-12 flex gap-2 justify-center opacity-50">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse delay-100" />
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse delay-200" />
        </div>
      </div>
    </div>
  );
}
