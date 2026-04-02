// =====================================================
// PDF Functions extracted from frontend/src/pages/Invoices.js
// =====================================================

// === 1. Purchase Order PDF ===
  const exportPOPdf = async () => {
    try {
      const doc = new jsPDF('landscape');
      const company = await fetchCompanyInfo();
      const totalQty = filteredPOs.reduce((s, po) => s + (Number(po.po_quantity) || 0), 0);

      // Build filter subtitle
      const filterParts = [];
      if (poFilterSponsor !== 'all') filterParts.push(`Sponsor: ${poFilterSponsor}`);
      if (poFilterCompany !== 'all') filterParts.push(`Compañía: ${poFilterCompany}`);
      if (poFilterYear !== 'all') filterParts.push(`Año: ${poFilterYear}`);
      
      const subtitle = filterParts.length > 0 
        ? `${filteredPOs.length} POs | ${filterParts.join(' | ')}`
        : `${filteredPOs.length} POs`;

      let y = await addDocumentHeader(doc, company, 'PURCHASE ORDERS', subtitle, new Date().toISOString(), totalQty);

      autoTable(doc, {
        startY: y + 4,
        head: [['Proyecto', 'No.', 'Compañía', 'Sponsor', 'PO Number', 'Cantidad PO', 'Fecha', 'Estatus']],
        body: filteredPOs.map(po => [
          po.project_name,
          po.project_number,
          po.client,
          po.sponsor,
          po.po_number,
          `$${(Number(po.po_quantity) || 0).toLocaleString('es-PR', { minimumFractionDigits: 2 })}`,
          po.date ? moment(po.date).format('DD/MM/YYYY') : '',
          po.status,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [234, 88, 12] },
        foot: [['', '', '', '', 'TOTAL', `$${totalQty.toLocaleString('es-PR', { minimumFractionDigits: 2 })}`, '', '']],
        footStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      });
      addFooter(doc, company);
      
      // Build filename with filter info
      let filename = 'Purchase_Orders';
      if (poFilterSponsor !== 'all') filename += `_${poFilterSponsor.replace(/\s+/g, '_')}`;
      if (poFilterCompany !== 'all') filename += `_${poFilterCompany.replace(/\s+/g, '_')}`;
      if (poFilterYear !== 'all') filename += `_${poFilterYear}`;
      filename += `_${moment().format('YYYYMMDD')}.pdf`;
      
      doc.save(filename);
      toast.success('PDF descargado');
    } catch (e) {
      console.error('Error generating PO PDF:', e);
      toast.error('Error al generar PDF');
    }
  };

  // Get unique clients from invoices for the filter dropdown
  const uniqueClients = React.useMemo(() => {
    const clients = new Map();
    invoices.forEach(inv => {
      if (inv.client_name && !clients.has(inv.client_name)) {
        clients.set(inv.client_name, {
          name: inv.client_name,
          email: inv.client_email,
          phone: inv.client_phone,
          address: inv.client_address
        });
      }
    });
    return Array.from(clients.values());
  }, [invoices]);

  // Filter invoices for statement based on mode
  const filteredInvoicesForStatement = React.useMemo(() => {
    let filtered = [...invoices];
    
    if (statementFilterMode === 'client' && statementClientFilter) {
      filtered = filtered.filter(inv => inv.client_name === statementClientFilter);
    }
    
    if (statementDateFrom) {
      filtered = filtered.filter(inv => {
        const invDate = inv.created_at || inv.invoice_date;
        return invDate >= statementDateFrom;
      });
    }
    
    if (statementDateTo) {
      filtered = filtered.filter(inv => {
        const invDate = inv.created_at || inv.invoice_date;
        return invDate <= statementDateTo;
      });
    }
    
    return filtered;
  }, [invoices, statementFilterMode, statementClientFilter, statementDateFrom, statementDateTo]);

  const handleToggleInvoiceForStatement = (invoiceId) => {
    setSelectedInvoicesForStatement(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleSelectAllInvoicesForStatement = () => {
    if (selectedInvoicesForStatement.length === filteredInvoicesForStatement.length) {
      setSelectedInvoicesForStatement([]);
    } else {
      setSelectedInvoicesForStatement(filteredInvoicesForStatement.map(inv => inv.invoice_id));
    }
  };

  const handlePreviewStatement = async () => {
    if (selectedInvoicesForStatement.length === 0) {
      toast.error('Seleccione al menos una factura');
      return;
    }

    const selectedInvs = invoices.filter(inv => selectedInvoicesForStatement.includes(inv.invoice_id));
    const clientInfo = selectedInvs[0] || {};

    try {
      const res = await api.post('/statements/preview', {
        client_name: clientInfo.client_name || 'Cliente',
        client_email: clientInfo.client_email,
        client_phone: clientInfo.client_phone,
        client_address: clientInfo.client_address,
        invoice_ids: selectedInvoicesForStatement,
        date_from: statementDateFrom || null,
        date_to: statementDateTo || null,
        notes: statementNotes
      }, { withCredentials: true });
      
      setStatementPreview(res.data);
      setPreviewStatementDialogOpen(true);
    } catch (error) {
      toast.error('Error al generar vista previa');
      console.error(error);
    }
  };

  const handleCreateStatement = async () => {
    if (selectedInvoicesForStatement.length === 0) {
      toast.error('Seleccione al menos una factura');
      return;
    }

    const selectedInvs = invoices.filter(inv => selectedInvoicesForStatement.includes(inv.invoice_id));
    const clientInfo = selectedInvs[0] || {};

    try {
      const res = await api.post('/statements', {
        project_id: statementProjectId && statementProjectId !== 'none' ? statementProjectId : null,
        client_name: clientInfo.client_name || 'Cliente',
        client_email: clientInfo.client_email,
        client_phone: clientInfo.client_phone,
        client_address: clientInfo.client_address,
        invoice_ids: selectedInvoicesForStatement,
        date_from: statementDateFrom || null,
        date_to: statementDateTo || null,
        notes: statementNotes
      }, { withCredentials: true });
      
      toast.success('Statement creado exitosamente');
      setStatementDialogOpen(false);
      setSelectedInvoicesForStatement([]);
      setStatementNotes('');
      setStatementProjectId('');
      loadStatements();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear statement');
      console.error(error);
    }
  };

  const handleDeleteStatement = async (statementId, statementNumber) => {
    if (!window.confirm(`¿Eliminar statement ${statementNumber}?`)) return;

    try {
      await api.delete(`/statements/${statementId}`, { withCredentials: true });
      toast.success('Statement eliminado exitosamente');
      loadStatements();
    } catch (error) {
      toast.error('Error al eliminar statement');
    }
  };


// === 2. Statement PDF ===
  const exportStatementToPDF = async (statement) => {
    const doc = await createPDFDocument({ compress: true });
    const company = await fetchCompanyInfo();
    
    // Header
    let y = await addDocumentHeader(doc, company, 'STATEMENT', statement.statement_number, statement.created_at, statement.balance_due);
    
    // Client section
    y = addPartySection(doc, 'Bill To:', statement.client_name, statement.client_address || '', statement.client_email || '', statement.client_phone || '', y);
    
    // Project Information (if associated)
    if (statement.project_name) {
      // Get project details including sponsor
      let projectDetails = null;
      try {
        const projectRes = await api.get(`/projects/${statement.project_id}`, { withCredentials: true });
        projectDetails = projectRes.data;
      } catch (e) {
        console.log('Could not fetch project details');
      }
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235); // Blue color for project section
      doc.text('Project Information', 15, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0); // Black
      
      // Project Name
      doc.setFont('helvetica', 'bold');
      doc.text('Project:', 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(statement.project_name, 40, y);
      y += 5;
      
      // Sponsor (if available)
      if (projectDetails?.sponsor) {
        doc.setFont('helvetica', 'bold');
        doc.text('Sponsor:', 15, y);
        doc.setFont('helvetica', 'normal');
        doc.text(projectDetails.sponsor, 40, y);
        y += 5;
      }
      
      // Project Address (if available)
      if (projectDetails?.address) {
        doc.setFont('helvetica', 'bold');
        doc.text('Location:', 15, y);
        doc.setFont('helvetica', 'normal');
        const addressText = doc.splitTextToSize(projectDetails.address, 140);
        doc.text(addressText, 40, y);
        y += (addressText.length * 4) + 1;
      }
      
      // Project Status (if available)
      if (projectDetails?.status) {
        doc.setFont('helvetica', 'bold');
        doc.text('Status:', 15, y);
        doc.setFont('helvetica', 'normal');
        const statusText = projectDetails.status === 'in_progress' ? 'In Progress' : 
                          projectDetails.status === 'completed' ? 'Completed' : 
                          projectDetails.status === 'on_hold' ? 'On Hold' : projectDetails.status;
        doc.text(statusText, 40, y);
        y += 5;
      }
      
      y += 5; // Extra spacing after project info
    }
    
    // Period
    if (statement.date_from || statement.date_to) {
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0); // Black
      const periodText = `Period: ${statement.date_from ? moment(statement.date_from).format('MM/DD/YYYY') : 'Start'} - ${statement.date_to ? moment(statement.date_to).format('MM/DD/YYYY') : 'Current'}`;
      doc.text(periodText, 15, y);
      y += 8;
    }
    
    // Account Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0); // Black
    doc.text('Account Summary', 15, y);
    y += 8;
    
    // Calculate remaining balance from project value
    const projectValue = statement.project_value || 0;
    const remainingFromProject = projectValue - statement.total_invoiced;
    
    // Summary boxes - 4 columns if project has value, otherwise 3
    const hasProjectValue = projectValue > 0;
    const boxWidth = hasProjectValue ? 43 : 55;
    const startX = 15;
    
    if (hasProjectValue) {
      // 4 boxes: Project Value, Total Invoiced, Total Paid, Balance Due
      doc.setFillColor(230, 244, 255); // Light blue for project value
      doc.rect(startX, y, boxWidth, 25, 'F');
      doc.setFillColor(240, 240, 240); // Light gray
      doc.rect(startX + boxWidth + 3, y, boxWidth, 25, 'F');
      doc.setFillColor(240, 240, 240); // Light gray
      doc.rect(startX + (boxWidth + 3) * 2, y, boxWidth, 25, 'F');
      // Orange tint if positive, Red tint if negative
      if (remainingFromProject >= 0) {
        doc.setFillColor(255, 245, 230);
      } else {
        doc.setFillColor(255, 230, 230);
      }
      doc.rect(startX + (boxWidth + 3) * 3, y, boxWidth, 25, 'F');
      
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0); // Black
      doc.text('Valor del Proyecto', startX + boxWidth/2, y + 5, { align: 'center' });
      doc.text('Total Facturado', startX + boxWidth + 3 + boxWidth/2, y + 5, { align: 'center' });
      doc.text('Total Pagado', startX + (boxWidth + 3) * 2 + boxWidth/2, y + 5, { align: 'center' });
      doc.text('Por Facturar', startX + (boxWidth + 3) * 3 + boxWidth/2, y + 5, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235); // Blue for project value
      doc.text(`$${formatCurrency(projectValue)}`, startX + boxWidth/2, y + 15, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Black
      doc.text(`$${formatCurrency(statement.total_invoiced)}`, startX + boxWidth + 3 + boxWidth/2, y + 15, { align: 'center' });
      doc.text(`$${formatCurrency(statement.total_paid)}`, startX + (boxWidth + 3) * 2 + boxWidth/2, y + 15, { align: 'center' });
      // Green if positive, Red if negative
      if (remainingFromProject >= 0) {
        doc.setTextColor(0, 128, 0);
      } else {
        doc.setTextColor(200, 0, 0);
      }
      doc.text(`$${formatCurrency(remainingFromProject)}`, startX + (boxWidth + 3) * 3 + boxWidth/2, y + 15, { align: 'center' });
      
      // Add balance due below
      y += 28;
      doc.setFillColor(240, 240, 240);
      doc.rect(startX + (boxWidth + 3) * 2, y, (boxWidth + 3) * 2 - 3, 20, 'F');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text('Balance Pendiente de Cobro', startX + (boxWidth + 3) * 3, y + 5, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0); // Red for balance due
      doc.text(`$${formatCurrency(statement.balance_due)}`, startX + (boxWidth + 3) * 3, y + 14, { align: 'center' });
      y += 25;
    } else {
      // Original 3 boxes layout
      doc.setFillColor(240, 240, 240); // Light gray
      doc.rect(15, y, boxWidth, 20, 'F');
      doc.setFillColor(240, 240, 240); // Light gray
      doc.rect(75, y, boxWidth, 20, 'F');
      doc.setFillColor(240, 240, 240); // Light gray
      doc.rect(135, y, boxWidth, 20, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0); // Black
      doc.text('Total Invoiced', 15 + boxWidth/2, y + 6, { align: 'center' });
      doc.text('Total Paid', 75 + boxWidth/2, y + 6, { align: 'center' });
      doc.text('Balance Due', 135 + boxWidth/2, y + 6, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black
      doc.text(`$${formatCurrency(statement.total_invoiced)}`, 15 + boxWidth/2, y + 15, { align: 'center' });
      doc.text(`$${formatCurrency(statement.total_paid)}`, 75 + boxWidth/2, y + 15, { align: 'center' });
      doc.text(`$${formatCurrency(statement.balance_due)}`, 135 + boxWidth/2, y + 15, { align: 'center' });
      y += 28;
    }
    
    // Invoices Table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0); // Black
    doc.text('Invoice Details', 15, y);
    y += 5;
    
    const invoiceTableData = statement.invoices.map(inv => [
      inv.invoice_number,
      moment(inv.invoice_date).format('MM/DD/YYYY'),
      inv.due_date ? moment(inv.due_date).format('MM/DD/YYYY') : '-',
      `$${formatCurrency(inv.total)}`,
      `$${formatCurrency(inv.amount_paid)}`,
      `$${formatCurrency(inv.balance_due)}`,
      inv.status === 'paid' ? 'Paid' : inv.status === 'partial' ? 'Partial' : 'Pending'
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [['Invoice', 'Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status']],
      body: invoiceTableData,
      theme: 'plain',
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [0, 0, 0], // Black
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0] }, // Black
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [252, 252, 253] }
    });
    
    y = doc.lastAutoTable.finalY + 10;
    
    // Payments Table (if any)
    if (statement.payments && statement.payments.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black
      doc.text('Payment History', 15, y);
      y += 5;
      
      const paymentTableData = statement.payments.map(p => [
        moment(p.payment_date).format('MM/DD/YYYY'),
        p.invoice_number,
        `$${formatCurrency(p.amount)}`,
        p.payment_method === 'transfer' ? 'Transfer' : p.payment_method === 'card' ? 'Card' : p.payment_method === 'cash' ? 'Cash' : p.payment_method === 'check' ? 'Check' : p.payment_method,
        p.reference || '-'
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Invoice', 'Amount', 'Method', 'Reference']],
        body: paymentTableData,
        theme: 'plain',
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: [0, 0, 0], // Black
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0] }, // Black
        columnStyles: {
          2: { halign: 'right' }
        },
        alternateRowStyles: { fillColor: [252, 252, 253] }
      });
      
      y = doc.lastAutoTable.finalY + 10;
    }
    
    // Notes
    if (statement.notes) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black
      doc.text('Notes', 15, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0); // Black
      const notesLines = doc.splitTextToSize(statement.notes, 175);
      doc.text(notesLines, 15, y);
    }
    
    // Footer
    addFooter(doc, company);
    
    doc.save(`Statement_${statement.statement_number}.pdf`);
  };


// === 3. Invoice PDF ===
  const exportToPDF = async (invoice) => {
    // Create PDF with compression enabled and Unicode font support
    const doc = await createPDFDocument({
      compress: true
    });
    const company = await fetchCompanyInfo();
    
    // Get PO# from project if available
    let poNumber = invoice.po_number;
    if (!poNumber && invoice.project_id) {
      const project = projects.find(p => p.project_id === invoice.project_id);
      if (project) {
        poNumber = project.po_number;
      }
    }
    
    // Header: Empresa izquierda, Doc derecha - with Due Date and PO#
    let y = await addDocumentHeader(doc, company, 'INVOICE', invoice.invoice_number, invoice.created_at, invoice.total || 0, {
      dueDate: invoice.due_date,
      poNumber: poNumber
    });
    
    // Client section - include company name and sponsor if available
    let clientDisplayName = invoice.client_company 
      ? `${invoice.client_company}\nAttn: ${invoice.client_name}`
      : invoice.client_name;
    
    // Add sponsor information if available
    if (invoice.sponsor_name) {
      clientDisplayName += `\nSponsor: ${invoice.sponsor_name}`;
    }
    
    y = addPartySection(doc, 'Bill To:', clientDisplayName, invoice.client_address || '', invoice.client_email || '', invoice.client_phone || '', y);
    
    // Tax ID
    if (invoice.tax_id) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(`Tax ID: ${invoice.tax_id}`, 15, y);
      y += 5;
    }
    
    // Valid until / Due Date derecha (like Estimate)
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    if (invoice.due_date) {
      doc.text(`Due Date: ${moment(invoice.due_date).format('MMM DD, YYYY')}`, 120, y - 10);
    }
    
    // Title (project name with quotes like Estimate)
    if (invoice.project_name) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`"${invoice.project_name}"`, 15, y);
      y += 6;
    }
    
    // Subtitle (centered before content)
    if (invoice.subtitle) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22); // Orange color for emphasis
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text(invoice.subtitle, pageWidth / 2, y, { align: 'center' });
      y += 8;
    }
    
    // Tasks table (like Estimate)
    const tasks = invoice.items.map(item => ({
      description: item.description,
      quantity: item.hours || 1,
      unit_price: item.rate || 0,
      amount: item.amount || 0
    }));
    y = addTasksTable(doc, tasks, y + 4);
    
    // Price Breakdown Section (Orange Area) - AFTER Tasks, BEFORE Totals
    if (invoice.price_breakdown) {
      y += 4;
      // Header row
      doc.setFillColor(249, 115, 22); // Orange-500
      doc.rect(15, y, 60, 10, 'F');
      doc.setFillColor(251, 146, 60); // Orange-400
      doc.rect(75, y, 60, 10, 'F');
      doc.setFillColor(234, 88, 12); // Orange-600
      doc.rect(135, y, 60, 10, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Material/Equipment', 45, y + 7, { align: 'center' });
      doc.text('Labor', 105, y + 7, { align: 'center' });
      doc.text('Total', 165, y + 7, { align: 'center' });
      y += 10;
      
      // Values row
      doc.setFillColor(254, 243, 199); // Orange-100
      doc.rect(15, y, 180, 12, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`$${formatCurrency(invoice.price_breakdown.material_equipment || 0)}`, 45, y + 8, { align: 'center' });
      doc.text(`$${formatCurrency(invoice.price_breakdown.labor || 0)}`, 105, y + 8, { align: 'center' });
      doc.text(`$${formatCurrency(invoice.price_breakdown.total || 0)}`, 165, y + 8, { align: 'center' });
      y += 18;
    }
    
    // Build tax details from selected_taxes or fallback to single tax
    let taxDetails = null;
    if (invoice.selected_taxes && invoice.selected_taxes.length > 0) {
      const taxableAmount = invoice.price_breakdown?.total || invoice.subtotal || 0;
      taxDetails = invoice.selected_taxes.map(t => ({
        name: t.name,
        percentage: t.percentage,
        amount: taxableAmount * t.percentage / 100
      }));
    } else if (invoice.tax_type_name && invoice.tax_percentage) {
      taxDetails = [{ name: invoice.tax_type_name, percentage: invoice.tax_percentage, amount: invoice.tax_amount || 0 }];
    }
    y = addTotalsSection(doc, invoice.price_breakdown?.total || invoice.subtotal || 0, 0, invoice.tax_amount || 0, invoice.total || 0, y, taxDetails);
    
    // Notes and Terms - Add to same page if there's space, otherwise new page
    if (invoice.notes || invoice.terms) {
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const columnWidth = (pageWidth - (margin * 2) - 10) / 2;
      const columnGap = 10;
      const lineHeight = 3.5;
      
      // Calculate approximate height needed for notes and terms
      doc.setFontSize(8);
      const cleanTerms = invoice.terms ? stripHtml(invoice.terms) : '';
      const cleanNotes = invoice.notes ? stripHtml(invoice.notes) : '';
      const termsLines = cleanTerms ? doc.splitTextToSize(cleanTerms, columnWidth) : [];
      const notesLines = cleanNotes ? doc.splitTextToSize(cleanNotes, columnWidth) : [];
      const maxLines = Math.max(termsLines.length, notesLines.length);
      const requiredHeight = 20 + (maxLines * lineHeight);
      
      // Check if we need a new page
      if (y + requiredHeight > pageHeight - 15) {
        doc.addPage();
        y = 20;
      } else {
        y += 10;
      }
      
      let leftY = y;
      let rightY = y;
      const maxY = pageHeight - 15;
      
      // LEFT COLUMN - Terms and Conditions
      if (invoice.terms) {
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
      if (invoice.notes) {
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
    
    doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  };