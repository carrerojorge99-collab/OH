import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from 'moment';
import api, { getBackendUrl } from './api';
import { LOGO_BASE64 } from './logoData';

// Colores corporativos
const COLORS = {
  primary: [249, 115, 22],    // Orange
  secondary: [71, 85, 105],   // Slate
  text: [30, 41, 59],         // Dark
  lightBg: [248, 250, 252],   // Light gray
  white: [255, 255, 255]
};

// Helper function to strip HTML tags and convert to plain text with proper formatting
export const stripHtml = (html) => {
  if (!html) return '';
  
  // Crear un elemento temporal para parsear HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Función recursiva para procesar nodos y preservar formato
  const processNode = (node) => {
    let result = '';
    
    for (let child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        result += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tagName = child.tagName.toLowerCase();
        
        switch (tagName) {
          case 'ol':
            let olIndex = 0;
            for (let li of child.children) {
              if (li.tagName.toLowerCase() === 'li') {
                olIndex++;
                result += `\n${olIndex}. ${processNode(li).trim()}`;
              }
            }
            result += '\n';
            break;
            
          case 'ul':
            for (let li of child.children) {
              if (li.tagName.toLowerCase() === 'li') {
                result += `\n• ${processNode(li).trim()}`;
              }
            }
            result += '\n';
            break;
            
          case 'li':
            result += processNode(child);
            break;
            
          case 'p':
            const pContent = processNode(child).trim();
            if (pContent) {
              result += pContent + '\n\n';
            }
            break;
            
          case 'br':
            result += '\n';
            break;
            
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            result += processNode(child).trim() + '\n\n';
            break;
            
          case 'strong':
          case 'b':
            result += processNode(child);
            break;
            
          case 'em':
          case 'i':
          case 'u':
          case 'span':
            result += processNode(child);
            break;
            
          case 'div':
            result += processNode(child) + '\n';
            break;
            
          default:
            result += processNode(child);
        }
      }
    }
    
    return result;
  };
  
  let result = processNode(temp);
  
  // Decodificar entidades HTML
  result = result
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  
  // Limpiar formato
  result = result
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .trim();
  
  return result;
};

// Helper function to format currency with thousands separator
export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper function to load image as base64 with compression
const loadImageAsBase64 = (url, maxWidth = 200, maxHeight = 150, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      // Use JPEG with compression for smaller file size
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

// Fetch company info including logo as base64
export const fetchCompanyInfo = async () => {
  try {
    const response = await api.get('/company');
    const companyData = response.data;
    
    // If company has a logo URL, convert it to base64
    if (companyData && companyData.company_logo) {
      try {
        // Build full URL for the logo
        const baseUrl = getBackendUrl();
        const logoUrl = companyData.company_logo.startsWith('http') 
          ? companyData.company_logo 
          : `${baseUrl}${companyData.company_logo}`;
        
        const logoBase64 = await loadImageAsBase64(logoUrl);
        if (logoBase64) {
          companyData.logoBase64 = logoBase64;
        }
      } catch (e) {
        console.error('Error loading company logo:', e);
      }
    }
    
    return companyData;
  } catch (error) {
    return {};
  }
};

// Add professional header with company info left, doc info right
export const addDocumentHeader = async (doc, company, docType, docNumber, docDate, total, extraInfo = {}) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // === LEFT SIDE: Company Logo and Info ===
  let leftY = 15;
  
  // Add company logo - use company's logo if available, otherwise fallback to default
  // Reduced logo size for smaller PDF file size
  const logoToUse = company?.logoBase64 || LOGO_BASE64;
  try {
    // Detect image format from base64 data
    const imageFormat = logoToUse.includes('image/jpeg') ? 'JPEG' : 'PNG';
    doc.addImage(logoToUse, imageFormat, 15, 6, 50, 38);
    leftY = 47;
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
  
  // Document number and date - PO# now appears below invoice number
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  doc.text(`#: ${docNumber}`, rightX, 28, { align: 'right' });
  
  // PO# immediately below invoice number (for invoices)
  let infoY = 34;
  if (extraInfo.poNumber) {
    doc.text(`PO#: ${extraInfo.poNumber}`, rightX, infoY, { align: 'right' });
    infoY += 6;
  }
  
  doc.text(`Fecha: ${moment(docDate).format('MMM DD, YYYY')}`, rightX, infoY, { align: 'right' });
  infoY += 6;
  
  // Due Date after fecha
  if (extraInfo.dueDate) {
    doc.text(`Due Date: ${moment(extraInfo.dueDate).format('MMM DD, YYYY')}`, rightX, infoY, { align: 'right' });
    infoY += 6;
  }
  
  // Total in orange box - position adjusted based on extra info
  const totalBoxY = Math.max(infoY, 40);
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(pageWidth - 55, totalBoxY, 40, 12, 2, 2, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - 35, totalBoxY + 8, { align: 'center' });
  
  // Separator line - position based on content height
  const lineY = Math.max(leftY + 2, totalBoxY + 18);
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
  
  // Handle multi-line names (e.g., company + contact)
  if (name) {
    const nameLines = name.split('\n');
    nameLines.forEach((line, idx) => {
      if (idx === 0) {
        doc.setFont('helvetica', 'bold');
        doc.text(line, 15, y);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(line, 15, y);
      }
      y += 5;
    });
  }
  
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  
  // Split address into multiple lines (by comma, newline, or pipe separator)
  if (address) {
    // Split by common separators: newline, comma, pipe
    const addressParts = address.split(/[\n|,]/).map(part => part.trim()).filter(part => part);
    addressParts.forEach(part => {
      doc.text(part, 15, y);
      y += 4;
    });
  }
  if (email) { doc.text(email, 15, y); y += 4; }
  if (phone) { doc.text(phone, 15, y); y += 4; }
  
  return y + 6;
};

// Task-based table for PO (large description area)
export const addTasksTable = (doc, tasks, startY) => {
  const tableData = tasks.map((task, idx) => {
    // Build description with scope and details - strip HTML
    let desc = `${idx + 1}. ${stripHtml(task.description || task.name || '')}`;
    if (task.scope) desc += `\n\nScope of Work:\n${stripHtml(task.scope)}`;
    if (task.details) desc += `\n\nConsidered Tasks:\n${stripHtml(task.details)}`;
    
    return [
      desc,
      (task.quantity || 1).toString(),
      `$${formatCurrency(task.unit_price || task.rate || 0)}`,
      `$${formatCurrency(task.amount || task.total || 0)}`
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
      cellPadding: 4,
      lineWidth: { bottom: 0.3 },
      lineColor: COLORS.primary
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 5,
      textColor: COLORS.text,
      lineWidth: 0,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    columnStyles: {
      0: { cellWidth: 120, overflow: 'linebreak' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253]
    },
    showHead: 'firstPage'
  });
  
  return doc.lastAutoTable.finalY;
};

// Standard items table
export const addItemsTable = (doc, items, startY, columns = ['Descripción', 'Cant.', 'Precio', 'Total']) => {
  const tableData = items.map((item, idx) => [
    `${idx + 1}. ${stripHtml(item.description || item.name || '')}`,
    (item.quantity || 1).toString(),
    `$${formatCurrency(item.unit_price || item.rate || 0)}`,
    `$${formatCurrency(item.amount || item.total || 0)}`
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
      cellPadding: 4,
      lineWidth: { bottom: 0.3 },
      lineColor: COLORS.primary
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: COLORS.text,
      lineWidth: 0,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    columnStyles: {
      0: { cellWidth: 100, overflow: 'linebreak' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253]
    },
    showHead: 'firstPage'
  });
  
  return doc.lastAutoTable.finalY;
};

// Totals section - with tax breakdown support
export const addTotalsSection = (doc, subtotal, discount = 0, tax = 0, total, startY, taxDetails = null) => {
  const pageWidth = doc.internal.pageSize.width;
  const rightX = pageWidth - 15;
  let y = startY + 10;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  
  doc.text('Sub Total:', rightX - 45, y);
  doc.text(`$${formatCurrency(subtotal)}`, rightX, y, { align: 'right' });
  y += 6;
  
  if (discount > 0) {
    doc.text('Descuento:', rightX - 45, y);
    doc.text(`-$${formatCurrency(discount)}`, rightX, y, { align: 'right' });
    y += 6;
  }
  
  // Tax breakdown if provided
  if (taxDetails && taxDetails.length > 0) {
    taxDetails.forEach(taxItem => {
      doc.text(`${taxItem.name} (${taxItem.percentage}%):`, rightX - 45, y);
      doc.text(`$${formatCurrency(taxItem.amount)}`, rightX, y, { align: 'right' });
      y += 6;
    });
  } else if (tax > 0) {
    doc.text('Impuesto:', rightX - 45, y);
    doc.text(`$${formatCurrency(tax)}`, rightX, y, { align: 'right' });
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
  doc.text(`$${formatCurrency(total)}`, rightX, y, { align: 'right' });
  
  return y + 12;
};

// Notes section - Terms & Conditions on LEFT, Notes on RIGHT (side by side)
// Truly continuous flow - each column flows independently
export const addNotesSection = (doc, notes, terms, startY, options = {}) => {
  if (!notes && !terms) return startY;
  
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const marginBottom = 20;
  let y = startY + 5;
  
  // Draw separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(15, y - 3, pageWidth - 15, y - 3);
  
  // Calculate column positions - Terms LEFT, Notes RIGHT
  const leftColStart = 15;
  const rightColStart = pageWidth / 2 + 5;
  const columnWidth = (pageWidth / 2) - 20;
  const lineHeight = 2.5; // 0.5 spacing between lines
  
  // Prepare all lines for both columns
  const termsText = terms || '';
  const notesText = notes || '';
  const termsLines = termsText.split('\n').filter(line => line && line.trim());
  const notesLines = notesText.split('\n').filter(line => line && line.trim());
  
  // Wrap all text into lines that fit column width
  doc.setFontSize(7);
  const wrappedTerms = [];
  const wrappedNotes = [];
  
  termsLines.forEach(line => {
    if (line && line.trim()) {
      const wrapped = doc.splitTextToSize(String(line).trim(), columnWidth);
      if (Array.isArray(wrapped)) {
        wrapped.forEach(w => { if (w) wrappedTerms.push(String(w)); });
      } else if (wrapped) {
        wrappedTerms.push(String(wrapped));
      }
    }
  });
  
  notesLines.forEach(line => {
    if (line && line.trim()) {
      const wrapped = doc.splitTextToSize(String(line).trim(), columnWidth);
      if (Array.isArray(wrapped)) {
        wrapped.forEach(w => { if (w) wrappedNotes.push(String(w)); });
      } else if (wrapped) {
        wrappedNotes.push(String(wrapped));
      }
    }
  });
  
  // If no content after processing, return early
  if (wrappedTerms.length === 0 && wrappedNotes.length === 0) {
    return startY;
  }
  
  // Draw headers
  let currentY = y;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.secondary);
  
  if (termsText) {
    doc.text('Terms & Conditions', leftColStart, currentY + 3);
  }
  if (notesText) {
    doc.text('Notes', rightColStart, currentY + 3);
  }
  
  currentY += 8;
  
  // Set font for content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.text);
  
  // Track position for each column independently
  let leftY = currentY;
  let rightY = currentY;
  let termsIdx = 0;
  let notesIdx = 0;
  let currentPage = doc.internal.getNumberOfPages();
  
  // Helper to check if we need new page and add continuation headers
  const checkAndAddPage = (colY, colName, colStart) => {
    if (colY > pageHeight - marginBottom) {
      // Check if we already added a page for this iteration
      if (doc.internal.getNumberOfPages() === currentPage) {
        doc.addPage();
        currentPage = doc.internal.getNumberOfPages();
        
        // Add continuation headers on new page
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.secondary);
        
        if (termsText && termsIdx < wrappedTerms.length) {
          doc.text('Terms & Conditions (cont.)', leftColStart, 23);
        }
        if (notesText && notesIdx < wrappedNotes.length) {
          doc.text('Notes (cont.)', rightColStart, 23);
        }
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.text);
      }
      return 31; // Reset Y position after header
    }
    return colY;
  };
  
  // Draw both columns - each flows continuously
  const maxIterations = Math.max(wrappedTerms.length, wrappedNotes.length);
  
  for (let i = 0; i < maxIterations; i++) {
    // Draw left column (Terms)
    if (termsIdx < wrappedTerms.length) {
      leftY = checkAndAddPage(leftY, 'Terms', leftColStart);
      const text = wrappedTerms[termsIdx];
      if (text && typeof text === 'string') {
        doc.text(text, leftColStart, leftY);
      }
      termsIdx++;
      leftY += lineHeight;
    }
    
    // Draw right column (Notes)
    if (notesIdx < wrappedNotes.length) {
      rightY = checkAndAddPage(rightY, 'Notes', rightColStart);
      const text = wrappedNotes[notesIdx];
      if (text && typeof text === 'string') {
        doc.text(text, rightColStart, rightY);
      }
      notesIdx++;
      rightY += lineHeight;
    }
  }
  
  return Math.max(leftY, rightY) + 5;
};

// Footer
export const addFooter = (doc, company) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(`Generated by ${company.company_name || 'ProManage ProManage'}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
};

// Report header for internal documents (Payroll, Audit, Timesheet, etc.)
export const addReportHeader = async (doc, company, reportTitle, subtitle = '', options = {}) => {
  const pageWidth = doc.internal.pageSize.width;
  const { landscape = false } = options;
  
  // === LEFT SIDE: Company Logo and Info ===
  let leftY = 15;
  
  // Add company logo - use company's logo if available, otherwise fallback to default
  const logoToUse = company?.logoBase64 || LOGO_BASE64;
  try {
    doc.addImage(logoToUse, 'PNG', 15, 10, 40, 20);
    leftY = 33;
  } catch (e) {
    leftY = 15;
  }
  
  // Company name
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
  
  // === RIGHT SIDE: Report Title ===
  const rightX = landscape ? pageWidth - 15 : pageWidth - 15;
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(reportTitle.toUpperCase(), rightX, 20, { align: 'right' });
  
  // Subtitle (e.g., date range, filters)
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.secondary);
    doc.text(subtitle, rightX, 28, { align: 'right' });
  }
  
  // Generation date
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text(`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`, rightX, subtitle ? 34 : 28, { align: 'right' });
  
  // Separator line
  const lineY = Math.max(leftY + 2, 55);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, lineY, pageWidth - 15, lineY);
  
  return lineY + 8;
};

// Standard data table for reports
export const addReportTable = (doc, headers, data, startY, options = {}) => {
  const { 
    footerRow = null, 
    columnStyles = {},
    landscape = false,
    fontSize = 9
  } = options;
  
  const tableConfig = {
    startY: startY,
    head: [headers],
    body: data,
    theme: 'plain',
    headStyles: {
      fillColor: COLORS.lightBg,
      textColor: COLORS.text,
      fontStyle: 'bold',
      fontSize: fontSize,
      cellPadding: 4,
      lineWidth: { bottom: 0.3 },
      lineColor: COLORS.primary
    },
    bodyStyles: {
      fontSize: fontSize,
      cellPadding: 4,
      textColor: COLORS.text,
      lineWidth: 0
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253]
    },
    columnStyles: columnStyles,
    showHead: 'firstPage'
  };
  
  if (footerRow) {
    tableConfig.foot = [footerRow];
    tableConfig.footStyles = {
      fillColor: COLORS.lightBg,
      textColor: COLORS.text,
      fontStyle: 'bold',
      fontSize: fontSize
    };
  }
  
  autoTable(doc, tableConfig);
  
  return doc.lastAutoTable.finalY;
};

// Pay Stub specific header
export const addPayStubHeader = async (doc, company, period) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // === LEFT SIDE: Company Logo and Info ===
  let leftY = 15;
  
  // Add company logo - use company's logo if available, otherwise fallback to default
  const logoToUse = company?.logoBase64 || LOGO_BASE64;
  try {
    doc.addImage(logoToUse, 'PNG', 15, 10, 40, 20);
    leftY = 33;
  } catch (e) {
    leftY = 15;
  }
  
  // Company name
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
  
  // === RIGHT SIDE: Document Title ===
  const rightX = pageWidth - 15;
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('TALONARIO DE PAGO', rightX, 20, { align: 'right' });
  
  // Period
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  doc.text(`Período: ${period}`, rightX, 28, { align: 'right' });
  
  // Separator line
  const lineY = Math.max(leftY + 2, 55);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, lineY, pageWidth - 15, lineY);
  
  return lineY + 8;
};

// Add section with title and content for pay stub
export const addPaySection = (doc, title, items, startY, isTotal = false) => {
  const pageWidth = doc.internal.pageSize.width;
  let y = startY;
  
  // Section header
  doc.setFillColor(...(isTotal ? COLORS.primary : COLORS.lightBg));
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(isTotal ? COLORS.white : COLORS.text));
  doc.text(title, 20, y + 5.5);
  
  if (isTotal && items.length === 1) {
    // For total row, show value on same line
    doc.text(items[0].value, pageWidth - 20, y + 5.5, { align: 'right' });
    return y + 14;
  }
  
  y += 12;
  
  // Section items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  
  items.forEach(item => {
    doc.text(item.label, 20, y);
    doc.text(item.value, pageWidth - 20, y, { align: 'right' });
    y += 6;
  });
  
  return y + 4;
};

// ==================== SAFETY REPORTS ====================

// Generate Safety Dashboard Report
export const generateSafetyDashboardReport = async (dashboardData, projectName = null) => {
  const doc = new jsPDF();
  const company = await fetchCompanyInfo();
  
  const subtitle = projectName ? `Proyecto: ${projectName}` : 'Todos los Proyectos';
  let y = await addReportHeader(doc, company, 'REPORTE DE SEGURIDAD', subtitle);
  
  // Summary Stats
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Resumen General', 15, y);
  y += 8;
  
  // Days without incidents highlight
  doc.setFillColor(34, 197, 94); // Green
  doc.roundedRect(15, y, 50, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${dashboardData.incidents?.days_without_incident || 0}`, 40, y + 10, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Días sin Incidentes', 40, y + 16, { align: 'center' });
  
  // Stats boxes
  const statsX = 75;
  const statsData = [
    { label: 'Checklists', value: `${dashboardData.checklists?.completed || 0}/${dashboardData.checklists?.total || 0}`, color: [59, 130, 246] },
    { label: 'Observaciones', value: `${dashboardData.observations?.total || 0}`, color: [234, 179, 8] },
    { label: 'Toolbox Talks', value: `${dashboardData.toolbox_talks?.completed || 0}`, color: [168, 85, 247] },
    { label: 'Incidentes', value: `${dashboardData.incidents?.total || 0}`, color: [239, 68, 68] }
  ];
  
  statsData.forEach((stat, idx) => {
    const boxX = statsX + (idx * 32);
    doc.setFillColor(...stat.color);
    doc.roundedRect(boxX, y, 28, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.value, boxX + 14, y + 10, { align: 'center' });
    doc.setFontSize(7);
    doc.text(stat.label, boxX + 14, y + 16, { align: 'center' });
  });
  
  y += 30;
  
  // Checklists section
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Estado de Checklists', 15, y);
  y += 6;
  
  const checklistTableData = [
    ['Total', dashboardData.checklists?.total?.toString() || '0'],
    ['Completados', dashboardData.checklists?.completed?.toString() || '0'],
    ['Tasa de Completado', `${dashboardData.checklists?.completion_rate || 0}%`]
  ];
  
  autoTable(doc, {
    startY: y,
    body: checklistTableData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'right' } },
    tableWidth: 90
  });
  y = doc.lastAutoTable.finalY + 10;
  
  // Observations breakdown
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Desglose de Observaciones', 15, y);
  y += 6;
  
  const obsTableData = [
    ['Positivas', (dashboardData.observations?.positive || 0).toString()],
    ['Negativas', (dashboardData.observations?.negative || 0).toString()],
    ['Abiertas', (dashboardData.observations?.open || 0).toString()]
  ];
  
  autoTable(doc, {
    startY: y,
    body: obsTableData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'right' } },
    tableWidth: 90
  });
  y = doc.lastAutoTable.finalY + 10;
  
  // Incidents summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen de Incidentes', 15, y);
  y += 6;
  
  const incidentTableData = [
    ['Total', (dashboardData.incidents?.total || 0).toString()],
    ['Abiertos', (dashboardData.incidents?.open || 0).toString()],
    ['Críticos', (dashboardData.incidents?.critical || 0).toString()]
  ];
  
  autoTable(doc, {
    startY: y,
    body: incidentTableData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'right' } },
    tableWidth: 90
  });
  
  addFooter(doc, company);
  doc.save(`Reporte_Seguridad_${moment().format('YYYY-MM-DD')}.pdf`);
};

// Generate Incidents Report
export const generateIncidentsReport = async (incidents, projectName = null, dateRange = null) => {
  const doc = new jsPDF();
  const company = await fetchCompanyInfo();
  
  let subtitle = projectName ? `Proyecto: ${projectName}` : 'Todos los Proyectos';
  if (dateRange) subtitle += ` | ${dateRange}`;
  
  let y = await addReportHeader(doc, company, 'REPORTE DE INCIDENTES', subtitle);
  
  if (incidents.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.secondary);
    doc.text('No se encontraron incidentes en el período seleccionado.', 15, y);
  } else {
    // Summary
    const totalIncidents = incidents.length;
    const criticalCount = incidents.filter(i => i.severity === 'critical').length;
    const seriousCount = incidents.filter(i => i.severity === 'serious').length;
    const openCount = incidents.filter(i => i.status !== 'closed').length;
    
    // Stats row
    doc.setFillColor(...COLORS.lightBg);
    doc.rect(15, y, 180, 15, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text(`Total: ${totalIncidents}  |  Críticos: ${criticalCount}  |  Serios: ${seriousCount}  |  Abiertos: ${openCount}`, 20, y + 9);
    y += 22;
    
    // Incidents table
    const tableHeaders = ['Fecha', 'Título', 'Severidad', 'Estado', 'Ubicación'];
    const tableData = incidents.map(incident => [
      moment(incident.incident_date).format('DD/MM/YYYY'),
      incident.title?.substring(0, 30) + (incident.title?.length > 30 ? '...' : '') || '',
      getSeverityLabel(incident.severity),
      getStatusLabel(incident.status),
      incident.location?.substring(0, 20) || 'N/A'
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [tableHeaders],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.lightBg,
        textColor: COLORS.text,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 40 }
      },
      alternateRowStyles: { fillColor: [252, 252, 253] }
    });
  }
  
  addFooter(doc, company);
  doc.save(`Reporte_Incidentes_${moment().format('YYYY-MM-DD')}.pdf`);
};

// Generate detailed Incident Report (single incident)
export const generateIncidentDetailReport = async (incident, projectName = null) => {
  const doc = new jsPDF();
  const company = await fetchCompanyInfo();
  
  let y = await addReportHeader(doc, company, 'REPORTE DE INCIDENTE', `#${incident.incident_id?.substring(0, 12) || ''}`);
  
  // Incident Info Header
  doc.setFillColor(...getSeverityColor(incident.severity));
  doc.roundedRect(15, y, 180, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(incident.title || 'Sin título', 20, y + 8);
  y += 18;
  
  // Basic Info Grid
  const infoData = [
    ['Fecha del Incidente', moment(incident.incident_date).format('DD/MM/YYYY')],
    ['Hora', incident.incident_time || 'No especificada'],
    ['Ubicación', incident.location || 'No especificada'],
    ['Tipo', incident.incident_type || 'Otro'],
    ['Severidad', getSeverityLabel(incident.severity)],
    ['Estado', getStatusLabel(incident.status)],
    ['Reportado por', incident.reported_by_name || 'N/A'],
    ['Proyecto', projectName || 'N/A']
  ];
  
  autoTable(doc, {
    startY: y,
    body: infoData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } }
  });
  y = doc.lastAutoTable.finalY + 8;
  
  // Description
  if (incident.description) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('Descripción', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(incident.description, 175);
    doc.text(descLines, 15, y);
    y += descLines.length * 4 + 8;
  }
  
  // Injuries
  if (incident.injuries_description) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Descripción de Lesiones', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const injLines = doc.splitTextToSize(incident.injuries_description, 175);
    doc.text(injLines, 15, y);
    y += injLines.length * 4 + 8;
  }
  
  // Property Damage
  if (incident.property_damage) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Daños a la Propiedad', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const dmgLines = doc.splitTextToSize(incident.property_damage, 175);
    doc.text(dmgLines, 15, y);
    y += dmgLines.length * 4 + 8;
  }
  
  // Immediate Actions
  if (incident.immediate_actions) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Acciones Inmediatas', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const actLines = doc.splitTextToSize(incident.immediate_actions, 175);
    doc.text(actLines, 15, y);
    y += actLines.length * 4 + 8;
  }
  
  // Root Cause
  if (incident.root_cause) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Causa Raíz', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const rootLines = doc.splitTextToSize(incident.root_cause, 175);
    doc.text(rootLines, 15, y);
    y += rootLines.length * 4 + 8;
  }
  
  // Corrective Actions
  if (incident.corrective_actions?.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Acciones Correctivas', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    incident.corrective_actions.forEach((action, idx) => {
      const actionText = typeof action === 'string' ? action : action.description || '';
      doc.text(`${idx + 1}. ${actionText}`, 18, y);
      y += 5;
    });
    y += 5;
  }
  
  // Preventive Actions
  if (incident.preventive_actions?.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Acciones Preventivas', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    incident.preventive_actions.forEach((action, idx) => {
      const actionText = typeof action === 'string' ? action : action.description || '';
      doc.text(`${idx + 1}. ${actionText}`, 18, y);
      y += 5;
    });
  }
  
  addFooter(doc, company);
  doc.save(`Incidente_${incident.incident_id?.substring(0, 12) || 'detalle'}_${moment().format('YYYY-MM-DD')}.pdf`);
};

// Generate Toolbox Talks Report
export const generateToolboxTalksReport = async (talks, projectName = null) => {
  const doc = new jsPDF();
  const company = await fetchCompanyInfo();
  
  const subtitle = projectName ? `Proyecto: ${projectName}` : 'Todos los Proyectos';
  let y = await addReportHeader(doc, company, 'REPORTE DE TOOLBOX TALKS', subtitle);
  
  if (talks.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.secondary);
    doc.text('No se encontraron Toolbox Talks.', 15, y);
  } else {
    // Summary
    const completedCount = talks.filter(t => t.status === 'completed').length;
    const scheduledCount = talks.filter(t => t.status === 'scheduled').length;
    const totalAttendees = talks.reduce((sum, t) => sum + (t.attendees?.length || 0) + (t.external_attendee_count || 0), 0);
    
    doc.setFillColor(...COLORS.lightBg);
    doc.rect(15, y, 180, 15, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text(`Total: ${talks.length}  |  Completados: ${completedCount}  |  Programados: ${scheduledCount}  |  Total Asistentes: ${totalAttendees}`, 20, y + 9);
    y += 22;
    
    // Talks table
    const tableHeaders = ['Fecha', 'Tema', 'Duración', 'Estado', 'Asistentes'];
    const tableData = talks.map(talk => [
      moment(talk.scheduled_date || talk.created_at).format('DD/MM/YYYY'),
      talk.title?.substring(0, 35) + (talk.title?.length > 35 ? '...' : '') || '',
      `${talk.duration_minutes || 15} min`,
      getStatusLabel(talk.status),
      ((talk.attendees?.length || 0) + (talk.external_attendee_count || 0)).toString()
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [tableHeaders],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.lightBg,
        textColor: COLORS.text,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [252, 252, 253] }
    });
  }
  
  addFooter(doc, company);
  doc.save(`Reporte_ToolboxTalks_${moment().format('YYYY-MM-DD')}.pdf`);
};

// Generate detailed Toolbox Talk Report (single talk with attendance)
export const generateToolboxTalkDetailReport = async (talk, projectName = null, users = []) => {
  const doc = new jsPDF();
  const company = await fetchCompanyInfo();
  
  let y = await addReportHeader(doc, company, 'TOOLBOX TALK', talk.title || 'Charla de Seguridad');
  
  // Talk Info
  const talkInfo = [
    ['Tema', talk.topic || talk.title || 'N/A'],
    ['Categoría', getCategoryLabel(talk.category)],
    ['Fecha', moment(talk.scheduled_date || talk.created_at).format('DD/MM/YYYY')],
    ['Duración', `${talk.duration_minutes || 15} minutos`],
    ['Ubicación', talk.location || 'No especificada'],
    ['Presentador', talk.presenter || 'No especificado'],
    ['Estado', getStatusLabel(talk.status)],
    ['Proyecto', projectName || 'N/A']
  ];
  
  autoTable(doc, {
    startY: y,
    body: talkInfo,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
  });
  y = doc.lastAutoTable.finalY + 8;
  
  // Description
  if (talk.description) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('Descripción', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(talk.description, 175);
    doc.text(descLines, 15, y);
    y += descLines.length * 4 + 8;
  }
  
  // Key Points
  if (talk.key_points?.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Puntos Clave', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    talk.key_points.forEach((point, idx) => {
      const pointText = typeof point === 'string' ? point : point.text || '';
      const lines = doc.splitTextToSize(`• ${pointText}`, 170);
      doc.text(lines, 18, y);
      y += lines.length * 4 + 2;
    });
    y += 5;
  }
  
  // Attendance Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Registro de Asistencia', 15, y);
  y += 6;
  
  const attendanceRecords = talk.attendance_records || [];
  const employeeAttendees = attendanceRecords.filter(r => r.type === 'employee');
  const externalAttendees = attendanceRecords.filter(r => r.type === 'external');
  
  // Employee attendees
  if (employeeAttendees.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Empleados:', 15, y);
    y += 5;
    
    const empData = employeeAttendees.map((record, idx) => [
      (idx + 1).toString(),
      record.user_name || 'N/A',
      moment(record.signed_at).format('DD/MM/YYYY HH:mm')
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [['#', 'Nombre', 'Hora de Firma']],
      body: empData,
      theme: 'plain',
      headStyles: { fillColor: COLORS.lightBg, textColor: COLORS.text, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 80 } }
    });
    y = doc.lastAutoTable.finalY + 8;
  }
  
  // External attendees
  if (externalAttendees.length > 0 || talk.external_attendee_count > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Externos: ${externalAttendees.length || talk.external_attendee_count || 0}`, 15, y);
    y += 5;
    
    if (externalAttendees.length > 0) {
      const extData = externalAttendees.map((record, idx) => [
        (idx + 1).toString(),
        record.user_name || 'Externo',
        moment(record.signed_at).format('DD/MM/YYYY HH:mm')
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [['#', 'Nombre', 'Hora de Firma']],
        body: extData,
        theme: 'plain',
        headStyles: { fillColor: COLORS.lightBg, textColor: COLORS.text, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 80 } }
      });
      y = doc.lastAutoTable.finalY + 8;
    }
  }
  
  // Total attendance
  const totalAttendance = employeeAttendees.length + (externalAttendees.length || talk.external_attendee_count || 0);
  doc.setFillColor(...COLORS.primary);
  doc.rect(15, y, 180, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Asistentes: ${totalAttendance}`, 20, y + 7);
  
  // Notes
  if (talk.notes) {
    y += 18;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('Notas', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(talk.notes, 175);
    doc.text(noteLines, 15, y);
  }
  
  addFooter(doc, company);
  doc.save(`ToolboxTalk_${talk.talk_id?.substring(0, 12) || 'detalle'}_${moment().format('YYYY-MM-DD')}.pdf`);
};

// Generate Checklists Report
export const generateChecklistsReport = async (checklists, projectName = null) => {
  const doc = new jsPDF();
  const company = await fetchCompanyInfo();
  
  const subtitle = projectName ? `Proyecto: ${projectName}` : 'Todos los Proyectos';
  let y = await addReportHeader(doc, company, 'REPORTE DE CHECKLISTS', subtitle);
  
  if (checklists.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.secondary);
    doc.text('No se encontraron checklists de seguridad.', 15, y);
  } else {
    // Summary
    const completedCount = checklists.filter(c => c.status === 'completed').length;
    const inProgressCount = checklists.filter(c => c.status === 'in_progress').length;
    const avgCompletion = Math.round(checklists.reduce((sum, c) => sum + (c.completion_percentage || 0), 0) / checklists.length);
    
    doc.setFillColor(...COLORS.lightBg);
    doc.rect(15, y, 180, 15, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text(`Total: ${checklists.length}  |  Completados: ${completedCount}  |  En Progreso: ${inProgressCount}  |  Promedio: ${avgCompletion}%`, 20, y + 9);
    y += 22;
    
    // Checklists table
    const tableHeaders = ['Título', 'Categoría', 'Estado', '% Completado', 'Asignado'];
    const tableData = checklists.map(checklist => [
      checklist.title?.substring(0, 35) + (checklist.title?.length > 35 ? '...' : '') || '',
      getCategoryLabel(checklist.category),
      getStatusLabel(checklist.status),
      `${checklist.completion_percentage || 0}%`,
      checklist.assigned_to_name || 'Sin asignar'
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [tableHeaders],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.lightBg,
        textColor: COLORS.text,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [252, 252, 253] }
    });
  }
  
  addFooter(doc, company);
  doc.save(`Reporte_Checklists_${moment().format('YYYY-MM-DD')}.pdf`);
};

// Generate Observations Report
export const generateObservationsReport = async (observations, projectName = null) => {
  const doc = new jsPDF();
  const company = await fetchCompanyInfo();
  
  const subtitle = projectName ? `Proyecto: ${projectName}` : 'Todos los Proyectos';
  let y = await addReportHeader(doc, company, 'REPORTE DE OBSERVACIONES', subtitle);
  
  if (observations.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.secondary);
    doc.text('No se encontraron observaciones de seguridad.', 15, y);
  } else {
    // Summary
    const positiveCount = observations.filter(o => o.observation_type === 'positive').length;
    const negativeCount = observations.filter(o => o.observation_type === 'negative').length;
    const openCount = observations.filter(o => o.status === 'open').length;
    const resolvedCount = observations.filter(o => o.status === 'resolved').length;
    
    doc.setFillColor(...COLORS.lightBg);
    doc.rect(15, y, 180, 15, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text(`Total: ${observations.length}  |  Positivas: ${positiveCount}  |  Negativas: ${negativeCount}  |  Abiertas: ${openCount}  |  Resueltas: ${resolvedCount}`, 20, y + 9);
    y += 22;
    
    // Observations table
    const tableHeaders = ['Fecha', 'Título', 'Tipo', 'Prioridad', 'Estado'];
    const tableData = observations.map(obs => [
      moment(obs.created_at).format('DD/MM/YYYY'),
      obs.title?.substring(0, 35) + (obs.title?.length > 35 ? '...' : '') || '',
      obs.observation_type === 'positive' ? '✓ Positiva' : '✗ Negativa',
      getPriorityLabel(obs.priority),
      getStatusLabel(obs.status)
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [tableHeaders],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.lightBg,
        textColor: COLORS.text,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [252, 252, 253] }
    });
  }
  
  addFooter(doc, company);
  doc.save(`Reporte_Observaciones_${moment().format('YYYY-MM-DD')}.pdf`);
};

// Helper functions for labels
const getSeverityLabel = (severity) => {
  const labels = { minor: 'Menor', moderate: 'Moderado', serious: 'Serio', critical: 'Crítico' };
  return labels[severity] || severity || 'N/A';
};

const getSeverityColor = (severity) => {
  const colors = {
    minor: [34, 197, 94],      // Green
    moderate: [234, 179, 8],   // Yellow
    serious: [249, 115, 22],   // Orange
    critical: [239, 68, 68]    // Red
  };
  return colors[severity] || [107, 114, 128];
};

const getStatusLabel = (status) => {
  const labels = {
    draft: 'Borrador', in_progress: 'En Progreso', completed: 'Completado',
    archived: 'Archivado', open: 'Abierto', resolved: 'Resuelto',
    closed: 'Cerrado', scheduled: 'Programado', cancelled: 'Cancelado',
    reported: 'Reportado', investigating: 'Investigando', action_taken: 'Acción Tomada'
  };
  return labels[status] || status || 'N/A';
};

const getCategoryLabel = (category) => {
  const labels = {
    general: 'General', altura: 'Trabajo en Alturas', epp: 'EPP',
    quimicos: 'Materiales Peligrosos', electrico: 'Seguridad Eléctrica',
    especial: 'Trabajos Especiales', ergonomia: 'Ergonomía', emergencia: 'Emergencias'
  };
  return labels[category] || category || 'N/A';
};

const getPriorityLabel = (priority) => {
  const labels = { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
  return labels[priority] || priority || 'N/A';
};

export { COLORS };

// ==================== DAILY LOG REPORT ====================
export const generateDailyLogReport = async (data) => {
  const { 
    projectInfo, 
    date, 
    weather, 
    workLogs, 
    notes, 
    survey, 
    surveyPhotos,
    attachments 
  } = data;
  
  const doc = new jsPDF();
  let yPos = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // Fetch company info
  const company = await fetchCompanyInfo();
  
  // Helper function to check page break
  const checkPageBreak = (neededSpace) => {
    if (yPos + neededSpace > pageHeight - 25) {
      doc.addPage();
      yPos = 15;
      return true;
    }
    return false;
  };
  
  // Helper to add footer
  const addPageFooter = (pageNum, totalPages) => {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${pageNum} de ${totalPages} | ${company?.nombre || 'OHSMS'}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.text('Powered by ProManage', margin, pageHeight - 10);
  };
  
  // ===== HEADER =====
  // Company name/logo - LARGER LOGO
  const logoSize = 45; // Increased from 25
  if (LOGO_BASE64) {
    try {
      doc.addImage(LOGO_BASE64, 'PNG', margin, yPos, logoSize, logoSize);
    } catch (e) {
      console.log('Error adding logo:', e);
    }
  }
  
  // Position text next to larger logo
  const textStartX = margin + logoSize + 8;
  
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(company?.nombre || 'OHSMS', textStartX, yPos + 18);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  doc.text(projectInfo?.location || 'Puerto Rico', textStartX, yPos + 28);
  
  // Add "Powered by ProManage" under company info
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Powered by ProManage', textStartX, yPos + 36);
  
  yPos += 55; // Increased to accommodate larger logo
  
  // ===== PROJECT INFO BAR =====
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos, contentWidth, 12, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  
  // Date
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', margin + 5, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(moment(date).format('ddd MM/DD/YYYY'), margin + 20, yPos + 8);
  
  // Project/Job number
  doc.setFont('helvetica', 'bold');
  doc.text('Trabajo #:', margin + 70, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(projectInfo?.projectNumber || projectInfo?.project_id || '-', margin + 90, yPos + 8);
  
  // Prepared by
  doc.setFont('helvetica', 'bold');
  doc.text('Preparado por:', margin + 130, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(company?.nombre || 'OHSMS LLC', margin + 158, yPos + 8);
  
  yPos += 18;
  
  // ===== WEATHER SECTION =====
  if (weather && weather.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Clima', margin, yPos);
    yPos += 7;
    
    // Weather boxes
    const boxWidth = (contentWidth - 10) / 3;
    
    weather.forEach((w, idx) => {
      const boxX = margin + (idx * (boxWidth + 5));
      
      // Box background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 220, 220);
      doc.rect(boxX, yPos, boxWidth, 35, 'FD');
      
      // Time header
      doc.setFillColor(...COLORS.primary);
      doc.rect(boxX, yPos, boxWidth, 8, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(w.time || `${idx === 0 ? '6:00 AM' : idx === 1 ? '12:00 PM' : '4:00 PM'}`, boxX + boxWidth/2, yPos + 5.5, { align: 'center' });
      
      // Temperature
      doc.setFontSize(18);
      doc.setTextColor(...COLORS.text);
      doc.text(`${w.temperature || '--'}°`, boxX + 5, yPos + 20);
      
      // Weather description
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(w.description || 'N/A', boxX + 25, yPos + 16);
      
      // Details
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text(`Viento: ${w.wind_speed || 0} MPH`, boxX + 5, yPos + 27);
      doc.text(`Precipitación: ${w.precipitation || 0}"`, boxX + 5, yPos + 31);
      doc.text(`Humedad: ${w.humidity || 0}%`, boxX + boxWidth/2 + 5, yPos + 27);
    });
    
    yPos += 42;
  }
  
  // ===== WORK LOGS (Registros) =====
  if (workLogs && workLogs.length > 0) {
    checkPageBreak(40);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Registros', margin, yPos);
    yPos += 5;
    
    const tableData = workLogs.map(log => [
      log.name || '',
      (log.description || '').substring(0, 200) + (log.description?.length > 200 ? '...' : ''),
      log.quantity || 0,
      log.hours || 0
    ]);
    
    // Add totals row
    const totalQty = workLogs.reduce((sum, l) => sum + (parseInt(l.quantity) || 0), 0);
    const totalHrs = workLogs.reduce((sum, l) => sum + (parseFloat(l.hours) || 0), 0);
    tableData.push(['Total', '', totalQty, totalHrs]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Nombre', 'Descripción', 'Cantidad', 'Total Horas']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: COLORS.primary,
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: { 
        fontSize: 7,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 100 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: margin, right: margin },
      didParseCell: function(data) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
  }
  
  // ===== NOTES SECTION =====
  if (notes && notes.length > 0) {
    checkPageBreak(40);
    
    // Group notes by category
    const generalNotes = notes.filter(n => n.category === 'general_notes');
    const safetyObs = notes.filter(n => n.category === 'site_safety_observations');
    const qualityObs = notes.filter(n => n.category === 'quality_control_observations');
    
    const renderNoteSection = (title, notesList) => {
      if (notesList.length === 0) return;
      
      checkPageBreak(20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(title, margin, yPos);
      yPos += 6;
      
      notesList.forEach((note, idx) => {
        checkPageBreak(15);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.text);
        doc.text(`${idx + 1}.`, margin, yPos);
        
        doc.setFont('helvetica', 'normal');
        const noteText = note.description || '';
        const lines = doc.splitTextToSize(noteText, contentWidth - 10);
        doc.text(lines, margin + 8, yPos);
        yPos += (lines.length * 4) + 5;
      });
      
      yPos += 5;
    };
    
    renderNoteSection('Notas Generales', generalNotes);
    renderNoteSection('Observaciones de Seguridad del Sitio', safetyObs);
    renderNoteSection('Observaciones de Control de Calidad', qualityObs);
  }
  
  // ===== SURVEY SECTION =====
  if (survey && survey.questions && survey.questions.length > 0) {
    checkPageBreak(50);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Encuesta', margin, yPos);
    yPos += 5;
    
    const surveyData = survey.questions.map((q, idx) => {
      const response = survey.responses?.[q.question_id] || {};
      return [
        `${idx + 1}. ${q.question_text}`,
        response.answer === 'na' ? '✓' : '',
        response.answer === 'no' ? '✓' : '',
        response.answer === 'yes' ? '✓' : '',
        response.description || ''
      ];
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [['Preguntas', 'N/A', 'No', 'Sí', 'Descripción']],
      body: surveyData,
      theme: 'grid',
      headStyles: { 
        fillColor: COLORS.primary,
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { 
        fontSize: 7,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 12, halign: 'center' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 75 }
      },
      margin: { left: margin, right: margin }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
  }
  
  // ===== PHOTOS SECTION =====
  // Note: Adding images to PDF is complex and may require async loading
  // For now, we'll indicate photo count
  if ((surveyPhotos && surveyPhotos.length > 0) || (attachments && attachments.length > 0)) {
    checkPageBreak(20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Fotos y Adjuntos', margin, yPos);
    yPos += 6;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    
    if (surveyPhotos && surveyPhotos.length > 0) {
      doc.text(`• Fotos de la Encuesta: ${surveyPhotos.length} archivo(s)`, margin, yPos);
      yPos += 5;
    }
    
    if (attachments && attachments.length > 0) {
      doc.text(`• Adjuntos: ${attachments.length} archivo(s)`, margin, yPos);
      yPos += 5;
    }
  }
  
  // ===== SIGN-OFF =====
  checkPageBreak(20);
  yPos += 10;
  
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos, contentWidth, 15, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.secondary);
  doc.text(`Yo, ${company?.nombre || 'OHSMS LLC'}, revisé y completé este reporte.`, margin + 5, yPos + 6);
  doc.text(`${company?.nombre || 'OHSMS LLC'} | ${moment().format('MM/DD/YY')} | ${moment().format('hh:mm A')}`, margin + 5, yPos + 11);
  
  // Add page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(i, totalPages);
  }
  
  // Save the PDF
  const fileName = `DailyLog_${projectInfo?.name || 'Project'}_${moment(date).format('YYYY-MM-DD')}.pdf`;
  doc.save(fileName);
  
  return fileName;
};

export default { 
  fetchCompanyInfo, addDocumentHeader, addPartySection, addTasksTable, addItemsTable, 
  addTotalsSection, addNotesSection, addFooter, addReportHeader, addReportTable, 
  addPayStubHeader, addPaySection, COLORS, formatCurrency,
  // Safety Reports
  generateSafetyDashboardReport, generateIncidentsReport, generateIncidentDetailReport,
  generateToolboxTalksReport, generateToolboxTalkDetailReport, generateChecklistsReport,
  generateObservationsReport,
  // Daily Log Report
  generateDailyLogReport
};
