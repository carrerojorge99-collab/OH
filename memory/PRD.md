# ProManage ERP - Product Requirements Document

## Original Problem Statement
Sistema ERP completo para gestión de proyectos de construcción/ingeniería con módulos de:
- Gestión de proyectos y clientes
- Presupuestos (Cost Estimates) con materiales, mano de obra y subcontratistas
- Facturación y estados de cuenta
- Control de tiempo (Clock In/Out)
- Módulo de calidad (MRR, Pressure Tests, Checklists, No Conformidades)
- Múltiples roles de usuario con permisos diferenciados

## User Personas
1. **Super Admin** - Acceso completo al sistema
2. **Project Manager** - Gestión de proyectos y equipos
3. **Designer** - Acceso limitado a estimaciones (solo materiales con precios)
4. **Supervisor** - Acceso de solo lectura, sin información financiera
5. **PM Estimator** - Rol híbrido (en pruebas)

## Core Requirements
- Autenticación JWT con roles
- CRUD completo de proyectos, clientes, compañías
- Generación de facturas desde timesheets
- Exportación PDF/Excel con branding de empresa
- Módulo de calidad integrado en proyectos
- Control de tiempo con historial

---

## What's Been Implemented

### Session: March 2026
- ✅ **Purchase Orders Report** - Exportación PDF/Excel filtrable por sponsor, compañía y año
- ✅ **Quality Module** - Checklists y No Conformidades en proyectos
- ✅ **Supervisor Role** - Rol de solo lectura sin acceso financiero
- ✅ **Tax ID en Invoices** - Campo Tax ID guardado y mostrado en PDF
- ✅ **Auto-población de facturas** - Datos del cliente se cargan automáticamente
- ✅ **Filtro de estado en facturas** - Filtrar por Draft, Sent, Paid, etc.
- ✅ **Retención de subcontratistas** - Columna de Income Retention % en Cost Estimates
- ✅ **Formato de tiempo sin segundos** - Removidos segundos de clock in/out

### Previous Sessions
- ✅ Módulo completo de Cost Estimates
- ✅ Sistema de facturación con statements
- ✅ Control de tiempo (Clock In/Out)
- ✅ Generación de PDFs con branding
- ✅ MRR y Pressure Tests
- ✅ Pre-proyectos workflow
- ✅ Sistema de compañías y sponsors

---

## Prioritized Backlog

### P0 - Critical
- [ ] **Bug: Blank page on Cost Estimate assignment** - Usuario reportó pero no reproducido
- [ ] **Refactor server.py** - >17,000 líneas, riesgo de estabilidad crítico

### P1 - High Priority
- [ ] **Bug: document_date no se guarda** - Persiste en Invoices.js y Estimates.js
- [ ] **Bug: PDF layout Estimates** - Totales se cortan en nueva página
- [ ] **Time Clock self-edit restriction UI** - Backend listo, falta UI
- [ ] **Refactor Invoices.js** - >3,200 líneas
- [ ] **Refactor ProjectDetail.js** - ~5,000 líneas
- [ ] **Bulk Invoice Sending** - Endpoint POST /api/invoices/bulk-send

### P2 - Medium Priority
- [ ] **PM Estimator role testing** - Verificar permisos completos
- [ ] **Calendar view** - Visualizar schedules de proyectos
- [ ] **User Activity Log** - Tracking de acciones
- [ ] **KPI Dashboard** - Métricas principales

### P3 - Low Priority
- [ ] Verificar soporte de acentos en PDFs
- [ ] UX del filtro de año en proyectos (default a año actual con datos)

---

## Technical Architecture

### Backend
- **Framework:** FastAPI
- **Database:** MongoDB
- **File:** `backend/server.py` (CRÍTICO: >17k líneas - necesita refactoring)

### Frontend
- **Framework:** React 18
- **UI Components:** Shadcn/UI
- **State:** useState/useEffect hooks
- **Critical Files:**
  - `pages/Invoices.js` (>3.2k líneas)
  - `pages/ProjectDetail.js` (~5k líneas)
  - `pages/CostEstimateDetail.js` (>1.7k líneas)

### Key Collections (MongoDB)
- `projects` - Con campos client_email, client_phone, client_address, tax_id
- `invoices` - Con campo tax_id
- `cost_estimates` - Subcontractors con income_retention_percentage
- `quality_checklists` - Nuevo
- `quality_non_conformities` - Nuevo

### 3rd Party Integrations
- Cloudinary (uploads)
- ShareCAD.org (CAD viewer)
- jspdf/jspdf-autotable (PDF generation)
- xlsx (Excel export)
- react-signature-canvas
- @fullcalendar/react
- reportlab (Python PDF)

---

## Test Credentials
- **Super Admin:** carrerojorge99@gmail.com / 12345678
- **Designer:** designer@test.com / newpassword1234
- **Supervisor:** supervisor@test.com / newpassword1234

---

## Known Issues & Tech Debt
1. **server.py monolith** - Must be split into routes/, models/, services/
2. **Large React components** - ProjectDetail, Invoices need component extraction
3. **document_date bug** - Not persisting across all modules
4. **Cost Estimate assignment** - Potential blank page issue (unconfirmed)
