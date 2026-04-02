# Codigo Completo de Generacion de PDFs - ProManage ERP

## Estructura de Archivos

### Frontend (jsPDF + jspdf-autotable)

| Archivo | Descripcion | Lineas |
|---------|-------------|--------|
| `pdfGenerator.js` | **PRINCIPAL** - Utilidades compartidas: header con logo, tablas, totales, notas, footer. Reportes de seguridad, daily log, pressure test, inspecciones | 2,766 |
| `exportUtils.js` | Export de Timesheet y Salarios a PDF/Excel | 217 |
| `fontLoader.js` | Carga de fuente Roboto para soporte Unicode/acentos | ~100 |
| `logoData.js` | Logo OHSMS en formato Base64 | ~125k |
| `invoices_pdf_functions.js` | 3 funciones extraidas de Invoices.js: PO PDF, Statement PDF, Invoice PDF | ~1,150 |
| `estimates_pdf_function.js` | Funcion exportPDF extraida de Estimates.js | ~145 |

### Backend (reportlab - Python)

| Archivo | Descripcion | Lineas |
|---------|-------------|--------|
| `backend_cost_estimate_pdf.py` | PDF de Cost Estimates con logo, calculo cascading, secciones de costos directos, cargos obligatorios, profit | ~545 |
| `backend_cost_estimate_excel.py` | Export Excel de Cost Estimates con multiples hojas | ~235 |
| `backend_schedules_pdf.py` | PDF de Programacion de Turnos | ~90 |

## Funciones Principales de pdfGenerator.js

- `createPDFDocument()` - Crea doc jsPDF con fuente Unicode
- `fetchCompanyInfo()` - Obtiene info de compania + logo en base64
- `addDocumentHeader()` - Header: logo izq, info documento der, total en badge
- `addPartySection()` - Seccion de cliente/vendor
- `addTasksTable()` - Tabla de tareas (PO style)
- `addTasksTableWithTotals()` - Tabla con totales integrados (evita page break)
- `addItemsTable()` - Tabla generica de items
- `addTotalsSection()` - Seccion de subtotal/tax/total
- `addNotesSection()` - Notas y Terms lado a lado
- `addFooter()` - Footer con nombre de compania
- `addReportHeader()` - Header para reportes internos
- `addReportTable()` - Tabla generica para reportes
- `addPayStubHeader()` - Header de talonario de pago
- `addPaySection()` - Seccion de pago
- `generateSafetyDashboardReport()` - Reporte dashboard seguridad
- `generateIncidentsReport()` - Reporte de incidentes
- `generateIncidentDetailReport()` - Detalle de incidente individual
- `generateToolboxTalksReport()` - Reporte de Toolbox Talks
- `generateToolboxTalkDetailReport()` - Detalle de Talk con asistencia
- `generateChecklistsReport()` - Reporte de checklists
- `generateObservationsReport()` - Reporte de observaciones
- `generateDailyLogReport()` - Daily Log completo con firma
- `generatePressureTestPDF()` - Formulario Pressure Test
- `generateAbovegroundInspectionPDF()` - Inspeccion de tuberia

## Dependencias

### Frontend
```json
{
  "jspdf": "^2.5.2",
  "jspdf-autotable": "^3.8.4",
  "moment": "^2.30.1"
}
```

### Backend
```
reportlab
openpyxl
```
