import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getBackendUrl } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  const BACKEND_URL = getBackendUrl();
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true,
        timeout: 10000 // 10 second timeout
      });
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.log('Auth check failed:', error.message);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role = 'colaborador') => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        name,
        email,
        password,
        role
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Error al registrar' };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password
      }, { 
        withCredentials: true,
        timeout: 15000 // 15 second timeout
      });
      setUser(response.data.user);
      setIsAuthenticated(true);
      
      // Check if password change is required
      const needsPasswordChange = response.data.requires_password_change || false;
      setRequiresPasswordChange(needsPasswordChange);
      
      return { 
        success: true, 
        user: response.data.user,
        requiresPasswordChange: needsPasswordChange
      };
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'ECONNABORTED') {
        return { success: false, error: 'Tiempo de espera agotado. Verifica tu conexión.' };
      }
      return { success: false, error: error.response?.data?.detail || 'Error al iniciar sesión' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword
      }, { withCredentials: true });
      setRequiresPasswordChange(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Error al cambiar contraseña' };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      // Clear all auth state
      setUser(null);
      setIsAuthenticated(false);
      setRequiresPasswordChange(false);
      // Clear any session storage
      sessionStorage.clear();
      // Clear any local storage auth data
      localStorage.clear();
      // Force cookies to be cleared from axios
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    requiresPasswordChange,
    register,
    login,
    logout,
    checkAuth,
    changePassword,
    setUser,
    setIsAuthenticated,
    setRequiresPasswordChange
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};