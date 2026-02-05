# ProManage ERP - Product Requirements Document

## Original Problem Statement
Sistema ERP completo para gestión de proyectos, facturación, estimados, recursos humanos, y operaciones de una empresa de servicios profesionales.

## Core Requirements
1. Gestión de proyectos con presupuestos y seguimiento
2. Sistema de estimados y cotizaciones
3. Facturación con generación de PDF
4. Gestión de órdenes de compra
5. Control de tiempo (ponches) de empleados
6. Gestión de proveedores
7. Sistema de permisos por roles
8. **Módulo de RFIs (Request for Information)**

## User Roles
- **Super Admin**: Acceso completo a todo el sistema
- **Admin**: Acceso administrativo
- **Project Manager**: Acceso operacional (financieros configurables)
- **RRHH**: Recursos humanos + acceso completo a proyectos
- **Empleado**: Acceso básico

## What's Been Implemented

### February 2026

#### RFI Module (2026-02-05)
- ✅ Backend: Modelos y endpoints completos para RFIs (`/api/rfis`)
- ✅ Frontend: Componente `ProjectRFI.js` con UI completa
- ✅ Tab "RFIs" integrado en la página de detalle del proyecto
- ✅ Estadísticas por proyecto (Total, Borrador, Enviados, En Revisión, Respondidos, Cerrados, Vencidos)
- ✅ CRUD completo: Crear, editar, eliminar RFIs
- ✅ Flujo de estados: Borrador → Enviado → En Revisión → Respondido → Cerrado
- ✅ Registro de respuestas con información del respondedor
- ✅ Generación de PDF con formato OHSMS
- ✅ Filtros por estado y búsqueda
- ✅ Soporte para RFI y RFC (Request for Clarification)
- ✅ Campos de impacto: Prioridad, Impacto en Costo, Impacto en Cronograma
- ✅ Fecha límite de respuesta con indicador de vencimiento

#### HR Navigation Update (2026-02-05)
- ✅ Usuarios con rol `rrhh` tienen acceso completo a todas las secciones de proyectos (igual que admin)

#### Configurable PM Financial Visibility (Previous Session)
- ✅ Toggle en Settings para ocultar/mostrar información financiera a Project Managers
- ✅ Hook centralizado `useFinancialPermissions.js`

### December 2025 - January 2026

#### Project Manager Money Restrictions (2026-01-31)
- ✅ Creado sistema de permisos centralizado (`/app/frontend/src/utils/permissions.js`)
- ✅ Dashboard: Oculta tarjeta "Ganancia Total" y gráficos financieros para PM
- ✅ Facturas: Oculta totales, precios y registro de pagos para PM
- ✅ Estimados: Oculta montos y totales para PM
- ✅ Órdenes de Compra: Oculta precios para PM
- ✅ Estimaciones de Costos: Oculta toda info de costos para PM
- ✅ Usuario de prueba: pm@test.com / Test123!

#### Automatic Punch Closure (2026-01-31)
- ✅ Backend: Función `auto_close_expired_punches` en server.py
- ✅ Database: Campo `max_punch_hours` en company_settings
- ✅ Frontend: UI de configuración en Settings.js
- ⏳ PENDIENTE: Verificación del usuario

#### Previous Session Features (PENDING USER VERIFICATION)
- Invoice numbering system
- Multi-line addresses in PDFs
- Reduced PDF size
- Cloudinary integration for profile photos
- PDF formatting for numbered lists

## Current Architecture

```
/app/
├── backend/
│   └── server.py              # FastAPI main server (RFI endpoints added)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ProjectRFI.js     # NEW: RFI module component
│       │   ├── ProjectSafety.js  # Safety module
│       │   └── Layout.js         # MODIFIED: HR navigation
│       ├── hooks/
│       │   └── useFinancialPermissions.js # Financial visibility hook
│       ├── pages/
│       │   ├── ProjectDetail.js  # MODIFIED: Added RFI tab
│       │   ├── Dashboard.js      # Role-based money visibility
│       │   ├── Settings.js       # PM visibility toggle
│       │   └── ...
│       └── utils/
│           └── permissions.js    # Centralized permission utilities
└── memory/
    └── PRD.md
```

## Database Schema (Key Collections)
- **users**: User accounts with roles
- **projects**: Project data with budgets
- **rfis**: RFI documents (NEW)
- **rfi_comments**: Comments on RFIs (NEW)
- **estimates**: Quote documents
- **invoices**: Invoice documents
- **purchase_orders**: PO documents
- **cost_estimates**: Cost estimation documents
- **clock_entries**: Time punch records
- **company_settings**: System configuration including `max_punch_hours`, `hide_financial_for_pm`

## Key API Endpoints
- `POST /api/auth/login` - Authentication
- `GET /api/rfis` - List RFIs (NEW)
- `POST /api/rfis` - Create RFI (NEW)
- `PUT /api/rfis/{id}` - Update RFI (NEW)
- `POST /api/rfis/{id}/send` - Send RFI (NEW)
- `POST /api/rfis/{id}/respond` - Add response (NEW)
- `POST /api/rfis/{id}/close` - Close RFI (NEW)
- `GET /api/projects/{id}/rfi-stats` - RFI statistics (NEW)
- `GET /api/company-settings` - Get settings
- `PUT /api/company-settings` - Update settings

## Third-Party Integrations
- jsPDF & jspdf-autotable (PDF generation)
- Cloudinary (Image hosting)
- fastapi-mail (Email sending)
- @tiptap/react (Rich text editor)
- React Big Calendar (Calendar UI)

## Prioritized Backlog

### P0 - Critical
1. ⏳ Verify Invoice PDF layout matches Estimate PDF
2. ⏳ Verify all pending fixes from previous sessions
3. ✅ PM money restrictions

### P1 - High Priority
1. Prepare DigitalOcean migration (Dockerfile, docker-compose)
2. Cloudinary integration decision for non-image files

### P2 - Medium Priority
1. Vendor categories
2. "Move Document" UI
3. Responsive layout fixes

### P3 - Future
1. Security features (2FA, rate limiting)
2. Closure prediction for projects
3. Profitability per employee report
4. Refactor monolithic files

## Known Issues
1. PDF formatting with numbered lists may not render correctly
2. Responsive layout issues on HR, Settings, MyRequests, MyProfile pages

## Test Credentials
- **Super Admin**: jcarrion@ohsmspr.com / Admin2024!
- **Project Manager**: pm@test.com / Test123!
- **Cloudinary**: Cloud name: dobwd06je, API Key: 894275145838962
