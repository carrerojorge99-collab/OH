# ProManage - Sistema de Gestión de Proyectos

## Descripción
Sistema completo de gestión de proyectos con funcionalidades de facturación, estimaciones de costos, control de tiempo y recursos humanos.

## Stack Tecnológico
- **Frontend:** React + Shadcn/UI + TailwindCSS
- **Backend:** FastAPI (Python)
- **Base de datos:** MongoDB

## Funcionalidades Implementadas

### Estimaciones de Costo
- Gestión completa de estimaciones con múltiples categorías
- **Campo Factor % (Nuevo - Feb 2025):** Campo porcentual editable en cada tab que ajusta los cálculos:
  - Mano de Obra: Factor se aplica a las horas
  - Subcontratistas: Factor se aplica al costo total
  - Materiales: Factor se aplica al costo unitario
  - Equipos: Factor se aplica a los días
  - Transporte: Factor se aplica a los días
  - Condiciones Generales: Factor se aplica a la cantidad
- Cálculo en cascada con múltiples porcentajes (Profit, Overhead, CFSE, Liability, etc.)
- Exportación a PDF y Excel
- Conversión a Estimado

### Otros Módulos
- Facturación (con campo subtítulo)
- Estimados para clientes
- Órdenes de compra
- Control de ponches/reloj
- Gestión de proyectos
- Reportes y dashboards

## Bugs Corregidos (Feb 2025)
1. Campo "Subtítulo" no se guardaba en facturas/estimados/órdenes de compra
2. Crash al editar ponche (SelectItem con value vacío)

## Backlog
- Verificación visual de Factor % en producción
- Testing de cálculos con Factor %
