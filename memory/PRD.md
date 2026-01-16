# ProManage ERP - Product Requirements Document

## Original Problem Statement
Sistema ERP completo para gestión de proyectos, empleados, facturas, estimados y órdenes de compra.

## Core Requirements
- Gestión de proyectos con presupuestos y timesheet
- Módulo de RRHH con perfiles de empleados
- Facturación automática desde timesheet
- Estimados y órdenes de compra
- Módulo de Compañías para gestión de clientes
- Módulo de Proveedores para gestión de vendors
- Sincronización automática de horas trabajadas

## What's Been Implemented

### Session: January 16, 2026
- **Sincronización Automática de Horas en Proyectos (COMPLETADO)**:
  - Las "Horas Consumidas" (`consumed_hours`) en los registros de Labor se actualizan automáticamente
  - Se sincroniza al: crear/editar/eliminar timesheet, clock out, crear/editar/eliminar ponches manuales
  - Función helper `sync_project_labor_hours()` suma todas las horas del timesheet del proyecto
  - Asignación inteligente: coincide nombre de usuario con categoría de labor

### Session: January 14, 2026 (Continued)
- **Módulo de Vendors (COMPLETADO)**:
  - CRUD completo para proveedores (crear, ver, editar, eliminar)
  - Categorías de proveedores (Materiales, Servicios, Equipos, Subcontratista, etc.)
  - CRUD para contactos múltiples por proveedor
  - Integración con Órdenes de Compra (selector de vendor auto-rellena datos)
  - Filtro por categoría y búsqueda

- **Fix Facturas Automáticas (COMPLETADO)**:
  - Corregido filtro de fechas que no traía horas correctas
  - Ajustado formato de comparación de fechas (YYYY-MM-DD sin hora)

- **Módulo de Compañías (COMPLETADO)**:
  - CRUD completo para compañías y sponsors anidados
  - Integración con Facturas y Estimados

### Previous Sessions
- Rich Text Editor (TipTap) en descripciones de items
- Fix de PDF de estimados (layout dos columnas)
- Filtro de fechas en generación automática de facturas
- Health endpoints para Kubernetes (/health, /ready)

## Prioritized Backlog

### P0 - Completado
- ✅ Módulo de Compañías
- ✅ Módulo de Vendors con categorías y contactos
- ✅ Integración de Vendors en Órdenes de Compra
- ✅ Fix filtro de fechas en facturas automáticas
- ✅ Sincronización automática de horas en proyectos

### P1 - Pendiente
- Testing completo del módulo de Vendors
- Categorías de Vendors (UI para gestionar categorías)

### P2 - Futuro
- Rate Limiting y políticas de contraseñas
- UI para "Mover Documento"
- Verificación de deployment MongoDB timeout fix

### P3 - Backlog
- Problemas de layout responsivo
- Refactorizar server.py en routers separados

## Key Files
- `/app/backend/server.py` - API principal (sync_project_labor_hours lines 911-976)
- `/app/frontend/src/pages/Vendors.js` - Módulo de proveedores
- `/app/frontend/src/pages/PurchaseOrders.js` - Con selector de vendors
- `/app/frontend/src/pages/Companies.js` - Módulo de compañías
- `/app/frontend/src/pages/ProjectDetail.js` - Detalle de proyecto con Labor y Timesheet
