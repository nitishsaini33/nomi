import { MessageSquare } from "lucide-react";

export default function DashboardHome() {
  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNjY2MiIG9wYWNpdHk9IjAuNSIvPjwvc3ZnPg==')] bg-repeat">
      <div className="brutal-box bg-white p-6 sm:p-8 max-w-xs sm:max-w-md transform rotate-1">
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 bg-primary border-4 border-text shadow-brutal inline-block">
            <MessageSquare size={40} className="text-text" />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black uppercase mb-3 sm:mb-4">
          Select a chat
        </h2>
        <p className="font-bold text-gray-600 text-sm sm:text-base">
          Choose a friend from the sidebar to start talking loud.
        </p>
      </div>
    </div>
  );
}
