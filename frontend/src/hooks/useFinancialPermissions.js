import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getBackendUrl } from '../utils/api';

/**
 * Hook para verificar permisos de visibilidad financiera
 * Consulta la configuración del sistema para determinar si el usuario puede ver datos financieros
 */
export const useFinancialPermissions = () => {
  const { user } = useAuth();
  const [hideFinancialForPM, setHideFinancialForPM] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const API_URL = getBackendUrl();
        const response = await fetch(`${API_URL}/api/company`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setHideFinancialForPM(data.hide_financial_for_pm || false);
        }
      } catch (error) {
        console.error('Error fetching company settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanySettings();
  }, []);

  /**
   * Verifica si el usuario actual puede ver información monetaria
   * @returns {boolean}
   */
  const canViewMoney = () => {
    if (!user?.role) return false;
    
    // Si la configuración está activada y el usuario es PM, no puede ver
    if (hideFinancialForPM && user.role === 'project_manager') {
      return false;
    }
    
    return true;
  };

  /**
   * Formatea un valor monetario o lo oculta según permisos
   * @param {number} amount 
   * @param {string} placeholder 
   * @returns {string}
   */
  const formatMoney = (amount, placeholder = '---') => {
    if (!canViewMoney()) {
      return placeholder;
    }
    return `$${(amount || 0).toLocaleString('es-PR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return {
    showMoney: canViewMoney(),
    canViewMoney,
    formatMoney,
    loading,
    hideFinancialForPM
  };
};

export default useFinancialPermissions;
