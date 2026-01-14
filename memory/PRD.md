# ProManage ERP - Product Requirements Document

## Original Problem Statement
Sistema ERP completo para gestión de proyectos, empleados, facturas, estimados y órdenes de compra.

## Core Requirements
- Gestión de proyectos con presupuestos y timesheet
- Módulo de RRHH con perfiles de empleados
- Facturación automática desde timesheet
- Estimados y órdenes de compra
- Módulo de Compañías para gestión de clientes

## What's Been Implemented

### Session: January 14, 2026
- **Módulo de Compañías (COMPLETADO)**:
  - CRUD completo para compañías (crear, ver, editar, eliminar)
  - CRUD anidado para sponsors dentro de compañías
  - Vista de detalle con información de contacto y términos de pago
  - Integración con Facturas (selector de compañía auto-rellena datos del cliente)
  - Integración con Estimados (selector de compañía en ClientProfileDetail.js)

- **Fix de Nomenclaturas (COMPLETADO)**:
  - Corregido endpoint en ClientProfileDetail.js: `/nomenclatures/next-number/${nomenclatureId}`
  - Auto-relleno del número de estimado generado

### Previous Sessions
- Rich Text Editor (TipTap) en descripciones de items
- Fix de PDF de estimados (layout dos columnas)
- Filtro de fechas en generación automática de facturas
- Lógica de sponsor en facturas
- Health endpoints para Kubernetes (/health, /ready)

## Prioritized Backlog

### P0 - Completado
- ✅ Módulo de Compañías con CRUD completo
- ✅ Integración de Compañías en Facturas y Estimados

### P1 - Pendiente
- Fix del bug de Nomenclature Selector (parcialmente resuelto - verificar en Settings)
- Integrar selector de compañías en Purchase Orders (si aplica)

### P2 - Futuro
- Rate Limiting y políticas de contraseñas
- UI para "Mover Documento"
- 2FA y auditoría de acceso

### P3 - Backlog
- Problemas de layout responsivo (HR, Settings, MyRequests, MyProfile)
- Refactorizar server.py (extraer company_router.py)
- Refactorizar Invoices.js y ClientProfileDetail.js

## Tech Stack
- Frontend: React 19, Shadcn/UI, TailwindCSS, TipTap
- Backend: FastAPI, Motor (MongoDB async)
- Database: MongoDB Atlas

## Key Files
- `/app/backend/server.py` - API principal
- `/app/frontend/src/pages/Companies.js` - Módulo de compañías
- `/app/frontend/src/pages/Invoices.js` - Facturas con selector de compañías
- `/app/frontend/src/pages/ClientProfileDetail.js` - Estimados con selector de compañías
- `/app/frontend/src/components/NomenclatureSelector.js` - Selector de nomenclaturas
