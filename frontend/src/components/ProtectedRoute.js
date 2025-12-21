import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Define allowed routes per role
const ROLE_ROUTES = {
  super_admin: ['*'], // All routes
  admin: ['*'], // Backward compatibility
  project_manager: [
    '/dashboard', '/clock', '/projects', '/calendar', '/reports', '/approvals', '/my-requests'
  ],
  rrhh: [
    '/dashboard', '/clock', '/hr', '/payroll', '/users', '/approvals', '/my-requests'
  ],
  empleado: [
    '/clock', '/projects', '/my-requests'
  ],
  client: [] // Handled separately
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = user?.role;
  const currentPath = location.pathname;

  // Cliente: solo su perfil
  if (role === 'client') {
    const allowedPaths = [`/clients/${user.user_id}`];
    const isAllowed = allowedPaths.some(path => currentPath.startsWith(path));
    if (!isAllowed) {
      return <Navigate to={`/clients/${user.user_id}`} replace />;
    }
  }

  // Super admin tiene acceso a todo
  if (role === 'super_admin' || role === 'admin') {
    return children;
  }

  // Verificar acceso por rol
  const allowedRoutes = ROLE_ROUTES[role] || [];
  if (allowedRoutes.includes('*')) {
    return children;
  }

  const isAllowed = allowedRoutes.some(route => 
    currentPath === route || currentPath.startsWith(route + '/')
  );

  if (!isAllowed) {
    // Redirigir a la primera ruta permitida del rol
    const defaultRoute = allowedRoutes[0] || '/clock';
    return <Navigate to={defaultRoute} replace />;
  }

  return children;
};

export default ProtectedRoute;