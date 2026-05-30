'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,           // Data considered fresh for 60s — prevents unnecessary refetches
        gcTime: 10 * 60_000,         // Keep cache for 10 minutes after unmount
        retry: 1,                     // Single retry for fast failure
        refetchOnWindowFocus: false,  // Prevents jarring data flashes on tab switch
      },
    },
  }))
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
