import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
import TopBar from "@/components/ghost/TopBar";
import Landing from "./pages/Landing";
import Arena from "./pages/Arena";
import Mint from "./pages/Mint";
import AgentDetail from "./pages/AgentDetail";
import Leaderboard from "./pages/Leaderboard";
import Portfolio from "./pages/Portfolio";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchInterval: 10_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Error Boundary — siyah ekranı önler ───────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4 p-8">
          <div className="text-ghost-cyan text-4xl">💀</div>
          <div className="text-xl font-bold">Bir hata oluştu</div>
          <div className="text-sm text-muted-foreground font-mono max-w-lg text-center">
            {this.state.error.message}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="mt-4 px-4 py-2 rounded bg-ghost-cyan/20 text-ghost-cyan text-sm border border-ghost-cyan/40 hover:bg-ghost-cyan/30"
          >
            Yeniden Yükle
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <TopBar />
            <Routes>
              <Route path="/"             element={<Landing />} />
              <Route path="/arena"        element={<Arena />} />
              <Route path="/mint"         element={<Mint />} />
              <Route path="/agent/:id"    element={<AgentDetail />} />
              <Route path="/leaderboard"  element={<Leaderboard />} />
              <Route path="/portfolio"    element={<Portfolio />} />
              <Route path="*"             element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
