# ProManage ERP - Product Requirements Document

## Original Problem Statement
Sistema ERP completo para gestión de proyectos de construcción con módulos de proyectos, tareas, presupuestos, facturas, estimados, seguridad, RFIs, recibos de pago y más.

## Current Session Completed Work (Feb 9, 2026)

### Document Subtitle Feature ✅ NEW
Agregado campo de subtítulo para documentos (Facturas, Estimados, Órdenes de Compra).

**Funcionalidades implementadas:**
1. **Campo "Subtítulo del Documento"** agregado a todos los formularios de creación/edición
2. **Aparece centrado en el PDF** en color naranja (destacado) antes del contenido principal
3. **Ejemplos de uso**:
   - Facturas: "Avance de Obra #2", "Factura Final"
   - Estimados: "Fase 1 - Demolición", "Propuesta Inicial"
   - Órdenes de Compra: "Materiales Fase 1", "Equipos para Demolición"

**Archivos modificados:**
- Backend: `server.py` - Agregado campo `subtitle` a modelos Invoice, Estimate y PurchaseOrder
- Frontend: `Invoices.js`, `Estimates.js`, `PurchaseOrders.js` - Campo de entrada y generación PDF

### Project Time Management Improvements ✅
Mejoras en el área de Tiempo de los proyectos solicitadas por el usuario.

**Funcionalidades implementadas:**
1. **Eliminación del cronómetro (Timer)**: Removido el componente Timer de la pestaña Tiempo
2. **Tarjetas de Control de Horas**: Nueva sección en el dashboard del proyecto con:
   - Horas Estimadas (configurables)
   - Horas Consumidas (calculadas automáticamente de los registros de timesheet)
   - Horas Restantes (estimadas - consumidas)
   - Barra de progreso con indicador de exceso
   - Botón "Editar Horas Estimadas" para acceso rápido
3. **Mover ponches en lote**:
   - Checkboxes en cada fila de la tabla de timesheet
   - Checkbox "Seleccionar todos" en el encabezado
   - Botón "Mover X seleccionados" que aparece al seleccionar registros
   - Diálogo modal con selector de proyecto destino
   - Endpoint API `/api/timesheet/move-batch` para mover múltiples registros
4. **Campo Horas Estimadas del Proyecto**: Agregado al formulario de edición del proyecto

### Payment Receipts Module (Recibos de Pago) ✅ (Previous session)
Módulo completo para gestionar y evidenciar los pagos realizados a proveedores.

**Funcionalidades implementadas:**
1. **CRUD completo de recibos** con numeración automática (REC-0001, REC-0002...)
2. **Campos del recibo:**
   - Proveedor (obligatorio)
   - Proyecto (opcional)
   - Fecha, Monto, Método de Pago
   - Número de Referencia (bancaria/cheque)
   - Concepto, Notas
   - Descuento en porcentaje
3. **Módulo centralizado** en `/receipts` con:
   - Tarjetas de estadísticas (Total Recibos, Total Pagado, Proveedores)
   - Filtros por proveedor, proyecto y búsqueda
   - Tabla con todas las columnas
4. **Vista integrada en Vendors**: Cada proveedor muestra sus recibos y total pagado
5. **Generación de PDF**: Diseño con branding de la empresa (estilo Estimados)
6. **Envío por Email**: Con PDF adjunto
7. **Comprobantes adjuntos**: Subida de imágenes/PDFs a Cloudinary

### Files Created/Modified (This Session)
- `/app/backend/server.py` - Agregado `estimated_hours` a Project, endpoint `/timesheet/move-batch`
- `/app/frontend/src/pages/ProjectDetail.js` - Timer eliminado, tarjetas de horas, checkboxes y mover en lote

### Files Created/Modified (Previous Session)
- `/app/backend/server.py` - Endpoints de recibos (CRUD, attachments, email)
- `/app/frontend/src/pages/PaymentReceipts.js` - Página principal de recibos
- `/app/frontend/src/pages/Vendors.js` - Integración de recibos en detalle de vendor
- `/app/frontend/src/components/Layout.js` - Menú con "Recibos de Pago"
- `/app/frontend/src/App.js` - Ruta /receipts

### RFI Module Enhancements ✅ (Previous session)
1. Logo del PDF corregido
2. Función de Adjuntar Documentos

## Architecture

```
/app/
├── backend/
│   └── server.py           # FastAPI backend con todos los endpoints
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProjectRFI.js    # Módulo RFI completo
│   │   │   ├── Layout.js        # Navegación
│   │   │   ├── Timer.js         # Componente (ya no se usa en Tiempo)
│   │   │   └── CloudinaryUpload.jsx
│   │   ├── pages/
│   │   │   ├── PaymentReceipts.js  # Módulo de recibos
│   │   │   ├── Vendors.js          # Con integración de recibos
│   │   │   └── ProjectDetail.js    # Detalle de proyecto con control de horas
│   │   └── utils/
│   │       ├── logoData.js         # Logo base64 de la empresa
│   │       └── pdfGenerator.js     # Helpers para PDF
│   └── package.json
└── memory/
    └── PRD.md
```

## Key API Endpoints
### Project Time Management (New)
- `POST /api/timesheet/move-batch` - Mover múltiples registros de timesheet a otro proyecto

### Payment Receipts
- `GET /api/receipts` - Listar recibos con filtros
- `POST /api/receipts` - Crear recibo
- `GET /api/receipts/{id}` - Obtener recibo
- `PUT /api/receipts/{id}` - Actualizar recibo
- `DELETE /api/receipts/{id}` - Eliminar recibo
- `POST /api/receipts/{id}/attachments` - Agregar comprobante
- `DELETE /api/receipts/{id}/attachments/{id}` - Eliminar comprobante
- `POST /api/receipts/{id}/send-email` - Enviar por email
- `GET /api/vendors/{id}/receipts` - Recibos de un proveedor

## Pending User Verification
- Verificación E2E del módulo RFI (generación PDF y fusión de documentos)
- Verificación acceso rol HR (rrhh)

## Backlog (P1-P2)
- Corregir diseño PDF Facturas vs Presupuestos
- Preparación para migración a DigitalOcean (Dockerfile, docker-compose)
- Refactorizar server.py en módulos
- Implementar categorías de proveedores
- Implementar "Mover Documento" en Project Documents

## Credentials
- **Super Admin**: jcarrion@ohsmspr.com / Admin2024!
- **Test Admin**: j.carrero@ohsmspr.com / Admin2024!

## 3rd Party Integrations
- jsPDF & jspdf-autotable (PDF generation)
- pdf-lib (PDF merging)
- Cloudinary (file storage)
- MongoDB (database)
- fastapi-mail (emails)
- React Big Calendar
- @tiptap/react (rich text editor)
