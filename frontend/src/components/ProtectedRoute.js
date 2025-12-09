import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, checkAuth } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (location.state?.user) {
        setIsChecking(false);
        return;
      }

      const justAuth = sessionStorage.getItem('just_authenticated');
      if (!justAuth) {
        await new Promise(r => setTimeout(r, 150));
      } else {
        sessionStorage.removeItem('just_authenticated');
      }

      await checkAuth();
      setIsChecking(false);
    };

    verifyAuth();
  }, [location, checkAuth]);

  if (loading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;