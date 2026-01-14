import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
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
import { Plus, FileText, Download, Eye, Trash2, DollarSign, RefreshCw, Send, User, Calendar, Edit } from 'lucide-react';
import { fetchCompanyInfo, addDocumentHeader, addPartySection, addTasksTable, addTotalsSection, addNotesSection, addFooter, formatCurrency } from '../utils/pdfGenerator';
import { toast } from 'sonner';
import moment from 'moment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import NomenclatureSelector, { useNomenclature } from '../components/NomenclatureSelector';
import RichTextEditor from '../components/ui/RichTextEditor';


const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
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
  const [yearFilter, setYearFilter] = useState('all');
  const [yearInitialized, setYearInitialized] = useState(false);
  const navigate = useNavigate();

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
    if (yearFilter === 'all') return invoices;
    return invoices.filter(inv => {
      const invoiceYear = inv.invoice_date 
        ? new Date(inv.invoice_date).getFullYear()
        : new Date(inv.created_at).getFullYear();
      return invoiceYear === parseInt(yearFilter);
    });
  }, [invoices, yearFilter]);

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
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    sponsor_name: '',
    items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
    tax_rate: 0,
    selected_taxes: [],
    discount_percent: 0,
    notes: '',
    terms: '',
    custom_number: '',
    price_breakdown: null  // {material_equipment, labor, total}
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
      const [invoicesRes, projectsRes] = await Promise.all([
        api.get(`/invoices`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        api.get(`/projects`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } })
      ]);
      setInvoices(invoicesRes.data);
      setProjects(projectsRes.data);
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

  const handleSelectSavedClient = (client, formSetter) => {
    formSetter(prev => ({
      ...prev,
      client_name: client.name,
      client_email: client.email || '',
      client_phone: client.phone || '',
      client_address: client.address || ''
    }));
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
        client_name: '',
        client_email: '',
        client_phone: '',
        client_address: '',
        sponsor_name: '',
        items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
        tax_rate: 0,
        selected_taxes: [],
        discount_percent: 0,
        notes: '',
        terms: '',
        custom_number: '',
        price_breakdown: null
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

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice.invoice_id);
    setManualForm({
      project_id: invoice.project_id || '',
      client_name: invoice.client_name || '',
      client_email: invoice.client_email || '',
      client_phone: invoice.client_phone || '',
      client_address: invoice.client_address || '',
      sponsor_name: invoice.sponsor_name || '',
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
      price_breakdown: invoice.price_breakdown || null
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
    const doc = new jsPDF();
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
    
    // Client section debajo de empresa - include all client info
    y = addPartySection(doc, 'Bill To:', invoice.client_name, invoice.client_address || '', invoice.client_email || '', invoice.client_phone || '', y);
    
    // Project info derecha
    if (invoice.project_name) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text('Project:', 120, y - 16);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(invoice.project_name, 120, y - 10);
    }
    
    // Tasks table FIRST (font size 12)
    const tasks = invoice.items.map(item => ({
      description: item.description,
      quantity: item.hours || 1,
      unit_price: item.rate || 0,
      amount: item.amount || 0
    }));
    y = addTasksTable(doc, tasks, y + 4, 12);
    
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
    
    // Notes on first page (if space)
    if (invoice.notes && y < 240) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Notes:', 15, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      const notesLines = doc.splitTextToSize(invoice.notes, 180);
      doc.text(notesLines, 15, y + 18);
      y += 18 + notesLines.length * 5;
    }
    
    // Terms and Conditions - ALWAYS on second page
    if (invoice.terms) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Terms and Conditions', 105, 30, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const termsLines = doc.splitTextToSize(invoice.terms, 180);
      doc.text(termsLines, 15, 45);
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
                        placeholder="Ej: INV-2025-0150"
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
                  {/* Invoice Number */}
                  <div className="space-y-2">
                    <Label htmlFor="manual_custom_number">Número de Factura *</Label>
                    <Input
                      id="manual_custom_number"
                      value={manualForm.custom_number}
                      onChange={(e) => setManualForm({...manualForm, custom_number: e.target.value})}
                      placeholder="Ej: INV-2025-0150"
                      required
                    />
                    <p className="text-xs text-slate-500">Ingrese el número de factura que desee</p>
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
                      <Label>Cliente Guardado</Label>
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
                    <div className="md:col-span-2">
                      <Label>Dirección</Label>
                      <Input value={manualForm.client_address} onChange={(e) => setManualForm({...manualForm, client_address: e.target.value})} />
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
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Total</Label>
                              <div className="h-9 flex items-center font-mono font-bold text-blue-600">
                                ${formatCurrency(parseFloat(item.amount) || 0)}
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

                  {/* Totals */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Descuento (%)</Label>
                      <Input type="number" value={manualForm.discount_percent} onChange={(e) => setManualForm({...manualForm, discount_percent: e.target.value})} />
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

          {/* Payment Dialog */}
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
        </div>

        {/* Invoices List */}
        {filteredInvoices.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.invoice_id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
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
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Fecha</p>
                          <p className="text-sm font-medium">{moment(invoice.created_at).format('DD/MM/YYYY')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Total</p>
                          <p className="text-lg font-bold font-mono text-blue-600">
                            ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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

                      {(invoice.status === 'sent' || invoice.status === 'partial') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPaymentDialog(invoice)}
                          className="text-green-600"
                        >
                          💵 Registrar Pago
                        </Button>
                      )}

                      {invoice.balance_due > 0 && invoice.status !== 'draft' && (
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
            ))}
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
                    {previewInvoice.client_address && <p className="text-sm text-slate-500">{previewInvoice.client_address}</p>}
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
                          <th className="p-2 text-right text-sm">Precio</th>
                          <th className="p-2 text-right text-sm">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewInvoice.items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 text-sm">{item.description}</td>
                            <td className="p-2 text-right text-sm">{item.hours || item.quantity || 1}</td>
                            <td className="p-2 text-right text-sm">${formatCurrency(item.rate || item.unit_price || 0)}</td>
                            <td className="p-2 text-right text-sm font-medium">${formatCurrency(item.amount || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Price Breakdown - AFTER Items, BEFORE Totals */}
                {previewInvoice.price_breakdown && (
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
