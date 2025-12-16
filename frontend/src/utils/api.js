import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
      // Redirigir al login si no está autenticado
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
