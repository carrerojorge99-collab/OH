import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchCompanyInfo, addReportHeader, addReportTable, addFooter } from './pdfGenerator';

// Export Timesheet to Excel
export const exportTimesheetToExcel = (timesheetData, projectName) => {
  const ws_data = [
    ['REPORTE DE TIMESHEET'],
    ['Proyecto:', projectName],
    ['Fecha de Exportación:', new Date().toLocaleDateString('es-MX')],
    [],
    ['Fecha', 'Usuario', 'Tarea', 'Horas', 'Descripción']
  ];

  timesheetData.forEach(entry => {
    ws_data.push([
      entry.date,
      entry.user_name || 'N/A',
      entry.task_name || 'Sin tarea',
      entry.hours_worked || entry.hours || 0,
      entry.description || ''
    ]);
  });

  // Add totals
  const totalHours = timesheetData.reduce((sum, entry) => sum + (entry.hours_worked || entry.hours || 0), 0);
  ws_data.push([]);
  ws_data.push(['TOTAL HORAS', '', '', totalHours, '']);

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 12 },
    { wch: 25 },
    { wch: 30 },
    { wch: 10 },
    { wch: 40 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
  
  const fileName = `Timesheet_${projectName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Export Timesheet to PDF
export const exportTimesheetToPDF = async (timesheetData, projectName) => {
  const doc = new jsPDF();
  const company = await fetchCompanyInfo();
  
  // Header with company info
  let y = await addReportHeader(doc, company, 'REPORTE DE TIMESHEET', `Proyecto: ${projectName}`);

  const tableData = timesheetData.map(entry => [
    entry.date || 'N/A',
    entry.user_name || 'N/A',
    entry.task_name || 'Sin tarea',
    (entry.hours_worked || entry.hours || 0).toString(),
    entry.description || ''
  ]);

  const totalHours = timesheetData.reduce((sum, entry) => sum + (entry.hours_worked || entry.hours || 0), 0);

  addReportTable(doc,
    ['Fecha', 'Usuario', 'Tarea', 'Horas', 'Descripción'],
    tableData,
    y,
    {
      footerRow: ['TOTAL', '', '', totalHours.toString(), ''],
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 40 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 60 }
      }
    }
  );

  addFooter(doc, company);
  const fileName = `Timesheet_${projectName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

// Export Labor/Salaries to Excel
export const exportLaborToExcel = (laborData, projectName) => {
  const ws_data = [
    ['REPORTE DE SALARIOS'],
    ['Proyecto:', projectName],
    ['Fecha de Exportación:', new Date().toLocaleDateString('es-MX')],
    [],
    ['Categoría', 'Horas/Semana', 'Tarifa/Hora', 'Horas Totales Est.', 'Horas Consumidas', 'Horas Extra', 'Tarifa Extra', 'Gastos', 'Total']
  ];

  laborData.forEach(labor => {
    const total = (labor.consumed_hours * labor.hourly_rate) + 
                  (labor.overtime_hours * labor.overtime_rate) + 
                  labor.expenses;
    
    ws_data.push([
      labor.labor_category,
      labor.hours_per_week,
      `$${labor.hourly_rate.toFixed(2)}`,
      labor.estimated_total_hours,
      labor.consumed_hours || 0,
      labor.overtime_hours || 0,
      `$${labor.overtime_rate.toFixed(2)}`,
      `$${labor.expenses.toFixed(2)}`,
      `$${total.toFixed(2)}`
    ]);
  });

  // Add totals
  const totalCost = laborData.reduce((sum, labor) => {
    return sum + (labor.consumed_hours * labor.hourly_rate) + 
           (labor.overtime_hours * labor.overtime_rate) + 
           labor.expenses;
  }, 0);
  
  ws_data.push([]);
  ws_data.push(['COSTO TOTAL', '', '', '', '', '', '', '', `$${totalCost.toFixed(2)}`]);

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  ws['!cols'] = [
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Salarios');
  
  const fileName = `Salarios_${projectName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Export Labor/Salaries to PDF
export const exportLaborToPDF = (laborData, projectName) => {
  const doc = new jsPDF('landscape');
  
  doc.setFontSize(18);
  doc.text('REPORTE DE SALARIOS', 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Proyecto: ${projectName}`, 14, 32);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 14, 38);

  const tableData = laborData.map(labor => {
    const consumedHours = labor.consumed_hours || 0;
    const overtimeHours = labor.overtime_hours || 0;
    const hourlyRate = labor.hourly_rate || 0;
    const overtimeRate = labor.overtime_rate || 0;
    const expenses = labor.expenses || 0;
    
    const total = (consumedHours * hourlyRate) + 
                  (overtimeHours * overtimeRate) + 
                  expenses;
    
    return [
      labor.labor_category || 'N/A',
      (labor.hours_per_week || 0).toString(),
      `$${hourlyRate.toFixed(2)}`,
      (labor.estimated_total_hours || 0).toString(),
      consumedHours.toString(),
      overtimeHours.toString(),
      `$${overtimeRate.toFixed(2)}`,
      `$${expenses.toFixed(2)}`,
      `$${total.toFixed(2)}`
    ];
  });

  const totalCost = laborData.reduce((sum, labor) => {
    const consumedHours = labor.consumed_hours || 0;
    const overtimeHours = labor.overtime_hours || 0;
    const hourlyRate = labor.hourly_rate || 0;
    const overtimeRate = labor.overtime_rate || 0;
    const expenses = labor.expenses || 0;
    
    return sum + (consumedHours * hourlyRate) + 
           (overtimeHours * overtimeRate) + 
           expenses;
  }, 0);

  autoTable(doc, {
    head: [['Categoría', 'Hrs/Sem', 'Tarifa/Hr', 'Hrs Est.', 'Hrs Cons.', 'Hrs Extra', 'Tarifa Extra', 'Gastos', 'Total']],
    body: tableData,
    foot: [['COSTO TOTAL', '', '', '', '', '', '', '', `$${totalCost.toFixed(2)}`]],
    startY: 45,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  const fileName = `Salarios_${projectName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
