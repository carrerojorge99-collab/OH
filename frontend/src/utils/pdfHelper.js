/**
 * Helper para agregar encabezado de empresa a PDFs
 */

import { LOGO_BASE64 } from './logoData';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Función para cargar la información de la empresa
export const fetchCompanyInfo = async () => {
  try {
    const response = await fetch(`${API_URL}/api/company?_t=${Date.now()}`, {
      credentials: 'include'
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching company info:', error);
  }
  return null;
};

// Función para cargar imagen como base64
export const loadImageAsBase64 = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

// Función principal para agregar encabezado de empresa al PDF
export const addCompanyHeader = async (doc, company, startY = 20) => {
  if (!company) return startY + 10;

  let currentY = startY;
  const leftMargin = 20;
  const rightMargin = 190;

  // Logo - use embedded base64 logo as primary source
  try {
    doc.addImage(LOGO_BASE64, 'PNG', leftMargin, currentY, 35, 18);
    currentY += 20;
  } catch (e) {
    console.error('Error loading logo:', e);
    currentY += 5;
  }

  // Información de la empresa (debajo del logo)
  const textStartX = leftMargin;
  
  // Nombre de la empresa
  if (company.company_name) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(company.company_name, textStartX, currentY + 8);
    currentY += 6;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  // Dirección
  if (company.address) {
    currentY += 6;
    doc.text(company.address, textStartX, currentY + 8);
  }

  // Ciudad, Estado, ZIP
  const cityLine = [company.city, company.state, company.zip_code].filter(Boolean).join(', ');
  if (cityLine) {
    currentY += 4;
    doc.text(cityLine, textStartX, currentY + 8);
  }

  // País
  if (company.country) {
    currentY += 4;
    doc.text(company.country, textStartX, currentY + 8);
  }

  // Teléfono y Email (en una línea)
  const contactLine = [
    company.phone ? `Tel: ${company.phone}` : null,
    company.email ? `Email: ${company.email}` : null
  ].filter(Boolean).join(' | ');
  if (contactLine) {
    currentY += 4;
    doc.text(contactLine, textStartX, currentY + 8);
  }

  // Website
  if (company.website) {
    currentY += 4;
    doc.text(company.website, textStartX, currentY + 8);
  }

  // Tax ID
  if (company.tax_id) {
    currentY += 4;
    doc.text(`ID Fiscal: ${company.tax_id}`, textStartX, currentY + 8);
  }

  // Resetear color de texto
  doc.setTextColor(0, 0, 0);

  // Línea separadora
  const headerEndY = Math.max(currentY + 20, startY + 45);
  doc.setDrawColor(200, 200, 200);
  doc.line(leftMargin, headerEndY, rightMargin, headerEndY);

  return headerEndY + 10;
};

// Función para agregar pie de página
export const addCompanyFooter = (doc, company, pageHeight = 280) => {
  if (!company || !company.footer_text) return;

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.setFont('helvetica', 'italic');
  
  const footerY = pageHeight;
  const lines = doc.splitTextToSize(company.footer_text, 170);
  doc.text(lines, 105, footerY, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
};

export default { fetchCompanyInfo, addCompanyHeader, addCompanyFooter, loadImageAsBase64 };
