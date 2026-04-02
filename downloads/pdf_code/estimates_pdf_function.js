// =====================================================
// PDF Function extracted from frontend/src/pages/Estimates.js
// =====================================================

  const exportPDF = async (estimate) => {
    // Create PDF with compression enabled and Unicode font support
    const doc = await createPDFDocument({
      compress: true
    });
    const company = await fetchCompanyInfo();
    
    // Header: Empresa izquierda, Doc derecha
    let y = await addDocumentHeader(doc, company, 'ESTIMATE', estimate.estimate_number, estimate.created_at, estimate.total);
    
    // Client section - include company name if available
    const clientDisplayName = estimate.client_company 
      ? `${estimate.client_company}\nAttn: ${estimate.client_name}`
      : estimate.client_name;
    y = addPartySection(doc, 'Bill To:', clientDisplayName, estimate.client_address || '', estimate.client_email, estimate.client_phone, y);
    
    // Valid until derecha
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0); // Black
    doc.text(`Valid Until: ${estimate.valid_until ? moment(estimate.valid_until).format('MMM DD, YYYY') : 'N/A'}`, 120, y - 10);
    
    // Title
    if (estimate.title) {
      doc.setFontSize(10);
      setFontWithFallback(doc, 'bold');
      doc.setTextColor(0, 0, 0); // Black
      doc.text(estimate.title, 15, y);
      y += 6;
    }
    
    // Subtitle (centered before content)
    if (estimate.subtitle) {
      doc.setFontSize(11);
      setFontWithFallback(doc, 'bold');
      doc.setTextColor(0, 0, 0); // Black
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text(estimate.subtitle, pageWidth / 2, y, { align: 'center' });
      y += 8;
    }
    
    // Tasks table
    y = addTasksTable(doc, estimate.items, y + 4);
    
    // Build tax details from selected_taxes or fallback to single tax
    let taxDetails = null;
    if (estimate.selected_taxes && estimate.selected_taxes.length > 0) {
      const taxableAmount = estimate.subtotal - (estimate.discount_amount || 0);
      taxDetails = estimate.selected_taxes.map(t => ({
        name: t.name,
        percentage: t.percentage,
        amount: taxableAmount * t.percentage / 100
      }));
    } else if (estimate.tax_type_name && estimate.tax_percentage) {
      taxDetails = [{ name: estimate.tax_type_name, percentage: estimate.tax_percentage, amount: estimate.tax_amount || 0 }];
    }
    y = addTotalsSection(doc, estimate.subtotal, estimate.discount_amount || 0, estimate.tax_amount || 0, estimate.total, y, taxDetails);
    
    // Notes and Terms - Add to same page if there's space, otherwise new page
    if (estimate.notes || estimate.terms) {
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const columnWidth = (pageWidth - (margin * 2) - 10) / 2;
      const columnGap = 10;
      const lineHeight = 3.5;
      
      // Calculate approximate height needed for notes and terms
      doc.setFontSize(8);
      const cleanTerms = estimate.terms ? stripHtml(estimate.terms) : '';
      const cleanNotes = estimate.notes ? stripHtml(estimate.notes) : '';
      const termsLines = cleanTerms ? doc.splitTextToSize(cleanTerms, columnWidth) : [];
      const notesLines = cleanNotes ? doc.splitTextToSize(cleanNotes, columnWidth) : [];
      const maxLines = Math.max(termsLines.length, notesLines.length);
      const requiredHeight = 20 + (maxLines * lineHeight); // 20 for headers
      
      // Check if we need a new page
      if (y + requiredHeight > pageHeight - 15) {
        doc.addPage();
        y = 20;
      } else {
        y += 10; // Add some spacing
      }
      
      let leftY = y;
      let rightY = y;
      const maxY = pageHeight - 15;
      
      // LEFT COLUMN - Terms and Conditions
      if (estimate.terms) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Terms and Conditions:', margin, leftY);
        leftY += 6;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        for (let i = 0; i < termsLines.length; i++) {
          if (leftY > maxY) {
            doc.addPage();
            leftY = 20;
            rightY = 20;
          }
          doc.text(termsLines[i], margin, leftY);
          leftY += lineHeight;
        }
      }
      
      // RIGHT COLUMN - Notes
      if (estimate.notes) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Notes:', margin + columnWidth + columnGap, rightY);
        rightY += 6;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        for (let i = 0; i < notesLines.length; i++) {
          if (rightY > maxY) {
            if (leftY < maxY) {
              rightY = leftY + 10;
              doc.text('Notes (cont.):', margin + columnWidth + columnGap, rightY);
              rightY += 6;
            } else {
              doc.addPage();
              rightY = 20;
              leftY = 20;
            }
          }
          doc.text(notesLines[i], margin + columnWidth + columnGap, rightY);
          rightY += lineHeight;
        }
      }
    }
    
    // Footer
    addFooter(doc, company);
    
    doc.save(`Estimate_${estimate.estimate_number}.pdf`);
  };
