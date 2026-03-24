import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import useFinancialPermissions from '../hooks/useFinancialPermissions';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, FileText, Download, Eye, Trash2, DollarSign, RefreshCw, Send, User, Calendar, Edit, Building2, ClipboardList, Check, Filter, Copy } from 'lucide-react';
import { fetchCompanyInfo, addDocumentHeader, addPartySection, addTasksTable, addTotalsSection, addNotesSection, addFooter, formatCurrency, stripHtml, createPDFDocument } from '../utils/pdfGenerator';
import { toast } from 'sonner';
import moment from 'moment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import NomenclatureSelector, { useNomenclature } from '../components/NomenclatureSelector';
import RichTextEditor from '../components/ui/RichTextEditor';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';


const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [savedClients, setSavedClients] = useState([]);
  const [taxTypes, setTaxTypes] = useState([]);
  // Start with 'all' and update to current year if data exists
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [yearInitialized, setYearInitialized] = useState(false);
  const navigate = useNavigate();
  
  // Statement states
  const [activeTab, setActiveTab] = useState('invoices');
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [statements, setStatements] = useState([]);
  const [selectedInvoicesForStatement, setSelectedInvoicesForStatement] = useState([]);
  const [statementFilterMode, setStatementFilterMode] = useState('manual'); // 'manual' or 'client'
  const [statementClientFilter, setStatementClientFilter] = useState('');
  const [statementDateFrom, setStatementDateFrom] = useState('');
  const [statementDateTo, setStatementDateTo] = useState('');
  const [statementPreview, setStatementPreview] = useState(null);
  const [statementNotes, setStatementNotes] = useState('');

  // Purchase Orders state
  const [poData, setPoData] = useState([]);
  const [poLoading, setPoLoading] = useState(false);
  const [poFilterYear, setPoFilterYear] = useState('all');
  const [poFilterCompany, setPoFilterCompany] = useState('all');
  const [poFilterSponsor, setPoFilterSponsor] = useState('all');
  const [statementProjectId, setStatementProjectId] = useState('');
  const [previewStatementDialogOpen, setPreviewStatementDialogOpen] = useState(false);
  const [clientsSummary, setClientsSummary] = useState([]);
  
  // Multi-select for bulk send
  const [selectedInvoicesForSend, setSelectedInvoicesForSend] = useState([]);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  
  // Get user role for permission checks
  const { user } = useAuth();
  const { showMoney } = useFinancialPermissions();

  // Generate available years from invoices
  const availableYears = React.useMemo(() => {
    const years = new Set();
    invoices.forEach(inv => {
      if (inv.created_at) {
        years.add(new Date(inv.created_at).getFullYear());
      }
      if (inv.invoice_date) {
        years.add(new Date(inv.invoice_date).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);

  // Filter invoices by year
  const filteredInvoices = React.useMemo(() => {
    let result = invoices;
    if (yearFilter !== 'all') {
      result = result.filter(inv => {
        const invoiceYear = inv.invoice_date 
          ? new Date(inv.invoice_date).getFullYear()
          : new Date(inv.created_at).getFullYear();
        return invoiceYear === parseInt(yearFilter);
      });
    }
    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.status === statusFilter);
    }
    return result;
  }, [invoices, yearFilter, statusFilter]);

  // Auto-set year filter to current year if available
  React.useEffect(() => {
    if (!yearInitialized && invoices.length > 0) {
      const currentYear = new Date().getFullYear();
      if (availableYears.includes(currentYear)) {
        setYearFilter(currentYear.toString());
      }
      setYearInitialized(true);
    }
  }, [invoices, availableYears, yearInitialized]);

  const [formData, setFormData] = useState({
    project_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    sponsor_name: '',
    po_number: '',
    tax_id: '',
    tax_rate: 0,
    selected_taxes: [],
    notes: '',
    custom_number: '',
    date_from: '',
    date_to: ''
  });

  // Form for manual invoice creation with tasks
  const [manualForm, setManualForm] = useState({
    project_id: '',
    selected_company_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    sponsor_name: '',
    sponsor_title: '',
    sponsor_email: '',
    po_number: '',
    subtitle: '',
    tax_id: '',
    items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
    tax_rate: 0,
    selected_taxes: [],
    discount_percent: 0,
    notes: '',
    terms: '',
    custom_number: '',
    price_breakdown: null,  // {material_equipment, labor, total}
    document_date: moment().format('YYYY-MM-DD'), // Fecha del documento
    due_date: moment().add(30, 'days').format('YYYY-MM-DD') // Fecha de vencimiento
  });
  
  // Preview state
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const { nomenclatures, selectedNomenclature, generatedNumber, handleSelectNomenclature } = useNomenclature(
    (number) => setFormData(prev => ({ ...prev, custom_number: number }))
  );

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'transfer',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
    loadSavedClients();
    loadTaxTypes();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadData, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const loadData = async () => {
    try {
      const [invoicesRes, projectsRes, companiesRes] = await Promise.all([
        api.get(`/invoices`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        api.get(`/projects`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        api.get(`/companies`, { withCredentials: true }).catch(() => ({ data: [] }))
      ]);
      setInvoices(invoicesRes.data);
      setProjects(projectsRes.data);
      setCompanies(companiesRes.data || []);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedClients = async () => {
    try {
      const res = await api.get('/saved-clients', { withCredentials: true });
      setSavedClients(res.data);
    } catch (error) {
      console.error('Error loading saved clients');
    }
  };

  const loadTaxTypes = async () => {
    try {
      const res = await api.get('/tax-types', { withCredentials: true });
      setTaxTypes(res.data.filter(t => t.is_active));
    } catch (error) {
      console.error('Error loading tax types');
    }
  };

  // Statement functions
  const loadStatements = async () => {
    try {
      const res = await api.get('/statements', { withCredentials: true });
      setStatements(res.data);
    } catch (error) {
      console.error('Error loading statements');
    }
  };

  const loadClientsSummary = async () => {
    try {
      const res = await api.get('/statements/clients/summary', { withCredentials: true });
      setClientsSummary(res.data);
    } catch (error) {
      console.error('Error loading clients summary');
    }
  };

  // Load statements when tab changes to statements
  useEffect(() => {
    if (activeTab === 'statements') {
      loadStatements();
      loadClientsSummary();
    }
  }, [activeTab]);

  // Load PO data when tab changes to purchase-orders
  useEffect(() => {
    if (activeTab === 'purchase-orders' && poData.length === 0) {
      loadPOData();
    }
  }, [activeTab]);

  const loadPOData = async () => {
    setPoLoading(true);
    try {
      const res = await api.get('/projects', { withCredentials: true });
      const projects = res.data || [];
      const pos = projects
        .filter(p => p.po_number)
        .map(p => ({
          project_id: p.project_id,
          project_name: p.name || '',
          project_number: p.project_number || '',
          client: p.client || '',
          sponsor: p.sponsor || '',
          po_number: p.po_number || '',
          po_quantity: p.po_quantity || 0,
          date: p.start_date || p.created_at || '',
          status: p.status || '',
        }));
      setPoData(pos);
    } catch (e) {
      toast.error('Error al cargar Purchase Orders');
    } finally {
      setPoLoading(false);
    }
  };

  const filteredPOs = React.useMemo(() => {
    let result = poData;
    if (poFilterYear !== 'all') {
      result = result.filter(po => {
        const y = po.date ? new Date(po.date).getFullYear() : null;
        return y === parseInt(poFilterYear);
      });
    }
    if (poFilterCompany !== 'all') {
      result = result.filter(po => po.client === poFilterCompany);
    }
    if (poFilterSponsor !== 'all') {
      result = result.filter(po => po.sponsor === poFilterSponsor);
    }
    return result;
  }, [poData, poFilterYear, poFilterCompany, poFilterSponsor]);

  const poCompanies = React.useMemo(() => [...new Set(poData.map(p => p.client).filter(Boolean))], [poData]);
  const poSponsors = React.useMemo(() => [...new Set(poData.map(p => p.sponsor).filter(Boolean))], [poData]);
  const poYears = React.useMemo(() => [...new Set(poData.map(p => p.date ? new Date(p.date).getFullYear() : null).filter(Boolean))].sort((a,b) => b-a), [poData]);

  const exportPOExcel = () => {
    import('xlsx').then(XLSX => {
      // Build filter info for header rows
      const filterInfo = [];
      if (poFilterSponsor !== 'all') filterInfo.push(['Sponsor:', poFilterSponsor]);
      if (poFilterCompany !== 'all') filterInfo.push(['Compañía:', poFilterCompany]);
      if (poFilterYear !== 'all') filterInfo.push(['Año:', poFilterYear]);
      
      const data = filteredPOs.map(po => ({
        'Proyecto': po.project_name,
        'No. Proyecto': po.project_number,
        'Compañía': po.client,
        'Sponsor': po.sponsor,
        'PO Number': po.po_number,
        'Cantidad PO': po.po_quantity,
        'Fecha': po.date ? moment(po.date).format('DD/MM/YYYY') : '',
        'Estatus': po.status,
      }));
      
      // Create workbook with header info
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([]);
      
      // Add title and filter info
      XLSX.utils.sheet_add_aoa(ws, [['PURCHASE ORDERS REPORT']], { origin: 'A1' });
      XLSX.utils.sheet_add_aoa(ws, [['Fecha de Generación:', moment().format('DD/MM/YYYY HH:mm')]], { origin: 'A2' });
      
      let startRow = 3;
      if (filterInfo.length > 0) {
        XLSX.utils.sheet_add_aoa(ws, [['Filtros Aplicados:']], { origin: `A${startRow}` });
        startRow++;
        filterInfo.forEach((f, idx) => {
          XLSX.utils.sheet_add_aoa(ws, [[f[0], f[1]]], { origin: `A${startRow + idx}` });
        });
        startRow += filterInfo.length + 1;
      } else {
        startRow++;
      }
      
      // Add data table
      XLSX.utils.sheet_add_json(ws, data, { origin: `A${startRow}` });
      
      // Add total row at the end
      const totalRow = startRow + data.length + 1;
      const totalQty = filteredPOs.reduce((s, po) => s + (Number(po.po_quantity) || 0), 0);
      XLSX.utils.sheet_add_aoa(ws, [['', '', '', '', 'TOTAL:', totalQty]], { origin: `A${totalRow}` });
      
      XLSX.utils.book_append_sheet(wb, ws, 'Purchase Orders');
      
      // Build filename with filter info
      let filename = 'Purchase_Orders';
      if (poFilterSponsor !== 'all') filename += `_${poFilterSponsor.replace(/\s+/g, '_')}`;
      if (poFilterCompany !== 'all') filename += `_${poFilterCompany.replace(/\s+/g, '_')}`;
      if (poFilterYear !== 'all') filename += `_${poFilterYear}`;
      filename += `_${moment().format('YYYYMMDD')}.xlsx`;
      
      XLSX.writeFile(wb, filename);
      toast.success('Excel descargado');
    });
  };

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

  const handleSelectSavedClient = (client, formSetter) => {
    formSetter(prev => ({
      ...prev,
      client_name: client.name,
      client_email: client.email || '',
      client_phone: client.phone || '',
      client_address: client.address || ''
    }));
  };

  // Handle company selection - auto-populate client info
  const handleSelectCompany = (companyId, formSetter) => {
    const company = companies.find(c => c.company_id === companyId);
    if (company) {
      const fullAddress = [company.address, company.city, company.state, company.zip_code].filter(Boolean).join(', ');
      formSetter(prev => ({
        ...prev,
        selected_company_id: companyId,
        client_name: company.name,
        client_email: company.email || '',
        client_phone: company.phone || '',
        client_address: fullAddress,
        sponsor_name: '' // Reset sponsor when company changes
      }));
    }
  };

  // Handle sponsor selection within a company
  const handleSelectSponsor = (sponsorId, companyId, formSetter) => {
    const company = companies.find(c => c.company_id === companyId);
    const sponsor = company?.sponsors?.find(s => s.sponsor_id === sponsorId);
    if (sponsor) {
      formSetter(prev => ({
        ...prev,
        sponsor_name: sponsor.name,
        sponsor_title: sponsor.title || '',
        sponsor_email: sponsor.email || ''
      }));
    }
  };

  const handleSelectTaxType = (taxId, formSetter) => {
    const tax = taxTypes.find(t => t.id === taxId);
    if (tax) {
      formSetter(prev => ({
        ...prev,
        tax_type_id: tax.id,
        tax_type_name: tax.name,
        tax_rate: tax.percentage
      }));
    }
  };

  const handleMarkSent = async (invoiceId) => {
    try {
      await api.put(`/invoices/${invoiceId}/mark-sent`, {}, { withCredentials: true });
      toast.success('Factura marcada como enviada');
      loadData();
    } catch (error) {
      toast.error('Error al marcar factura');
    }
  };

  // Auto-populate sponsor when project is selected
  const handleProjectSelect = (projectId, formSetter) => {
    const project = projects.find(p => p.project_id === projectId);
    if (project) {
      formSetter(prev => ({
        ...prev,
        project_id: projectId,
        sponsor_name: project.sponsor || '',
        client_name: project.client || prev.client_name
      }));
    } else {
      formSetter(prev => ({ ...prev, project_id: projectId }));
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();

    if (!formData.project_id) {
      toast.error('Selecciona un proyecto');
      return;
    }

    try {
      await api.post(`/invoices/generate`, formData, { withCredentials: true });
      toast.success('Factura generada exitosamente');
      setDialogOpen(false);
      setFormData({
        project_id: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        client_address: '',
        sponsor_name: '',
        po_number: '',
        tax_rate: 0,
        tax_type_id: '',
        tax_type_name: '',
        notes: '',
        custom_number: '',
        date_from: '',
        date_to: ''
      });
      loadData();
      loadSavedClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al generar factura');
      console.error(error);
    }
  };

  // Manual invoice handlers
  const handleManualItemChange = (index, field, value) => {
    const newItems = [...manualForm.items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = parseFloat(newItems[index].quantity || 0) * parseFloat(newItems[index].unit_price || 0);
    }
    
    setManualForm({ ...manualForm, items: newItems });
  };

  const addManualItem = () => {
    setManualForm({
      ...manualForm,
      items: [...manualForm.items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]
    });
  };

  const removeManualItem = (index) => {
    if (manualForm.items.length === 1) return;
    const newItems = manualForm.items.filter((_, i) => i !== index);
    setManualForm({ ...manualForm, items: newItems });
  };

  const calculateManualTotals = () => {
    const subtotal = manualForm.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const discountAmount = subtotal * (parseFloat(manualForm.discount_percent) || 0) / 100;
    const taxableAmount = subtotal - discountAmount;
    // Calculate tax from selected taxes
    const totalTaxRate = manualForm.selected_taxes.reduce((sum, t) => sum + (t.percentage || 0), 0);
    const taxAmount = taxableAmount * totalTaxRate / 100;
    const total = taxableAmount + taxAmount;
    // Calculate individual tax amounts for display
    const taxDetails = manualForm.selected_taxes.map(t => ({
      name: t.name,
      percentage: t.percentage,
      amount: taxableAmount * t.percentage / 100
    }));
    return { subtotal, discountAmount, taxAmount, total, taxDetails };
  };

  const resetManualForm = () => {
    setManualForm({
      project_id: '',
      selected_company_id: '',
      client_name: '',
      client_email: '',
      client_phone: '',
      client_address: '',
      sponsor_name: '',
      sponsor_title: '',
      sponsor_email: '',
      po_number: '',
      subtitle: '',
      tax_id: '',
      items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
      tax_rate: 0,
      selected_taxes: [],
      discount_percent: 0,
      notes: '',
      terms: '',
      custom_number: '',
      price_breakdown: null,
      document_date: moment().format('YYYY-MM-DD'),
      due_date: moment().add(30, 'days').format('YYYY-MM-DD')
    });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    
    if (!manualForm.client_name || manualForm.items.length === 0) {
      toast.error('Complete los campos requeridos');
      return;
    }

    // Calculate total tax rate from selected taxes
    const totalTaxRate = manualForm.selected_taxes.reduce((sum, t) => sum + (t.percentage || 0), 0);

    try {
      const payload = {
        ...manualForm,
        project_id: manualForm.project_id || null,
        items: manualForm.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.amount) || 0
        })),
        tax_rate: totalTaxRate,
        selected_taxes: manualForm.selected_taxes,
        discount_percent: parseFloat(manualForm.discount_percent) || 0
      };

      await api.post(`/invoices/manual`, payload, { withCredentials: true });
      toast.success('Factura creada exitosamente');
      setManualDialogOpen(false);
      setManualForm({
        project_id: '',
        selected_company_id: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        client_address: '',
        sponsor_name: '',
        sponsor_title: '',
        sponsor_email: '',
        po_number: '',
        subtitle: '',
        tax_id: '',
        items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
        tax_rate: 0,
        selected_taxes: [],
        discount_percent: 0,
        notes: '',
        terms: '',
        custom_number: '',
        price_breakdown: null,
        document_date: moment().format('YYYY-MM-DD'),
        due_date: moment().add(30, 'days').format('YYYY-MM-DD')
      });
      loadData();
      loadSavedClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear factura');
    }
  };

  const handleUpdateStatus = async (invoiceId, newStatus) => {
    try {
      await api.put(
        `/invoices/${invoiceId}/status`,
        null,
        {
          params: { status: newStatus },
          withCredentials: true
        }
      );
      toast.success('Estado actualizado');
      loadData();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleDeleteInvoice = async (invoiceId, invoiceNumber) => {
    if (!window.confirm(`¿Eliminar factura ${invoiceNumber}?`)) return;

    try {
      await api.delete(`/invoices/${invoiceId}`, { 
        withCredentials: true,
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      toast.success('Factura eliminada exitosamente');
      // Force reload with cache bust
      setInvoices(prev => prev.filter(inv => inv.invoice_id !== invoiceId));
      loadData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar factura');
    }
  };

  const handleDuplicateInvoice = async (invoiceId, invoiceNumber) => {
    try {
      const res = await api.post(`/invoices/${invoiceId}/duplicate`, {}, { 
        withCredentials: true 
      });
      toast.success(`Factura ${invoiceNumber} duplicada como #${res.data.invoice_number}`);
      loadData();
    } catch (error) {
      console.error('Error duplicating invoice:', error);
      toast.error(error.response?.data?.detail || 'Error al duplicar factura');
    }
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice.invoice_id);
    setManualForm({
      project_id: invoice.project_id || '',
      client_name: invoice.client_name || '',
      client_email: invoice.client_email || '',
      client_phone: invoice.client_phone || '',
      client_address: invoice.client_address || '',
      sponsor_name: invoice.sponsor_name || '',
      po_number: invoice.po_number || '',
      subtitle: invoice.subtitle || '',
      tax_id: invoice.tax_id || '',
      items: invoice.items?.map(item => ({
        description: item.description || '',
        quantity: item.hours || item.quantity || 1,
        unit_price: item.rate || item.unit_price || 0,
        amount: item.amount || 0
      })) || [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
      tax_rate: invoice.tax_rate || 0,
      selected_taxes: invoice.selected_taxes || [],
      discount_percent: invoice.discount_percent || 0,
      notes: invoice.notes || '',
      terms: invoice.terms || '',
      custom_number: invoice.invoice_number || '',
      price_breakdown: invoice.price_breakdown || null,
      document_date: invoice.document_date || moment(invoice.created_at).format('YYYY-MM-DD'),
      due_date: invoice.due_date || moment().add(30, 'days').format('YYYY-MM-DD')
    });
    setManualDialogOpen(true);
  };

  const handleUpdateInvoice = async () => {
    if (!editingInvoice) return;
    
    try {
      const totals = calculateManualTotals();
      const payload = {
        ...manualForm,
        items: manualForm.items.map(item => ({
          description: item.description,
          hours: parseFloat(item.quantity) || 1,
          rate: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.amount) || 0
        })),
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        total: totals.total,
        custom_number: manualForm.custom_number
      };
      
      await api.put(`/invoices/${editingInvoice}`, payload, { withCredentials: true });
      toast.success('Factura actualizada exitosamente');
      setManualDialogOpen(false);
      setEditingInvoice(null);
      resetManualForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar factura');
    }
  };

  const handleSendInvoice = async (invoiceId, clientEmail) => {
    if (!clientEmail) {
      toast.error('La factura no tiene email del cliente');
      return;
    }

    try {
      await api.post(`/invoices/${invoiceId}/send`, {}, { withCredentials: true });
      toast.success(`Factura enviada a ${clientEmail}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar factura');
    }
  };

  // Toggle selection for bulk send
  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoicesForSend(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  // Select all sendable invoices (draft with email)
  const selectAllSendableInvoices = () => {
    const sendableInvoices = filteredInvoices
      .filter(inv => inv.status === 'draft' && inv.client_email)
      .map(inv => inv.invoice_id);
    
    if (selectedInvoicesForSend.length === sendableInvoices.length) {
      setSelectedInvoicesForSend([]);
    } else {
      setSelectedInvoicesForSend(sendableInvoices);
    }
  };

  // Get sendable invoices count
  const sendableInvoicesCount = filteredInvoices.filter(inv => inv.status === 'draft' && inv.client_email).length;

  // Bulk send invoices
  const handleBulkSendInvoices = async () => {
    if (selectedInvoicesForSend.length === 0) {
      toast.error('Selecciona al menos una factura para enviar');
      return;
    }

    const invoicesToSend = invoices.filter(inv => 
      selectedInvoicesForSend.includes(inv.invoice_id) && 
      inv.client_email && 
      inv.status === 'draft'
    );

    if (invoicesToSend.length === 0) {
      toast.error('Las facturas seleccionadas no tienen email o ya fueron enviadas');
      return;
    }

    setIsSendingBulk(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Send invoices in parallel batches of 3
      for (let i = 0; i < invoicesToSend.length; i += 3) {
        const batch = invoicesToSend.slice(i, i + 3);
        const results = await Promise.allSettled(
          batch.map(inv => 
            api.post(`/invoices/${inv.invoice_id}/send`, {}, { withCredentials: true })
          )
        );
        
        results.forEach(result => {
          if (result.status === 'fulfilled') successCount++;
          else errorCount++;
        });
      }

      if (successCount > 0) {
        toast.success(`${successCount} factura(s) enviada(s) exitosamente`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} factura(s) no pudieron ser enviadas`);
      }
      
      setSelectedInvoicesForSend([]);
      loadData();
    } catch (error) {
      toast.error('Error al enviar facturas');
    } finally {
      setIsSendingBulk(false);
    }
  };

  const handleOpenPaymentDialog = async (invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentForm({
      amount: invoice.balance_due || invoice.total,
      payment_method: 'transfer',
      reference: '',
      notes: ''
    });
    
    // Load existing payments
    try {
      const response = await api.get(`/invoices/${invoice.invoice_id}/payments`, { withCredentials: true });
      setPayments(response.data);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
    
    setPaymentDialogOpen(true);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();

    try {
      await api.post(
        `/invoices/${selectedInvoiceForPayment.invoice_id}/payments`,
        paymentForm,
        { withCredentials: true }
      );
      toast.success('Pago registrado exitosamente');
      setPaymentDialogOpen(false);
      setPaymentForm({
        amount: 0,
        payment_method: 'transfer',
        reference: '',
        notes: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar pago');
    }
  };

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-slate-100 text-slate-700">Borrador</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-700">Enviada</Badge>;
      case 'partial':
        return <Badge className="bg-orange-100 text-orange-700">Pago Parcial</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-700">Pagada</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700">Vencida</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Cargando facturas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">Facturas</h1>
            <p className="text-muted-foreground mt-2">
              Genera facturas automáticamente desde el timesheet
              {yearFilter !== 'all' && <span className="text-blue-600 font-medium"> - Año {yearFilter}</span>}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="paid">Pagada</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="overdue">Vencida</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los años</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => { setLoading(true); loadData(); }}
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Generar Factura
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Generar Nueva Factura</DialogTitle>
                <DialogDescription>
                  La factura se generará automáticamente desde el timesheet del proyecto
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleGenerateInvoice}>
                <div className="space-y-4 py-4">
                  <NomenclatureSelector
                    nomenclatures={nomenclatures}
                    selectedNomenclature={selectedNomenclature}
                    generatedNumber={generatedNumber}
                    onSelect={handleSelectNomenclature}
                    label="Nomenclatura de Factura"
                  />
                  {!selectedNomenclature && (
                    <div className="space-y-2">
                      <Label htmlFor="custom_number">Número Manual (opcional)</Label>
                      <Input
                        id="custom_number"
                        value={formData.custom_number}
                        onChange={(e) => setFormData({ ...formData, custom_number: e.target.value })}
                        placeholder="Ej: 001"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="project">Proyecto *</Label>
                    <Select
                      value={formData.project_id}
                      onValueChange={(value) => {
                        const project = projects.find(p => p.project_id === value);
                        setFormData({
                          ...formData,
                          project_id: value,
                          client_name: project?.client || '',
                          sponsor_name: project?.sponsor || ''
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.project_id} value={project.project_id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sponsor field */}
                  <div className="space-y-2">
                    <Label htmlFor="sponsor_name">Patrocinador / Sponsor</Label>
                    <Input
                      id="sponsor_name"
                      value={formData.sponsor_name}
                      onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                      placeholder="Nombre del patrocinador"
                    />
                  </div>

                  {/* PO Number field */}
                  <div className="space-y-2">
                    <Label htmlFor="po_number">Número de PO</Label>
                    <Input
                      id="po_number"
                      value={formData.po_number}
                      onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                      placeholder="Número de orden de compra"
                    />
                  </div>

                  {/* Date Range Filter for Timesheet */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="date_from">Fecha Desde</Label>
                      <Input
                        id="date_from"
                        type="date"
                        value={formData.date_from}
                        onChange={(e) => setFormData({ ...formData, date_from: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_to">Fecha Hasta</Label>
                      <Input
                        id="date_to"
                        type="date"
                        value={formData.date_to}
                        onChange={(e) => setFormData({ ...formData, date_to: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Filtra las horas del timesheet por rango de fechas. Deja vacío para incluir todas.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="client_name">Nombre del Cliente *</Label>
                    <Input
                      id="client_name"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      required
                      placeholder="Empresa o Persona"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client_email">Email del Cliente</Label>
                    <Input
                      id="client_email"
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      placeholder="cliente@ejemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client_phone">Teléfono del Cliente</Label>
                    <Input
                      id="client_phone"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                      placeholder="(787) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client_address">Dirección del Cliente</Label>
                    <Textarea
                      id="client_address"
                      value={formData.client_address}
                      onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                      placeholder="Dirección completa del cliente..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_id">Tax ID / EIN</Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      placeholder="Ej: 66-0123456"
                      data-testid="invoice-tax-id"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">Tasa de Impuesto (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas (Opcional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Términos y condiciones, información adicional..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Generar Factura
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>

            {/* Manual Invoice Dialog */}
            <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Factura Manual
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingInvoice ? 'Editar Factura' : 'Crear Factura Manual'}</DialogTitle>
                  <DialogDescription>
                    {editingInvoice ? 'Modifica los datos de la factura' : 'Crea una factura con items personalizados (Tasks)'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); editingInvoice ? handleUpdateInvoice() : handleManualSubmit(e); }} className="space-y-6">
                  {/* Invoice Number and Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manual_custom_number">Número de Factura *</Label>
                      <Input
                        id="manual_custom_number"
                        value={manualForm.custom_number}
                        onChange={(e) => setManualForm({...manualForm, custom_number: e.target.value})}
                        placeholder="Ej: INV-2025-0150"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual_document_date">Fecha del Documento</Label>
                      <Input
                        id="manual_document_date"
                        type="date"
                        value={manualForm.document_date}
                        onChange={(e) => setManualForm({...manualForm, document_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual_due_date">Fecha de Vencimiento</Label>
                      <Input
                        id="manual_due_date"
                        type="date"
                        value={manualForm.due_date}
                        onChange={(e) => setManualForm({...manualForm, due_date: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Subtitle */}
                  <div className="space-y-2">
                    <Label htmlFor="manual_subtitle">Subtítulo del Documento</Label>
                    <Input
                      id="manual_subtitle"
                      value={manualForm.subtitle}
                      onChange={(e) => setManualForm({...manualForm, subtitle: e.target.value})}
                      placeholder="Ej: Avance de Obra #2, Factura Final, etc."
                    />
                    <p className="text-xs text-slate-500">Aparecerá centrado en el PDF antes del contenido</p>
                  </div>

                  {/* Client Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Proyecto (opcional)</Label>
                      <Select value={manualForm.project_id || 'none'} onValueChange={(v) => handleProjectSelect(v === 'none' ? '' : v, setManualForm)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proyecto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin proyecto</SelectItem>
                          {projects.map(p => (
                            <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="flex items-center gap-1"><Building2 className="w-4 h-4" /> Compañía (Módulo)</Label>
                      <Select 
                        value={manualForm.selected_company_id || 'none'} 
                        onValueChange={(v) => handleSelectCompany(v === 'none' ? '' : v, setManualForm)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar compañía" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Sin seleccionar --</SelectItem>
                          {companies.map(c => (
                            <SelectItem key={c.company_id} value={c.company_id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {manualForm.selected_company_id && (
                      <div>
                        <Label>Sponsor de la Compañía</Label>
                        <Select onValueChange={(v) => handleSelectSponsor(v, manualForm.selected_company_id, setManualForm)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar sponsor" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.find(c => c.company_id === manualForm.selected_company_id)?.sponsors?.map(s => (
                              <SelectItem key={s.sponsor_id} value={s.sponsor_id}>
                                {s.name} {s.title && `(${s.title})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label>Cliente Guardado (Legacy)</Label>
                      <Select onValueChange={(v) => {
                        const client = savedClients.find(c => c.id === v);
                        if (client) handleSelectSavedClient(client, setManualForm);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente guardado" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedClients.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nombre del Cliente *</Label>
                      <Input value={manualForm.client_name} onChange={(e) => setManualForm({...manualForm, client_name: e.target.value})} required />
                    </div>
                    <div>
                      <Label>Email del Cliente</Label>
                      <Input type="email" value={manualForm.client_email} onChange={(e) => setManualForm({...manualForm, client_email: e.target.value})} />
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <Input value={manualForm.client_phone} onChange={(e) => setManualForm({...manualForm, client_phone: e.target.value})} />
                    </div>
                    <div>
                      <Label>Sponsor</Label>
                      <Input value={manualForm.sponsor_name} onChange={(e) => setManualForm({...manualForm, sponsor_name: e.target.value})} placeholder="Nombre del sponsor" />
                    </div>
                    <div>
                      <Label>Número de PO</Label>
                      <Input value={manualForm.po_number} onChange={(e) => setManualForm({...manualForm, po_number: e.target.value})} placeholder="Número de orden de compra" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Dirección</Label>
                      <Textarea 
                        value={manualForm.client_address} 
                        onChange={(e) => setManualForm({...manualForm, client_address: e.target.value})} 
                        placeholder="Calle, Número&#10;Ciudad, Estado&#10;Código Postal"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Tax ID / EIN</Label>
                      <Input 
                        value={manualForm.tax_id} 
                        onChange={(e) => setManualForm({...manualForm, tax_id: e.target.value})} 
                        placeholder="Ej: 66-0123456"
                        data-testid="manual-invoice-tax-id"
                      />
                    </div>
                  </div>

                  {/* Items - Task Format */}
                  <div>
                    <Label className="mb-2 block">Líneas de la Factura (Tasks)</Label>
                    <div className="space-y-2">
                      {manualForm.items.map((item, idx) => (
                        <div key={idx} className="border rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Task #{idx + 1}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeManualItem(idx)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                          <RichTextEditor 
                            placeholder="Descripción del task / Scope of Work..." 
                            value={item.description}
                            onChange={(value) => handleManualItemChange(idx, 'description', value)}
                            minHeight="100px"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs">Cantidad</Label>
                              <Input 
                                type="number" 
                                value={item.quantity}
                                onChange={(e) => handleManualItemChange(idx, 'quantity', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Precio Unit.</Label>
                              <Input 
                                type="number" 
                                value={item.unit_price}
                                onChange={(e) => handleManualItemChange(idx, 'unit_price', e.target.value)}
                                disabled={!showMoney}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Total</Label>
                              <div className="h-9 flex items-center font-mono font-bold text-blue-600">
                                {showMoney ? `$${formatCurrency(parseFloat(item.amount) || 0)}` : '---'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" onClick={addManualItem} className="mt-2 w-full">
                      <Plus className="w-4 h-4 mr-1" /> Agregar Task
                    </Button>
                  </div>

                  {/* Price Breakdown Section - After Tasks, Before Totals */}
                  {showMoney && (
                    <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                      <p className="font-semibold text-orange-800 mb-3">Price Breakdown</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-orange-700">Material/Equipment</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            className="bg-white"
                            value={manualForm.price_breakdown?.material_equipment || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const labor = manualForm.price_breakdown?.labor || 0;
                              setManualForm({
                                ...manualForm, 
                                price_breakdown: {
                                  ...manualForm.price_breakdown,
                                  material_equipment: val,
                                  total: val + labor
                                }
                              });
                            }}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label className="text-orange-700">Labor</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            className="bg-white"
                            value={manualForm.price_breakdown?.labor || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const matEquip = manualForm.price_breakdown?.material_equipment || 0;
                              setManualForm({
                                ...manualForm, 
                                price_breakdown: {
                                  ...manualForm.price_breakdown,
                                  labor: val,
                                  total: matEquip + val
                                }
                              });
                            }}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label className="text-orange-700">Total</Label>
                          <div className="h-9 flex items-center px-3 bg-orange-100 rounded-md font-bold text-orange-800">
                            ${formatCurrency(manualForm.price_breakdown?.total || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Descuento (%)</Label>
                      <Input type="number" value={manualForm.discount_percent} onChange={(e) => setManualForm({...manualForm, discount_percent: e.target.value})} disabled={!showMoney} />
                    </div>
                    <div>
                      <Label>Impuestos (seleccione múltiples)</Label>
                      <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2 bg-white">
                        {taxTypes.filter(t => t.is_active).map(tax => (
                          <label key={tax.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={manualForm.selected_taxes.some(t => t.name === tax.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setManualForm({...manualForm, selected_taxes: [...manualForm.selected_taxes, { name: tax.name, percentage: tax.percentage }]});
                                } else {
                                  setManualForm({...manualForm, selected_taxes: manualForm.selected_taxes.filter(t => t.name !== tax.name)});
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300"
                              disabled={!showMoney}
                            />
                            <span className="text-sm">{tax.name} ({tax.percentage}%)</span>
                          </label>
                        ))}
                        {taxTypes.filter(t => t.is_active).length === 0 && (
                          <p className="text-sm text-slate-500">No hay tipos de impuesto configurados</p>
                        )}
                      </div>
                      {manualForm.selected_taxes.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          Total: {manualForm.selected_taxes.reduce((sum, t) => sum + t.percentage, 0)}%
                        </p>
                      )}
                    </div>
                    {showMoney && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex justify-between text-sm"><span>Subtotal:</span><span>${formatCurrency(calculateManualTotals().subtotal)}</span></div>
                        {calculateManualTotals().discountAmount > 0 && <div className="flex justify-between text-sm text-red-600"><span>Descuento:</span><span>-${formatCurrency(calculateManualTotals().discountAmount)}</span></div>}
                        {calculateManualTotals().taxDetails && calculateManualTotals().taxDetails.map((tax, idx) => (
                          <div key={idx} className="flex justify-between text-sm text-slate-600">
                            <span>{tax.name} ({tax.percentage}%):</span>
                            <span>${formatCurrency(tax.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold text-lg border-t mt-2 pt-2"><span>Total:</span><span>${formatCurrency(calculateManualTotals().total)}</span></div>
                      </div>
                    )}
                  </div>

                  {/* Notes & Terms */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Notas</Label>
                      <Textarea value={manualForm.notes} onChange={(e) => setManualForm({...manualForm, notes: e.target.value})} rows={3} />
                    </div>
                    <div>
                      <Label>Términos y Condiciones</Label>
                      <Textarea value={manualForm.terms} onChange={(e) => setManualForm({...manualForm, terms: e.target.value})} rows={3} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setManualDialogOpen(false); setEditingInvoice(null); resetManualForm(); }}>Cancelar</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingInvoice ? 'Actualizar Factura' : 'Crear Factura'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Payment Dialog - Only visible for users who can see money */}
          {showMoney && (
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Registrar Pago</DialogTitle>
                  <DialogDescription>
                    {selectedInvoiceForPayment && (
                      <div className="mt-2">
                        <p>Factura: {selectedInvoiceForPayment.invoice_number}</p>
                        <p className="text-lg font-bold mt-1">
                          Saldo Pendiente: ${selectedInvoiceForPayment.balance_due?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddPayment}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Monto del Pago *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                        required
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment_method">Método de Pago *</Label>
                      <Select
                        value={paymentForm.payment_method}
                        onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transfer">Transferencia</SelectItem>
                          <SelectItem value="card">Tarjeta</SelectItem>
                          <SelectItem value="cash">Efectivo</SelectItem>
                          <SelectItem value="check">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reference">Referencia/Confirmación</Label>
                      <Input
                        id="reference"
                        value={paymentForm.reference}
                        onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                        placeholder="Número de referencia o confirmación"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment_notes">Notas</Label>
                      <Textarea
                        id="payment_notes"
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        placeholder="Información adicional del pago..."
                        rows={2}
                      />
                    </div>

                    {/* Existing Payments */}
                    {payments.length > 0 && (
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-2 text-sm">Pagos Anteriores:</h4>
                        <div className="space-y-2">
                          {payments.map((payment) => (
                            <div key={payment.payment_id} className="text-xs bg-slate-50 p-2 rounded">
                              <div className="flex justify-between">
                                <span>{moment(payment.created_at).format('DD/MM/YYYY')}</span>
                                <span className="font-bold">${formatCurrency(payment.amount)}</span>
                              </div>
                              <div className="text-slate-600">{payment.payment_method}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Registrar Pago
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Tabs para Facturas y Statements */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Facturas
            </TabsTrigger>
            <TabsTrigger value="purchase-orders" className="flex items-center gap-2" data-testid="po-tab">
              <ClipboardList className="w-4 h-4" />
              Purchase Orders
            </TabsTrigger>
            <TabsTrigger value="statements" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Statements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-6">
            {/* Bulk Actions Bar */}
            {filteredInvoices.some(inv => inv.status === 'draft') && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all-sendable"
                    checked={selectedInvoicesForSend.length === sendableInvoicesCount && sendableInvoicesCount > 0}
                    onCheckedChange={selectAllSendableInvoices}
                    disabled={sendableInvoicesCount === 0}
                  />
                  <label htmlFor="select-all-sendable" className="text-sm font-medium text-blue-800 cursor-pointer">
                    {sendableInvoicesCount > 0 
                      ? `Seleccionar todas las enviables (${sendableInvoicesCount} con email)`
                      : 'No hay facturas con email para enviar'
                    }
                  </label>
                </div>
                {selectedInvoicesForSend.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-blue-700">
                      {selectedInvoicesForSend.length} seleccionada(s)
                    </span>
                    <Button
                      onClick={handleBulkSendInvoices}
                      disabled={isSendingBulk}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="bulk-send-invoices-btn"
                    >
                      {isSendingBulk ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Seleccionadas
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInvoicesForSend([])}
                    >
                      Limpiar selección
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Invoices List */}
            {filteredInvoices.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredInvoices.map((invoice) => {
              const isSendable = invoice.status === 'draft' && invoice.client_email;
              const isDraft = invoice.status === 'draft';
              const isSelected = selectedInvoicesForSend.includes(invoice.invoice_id);
              
              return (
              <Card 
                key={invoice.invoice_id} 
                className={`border-slate-200 shadow-sm hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-400 bg-blue-50/30' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Checkbox for bulk selection - show for all drafts */}
                    {isDraft && (
                      <div className="pt-1" title={isSendable ? 'Seleccionar para envío' : 'Sin email de cliente'}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => isSendable && toggleInvoiceSelection(invoice.invoice_id)}
                          disabled={!isSendable}
                          className={!isSendable ? 'opacity-50' : ''}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[#0F172A]">{invoice.invoice_number}</h3>
                          <p className="text-sm text-slate-600">{invoice.project_name}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-slate-600">Cliente</p>
                          <p className="text-sm font-medium">{invoice.client_name}</p>
                          {invoice.client_email && (
                            <p className="text-xs text-slate-400">{invoice.client_email}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Fecha</p>
                          <p className="text-sm font-medium">{moment(invoice.created_at).format('DD/MM/YYYY')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Total</p>
                          <p className="text-lg font-bold font-mono text-blue-600">
                            {showMoney ? `$${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '---'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 mb-1">Estado</p>
                          {getStatusBadge(invoice.status)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewInvoice(invoice)}
                        title="Vista Previa"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToPDF(invoice)}
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>

                      {invoice.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkSent(invoice.invoice_id)}
                          className="text-blue-600"
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Marcar Enviada
                        </Button>
                      )}

                      {invoice.status === 'draft' && invoice.client_email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendInvoice(invoice.invoice_id, invoice.client_email)}
                          className="text-blue-600"
                        >
                          📧 Enviar por Email
                        </Button>
                      )}

                      {showMoney && (invoice.status === 'sent' || invoice.status === 'partial') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPaymentDialog(invoice)}
                          className="text-green-600"
                        >
                          💵 Registrar Pago
                        </Button>
                      )}

                      {showMoney && invoice.balance_due > 0 && invoice.status !== 'draft' && (
                        <div className="text-xs text-center py-1">
                          <p className="text-slate-600">Pendiente:</p>
                          <p className="font-bold text-red-600">
                            ${invoice.balance_due.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Editar factura"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateInvoice(invoice.invoice_id, invoice.invoice_number)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Duplicar factura"
                        data-testid={`duplicate-invoice-${invoice.invoice_id}`}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInvoice(invoice.invoice_id, invoice.invoice_number)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Sponsor display */}
                  {invoice.sponsor_name && (
                    <div className="mt-2 text-sm text-slate-600">
                      <span className="font-medium">Sponsor:</span> {invoice.sponsor_name}
                    </div>
                  )}

                  {/* Tax ID display */}
                  {invoice.tax_id && (
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">Tax ID:</span> {invoice.tax_id}
                    </div>
                  )}

                  {/* Tax type display */}
                  {invoice.tax_type_name && (
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">Impuesto:</span> {invoice.tax_type_name} ({invoice.tax_rate}%)
                    </div>
                  )}

                  {/* Items preview */}
                  {selectedInvoice === invoice.invoice_id && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <h4 className="font-semibold mb-2">Detalles:</h4>
                      <div className="space-y-2">
                        {invoice.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.description}</span>
                            <span className="font-mono">{item.hours}h × ${item.rate} = ${item.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSelectedInvoice(selectedInvoice === invoice.invoice_id ? null : invoice.invoice_id)}
                    className="mt-2"
                  >
                    {selectedInvoice === invoice.invoice_id ? 'Ocultar detalles' : 'Ver detalles'}
                  </Button>
                </CardContent>
              </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <DollarSign className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600 mb-2">No hay facturas generadas</p>
              <p className="text-sm text-muted-foreground mb-6">Crea tu primera factura desde el timesheet de un proyecto</p>
              <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Generar Factura
              </Button>
            </CardContent>
          </Card>
        )}

          </TabsContent>

          {/* Purchase Orders Tab */}
          <TabsContent value="purchase-orders" className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Purchase Orders</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={poFilterYear} onValueChange={setPoFilterYear}>
                  <SelectTrigger className="w-[120px]"><SelectValue placeholder="Año" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {poYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={poFilterCompany} onValueChange={setPoFilterCompany}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Compañía" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {poCompanies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={poFilterSponsor} onValueChange={setPoFilterSponsor}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sponsor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {poSponsors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportPOPdf} data-testid="po-pdf-btn">
                  <Download className="w-4 h-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" onClick={exportPOExcel} data-testid="po-excel-btn">
                  <Download className="w-4 h-4 mr-1" /> Excel
                </Button>
              </div>
            </div>

            {poLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>
            ) : filteredPOs.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-slate-500">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No hay Purchase Orders {poFilterYear !== 'all' || poFilterCompany !== 'all' || poFilterSponsor !== 'all' ? 'con esos filtros' : 'registrados'}</p>
              </CardContent></Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-orange-600">{filteredPOs.length}</p>
                      <p className="text-xs text-orange-700">Total POs</p>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        ${filteredPOs.reduce((s, po) => s + (Number(po.po_quantity) || 0), 0).toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-green-700">Cantidad Total</p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{poCompanies.length}</p>
                      <p className="text-xs text-blue-700">Compañías</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <th className="p-3 text-left font-semibold">Proyecto</th>
                            <th className="p-3 text-left font-semibold">Compañía</th>
                            <th className="p-3 text-left font-semibold">Sponsor</th>
                            <th className="p-3 text-left font-semibold">PO Number</th>
                            <th className="p-3 text-right font-semibold">Cantidad PO</th>
                            <th className="p-3 text-left font-semibold">Fecha</th>
                            <th className="p-3 text-left font-semibold">Estatus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPOs.map((po, idx) => (
                            <tr key={po.project_id} className={`border-b hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                              <td className="p-3">
                                <div className="font-medium">{po.project_name}</div>
                                <div className="text-xs text-slate-400">{po.project_number}</div>
                              </td>
                              <td className="p-3">{po.client}</td>
                              <td className="p-3">{po.sponsor}</td>
                              <td className="p-3 font-mono text-orange-600 font-medium">{po.po_number}</td>
                              <td className="p-3 text-right font-semibold text-green-600">
                                ${(Number(po.po_quantity) || 0).toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-slate-500">{po.date ? moment(po.date).format('DD/MM/YYYY') : '—'}</td>
                              <td className="p-3">
                                <Badge variant="outline" className="text-xs capitalize">{po.status}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-orange-50 font-bold border-t-2 border-orange-300">
                            <td className="p-3" colSpan={4}>TOTAL</td>
                            <td className="p-3 text-right text-orange-600">
                              ${filteredPOs.reduce((s, po) => s + (Number(po.po_quantity) || 0), 0).toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Statements Tab */}
          <TabsContent value="statements" className="mt-6 space-y-6">
            {/* Statements Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-muted-foreground">
                  Genera estados de cuenta con facturas pendientes y pagadas
                </p>
              </div>
              <Button 
                onClick={() => setStatementDialogOpen(true)} 
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Crear Statement
              </Button>
            </div>

            {/* Statements List */}
            {statements.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {statements.map((statement) => (
                  <Card key={statement.statement_id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                              <ClipboardList className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-[#0F172A]">{statement.statement_number}</h3>
                              <p className="text-sm text-slate-600">{statement.client_name}</p>
                              {statement.project_name && (
                                <Badge variant="outline" className="text-xs mt-1 bg-blue-50 text-blue-700 border-blue-200">
                                  {statement.project_name}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-slate-600">Fecha</p>
                              <p className="text-sm font-medium">{moment(statement.created_at).format('DD/MM/YYYY')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-600">Facturas</p>
                              <p className="text-sm font-medium">{statement.invoices?.length || 0}</p>
                            </div>
                            {showMoney && (
                              <>
                                <div>
                                  <p className="text-xs text-slate-600">Total Facturado</p>
                                  <p className="text-sm font-bold text-blue-600">${formatCurrency(statement.total_invoiced)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-600">Total Pagado</p>
                                  <p className="text-sm font-bold text-green-600">${formatCurrency(statement.total_paid)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-600">Balance</p>
                                  <p className={`text-lg font-bold ${statement.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ${formatCurrency(statement.balance_due)}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportStatementToPDF(statement)}
                            title="Descargar PDF"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStatement(statement.statement_id, statement.statement_number)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Period info */}
                      {(statement.date_from || statement.date_to) && (
                        <div className="mt-2 text-sm text-slate-600">
                          <span className="font-medium">Período:</span> {statement.date_from ? moment(statement.date_from).format('DD/MM/YYYY') : 'Inicio'} - {statement.date_to ? moment(statement.date_to).format('DD/MM/YYYY') : 'Actual'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <ClipboardList className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600 mb-2">No hay statements generados</p>
                  <p className="text-sm text-muted-foreground mb-6">Crea tu primer estado de cuenta seleccionando facturas</p>
                  <Button onClick={() => setStatementDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Crear Statement
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Statement Creation Dialog */}
        <Dialog open={statementDialogOpen} onOpenChange={setStatementDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Statement (Estado de Cuenta)</DialogTitle>
              <DialogDescription>
                Selecciona facturas para incluir en el estado de cuenta
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Filter Mode Selection */}
              <div className="flex gap-4">
                <Button
                  variant={statementFilterMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => {
                    setStatementFilterMode('manual');
                    setStatementClientFilter('');
                  }}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Selección Manual
                </Button>
                <Button
                  variant={statementFilterMode === 'client' ? 'default' : 'outline'}
                  onClick={() => setStatementFilterMode('client')}
                  className="flex-1"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtrar por Cliente
                </Button>
              </div>

              {/* Client Filter (when in client mode) */}
              {statementFilterMode === 'client' && (
                <div className="space-y-2">
                  <Label>Seleccionar Cliente</Label>
                  <Select value={statementClientFilter} onValueChange={(v) => {
                    setStatementClientFilter(v);
                    // Auto-select all invoices for this client
                    const clientInvoices = invoices.filter(inv => inv.client_name === v);
                    setSelectedInvoicesForStatement(clientInvoices.map(inv => inv.invoice_id));
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueClients.map(client => (
                        <SelectItem key={client.name} value={client.name}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date Range Filter */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Desde (opcional)</Label>
                  <Input
                    type="date"
                    value={statementDateFrom}
                    onChange={(e) => setStatementDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Hasta (opcional)</Label>
                  <Input
                    type="date"
                    value={statementDateTo}
                    onChange={(e) => setStatementDateTo(e.target.value)}
                  />
                </div>
              </div>

              {/* Project Selection */}
              <div className="space-y-2">
                <Label>Proyecto Asociado (opcional)</Label>
                <Select value={statementProjectId} onValueChange={setStatementProjectId}>
                  <SelectTrigger data-testid="statement-project-select">
                    <SelectValue placeholder="Seleccionar proyecto..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin proyecto</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.project_id} value={project.project_id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Asocia este estado de cuenta a un proyecto específico
                </p>
              </div>

              {/* Invoice Selection Table */}
              <div className="border rounded-lg">
                <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedInvoicesForStatement.length === filteredInvoicesForStatement.length && filteredInvoicesForStatement.length > 0}
                      onCheckedChange={handleSelectAllInvoicesForStatement}
                    />
                    <span className="text-sm font-medium">
                      Seleccionar Todas ({selectedInvoicesForStatement.length} de {filteredInvoicesForStatement.length})
                    </span>
                  </div>
                  {showMoney && selectedInvoicesForStatement.length > 0 && (
                    <div className="text-sm">
                      <span className="text-slate-600">Total seleccionado: </span>
                      <span className="font-bold text-blue-600">
                        ${formatCurrency(
                          invoices
                            .filter(inv => selectedInvoicesForStatement.includes(inv.invoice_id))
                            .reduce((sum, inv) => sum + (inv.total || 0), 0)
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {filteredInvoicesForStatement.length > 0 ? (
                    filteredInvoicesForStatement.map((invoice) => (
                      <div
                        key={invoice.invoice_id}
                        className={`p-3 border-b flex items-center gap-4 hover:bg-slate-50 cursor-pointer ${
                          selectedInvoicesForStatement.includes(invoice.invoice_id) ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleToggleInvoiceForStatement(invoice.invoice_id)}
                      >
                        <Checkbox
                          checked={selectedInvoicesForStatement.includes(invoice.invoice_id)}
                          onCheckedChange={() => handleToggleInvoiceForStatement(invoice.invoice_id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{invoice.invoice_number}</span>
                            <Badge variant="outline" className="text-xs">
                              {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'partial' ? 'Parcial' : 'Pendiente'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">{invoice.client_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-600">{moment(invoice.created_at).format('DD/MM/YYYY')}</p>
                          {showMoney && (
                            <p className="font-mono font-bold text-blue-600">${formatCurrency(invoice.total || 0)}</p>
                          )}
                        </div>
                        {showMoney && invoice.balance_due > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-slate-600">Pendiente</p>
                            <p className="font-mono font-bold text-red-600">${formatCurrency(invoice.balance_due)}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      No hay facturas que coincidan con los filtros
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notas del Statement (opcional)</Label>
                <Textarea
                  value={statementNotes}
                  onChange={(e) => setStatementNotes(e.target.value)}
                  placeholder="Información adicional para el cliente..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setStatementDialogOpen(false);
                setSelectedInvoicesForStatement([]);
                setStatementNotes('');
                setStatementProjectId('');
              }}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={handlePreviewStatement}
                disabled={selectedInvoicesForStatement.length === 0}
              >
                <Eye className="w-4 h-4 mr-2" />
                Vista Previa
              </Button>
              <Button
                onClick={handleCreateStatement}
                disabled={selectedInvoicesForStatement.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Crear Statement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Statement Preview Dialog */}
        <Dialog open={previewStatementDialogOpen} onOpenChange={setPreviewStatementDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vista Previa del Statement</DialogTitle>
            </DialogHeader>
            
            {statementPreview && (
              <div className="space-y-6 p-4 bg-white border rounded-lg">
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-emerald-600">STATEMENT</h2>
                    <p className="text-lg font-semibold">{statementPreview.client_name}</p>
                    {statementPreview.client_email && <p className="text-sm text-slate-500">{statementPreview.client_email}</p>}
                  </div>
                  <div className="text-right">
                    {(statementPreview.date_from || statementPreview.date_to) && (
                      <p className="text-sm text-slate-500">
                        Período: {statementPreview.date_from ? moment(statementPreview.date_from).format('DD/MM/YYYY') : 'Inicio'} - {statementPreview.date_to ? moment(statementPreview.date_to).format('DD/MM/YYYY') : 'Actual'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Summary Boxes */}
                {showMoney && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-500 text-white p-4 rounded-lg text-center">
                      <p className="text-sm opacity-90">Total Facturado</p>
                      <p className="text-2xl font-bold">${formatCurrency(statementPreview.total_invoiced)}</p>
                    </div>
                    <div className="bg-green-500 text-white p-4 rounded-lg text-center">
                      <p className="text-sm opacity-90">Total Pagado</p>
                      <p className="text-2xl font-bold">${formatCurrency(statementPreview.total_paid)}</p>
                    </div>
                    <div className={`${statementPreview.balance_due > 0 ? 'bg-red-500' : 'bg-emerald-500'} text-white p-4 rounded-lg text-center`}>
                      <p className="text-sm opacity-90">Balance Pendiente</p>
                      <p className="text-2xl font-bold">${formatCurrency(statementPreview.balance_due)}</p>
                    </div>
                  </div>
                )}

                {/* Invoices Table */}
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">Detalle de Facturas</h3>
                  <table className="w-full border">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-2 text-left text-sm">Factura</th>
                        <th className="p-2 text-left text-sm">Fecha</th>
                        <th className="p-2 text-left text-sm">Vencimiento</th>
                        {showMoney && <th className="p-2 text-right text-sm">Total</th>}
                        {showMoney && <th className="p-2 text-right text-sm">Pagado</th>}
                        {showMoney && <th className="p-2 text-right text-sm">Pendiente</th>}
                        <th className="p-2 text-center text-sm">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementPreview.invoices?.map((inv, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2 text-sm font-medium">{inv.invoice_number}</td>
                          <td className="p-2 text-sm">{moment(inv.invoice_date).format('DD/MM/YYYY')}</td>
                          <td className="p-2 text-sm">{inv.due_date ? moment(inv.due_date).format('DD/MM/YYYY') : '-'}</td>
                          {showMoney && <td className="p-2 text-right text-sm">${formatCurrency(inv.total)}</td>}
                          {showMoney && <td className="p-2 text-right text-sm text-green-600">${formatCurrency(inv.amount_paid)}</td>}
                          {showMoney && <td className="p-2 text-right text-sm font-medium text-red-600">${formatCurrency(inv.balance_due)}</td>}
                          <td className="p-2 text-center">
                            <Badge variant="outline" className={`text-xs ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'partial' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100'}`}>
                              {inv.status === 'paid' ? 'Pagada' : inv.status === 'partial' ? 'Parcial' : 'Pendiente'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Payments Table */}
                {statementPreview.payments && statementPreview.payments.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2">Historial de Pagos</h3>
                    <table className="w-full border">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 text-left text-sm">Fecha</th>
                          <th className="p-2 text-left text-sm">Factura</th>
                          {showMoney && <th className="p-2 text-right text-sm">Monto</th>}
                          <th className="p-2 text-left text-sm">Método</th>
                          <th className="p-2 text-left text-sm">Referencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementPreview.payments.map((p, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 text-sm">{moment(p.payment_date).format('DD/MM/YYYY')}</td>
                            <td className="p-2 text-sm">{p.invoice_number}</td>
                            {showMoney && <td className="p-2 text-right text-sm font-medium text-green-600">${formatCurrency(p.amount)}</td>}
                            <td className="p-2 text-sm">
                              {p.payment_method === 'transfer' ? 'Transferencia' : 
                               p.payment_method === 'card' ? 'Tarjeta' : 
                               p.payment_method === 'cash' ? 'Efectivo' : 
                               p.payment_method === 'check' ? 'Cheque' : p.payment_method}
                            </td>
                            <td className="p-2 text-sm">{p.reference || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Notes */}
                {statementNotes && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-slate-700 mb-2">Notas</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{statementNotes}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewStatementDialogOpen(false)}>
                Cerrar
              </Button>
              <Button onClick={handleCreateStatement} className="bg-emerald-600 hover:bg-emerald-700">
                Crear Statement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewInvoice} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Vista Previa - {previewInvoice?.invoice_number}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { exportToPDF(previewInvoice); }}>
                    <Download className="w-4 h-4 mr-1" /> PDF
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            {previewInvoice && (
              <div className="space-y-6 p-4 bg-white border rounded-lg">
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-blue-600">INVOICE</h2>
                    <p className="text-lg font-semibold">{previewInvoice.invoice_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Fecha: {moment(previewInvoice.created_at).format('DD/MM/YYYY')}</p>
                    {previewInvoice.due_date && <p className="text-sm text-slate-500">Vence: {moment(previewInvoice.due_date).format('DD/MM/YYYY')}</p>}
                    {getStatusBadge(previewInvoice.status)}
                  </div>
                </div>

                {/* Client Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2">Cliente</h3>
                    <p className="font-medium">{previewInvoice.client_name}</p>
                    {previewInvoice.client_email && <p className="text-sm text-slate-500">{previewInvoice.client_email}</p>}
                    {previewInvoice.client_phone && <p className="text-sm text-slate-500">{previewInvoice.client_phone}</p>}
                    {previewInvoice.client_address && (
                      <div className="text-sm text-slate-500 whitespace-pre-line">{previewInvoice.client_address}</div>
                    )}
                    {previewInvoice.tax_id && (
                      <p className="text-sm text-slate-600 font-medium mt-1">Tax ID: {previewInvoice.tax_id}</p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2">Detalles</h3>
                    {previewInvoice.project_name && <p className="font-medium">{previewInvoice.project_name}</p>}
                    {previewInvoice.sponsor_name && <p className="text-sm text-slate-600">Sponsor: {previewInvoice.sponsor_name}</p>}
                  </div>
                </div>

                {/* Items Table - FIRST */}
                {previewInvoice.items && previewInvoice.items.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2">Líneas</h3>
                    <table className="w-full border">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 text-left text-sm">Descripción</th>
                          <th className="p-2 text-right text-sm">Cant.</th>
                          {showMoney && <th className="p-2 text-right text-sm">Precio</th>}
                          {showMoney && <th className="p-2 text-right text-sm">Total</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {previewInvoice.items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 text-sm">{item.description}</td>
                            <td className="p-2 text-right text-sm">{item.hours || item.quantity || 1}</td>
                            {showMoney && <td className="p-2 text-right text-sm">${formatCurrency(item.rate || item.unit_price || 0)}</td>}
                            {showMoney && <td className="p-2 text-right text-sm font-medium">${formatCurrency(item.amount || 0)}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Price Breakdown - AFTER Items, BEFORE Totals */}
                {showMoney && previewInvoice.price_breakdown && (
                  <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <h3 className="font-semibold text-orange-800 mb-3">Price Breakdown</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-orange-500 text-white p-3 rounded">
                        <p className="text-sm">Material/Equipment</p>
                        <p className="text-xl font-bold">${formatCurrency(previewInvoice.price_breakdown.material_equipment || 0)}</p>
                      </div>
                      <div className="bg-orange-400 text-white p-3 rounded">
                        <p className="text-sm">Labor</p>
                        <p className="text-xl font-bold">${formatCurrency(previewInvoice.price_breakdown.labor || 0)}</p>
                      </div>
                      <div className="bg-orange-600 text-white p-3 rounded">
                        <p className="text-sm">Total</p>
                        <p className="text-xl font-bold">${formatCurrency(previewInvoice.price_breakdown.total || 0)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Totals */}
                {showMoney && (
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between"><span>Subtotal:</span><span>${formatCurrency(previewInvoice.price_breakdown?.total || previewInvoice.subtotal || 0)}</span></div>
                      {previewInvoice.tax_amount > 0 && <div className="flex justify-between"><span>Impuestos:</span><span>${formatCurrency(previewInvoice.tax_amount)}</span></div>}
                      <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span>${formatCurrency(previewInvoice.total || 0)}</span></div>
                      {previewInvoice.balance_due > 0 && previewInvoice.status !== 'draft' && (
                        <div className="flex justify-between text-red-600 font-bold"><span>Pendiente:</span><span>${formatCurrency(previewInvoice.balance_due)}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {previewInvoice.notes && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-slate-700 mb-2">Notas</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{previewInvoice.notes}</p>
                  </div>
                )}

                {/* Terms */}
                {previewInvoice.terms && (
                  <div className="border-t pt-4 bg-slate-50 p-4 rounded">
                    <h3 className="font-semibold text-slate-700 mb-2">Términos y Condiciones</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{previewInvoice.terms}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Invoices;
