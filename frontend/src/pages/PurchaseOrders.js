import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { 
  Plus, Trash2, FileText, Download, Send, Copy, Edit, 
  CheckCircle, XCircle, Package, User, Mail, Calendar, Truck, RefreshCw
} from 'lucide-react';
import { fetchCompanyInfo, addCompanyHeader, addCompanyFooter } from '../utils/pdfHelper';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import NomenclatureSelector, { useNomenclature } from '../components/NomenclatureSelector';

const API = process.env.REACT_APP_BACKEND_URL;

const statusLabels = {
  draft: 'Borrador',
  approved: 'Aprobada',
  sent: 'Enviada',
  partially_received: 'Parcialmente Recibida',
  completed: 'Completada',
  cancelled: 'Cancelada'
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  approved: 'bg-blue-100 text-blue-800',
  sent: 'bg-yellow-100 text-yellow-800',
  partially_received: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const PurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [form, setForm] = useState({
    project_id: '',
    supplier_name: '',
    supplier_email: '',
    supplier_phone: '',
    supplier_address: '',
    title: '',
    description: '',
    items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
    tax_rate: 0,
    discount_percent: 0,
    notes: '',
    terms: 'Pago a 30 días después de la entrega.',
    expected_delivery_date: '',
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
      const [posRes, projectsRes] = await Promise.all([
        axios.get(`${API}/api/purchase-orders`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        axios.get(`${API}/api/projects`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } })
      ]);
      setPurchaseOrders(posRes.data || []);
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
      supplier_name: '',
      supplier_email: '',
      supplier_phone: '',
      supplier_address: '',
      title: '',
      description: '',
      items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
      tax_rate: 0,
      discount_percent: 0,
      notes: '',
      terms: 'Pago a 30 días después de la entrega.',
      expected_delivery_date: ''
    });
    setEditingPO(null);
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
    
    if (!form.supplier_name || !form.title || form.items.length === 0) {
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

      if (editingPO) {
        await axios.put(`${API}/api/purchase-orders/${editingPO}`, payload, { withCredentials: true });
        toast.success('Orden actualizada');
      } else {
        await axios.post(`${API}/api/purchase-orders`, payload, { withCredentials: true });
        toast.success('Orden creada');
      }
      
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar orden');
    }
  };

  const handleEdit = (po) => {
    setEditingPO(po.po_id);
    setForm({
      project_id: po.project_id || '',
      supplier_name: po.supplier_name,
      supplier_email: po.supplier_email || '',
      supplier_phone: po.supplier_phone || '',
      supplier_address: po.supplier_address || '',
      title: po.title,
      description: po.description || '',
      items: po.items,
      tax_rate: po.tax_rate,
      discount_percent: po.discount_percent,
      notes: po.notes || '',
      terms: po.terms || '',
      expected_delivery_date: po.expected_delivery_date || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (poId) => {
    if (!window.confirm('¿Eliminar esta orden de compra?')) return;
    
    try {
      await axios.delete(`${API}/api/purchase-orders/${poId}`, { withCredentials: true });
      toast.success('Orden eliminada');
      setPurchaseOrders(prev => prev.filter(po => po.po_id !== poId));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const handleStatusChange = async (poId, newStatus) => {
    try {
      await axios.put(`${API}/api/purchase-orders/${poId}/status?status=${newStatus}`, {}, { withCredentials: true });
      toast.success(`Estado cambiado a ${statusLabels[newStatus]}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar estado');
    }
  };

  const handleSend = async (poId) => {
    try {
      await axios.post(`${API}/api/purchase-orders/${poId}/send`, {}, { withCredentials: true });
      toast.success('Orden enviada');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar');
    }
  };

  const handleDuplicate = async (poId) => {
    try {
      await axios.post(`${API}/api/purchase-orders/${poId}/duplicate`, {}, { withCredentials: true });
      toast.success('Orden duplicada');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al duplicar');
    }
  };

  const exportPDF = async (po) => {
    const doc = new jsPDF();
    const company = await fetchCompanyInfo();
    
    // Encabezado de empresa
    let startY = await addCompanyHeader(doc, company, 15);
    
    // Título del documento
    doc.setFontSize(20);
    doc.setTextColor(34, 197, 94);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDEN DE COMPRA', 105, startY, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(po.po_number, 105, startY + 8, { align: 'center' });
    startY += 18;
    
    // Supplier info (right)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Proveedor:', 120, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(po.supplier_name || '', 120, startY + 6);
    if (po.supplier_email) doc.text(po.supplier_email, 120, startY + 12);
    if (po.supplier_phone) doc.text(po.supplier_phone, 120, startY + 18);
    
    // PO details (left)
    doc.text(`Fecha: ${moment(po.created_at).format('DD/MM/YYYY')}`, 20, startY);
    doc.text(`Entrega esperada: ${po.expected_delivery_date ? moment(po.expected_delivery_date).format('DD/MM/YYYY') : 'N/A'}`, 20, startY + 6);
    doc.text(`Estado: ${statusLabels[po.status]}`, 20, startY + 12);
    if (po.project_name) doc.text(`Proyecto: ${po.project_name}`, 20, startY + 18);
    
    // Title
    startY += 26;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Título: ${po.title}`, 20, startY);
    if (po.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(po.description, 20, startY + 6, { maxWidth: 170 });
      startY += 8;
    }
    
    // Items table
    const tableData = po.items.map(item => [
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
      headStyles: { fillColor: [34, 197, 94] }
    });
    
    // Totals
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Subtotal: $${po.subtotal.toFixed(2)}`, 140, finalY);
    if (po.discount_amount > 0) {
      doc.text(`Descuento (${po.discount_percent}%): -$${po.discount_amount.toFixed(2)}`, 140, finalY + 6);
    }
    if (po.tax_amount > 0) {
      doc.text(`Impuesto (${po.tax_rate}%): $${po.tax_amount.toFixed(2)}`, 140, finalY + 12);
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: $${po.total.toFixed(2)}`, 140, finalY + 22);
    
    // Notes and terms
    if (po.notes || po.terms) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      let notesY = finalY + 35;
      if (po.notes) {
        doc.text('Notas:', 20, notesY);
        doc.text(po.notes, 20, notesY + 6, { maxWidth: 170 });
        notesY += 18;
      }
      if (po.terms) {
        doc.text('Términos y Condiciones:', 20, notesY);
        doc.text(po.terms, 20, notesY + 6, { maxWidth: 170 });
      }
    }
    
    // Pie de página
    addCompanyFooter(doc, company);
    
    doc.save(`${po.po_number}.pdf`);
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Package className="w-12 h-12 animate-pulse text-green-600" />
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
            <h1 className="text-3xl font-bold text-slate-900">Órdenes de Compra</h1>
            <p className="text-slate-600">Gestiona las compras a proveedores</p>
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
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" /> Nueva Orden
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPO ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nomenclatura */}
                <NomenclatureSelector
                  nomenclatures={nomenclatures}
                  selectedNomenclature={selectedNomenclature}
                  generatedNumber={generatedNumber}
                  onSelect={handleSelectNomenclature}
                  label="Nomenclatura de Orden"
                />
                {!selectedNomenclature && (
                  <div className="space-y-2">
                    <Label>Número Manual (opcional)</Label>
                    <Input 
                      value={form.custom_number} 
                      onChange={(e) => setForm({...form, custom_number: e.target.value})} 
                      placeholder="Ej: PO-2025-0150"
                    />
                  </div>
                )}

                {/* Supplier Info */}
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
                    <Label>Nombre del Proveedor *</Label>
                    <Input value={form.supplier_name} onChange={(e) => setForm({...form, supplier_name: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Email del Proveedor</Label>
                    <Input type="email" value={form.supplier_email} onChange={(e) => setForm({...form, supplier_email: e.target.value})} />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input value={form.supplier_phone} onChange={(e) => setForm({...form, supplier_phone: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Dirección</Label>
                    <Input value={form.supplier_address} onChange={(e) => setForm({...form, supplier_address: e.target.value})} />
                  </div>
                </div>

                {/* PO Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Título de la Orden *</Label>
                    <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Fecha de Entrega Esperada</Label>
                    <Input type="date" value={form.expected_delivery_date} onChange={(e) => setForm({...form, expected_delivery_date: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Descripción</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <Label className="mb-2 block">Líneas de la Orden</Label>
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
                  <div className="md:col-span-2 bg-green-50 p-4 rounded-lg">
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
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    {editingPO ? 'Actualizar' : 'Crear'} Orden
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {['draft', 'approved', 'sent', 'partially_received', 'completed', 'cancelled'].map(status => (
            <Card key={status}>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{purchaseOrders.filter(po => po.status === status).length}</div>
                <div className="text-sm text-slate-600">{statusLabels[status]}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* PO List */}
        <div className="space-y-4">
          {purchaseOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-700">No hay órdenes de compra</h3>
                <p className="text-slate-500 mt-2">Crea tu primera orden para comenzar</p>
              </CardContent>
            </Card>
          ) : (
            purchaseOrders.map(po => (
              <Card key={po.po_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{po.po_number}</h3>
                        <Badge className={statusColors[po.status]}>{statusLabels[po.status]}</Badge>
                      </div>
                      <p className="font-medium text-slate-900">{po.title}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1"><User className="w-4 h-4" />{po.supplier_name}</span>
                        {po.supplier_email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{po.supplier_email}</span>}
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{moment(po.created_at).format('DD/MM/YYYY')}</span>
                        {po.expected_delivery_date && <span className="flex items-center gap-1"><Truck className="w-4 h-4" />{moment(po.expected_delivery_date).format('DD/MM/YYYY')}</span>}
                        {po.project_name && <span className="text-green-600">{po.project_name}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">${po.total.toFixed(2)}</div>
                      <div className="flex gap-1 mt-2">
                        <Button variant="ghost" size="sm" onClick={() => exportPDF(po)} title="Descargar PDF">
                          <Download className="w-4 h-4" />
                        </Button>
                        {po.status === 'draft' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(po)} title="Editar">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(po.po_id, 'approved')} title="Aprobar" className="text-blue-600">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {po.status === 'approved' && (
                          <Button variant="ghost" size="sm" onClick={() => handleSend(po.po_id)} title="Enviar" disabled={!po.supplier_email}>
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        {po.status === 'sent' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(po.po_id, 'partially_received')} title="Marcar Parcialmente Recibida" className="text-orange-600">
                              <Package className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(po.po_id, 'completed')} title="Marcar Completada" className="text-green-600">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {po.status === 'partially_received' && (
                          <Button variant="ghost" size="sm" onClick={() => handleStatusChange(po.po_id, 'completed')} title="Marcar Completada" className="text-green-600">
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(po.po_id)} title="Duplicar">
                          <Copy className="w-4 h-4" />
                        </Button>
                        {!['completed', 'cancelled'].includes(po.status) && (
                          <Button variant="ghost" size="sm" onClick={() => handleStatusChange(po.po_id, 'cancelled')} title="Cancelar" className="text-orange-600">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(po.po_id)} title="Eliminar" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Items preview */}
                  {selectedPO === po.po_id && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2">Detalles:</h4>
                      <div className="space-y-1">
                        {po.items.map((item, idx) => (
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
                    className="mt-2 text-green-600"
                    onClick={() => setSelectedPO(selectedPO === po.po_id ? null : po.po_id)}
                  >
                    {selectedPO === po.po_id ? 'Ocultar detalles' : 'Ver detalles'}
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

export default PurchaseOrders;
