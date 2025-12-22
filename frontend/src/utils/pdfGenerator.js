import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from 'moment';
import api from './api';
import { LOGO_BASE64 } from './logoData';

// Colores corporativos
const COLORS = {
  primary: [249, 115, 22],    // Orange
  secondary: [71, 85, 105],   // Slate
  text: [30, 41, 59],         // Dark
  lightBg: [248, 250, 252],   // Light gray
  white: [255, 255, 255]
};

// Fetch company info
export const fetchCompanyInfo = async () => {
  try {
    const response = await api.get('/company');
    return response.data;
  } catch (error) {
    return {};
  }
};

// Add professional header with company info left, doc info right
export const addDocumentHeader = async (doc, company, docType, docNumber, docDate, total) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // === LEFT SIDE: Company Logo and Info ===
  let leftY = 15;
  
  // Add company logo (PNG with white background)
  try {
    doc.addImage(LOGO_BASE64, 'PNG', 15, 10, 40, 20);
    leftY = 33;
  } catch (e) {
    // If logo fails, just continue
    leftY = 15;
  }
  
  // Always show company name below logo (split into 2 lines after "SAFETY")
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  const companyName = company.company_name || 'OHSMS PR';
  if (companyName.includes('SAFETY')) {
    const parts = companyName.split('SAFETY');
    doc.text(parts[0].trim() + ' SAFETY', 15, leftY);
    leftY += 4;
    doc.text(parts[1].trim(), 15, leftY);
    leftY += 5;
  } else {
    doc.text(companyName, 15, leftY);
    leftY += 5;
  }
  
  // Company details
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  if (company.address) { doc.text(company.address, 15, leftY); leftY += 4; }
  if (company.city || company.state) { 
    doc.text(`${company.city || ''}, ${company.state || ''} ${company.zip_code || ''}`, 15, leftY); 
    leftY += 4; 
  }
  if (company.phone) { doc.text(`Tel: ${company.phone}`, 15, leftY); leftY += 4; }
  if (company.email) { doc.text(company.email, 15, leftY); leftY += 4; }
  if (company.website) { doc.text(company.website, 15, leftY); leftY += 4; }
  
  // === RIGHT SIDE: Document Info ===
  const rightX = pageWidth - 15;
  
  // Document type title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(docType.toUpperCase(), rightX, 20, { align: 'right' });
  
  // Document number and date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  doc.text(`#: ${docNumber}`, rightX, 28, { align: 'right' });
  doc.text(`Fecha: ${moment(docDate).format('MMM DD, YYYY')}`, rightX, 34, { align: 'right' });
  
  // Total in orange box
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(pageWidth - 55, 40, 40, 12, 2, 2, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - 35, 48, { align: 'center' });
  
  // Separator line - position based on content height
  const lineY = Math.max(leftY + 2, 60);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, lineY, pageWidth - 15, lineY);
  
  return lineY + 6;
};

// Add client/vendor section BELOW company info
export const addPartySection = (doc, title, name, address, email, phone, startY) => {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(title, 15, startY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  let y = startY + 6;
  if (name) { doc.text(name, 15, y); y += 5; }
  
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  if (address) { doc.text(address, 15, y); y += 4; }
  if (email) { doc.text(email, 15, y); y += 4; }
  if (phone) { doc.text(phone, 15, y); y += 4; }
  
  return y + 6;
};

// Task-based table for PO (large description area)
export const addTasksTable = (doc, tasks, startY) => {
  const tableData = tasks.map((task, idx) => {
    // Build description with scope and details
    let desc = `${idx + 1}. ${task.description || task.name || ''}`;
    if (task.scope) desc += `\n\nScope of Work:\n${task.scope}`;
    if (task.details) desc += `\n\nConsidered Tasks:\n${task.details}`;
    
    return [
      { content: desc, styles: { cellWidth: 120, minCellHeight: 25 } },
      { content: (task.quantity || 1).toString(), styles: { halign: 'center' } },
      { content: `$${(task.unit_price || task.rate || 0).toFixed(2)}`, styles: { halign: 'right' } },
      { content: `$${(task.amount || task.total || 0).toFixed(2)}`, styles: { halign: 'right' } }
    ];
  });
  
  autoTable(doc, {
    startY: startY,
    head: [['# Tasks', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: COLORS.lightBg,
      textColor: COLORS.text,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 5,
      textColor: COLORS.text,
      lineHeight: 1.4
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253]
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.1,
    didParseCell: (data) => {
      // Allow line breaks in description
      if (data.column.index === 0 && data.cell.raw?.content) {
        data.cell.styles.cellWidth = 120;
      }
    }
  });
  
  return doc.lastAutoTable.finalY;
};

// Standard items table
export const addItemsTable = (doc, items, startY, columns = ['Descripción', 'Cant.', 'Precio', 'Total']) => {
  const tableData = items.map((item, idx) => [
    `${idx + 1}. ${item.description || item.name || ''}`,
    (item.quantity || 1).toString(),
    `$${(item.unit_price || item.rate || 0).toFixed(2)}`,
    `$${(item.amount || item.total || 0).toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: startY,
    head: [columns],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: COLORS.lightBg,
      textColor: COLORS.text,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: COLORS.text
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253]
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.1
  });
  
  return doc.lastAutoTable.finalY;
};

// Totals section
export const addTotalsSection = (doc, subtotal, discount = 0, tax = 0, total, startY) => {
  const pageWidth = doc.internal.pageSize.width;
  const rightX = pageWidth - 15;
  let y = startY + 10;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  
  doc.text('Sub Total:', rightX - 45, y);
  doc.text(`$${subtotal.toFixed(2)}`, rightX, y, { align: 'right' });
  y += 6;
  
  if (discount > 0) {
    doc.text('Descuento:', rightX - 45, y);
    doc.text(`-$${discount.toFixed(2)}`, rightX, y, { align: 'right' });
    y += 6;
  }
  
  if (tax > 0) {
    doc.text('Impuesto:', rightX - 45, y);
    doc.text(`$${tax.toFixed(2)}`, rightX, y, { align: 'right' });
    y += 6;
  }
  
  // Total line
  doc.setDrawColor(...COLORS.secondary);
  doc.line(rightX - 55, y, rightX, y);
  y += 8;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Total:', rightX - 45, y);
  doc.text(`$${total.toFixed(2)}`, rightX, y, { align: 'right' });
  
  return y + 12;
};

// Notes section
export const addNotesSection = (doc, notes, terms, startY) => {
  if (!notes && !terms) return startY;
  
  let y = startY + 5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(15, y - 3, 195, y - 3);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.secondary);
  doc.text('Notes', 15, y + 3);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  
  y += 10;
  if (notes) {
    const splitNotes = doc.splitTextToSize(notes, 170);
    doc.text(splitNotes, 15, y);
    y += splitNotes.length * 4 + 4;
  }
  if (terms) {
    const splitTerms = doc.splitTextToSize(terms, 170);
    doc.text(splitTerms, 15, y);
  }
  
  return y;
};

// Footer
export const addFooter = (doc, company) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(`Generated by ${company.company_name || 'ProManage ProManage'}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
};

export default { fetchCompanyInfo, addDocumentHeader, addPartySection, addTasksTable, addItemsTable, addTotalsSection, addNotesSection, addFooter };
