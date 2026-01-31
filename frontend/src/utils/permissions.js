/**
 * Utilidades de permisos para control de acceso basado en roles
 */

// Roles que NO pueden ver información monetaria
const ROLES_WITHOUT_MONEY_ACCESS = ['project_manager'];

/**
 * Verifica si un rol puede ver información monetaria
 * @param {string} role - El rol del usuario
 * @returns {boolean} - true si puede ver dinero, false si no
 */
export const canViewMoney = (role) => {
  if (!role) return false;
  return !ROLES_WITHOUT_MONEY_ACCESS.includes(role);
};

/**
 * Formatea un valor monetario o lo oculta según el rol
 * @param {number} amount - El monto a formatear
 * @param {string} role - El rol del usuario
 * @param {string} placeholder - Texto a mostrar si no tiene acceso (default: '---')
 * @returns {string} - El monto formateado o el placeholder
 */
export const formatMoneyByRole = (amount, role, placeholder = '---') => {
  if (!canViewMoney(role)) {
    return placeholder;
  }
  return `$${(amount || 0).toLocaleString('es-PR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Componente helper para mostrar/ocultar contenido monetario
 * @param {string} role - El rol del usuario
 * @param {React.ReactNode} children - El contenido a mostrar
 * @param {React.ReactNode} fallback - Contenido alternativo si no tiene acceso
 * @returns {React.ReactNode}
 */
export const MoneyDisplay = ({ role, children, fallback = '---' }) => {
  if (!canViewMoney(role)) {
    return fallback;
  }
  return children;
};

export default {
  canViewMoney,
  formatMoneyByRole,
  MoneyDisplay
};
