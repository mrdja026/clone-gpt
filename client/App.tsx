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

/**
 * DEV: Test prompts to validate tickets, boards, projects, sprints, and updates (SCRUM, HWP/HWB)
 * Navigate to /chat and paste any of these into the chat input.
 */
export const DEV_TEST_PROMPTS = [
  // Tickets and tasks (SCRUM-prefixed)
  "SCRUM-8",
  "Status-SCRUM-8",
  "RealStatus-SCRUM-8",
  "blockers for SCRUM-25",

  // Boards (SCRUM and HWP/HWB)
  "list scrum boards for project SCRUM",
  "list boards for project HWP",
  "list boards for project HWB",
  "search scrum boards with active sprints",

  // Projects (SCRUM, HWP)
  "search project SCRUM",
  "search project HWP",
  "list projects",
  "search projects with boards",

  // Project tree (3 levels)
  "Show me the complete 3-level project tree for SCRUM",
  "Show me the complete 3-level project tree for HWP",

  // Sprints (active sprint info)
  "project SCRUM sprint",
  "which sprint is active right now in my scrum project?",

  // Updates and release notes
  "generate release notes for version 1.0.0",
  "what can we put in release notes for the last update of SCRUM?",
];

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
