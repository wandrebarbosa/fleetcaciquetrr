import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FleetProvider } from "@/contexts/FleetContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import Dashboard from "./pages/Dashboard";
import VeiculosPage from "./pages/VeiculosPage";
import MotoristasPage from "./pages/MotoristasPage";
import FiliaisPage from "./pages/FiliaisPage";
import ServicosPage from "./pages/ServicosPage";
import HistoricoPage from "./pages/HistoricoPage";
import ImportarKmPage from "./pages/ImportarKmPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Carregando...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {session ? (
            <FleetProvider>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/veiculos" element={<VeiculosPage />} />
                <Route path="/motoristas" element={<MotoristasPage />} />
                <Route path="/filiais" element={<FiliaisPage />} />
                <Route path="/servicos" element={<ServicosPage />} />
                <Route path="/historico" element={<HistoricoPage />} />
                <Route path="/importar-km" element={<ImportarKmPage />} />
                <Route path="/auth" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </FleetProvider>
          ) : (
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </Routes>
          )}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
