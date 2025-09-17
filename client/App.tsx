import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PostLoginPage from "./pages/PostLogin/PostLoginPage";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import ProviderPerplexity from "./pages/ProviderPerplexity";
import ProviderNotion from "./pages/ProviderNotion";
import Diagnostics from "./pages/Diagnostics";
import LaneBTest from "./pages/LaneBTest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PostLoginPage />} />
          <Route path="/chat" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route
            path="/providers/perplexity"
            element={<ProviderPerplexity />}
          />
          <Route path="/providers/notion" element={<ProviderNotion />} />
          <Route path="/lane-b-test" element={<LaneBTest />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
