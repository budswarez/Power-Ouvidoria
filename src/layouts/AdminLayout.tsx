import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Tags, Users, Menu, X, LogOut, Shield, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/authContext';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Ouvidorias', href: '/admin/ouvidorias', icon: FileText },
    { name: 'Categorias', href: '/admin/categorias', icon: Tags },
    { name: 'Unidades & Filiais', href: '/admin/unidades', icon: Building2 },
    { name: 'Usuários', href: '/admin/usuarios', icon: Users },
    { name: 'Auditoria & Logs', href: '/admin/auditoria', icon: Shield },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background font-body flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-surface flex flex-col border-r border-surface-variant transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen print:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-8 py-6 flex items-center gap-3 border-b border-surface-variant">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-xs">
            <span className="text-white font-bold text-base">P</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-primary leading-none text-sm tracking-wider">SUA EMPRESA</span>
            <span className="font-mono text-on-surface-variant text-[10px] uppercase tracking-widest leading-none mt-1">Ouvidoria Admin</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center px-4 py-3 rounded-xl transition-all group font-body text-sm font-medium",
                  isActive
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                )}
              >
                <item.icon className="mr-3.5 w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-surface-variant flex flex-col gap-2">
          <Link 
            to="/" 
            className="flex items-center px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all group font-body text-xs"
          >
            <span>Ver Formulário Público</span>
          </Link>

          <button 
            onClick={handleLogout}
            className="flex items-center px-4 py-2.5 rounded-xl text-error hover:bg-error/10 transition-all font-body text-xs font-semibold cursor-pointer w-full text-left"
          >
            <LogOut className="mr-3 w-4 h-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between lg:justify-end h-20 px-4 sm:px-8 bg-surface/90 backdrop-blur-xl border-b border-surface-variant print:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-on-surface-variant lg:hidden hover:bg-surface-container-high rounded-xl"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-semibold text-on-surface">{user?.name || 'Administrador'}</span>
              <span className="text-xs text-on-surface-variant font-mono">{user?.email || 'admin@example.test'}</span>
            </div>
            {user?.avatar ? (
              <img
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 p-0.5 shadow-xs"
                src={user.avatar}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-display font-bold flex items-center justify-center border border-primary/20">
                {user?.initials || 'A'}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
