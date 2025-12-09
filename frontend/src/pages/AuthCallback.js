import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setIsAuthenticated } = useAuth();

  useEffect(() => {
    const processSession = async () => {
      const hash = location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
        const API = `${BACKEND_URL}/api`;

        const response = await axios.post(`${API}/auth/session`, {}, {
          headers: {
            'X-Session-ID': sessionId
          },
          withCredentials: true
        });

        setUser(response.data.user);
        setIsAuthenticated(true);
        sessionStorage.setItem('just_authenticated', 'true');
        
        navigate('/dashboard', {
          replace: true,
          state: { user: response.data.user }
        });
      } catch (error) {
        console.error('Error processing session:', error);
        navigate('/login', { replace: true });
      }
    };

    processSession();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-muted-foreground">Verificando autenticación...</p>
      </div>
    </div>
  );
};

export default AuthCallback;