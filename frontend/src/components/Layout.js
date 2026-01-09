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
  CheckCircle,
  Building2,
  Send,
  User,
  Shield,
  Home,
  ChevronUp,
  Landmark
} from 'lucide-react';
import { toast } from 'sonner';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close sidebar when route changes on mobile
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Definir navegación por rol
  const getNavigationByRole = (role) => {
    const baseEmpleado = [
      { name: 'Mi Perfil', href: '/my-profile', icon: User },
      { name: 'Ponchar', href: '/clock', icon: Clock },
      { name: 'Mi Historial', href: '/clock/history', icon: Clock },
      { name: 'Mis Solicitudes', href: '/my-requests', icon: Send },
    ];

    const pmNav = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Mi Perfil', href: '/my-profile', icon: User },
      { name: 'Ponchar', href: '/clock', icon: Clock },
      { name: 'Mi Historial', href: '/clock/history', icon: Clock },
      { name: 'Proyectos', href: '/projects', icon: FolderKanban },
      { name: 'Calendario', href: '/calendar', icon: Calendar },
      { name: 'Estimados', href: '/estimados', icon: FileText },
      { name: 'Estimaciones Costos', href: '/cost-estimates', icon: Calculator },
      { name: 'Órdenes de Compra', href: '/purchase-orders', icon: Package },
      { name: 'Facturas', href: '/invoices', icon: DollarSign },
      { name: 'Reportes', href: '/reports', icon: BarChart3 },
      { name: 'Mis Solicitudes', href: '/my-requests', icon: Send },
      { name: 'Aprobaciones', href: '/approvals', icon: CheckCircle },
    ];

    const rrhhNav = [
      { name: 'Mi Perfil', href: '/my-profile', icon: User },
      { name: 'Ponchar', href: '/clock', icon: Clock },
      { name: 'Mi Historial', href: '/clock/history', icon: Clock },
      { name: 'Historial Ponches', href: '/clock/history', icon: Clock },
      { name: 'Recursos Humanos', href: '/hr', icon: Briefcase },
      { name: 'Nómina', href: '/payroll', icon: DollarSign },
      { name: 'Usuarios', href: '/users', icon: Users },
      { name: 'Mis Solicitudes', href: '/my-requests', icon: Send },
      { name: 'Aprobaciones', href: '/approvals', icon: CheckCircle },
    ];

    const superAdminNav = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Mi Perfil', href: '/my-profile', icon: User },
      { name: 'Ponchar', href: '/clock', icon: Clock },
      { name: 'Historial Ponches', href: '/clock/history', icon: Clock },
      { name: 'Proyectos', href: '/projects', icon: FolderKanban },
      { name: 'Calendario', href: '/calendar', icon: Calendar },
      { name: 'Seguridad', href: '/safety', icon: Shield },
      { name: 'Reportes', href: '/reports', icon: BarChart3 },
      { name: 'Estimados', href: '/estimados', icon: FileText },
      { name: 'Estimaciones Costos', href: '/cost-estimates', icon: Calculator },
      { name: 'Órdenes de Compra', href: '/purchase-orders', icon: Package },
      { name: 'Facturas', href: '/invoices', icon: DollarSign },
      { name: 'Historial Auditoría', href: '/audit-log', icon: FileText },
      { name: 'Mis Solicitudes', href: '/my-requests', icon: Send },
      { name: 'Aprobaciones', href: '/approvals', icon: CheckCircle },
      { name: 'Clientes', href: '/clients', icon: Building2 },
      { name: 'Usuarios', href: '/users', icon: Users },
      { name: 'Recursos Humanos', href: '/hr', icon: Briefcase },
      { name: 'Configuración', href: '/settings', icon: Settings },
    ];

    const clientNav = [
      { name: 'Mi Perfil', href: `/clients/${user?.user_id}`, icon: Building2 },
    ];

    switch (role) {
      case 'super_admin':
      case 'admin':
        return superAdminNav;
      case 'project_manager':
        return pmNav;
      case 'rrhh':
        return rrhhNav;
      case 'empleado':
        return baseEmpleado;
      case 'client':
        return clientNav;
      default:
        return baseEmpleado;
    }
  };

  const navigation = getNavigationByRole(user?.role);

  // Mobile bottom navigation - varies by role
  const getMobileBottomNav = (role) => {
    if (role === 'empleado') {
      return [
        { name: 'Perfil', href: '/my-profile', icon: User },
        { name: 'Ponchar', href: '/clock', icon: Clock },
        { name: 'Historial', href: '/clock/history', icon: Clock },
        { name: 'Solicitudes', href: '/my-requests', icon: Send },
      ];
    }
    // Default for admin, PM, RRHH, etc.
    return [
      { name: 'Inicio', href: '/dashboard', icon: Home },
      { name: 'Proyectos', href: '/projects', icon: FolderKanban },
      { name: 'Ponchar', href: '/clock', icon: Clock },
      { name: 'Perfil', href: '/my-profile', icon: User },
    ];
  };
  
  const mobileBottomNav = getMobileBottomNav(user?.role);

  const roleLabels = {
    'super_admin': 'Super Admin',
    'admin': 'Admin',
    'project_manager': 'Project Manager',
    'rrhh': 'RRHH',
    'empleado': 'Empleado',
    'client': 'Cliente'
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada exitosamente');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    } catch (error) {
      console.error('Error during logout:', error);
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
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img src="/logo.png" alt="ProManage" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[#0F172A]">ProManage</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name + item.href}
                  to={item.href}
                  data-testid={`nav-link-${item.name.toLowerCase()}`}
                  className={`flex items-center px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-lg sidebar-link transition-colors ${
                    isActive
                      ? 'bg-orange-50 text-orange-500'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-orange-500' : 'text-slate-500'}`} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="p-3 sm:p-4 border-t border-slate-200 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-button" className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 space-x-3 rounded-lg hover:bg-slate-100 transition-colors">
                  <Avatar className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                    <AvatarImage src={user?.picture} alt={user?.name} />
                    <AvatarFallback className="bg-orange-500 text-white font-medium text-sm">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'Usuario'}</p>
                    <p className="text-xs text-slate-500 truncate">{roleLabels[user?.role] || user?.role}</p>
                  </div>
                  <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
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

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-0">
        {/* Fixed Header - Mobile */}
        <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between h-14 px-4 bg-white border-b border-slate-200 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            data-testid="mobile-menu-button"
            className="h-9 w-9"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="ProManage" className="w-7 h-7 object-contain" />
            <span className="text-base font-bold tracking-tight text-[#0F172A]">ProManage</span>
          </div>
          <NotificationCenter />
        </header>

        {/* Fixed Header - Desktop */}
        <header className="hidden lg:flex fixed top-0 left-64 right-0 z-30 items-center justify-between h-16 px-8 bg-white border-b border-slate-200">
          <div className="text-sm text-slate-500">
            {/* Breadcrumb or page title could go here */}
          </div>
          <NotificationCenter />
        </header>

        {/* Scrollable Page content */}
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-16 pb-16 lg:pb-0">
          <div className="p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
            {children}
          </div>
        </main>

        {/* Fixed Footer - Mobile Bottom Navigation */}
        <footer className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-slate-200 safe-area-bottom">
          <nav className="flex items-center justify-around h-16">
            {mobileBottomNav.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-colors ${
                    isActive
                      ? 'text-orange-500'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mb-1 ${isActive ? 'text-orange-500' : ''}`} />
                  <span className="text-xs font-medium truncate">{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center justify-center flex-1 h-full py-2 px-1 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Menu className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Más</span>
            </button>
          </nav>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
