import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import AskPage from "./pages/Ask";
import DemoPage from "./pages/Demo";
import SlidesPage from "./pages/Slides";
import ExamPrepPage from "./pages/ExamPrep";
import AuthPage from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ConceptsPage from "./pages/Concepts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/ask" element={<AskPage />} />
            <Route path="/slides" element={<SlidesPage />} />
            <Route path="/exam-prep" element={<ExamPrepPage />} />
            <Route path="/concepts" element={<ConceptsPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
