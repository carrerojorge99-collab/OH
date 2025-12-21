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
import { Plus, FileText, Download, Eye, Trash2, DollarSign, RefreshCw } from 'lucide-react';
import { fetchCompanyInfo, addDocumentHeader, addPartySection, addTasksTable, addTotalsSection, addNotesSection, addFooter } from '../utils/pdfGenerator';
import { toast } from 'sonner';
import moment from 'moment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import NomenclatureSelector, { useNomenclature } from '../components/NomenclatureSelector';


const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [payments, setPayments] = useState([]);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    project_id: '',
    client_name: '',
    client_email: '',
    tax_rate: 16,
    notes: '',
    custom_number: ''
  });

  // Form for manual invoice creation with tasks
  const [manualForm, setManualForm] = useState({
    project_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
    tax_rate: 0,
    discount_percent: 0,
    notes: '',
    terms: '',
    custom_number: ''
  });

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
        tax_rate: 16,
        notes: '',
        custom_number: ''
      });
      loadData();
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
    const taxAmount = taxableAmount * (parseFloat(manualForm.tax_rate) || 0) / 100;
    const total = taxableAmount + taxAmount;
    return { subtotal, discountAmount, taxAmount, total };
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    
    if (!manualForm.client_name || manualForm.items.length === 0) {
      toast.error('Complete los campos requeridos');
      return;
    }

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
        tax_rate: parseFloat(manualForm.tax_rate) || 0,
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
        items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
        tax_rate: 0,
        discount_percent: 0,
        notes: '',
        terms: '',
        custom_number: ''
      });
      loadData();
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
    
    // Header: Empresa izquierda, Doc derecha
    let y = await addDocumentHeader(doc, company, 'INVOICE', invoice.invoice_number, invoice.created_at, invoice.total || 0);
    
    // Client section debajo de empresa
    y = addPartySection(doc, 'Bill To:', invoice.client_name, '', invoice.client_email, '', y);
    
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
    
    // Due date
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Due: ${moment(invoice.due_date).format('MMM DD, YYYY')}`, 120, y - 4);
    
    // Tasks table
    const tasks = invoice.items.map(item => ({
      description: item.description,
      quantity: item.hours || 1,
      unit_price: item.rate || 0,
      amount: item.amount || 0
    }));
    y = addTasksTable(doc, tasks, y + 4);
    
    // Totals
    y = addTotalsSection(doc, invoice.subtotal || 0, 0, invoice.tax_amount || 0, invoice.total || 0, y);
    
    // Notes
    addNotesSection(doc, invoice.notes, invoice.terms, y);
    
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
            <p className="text-muted-foreground mt-2">Genera facturas automáticamente desde el timesheet</p>
          </div>

          <div className="flex gap-2">
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
                          client_name: project?.client || ''
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
                  <DialogTitle>Crear Factura Manual</DialogTitle>
                  <DialogDescription>
                    Crea una factura con items personalizados (Tasks)
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleManualSubmit} className="space-y-6">
                  {/* Client Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Proyecto (opcional)</Label>
                      <Select value={manualForm.project_id || 'none'} onValueChange={(v) => setManualForm({...manualForm, project_id: v === 'none' ? '' : v})}>
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
                          <Textarea 
                            placeholder="Descripción del task / Scope of Work..." 
                            className="min-h-[80px]"
                            value={item.description}
                            onChange={(e) => handleManualItemChange(idx, 'description', e.target.value)}
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
                                ${(parseFloat(item.amount) || 0).toFixed(2)}
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

                  {/* Totals */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Descuento (%)</Label>
                      <Input type="number" value={manualForm.discount_percent} onChange={(e) => setManualForm({...manualForm, discount_percent: e.target.value})} />
                    </div>
                    <div>
                      <Label>Impuesto (%)</Label>
                      <Input type="number" value={manualForm.tax_rate} onChange={(e) => setManualForm({...manualForm, tax_rate: e.target.value})} />
                    </div>
                    <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg">
                      <div className="flex justify-between text-sm"><span>Subtotal:</span><span>${calculateManualTotals().subtotal.toFixed(2)}</span></div>
                      {calculateManualTotals().discountAmount > 0 && <div className="flex justify-between text-sm text-red-600"><span>Descuento:</span><span>-${calculateManualTotals().discountAmount.toFixed(2)}</span></div>}
                      {calculateManualTotals().taxAmount > 0 && <div className="flex justify-between text-sm"><span>Impuesto:</span><span>${calculateManualTotals().taxAmount.toFixed(2)}</span></div>}
                      <div className="flex justify-between font-bold text-lg border-t mt-2 pt-2"><span>Total:</span><span>${calculateManualTotals().total.toFixed(2)}</span></div>
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
                    <Button type="button" variant="outline" onClick={() => setManualDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      Crear Factura
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
                              <span className="font-bold">${payment.amount.toFixed(2)}</span>
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
        {invoices.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {invoices.map((invoice) => (
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
                        onClick={() => exportToPDF(invoice)}
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>

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
                        onClick={() => handleDeleteInvoice(invoice.invoice_id, invoice.invoice_number)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

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
      </div>
    </Layout>
  );
};

export default Invoices;
