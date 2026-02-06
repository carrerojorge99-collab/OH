# ProManage ERP - Product Requirements Document

## Original Problem Statement
Sistema ERP completo para gestión de proyectos de construcción con módulos de proyectos, tareas, presupuestos, facturas, estimados, seguridad, RFIs y más.

## Current Session Completed Work (Feb 2026)

### RFI Module Enhancements ✅
1. **Logo del PDF corregido**: El PDF ahora muestra el logo real de la empresa (importado desde `logoData.js`) en lugar del texto placeholder "OHSMS"
2. **Función de Adjuntar Documentos**: 
   - Subida de archivos a Cloudinary
   - Sección de adjuntos en formularios de Crear y Editar RFI
   - Visualización de adjuntos en el diálogo de Ver RFI
   - Enlaces a documentos adjuntos incluidos en el PDF generado

### Files Modified
- `/app/frontend/src/components/ProjectRFI.js` - Añadido import de LOGO_BASE64, función de upload, UI de adjuntos

## Architecture

```
/app/
├── backend/
│   └── server.py           # FastAPI backend con todos los endpoints
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProjectRFI.js    # Módulo RFI completo
│   │   │   └── Layout.js        # Navegación
│   │   ├── pages/
│   │   │   └── ProjectDetail.js # Detalle de proyecto con tabs
│   │   └── utils/
│   │       └── logoData.js      # Logo base64 de la empresa
│   └── package.json
└── memory/
    └── PRD.md
```

## Pending User Verification
- Verificación acceso rol HR (rrhh)
- Funciones anteriores completadas pendientes de verificación

## Backlog (P1-P2)
- Corregir diseño PDF Facturas vs Presupuestos
- Preparación para migración a DigitalOcean
- Refactorizar server.py en módulos
- Implementar categorías de proveedores

## Credentials
- **Super Admin**: jcarrion@ohsmspr.com / Admin2024!
- **Project Manager**: pm@test.com / Test123!

## 3rd Party Integrations
- jsPDF & jspdf-autotable (PDF generation)
- Cloudinary (file storage)
- MongoDB (database)
- fastapi-mail (emails)
