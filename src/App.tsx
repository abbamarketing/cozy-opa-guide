import React, { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AIChatWidget from "@/components/shared/AIChatWidget";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Landing = lazy(() => import("./pages/Landing"));
const AuthPage = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Editor = lazy(() => import("./pages/Editor"));
const Admin = lazy(() => import("./pages/Admin"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const PaymentGate = lazy(() => import("./pages/PaymentGate"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Waiting = lazy(() => import("./pages/Waiting"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
          <p className="text-lg font-medium">Algo deu errado. Recarregue a página.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <AppErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/landing" element={<Landing />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Admin only */}
              <Route element={<ProtectedRoute requireRole="admin" />}>
                <Route path="/admin" element={<Admin />} />
              </Route>

              {/* Editor only */}
              <Route element={<ProtectedRoute requireRole="editor" />}>
                <Route path="/editor" element={<Editor />} />
              </Route>

              {/* Client routes */}
              <Route element={<ProtectedRoute requireRole="client" />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/payment" element={<PaymentGate />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/waiting" element={<Waiting />} />
                <Route path="/studio" element={<Dashboard />} />
              </Route>

              {/* Any authenticated user */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Index />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <AIChatWidget />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
