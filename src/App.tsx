import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FleetProvider } from "@/contexts/FleetContext";
import Dashboard from "./pages/Dashboard";
import VeiculosPage from "./pages/VeiculosPage";
import MotoristasPage from "./pages/MotoristasPage";
import FiliaisPage from "./pages/FiliaisPage";
import ServicosPage from "./pages/ServicosPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FleetProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/veiculos" element={<VeiculosPage />} />
            <Route path="/motoristas" element={<MotoristasPage />} />
            <Route path="/filiais" element={<FiliaisPage />} />
            <Route path="/servicos" element={<ServicosPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </FleetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
