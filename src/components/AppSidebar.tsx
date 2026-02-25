import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Truck, Users, Building2, Wrench, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/veiculos', label: 'Veículos', icon: Truck },
  { to: '/motoristas', label: 'Motoristas', icon: Users },
  { to: '/filiais', label: 'Filiais', icon: Building2 },
  { to: '/servicos', label: 'Serviços', icon: Wrench },
];

const AppSidebar: React.FC = () => {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sessão encerrada');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 sidebar-gradient flex flex-col z-50">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Truck className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-sidebar-primary-foreground">FleetControl</h1>
            <p className="text-xs text-sidebar-muted">Gestão de Frota</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(link => {
          const isActive = location.pathname === link.to;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-sidebar-muted hover:text-sidebar-foreground transition-colors w-full px-3 py-2"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
