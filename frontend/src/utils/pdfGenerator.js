import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from 'moment';
import api from './api';

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
    const response = await api.get('/company-settings');
    return response.data;
  } catch (error) {
    return {};
  }
};

// Add professional header with logo
export const addDocumentHeader = async (doc, company, docType, docNumber, docDate, total) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Logo placeholder (left side)
  if (company.company_logo) {
    try {
      doc.addImage(company.company_logo, 'PNG', 15, 10, 40, 20);
    } catch (e) {
      // Fallback: company name as logo
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(company.company_name || 'OHSMS', 15, 22);
    }
  } else {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(company.company_name || 'OHSMS', 15, 22);
  }
  
  // Company info below logo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  let infoY = 32;
  if (company.address) { doc.text(company.address, 15, infoY); infoY += 4; }
  if (company.city || company.state) { doc.text(`${company.city || ''}, ${company.state || ''} ${company.zip_code || ''}`, 15, infoY); infoY += 4; }
  if (company.phone) { doc.text(`Tel: ${company.phone}`, 15, infoY); infoY += 4; }
  if (company.email) { doc.text(company.email, 15, infoY); infoY += 4; }
  
  // Document title and info (right side)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(docType.toUpperCase(), pageWidth - 15, 18, { align: 'right' });
  
  // Document details box (right aligned)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  
  const rightX = pageWidth - 15;
  doc.text(`#: ${docNumber}`, rightX, 26, { align: 'right' });
  doc.text(`Fecha: ${moment(docDate).format('MMM DD, YYYY')}`, rightX, 32, { align: 'right' });
  
  // Total highlight
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(pageWidth - 60, 36, 45, 12, 2, 2, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, rightX - 22.5, 44, { align: 'center' });
  
  // Separator line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, 52, pageWidth - 15, 52);
  
  return 58;
};

// Add vendor/client section
export const addPartySection = (doc, title, name, address, email, phone, startY, isLeft = true) => {
  const x = isLeft ? 15 : 110;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(title, x, startY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  let y = startY + 6;
  if (name) { doc.text(name, x, y); y += 5; }
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  if (address) { doc.text(address, x, y); y += 4; }
  if (email) { doc.text(email, x, y); y += 4; }
  if (phone) { doc.text(phone, x, y); y += 4; }
  
  return y + 4;
};

// Professional table for items
export const addItemsTable = (doc, items, startY, columns = ['Descripción', 'Cant.', 'Precio', 'Total']) => {
  const tableData = items.map((item, idx) => {
    const row = [
      { content: `${idx + 1}. ${item.description || item.name || ''}`, styles: { fontStyle: 'normal' } },
      item.quantity?.toString() || '1',
      `$${(item.unit_price || item.rate || 0).toFixed(2)}`,
      `$${(item.amount || item.total || 0).toFixed(2)}`
    ];
    return row;
  });
  
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
  let y = startY + 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  
  doc.text('Subtotal:', rightX - 40, y);
  doc.text(`$${subtotal.toFixed(2)}`, rightX, y, { align: 'right' });
  y += 6;
  
  if (discount > 0) {
    doc.text('Descuento:', rightX - 40, y);
    doc.text(`-$${discount.toFixed(2)}`, rightX, y, { align: 'right' });
    y += 6;
  }
  
  if (tax > 0) {
    doc.text('Impuesto:', rightX - 40, y);
    doc.text(`$${tax.toFixed(2)}`, rightX, y, { align: 'right' });
    y += 6;
  }
  
  // Total line
  doc.setDrawColor(...COLORS.secondary);
  doc.line(rightX - 50, y, rightX, y);
  y += 6;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('TOTAL:', rightX - 40, y);
  doc.text(`$${total.toFixed(2)}`, rightX, y, { align: 'right' });
  
  return y + 10;
};

// Notes section
export const addNotesSection = (doc, notes, terms, startY) => {
  if (!notes && !terms) return startY;
  
  let y = startY + 5;
  doc.setDrawColor(...COLORS.lightBg);
  doc.setLineWidth(0.5);
  doc.line(15, y - 3, 195, y - 3);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.secondary);
  doc.text('Notas', 15, y + 3);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  
  y += 9;
  if (notes) {
    const splitNotes = doc.splitTextToSize(notes, 170);
    doc.text(splitNotes, 15, y);
    y += splitNotes.length * 4;
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
  doc.setTextColor(...COLORS.secondary);
  doc.text(`Generado por ${company.company_name || 'OHSMS ProManage'}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
};

export default { fetchCompanyInfo, addDocumentHeader, addPartySection, addItemsTable, addTotalsSection, addNotesSection, addFooter };
