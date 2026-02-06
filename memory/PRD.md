# ProManage ERP - Product Requirements Document

## Original Problem Statement
Sistema ERP completo para gestión de proyectos de construcción con módulos de proyectos, tareas, presupuestos, facturas, estimados, seguridad, RFIs, recibos de pago y más.

## Current Session Completed Work (Feb 2026)

### Payment Receipts Module (Recibos de Pago) ✅ NEW
Módulo completo para gestionar y evidenciar los pagos realizados a proveedores.

**Funcionalidades implementadas:**
1. **CRUD completo de recibos** con numeración automática (REC-0001, REC-0002...)
2. **Campos del recibo:**
   - Proveedor (obligatorio)
   - Proyecto (opcional)
   - Fecha, Monto, Método de Pago
   - Número de Referencia (bancaria/cheque)
   - Concepto, Notas
3. **Módulo centralizado** en `/receipts` con:
   - Tarjetas de estadísticas (Total Recibos, Total Pagado, Proveedores)
   - Filtros por proveedor, proyecto y búsqueda
   - Tabla con todas las columnas
4. **Vista integrada en Vendors**: Cada proveedor muestra sus recibos y total pagado
5. **Generación de PDF**: Diseño minimalista con logo de empresa
6. **Envío por Email**: Con PDF adjunto
7. **Comprobantes adjuntos**: Subida de imágenes/PDFs a Cloudinary

### Files Created/Modified
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
│   │   │   └── CloudinaryUpload.jsx
│   │   ├── pages/
│   │   │   ├── PaymentReceipts.js  # Nuevo módulo de recibos
│   │   │   ├── Vendors.js          # Con integración de recibos
│   │   │   └── ProjectDetail.js    # Detalle de proyecto con tabs
│   │   └── utils/
│   │       ├── logoData.js         # Logo base64 de la empresa
│   │       └── pdfGenerator.js     # Helpers para PDF
│   └── package.json
└── memory/
    └── PRD.md
```

## Key API Endpoints (New)
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
- Verificación acceso rol HR (rrhh)
- Funciones anteriores completadas pendientes de verificación

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
