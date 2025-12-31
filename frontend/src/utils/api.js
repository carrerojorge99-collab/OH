import axios from 'axios';

// Función para obtener la URL del backend
// Si estamos en un dominio personalizado, usa ese dominio
// Si estamos en localhost o emergent preview, usa la variable de entorno
const getBackendUrl = () => {
  const currentHost = window.location.origin;
  const envUrl = process.env.REACT_APP_BACKEND_URL;
  
  // Si estamos en localhost, usa la URL de entorno o localhost
  if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
    return envUrl || 'http://localhost:8001';
  }
  
  // Si estamos en el preview de emergent, usa la URL de entorno
  if (currentHost.includes('preview.emergentagent.com')) {
    return envUrl || currentHost;
  }
  
  // Si estamos en producción de emergent, usa la URL de entorno
  if (currentHost.includes('.emergentagent.com')) {
    return envUrl || currentHost;
  }
  
  // Para dominios personalizados (cualquier otro dominio), usa el dominio actual
  // Esto permite que la app funcione con cualquier dominio personalizado
  return currentHost;
};

const API_URL = getBackendUrl();

// Log para debugging (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('API URL:', API_URL);
  console.log('Current Host:', window.location.origin);
}

// Crear instancia de axios con configuración anti-caché
const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// Interceptor para agregar timestamp a las peticiones GET (cache busting)
api.interceptors.request.use((config) => {
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: Date.now()
    };
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Solo redirigir si no estamos ya en la página de login
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/setup') &&
          !window.location.pathname.includes('/emergency-reset')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL, getBackendUrl };
