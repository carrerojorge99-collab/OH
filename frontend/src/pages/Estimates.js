import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  FileText, Plus, Trash2, Send, CheckCircle, XCircle, Copy, 
  ArrowRight, DollarSign, Calendar, User, Mail, Phone, MapPin,
  Download, Edit, MoreHorizontal, RefreshCw
} from 'lucide-react';
import { fetchCompanyInfo, addCompanyHeader, addCompanyFooter } from '../utils/pdfHelper';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import NomenclatureSelector, { useNomenclature } from '../components/NomenclatureSelector';

moment.locale('es');

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  converted: 'bg-purple-100 text-purple-700'
};

const statusLabels = {
  draft: 'Borrador',
  sent: 'Enviado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  converted: 'Convertido'
};

const Estimates = () => {
  const [estimates, setEstimates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  
  const [form, setForm] = useState({
    project_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    title: '',
    description: '',
    items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
    tax_rate: 0,
    discount_percent: 0,
    notes: '',
    terms: 'Este estimado es válido por 30 días.',
    valid_until: moment().add(30, 'days').format('YYYY-MM-DD'),
    custom_number: ''
  });

  const { nomenclatures, selectedNomenclature, generatedNumber, handleSelectNomenclature } = useNomenclature(
    (number) => setForm(prev => ({ ...prev, custom_number: number }))
  );

  useEffect(() => {
    loadData();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadData, 30000);
    
    // Refresh cuando la ventana vuelve a estar visible
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
      const [estimatesRes, projectsRes] = await Promise.all([
        axios.get(`${API}/estimates?_t=${Date.now()}`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        axios.get(`${API}/projects?_t=${Date.now()}`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } })
      ]);
      setEstimates(estimatesRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      project_id: '',
      client_name: '',
      client_email: '',
      client_phone: '',
      client_address: '',
      title: '',
      description: '',
      items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
      tax_rate: 0,
      discount_percent: 0,
      notes: '',
      terms: 'Este estimado es válido por 30 días.',
      valid_until: moment().add(30, 'days').format('YYYY-MM-DD')
    });
    setEditingEstimate(null);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = parseFloat(newItems[index].quantity || 0) * parseFloat(newItems[index].unit_price || 0);
    }
    
    setForm({ ...form, items: newItems });
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]
    });
  };

  const removeItem = (index) => {
    if (form.items.length === 1) return;
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  };

  const calculateTotals = () => {
    const subtotal = form.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const discountAmount = subtotal * (parseFloat(form.discount_percent) || 0) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (parseFloat(form.tax_rate) || 0) / 100;
    const total = taxableAmount + taxAmount;
    return { subtotal, discountAmount, taxAmount, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.client_name || !form.title || form.items.length === 0) {
      toast.error('Complete los campos requeridos');
      return;
    }

    try {
      const payload = {
        ...form,
        project_id: form.project_id || null,
        items: form.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.amount) || 0
        })),
        tax_rate: parseFloat(form.tax_rate) || 0,
        discount_percent: parseFloat(form.discount_percent) || 0
      };

      if (editingEstimate) {
        await axios.put(`${API}/estimates/${editingEstimate}`, payload, { withCredentials: true });
        toast.success('Estimado actualizado');
      } else {
        await axios.post(`${API}/estimates`, payload, { withCredentials: true });
        toast.success('Estimado creado');
      }
      
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar estimado');
    }
  };

  const handleEdit = (estimate) => {
    setEditingEstimate(estimate.estimate_id);
    setForm({
      project_id: estimate.project_id || '',
      client_name: estimate.client_name,
      client_email: estimate.client_email || '',
      client_phone: estimate.client_phone || '',
      client_address: estimate.client_address || '',
      title: estimate.title,
      description: estimate.description || '',
      items: estimate.items,
      tax_rate: estimate.tax_rate,
      discount_percent: estimate.discount_percent,
      notes: estimate.notes || '',
      terms: estimate.terms || '',
      valid_until: estimate.valid_until || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (estimateId) => {
    if (!window.confirm('¿Eliminar este estimado?')) return;
    
    try {
      await axios.delete(`${API}/estimates/${estimateId}`, { withCredentials: true });
      toast.success('Estimado eliminado');
      // Actualizar estado local inmediatamente para reflejar el cambio
      setEstimates(prev => prev.filter(e => e.estimate_id !== estimateId));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const handleStatusChange = async (estimateId, newStatus) => {
    try {
      await axios.put(`${API}/estimates/${estimateId}/status?status=${newStatus}`, {}, { withCredentials: true });
      toast.success(`Estado cambiado a ${statusLabels[newStatus]}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar estado');
    }
  };

  const handleSend = async (estimateId) => {
    try {
      await axios.post(`${API}/estimates/${estimateId}/send`, {}, { withCredentials: true });
      toast.success('Estimado enviado');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar');
    }
  };

  const handleDuplicate = async (estimateId) => {
    try {
      await axios.post(`${API}/estimates/${estimateId}/duplicate`, {}, { withCredentials: true });
      toast.success('Estimado duplicado');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al duplicar');
    }
  };

  const handleConvert = async (estimateId) => {
    if (!window.confirm('¿Convertir este estimado a factura?')) return;
    
    try {
      const res = await axios.post(`${API}/estimates/${estimateId}/convert`, {}, { withCredentials: true });
      toast.success(`Factura ${res.data.invoice_number} creada`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al convertir');
    }
  };

  const exportPDF = async (estimate) => {
    const doc = new jsPDF();
    const company = await fetchCompanyInfo();
    
    // Encabezado de empresa
    let startY = await addCompanyHeader(doc, company, 15);
    
    // Título del documento
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTIMADO', 105, startY, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(estimate.estimate_number, 105, startY + 8, { align: 'center' });
    startY += 18;
    
    // Client info (right)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', 120, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(estimate.client_name || '', 120, startY + 6);
    if (estimate.client_email) doc.text(estimate.client_email, 120, startY + 12);
    if (estimate.client_phone) doc.text(estimate.client_phone, 120, startY + 18);
    
    // Estimate details (left)
    doc.text(`Fecha: ${moment(estimate.created_at).format('DD/MM/YYYY')}`, 20, startY);
    doc.text(`Válido hasta: ${estimate.valid_until ? moment(estimate.valid_until).format('DD/MM/YYYY') : 'N/A'}`, 20, startY + 6);
    doc.text(`Estado: ${statusLabels[estimate.status]}`, 20, startY + 12);
    
    // Title
    startY += 26;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Título: ${estimate.title}`, 20, startY);
    if (estimate.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(estimate.description, 20, startY + 6, { maxWidth: 170 });
      startY += 8;
    }
    
    // Items table
    const tableData = estimate.items.map(item => [
      item.description,
      item.quantity.toString(),
      `$${item.unit_price.toFixed(2)}`,
      `$${item.amount.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: startY + 8,
      head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Totals
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Subtotal: $${estimate.subtotal.toFixed(2)}`, 140, finalY);
    if (estimate.discount_amount > 0) {
      doc.text(`Descuento (${estimate.discount_percent}%): -$${estimate.discount_amount.toFixed(2)}`, 140, finalY + 6);
    }
    if (estimate.tax_amount > 0) {
      doc.text(`Impuesto (${estimate.tax_rate}%): $${estimate.tax_amount.toFixed(2)}`, 140, finalY + 12);
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: $${estimate.total.toFixed(2)}`, 140, finalY + 22);
    
    // Notes and terms
    if (estimate.notes || estimate.terms) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      let notesY = finalY + 35;
      if (estimate.notes) {
        doc.text('Notas:', 20, notesY);
        doc.text(estimate.notes, 20, notesY + 6, { maxWidth: 170 });
        notesY += 18;
      }
      if (estimate.terms) {
        doc.text('Términos y Condiciones:', 20, notesY);
        doc.text(estimate.terms, 20, notesY + 6, { maxWidth: 170 });
      }
    }
    
    // Pie de página
    addCompanyFooter(doc, company);
    
    doc.save(`${estimate.estimate_number}.pdf`);
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <FileText className="w-12 h-12 animate-pulse text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Estimados</h1>
            <p className="text-slate-600">Crea y gestiona cotizaciones para tus clientes</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setLoading(true); loadData(); }}
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Nuevo Estimado
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEstimate ? 'Editar Estimado' : 'Nuevo Estimado'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Número personalizado */}
                <div className="space-y-2">
                  <Label>Número de Estimado (opcional)</Label>
                  <Input 
                    value={form.custom_number} 
                    onChange={(e) => setForm({...form, custom_number: e.target.value})} 
                    placeholder="Ej: EST-2025-0150 (dejar vacío para auto-generar)"
                  />
                  <p className="text-xs text-slate-500">Si lo deja vacío, se generará automáticamente</p>
                </div>

                {/* Client Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Proyecto (opcional)</Label>
                    <Select value={form.project_id || 'none'} onValueChange={(v) => setForm({...form, project_id: v === 'none' ? '' : v})}>
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
                    <Input value={form.client_name} onChange={(e) => setForm({...form, client_name: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Email del Cliente</Label>
                    <Input type="email" value={form.client_email} onChange={(e) => setForm({...form, client_email: e.target.value})} />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input value={form.client_phone} onChange={(e) => setForm({...form, client_phone: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Dirección</Label>
                    <Input value={form.client_address} onChange={(e) => setForm({...form, client_address: e.target.value})} />
                  </div>
                </div>

                {/* Estimate Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Título del Estimado *</Label>
                    <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Válido Hasta</Label>
                    <Input type="date" value={form.valid_until} onChange={(e) => setForm({...form, valid_until: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Descripción</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <Label className="mb-2 block">Líneas del Estimado</Label>
                  <div className="space-y-2">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <Input 
                          placeholder="Descripción" 
                          className="col-span-5"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        />
                        <Input 
                          type="number" 
                          placeholder="Cant."
                          className="col-span-2"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        />
                        <Input 
                          type="number" 
                          placeholder="Precio"
                          className="col-span-2"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                        />
                        <div className="col-span-2 text-right font-mono">
                          ${(parseFloat(item.amount) || 0).toFixed(2)}
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="col-span-1">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-2">
                    <Plus className="w-4 h-4 mr-1" /> Agregar Línea
                  </Button>
                </div>

                {/* Totals */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Descuento (%)</Label>
                    <Input type="number" value={form.discount_percent} onChange={(e) => setForm({...form, discount_percent: e.target.value})} />
                  </div>
                  <div>
                    <Label>Impuesto (%)</Label>
                    <Input type="number" value={form.tax_rate} onChange={(e) => setForm({...form, tax_rate: e.target.value})} />
                  </div>
                  <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm"><span>Subtotal:</span><span>${totals.subtotal.toFixed(2)}</span></div>
                    {totals.discountAmount > 0 && <div className="flex justify-between text-sm text-red-600"><span>Descuento:</span><span>-${totals.discountAmount.toFixed(2)}</span></div>}
                    {totals.taxAmount > 0 && <div className="flex justify-between text-sm"><span>Impuesto:</span><span>${totals.taxAmount.toFixed(2)}</span></div>}
                    <div className="flex justify-between font-bold text-lg border-t mt-2 pt-2"><span>Total:</span><span>${totals.total.toFixed(2)}</span></div>
                  </div>
                </div>

                {/* Notes & Terms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Notas</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} />
                  </div>
                  <div>
                    <Label>Términos y Condiciones</Label>
                    <Textarea value={form.terms} onChange={(e) => setForm({...form, terms: e.target.value})} rows={3} />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingEstimate ? 'Actualizar' : 'Crear'} Estimado
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['draft', 'sent', 'approved', 'rejected', 'converted'].map(status => (
            <Card key={status}>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{estimates.filter(e => e.status === status).length}</div>
                <div className="text-sm text-slate-600">{statusLabels[status]}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Estimates List */}
        <div className="space-y-4">
          {estimates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-700">No hay estimados</h3>
                <p className="text-slate-500 mt-2">Crea tu primer estimado para comenzar</p>
              </CardContent>
            </Card>
          ) : (
            estimates.map(estimate => (
              <Card key={estimate.estimate_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{estimate.estimate_number}</h3>
                        <Badge className={statusColors[estimate.status]}>{statusLabels[estimate.status]}</Badge>
                      </div>
                      <p className="font-medium text-slate-900">{estimate.title}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1"><User className="w-4 h-4" />{estimate.client_name}</span>
                        {estimate.client_email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{estimate.client_email}</span>}
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{moment(estimate.created_at).format('DD/MM/YYYY')}</span>
                        {estimate.project_name && <span className="text-blue-600">{estimate.project_name}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">${estimate.total.toFixed(2)}</div>
                      <div className="flex gap-1 mt-2">
                        <Button variant="ghost" size="sm" onClick={() => exportPDF(estimate)} title="Descargar PDF">
                          <Download className="w-4 h-4" />
                        </Button>
                        {estimate.status === 'draft' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(estimate)} title="Editar">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleSend(estimate.estimate_id)} title="Enviar" disabled={!estimate.client_email}>
                              <Send className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {estimate.status === 'sent' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(estimate.estimate_id, 'approved')} title="Aprobar" className="text-green-600">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(estimate.estimate_id, 'rejected')} title="Rechazar" className="text-red-600">
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {estimate.status === 'approved' && (
                          <Button variant="ghost" size="sm" onClick={() => handleConvert(estimate.estimate_id)} title="Convertir a Factura" className="text-purple-600">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(estimate.estimate_id)} title="Duplicar">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(estimate.estimate_id)} title="Eliminar" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Items preview on click */}
                  {selectedEstimate === estimate.estimate_id && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2">Detalles:</h4>
                      <div className="space-y-1">
                        {estimate.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.description}</span>
                            <span className="font-mono">{item.quantity} x ${item.unit_price} = ${item.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-blue-600"
                    onClick={() => setSelectedEstimate(selectedEstimate === estimate.estimate_id ? null : estimate.estimate_id)}
                  >
                    {selectedEstimate === estimate.estimate_id ? 'Ocultar detalles' : 'Ver detalles'}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Estimates;
