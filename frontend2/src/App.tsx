import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TopBar from "@/components/ghost/TopBar";
import Landing from "./pages/Landing";
import Arena from "./pages/Arena";
import Mint from "./pages/Mint";
import AgentDetail from "./pages/AgentDetail";
import Stake from "./pages/Stake";
import Market from "./pages/Market";
import Leaderboard from "./pages/Leaderboard";
import Portfolio from "./pages/Portfolio";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 4000,      // 4 s — ~10 Monad blocks
      refetchInterval: 4000,
      retry: 2,
    },
  },
});

const App = () => (
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
            <Route path="/market"       element={<Market />} />
            <Route path="/agent/:id"    element={<AgentDetail />} />
            <Route path="/stake"        element={<Stake />} />
            <Route path="/leaderboard"  element={<Leaderboard />} />
            <Route path="/portfolio"    element={<Portfolio />} />
            <Route path="*"             element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
