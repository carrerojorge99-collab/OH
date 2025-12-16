import { useEffect, useCallback, useState } from 'react';

/**
 * Hook para auto-refresh de datos
 * @param {Function} fetchFunction - Función que carga los datos
 * @param {number} interval - Intervalo en milisegundos (default: 30000 = 30 segundos)
 */
export const useAutoRefresh = (fetchFunction, interval = 30000) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchFunction();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    // Auto-refresh interval
    const intervalId = setInterval(() => {
      refresh();
    }, interval);

    // Refresh cuando la ventana vuelve a estar visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    // Refresh cuando se reconecta a internet
    const handleOnline = () => {
      refresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [refresh, interval]);

  return { refresh, isRefreshing, lastUpdated };
};

export default useAutoRefresh;
