import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import NotificationCenter from './NotificationCenter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  Menu,
  X,
  Briefcase,
  Users,
  BarChart3,
  Settings,
  Calendar,
  FileText,
  DollarSign,
  Clock,
  Package,
  Calculator,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Ponchar', href: '/clock', icon: Clock },
    { name: 'Historial Ponches', href: '/clock/history', icon: Clock, adminOnly: true },
    { name: 'Proyectos', href: '/projects', icon: FolderKanban },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    { name: 'Reportes', href: '/reports', icon: BarChart3 },
    { name: 'Estimados', href: '/estimates', icon: FileText },
    { name: 'Estimaciones Costos', href: '/cost-estimates', icon: Calculator },
    { name: 'Órdenes de Compra', href: '/purchase-orders', icon: Package },
    { name: 'Facturas', href: '/invoices', icon: DollarSign },
    { name: 'Historial Auditoría', href: '/audit-log', icon: FileText },
    { name: 'Aprobaciones', href: '/approvals', icon: CheckCircle },
    { name: 'Usuarios', href: '/users', icon: Users },
    { name: 'Recursos Humanos', href: '/hr', icon: Briefcase },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada exitosamente');
      // Wait a brief moment for state to update
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    } catch (error) {
      console.error('Error during logout:', error);
      // Still navigate to login even if there's an error
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="ProManage" className="w-10 h-10 object-contain" />
              <span className="text-xl font-bold tracking-tight text-[#0F172A]">ProManage</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.filter(item => !item.adminOnly || user?.role === 'admin').map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-testid={`nav-link-${item.name.toLowerCase()}`}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-md sidebar-link ${
                    isActive
                      ? 'bg-orange-50 text-orange-500'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-orange-500' : 'text-slate-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-slate-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-button" className="flex items-center w-full px-4 py-3 space-x-3 rounded-md hover:bg-slate-100 transition-colors">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user?.picture} alt={user?.name} />
                    <AvatarFallback className="bg-orange-500 text-white font-medium">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="logout-button">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar for mobile */}
        <div className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            data-testid="mobile-menu-button"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="ProManage" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold tracking-tight text-[#0F172A]">ProManage</span>
          </div>
          <NotificationCenter />
        </div>

        {/* Top bar for desktop */}
        <div className="hidden lg:flex sticky top-0 z-30 items-center justify-end h-16 px-8 bg-white border-b border-slate-200">
          <NotificationCenter />
        </div>

        {/* Page content */}
        <main className="p-6 md:p-8 lg:p-12">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;