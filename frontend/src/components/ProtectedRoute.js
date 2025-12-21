import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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

  // Si el usuario es cliente, restringir acceso a solo su perfil
  if (user?.role === 'client') {
    const allowedPaths = [`/clients/${user.user_id}`];
    const currentPath = location.pathname;
    
    // Verificar si la ruta actual está permitida para clientes
    const isAllowed = allowedPaths.some(path => currentPath.startsWith(path));
    
    if (!isAllowed) {
      // Redirigir al perfil del cliente
      return <Navigate to={`/clients/${user.user_id}`} replace />;
    }
  }

  // User is authenticated, render children
  return children;
};

export default ProtectedRoute;