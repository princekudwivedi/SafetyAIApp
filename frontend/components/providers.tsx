'use client';

import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { WebSocketProvider } from '@/contexts/websocket-context';
import { ErrorHandlerProvider } from '@/providers/error-handler-provider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ErrorHandlerProvider>
            <WebSocketProvider>
              {children}
              <ReactQueryDevtools initialIsOpen={false} />
            </WebSocketProvider>
          </ErrorHandlerProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
