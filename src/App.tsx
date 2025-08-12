import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { NotionProvider } from "@/contexts/NotionContext";
import { MetricsProvider } from "@/contexts/MetricsContext";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalAuthModal from "./components/auth/GlobalAuthModal";
import Index from "./pages/Index";
import Dashboard from "./components/Dashboard";
import NotionCallback from "./pages/NotionCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthModalProvider>
          <MetricsProvider>
            <NotionProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route 
                      path="/dashboard" 
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/auth/notion/callback" 
                      element={
                        <ProtectedRoute>
                          <NotionCallback />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
                {/* Global Auth Modal - rendered at root level */}
                <GlobalAuthModal />
              </TooltipProvider>
            </NotionProvider>
          </MetricsProvider>
        </AuthModalProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
