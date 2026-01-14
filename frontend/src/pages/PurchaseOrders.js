import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
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
import { 
  fetchCompanyInfo, 
  addDocumentHeader, 
  addPartySection, 
  addTasksTable, 
  addTotalsSection, 
  addNotesSection, 
  addFooter 
} from '../utils/pdfGenerator';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import NomenclatureSelector, { useNomenclature } from '../components/NomenclatureSelector';
import RichTextEditor from '../components/ui/RichTextEditor';


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
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  // Start with 'all' and update to current year if data exists
  const [yearFilter, setYearFilter] = useState('all');
  const [yearInitialized, setYearInitialized] = useState(false);

  // Generate available years from purchase orders
  const availableYears = useMemo(() => {
    const years = new Set();
    purchaseOrders.forEach(po => {
      if (po.created_at) {
        years.add(new Date(po.created_at).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [purchaseOrders]);

  // Filter purchase orders by year
  const filteredPurchaseOrders = useMemo(() => {
    if (yearFilter === 'all') return purchaseOrders;
    return purchaseOrders.filter(po => {
      const year = po.created_at ? new Date(po.created_at).getFullYear() : new Date().getFullYear();
      return year === parseInt(yearFilter);
    });
  }, [purchaseOrders, yearFilter]);

  // Auto-set year filter to current year if available
  useEffect(() => {
    if (!yearInitialized && purchaseOrders.length > 0) {
      const currentYear = new Date().getFullYear();
      if (availableYears.includes(currentYear)) {
        setYearFilter(currentYear.toString());
      }
      setYearInitialized(true);
    }
  }, [purchaseOrders, availableYears, yearInitialized]);

  const [form, setForm] = useState({
    project_id: '',
    selected_vendor_id: '',
    supplier_name: '',
    supplier_email: '',
    supplier_phone: '',
    supplier_address: '',
    title: '',
    description: '',
    items: [{ description: '', scope: '', quantity: 1, unit_price: 0, amount: 0 }],
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
      const [posRes, projectsRes, vendorsRes] = await Promise.all([
        api.get(`/purchase-orders`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        api.get(`/projects`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        api.get(`/vendors`, { withCredentials: true }).catch(() => ({ data: [] }))
      ]);
      setPurchaseOrders(posRes.data || []);
      setProjects(projectsRes.data || []);
      setVendors(vendorsRes.data || []);
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
      items: [{ description: '', scope: '', quantity: 1, unit_price: 0, amount: 0 }],
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
      items: [...form.items, { description: '', scope: '', quantity: 1, unit_price: 0, amount: 0 }]
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
        await api.put(`/purchase-orders/${editingPO}`, payload, { withCredentials: true });
        toast.success('Orden actualizada');
      } else {
        await api.post(`/purchase-orders`, payload, { withCredentials: true });
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
      expected_delivery_date: po.expected_delivery_date || '',
      custom_number: po.po_number || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (poId) => {
    if (!window.confirm('¿Eliminar esta orden de compra?')) return;
    
    try {
      await api.delete(`/purchase-orders/${poId}`, { withCredentials: true });
      toast.success('Orden eliminada');
      setPurchaseOrders(prev => prev.filter(po => po.po_id !== poId));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const handleStatusChange = async (poId, newStatus) => {
    try {
      await api.put(`/purchase-orders/${poId}/status?status=${newStatus}`, {}, { withCredentials: true });
      toast.success(`Estado cambiado a ${statusLabels[newStatus]}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar estado');
    }
  };

  const handleSend = async (poId) => {
    try {
      // Find the PO to generate PDF
      const po = purchaseOrders.find(p => p.po_id === poId);
      if (!po) {
        toast.error('Orden no encontrada');
        return;
      }
      
      // Generate PDF
      const doc = new jsPDF();
      const company = await fetchCompanyInfo();
      
      // Header: Empresa arriba izquierda, Doc info derecha
      let y = await addDocumentHeader(doc, company, 'PURCHASE ORDER', po.po_number, po.created_at, po.total);
      
      // Vendor section - abajo de la empresa
      y = addPartySection(doc, 'Vendor To:', po.supplier_name, po.supplier_address || '', po.supplier_email, po.supplier_phone, y);
      
      // Project info (derecha)
      if (po.project_name) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(249, 115, 22);
        doc.text('Project:', 120, y - 16);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(po.project_name, 120, y - 10);
      }
      
      // Tasks table con espacio para descripción
      const tasks = po.items.map(item => ({
        description: item.description,
        scope: item.scope || '',
        details: item.details || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount
      }));
      y = addTasksTable(doc, tasks, y + 4);
      
      // Totals
      y = addTotalsSection(doc, po.subtotal, po.discount_amount || 0, po.tax_amount || 0, po.total, y);
      
      // Notes
      addNotesSection(doc, po.notes, po.terms, y);
      
      // Footer
      addFooter(doc, company);
      
      // Get PDF as base64
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      // Send with PDF attachment
      await api.post(`/purchase-orders/${poId}/send`, { pdf_base64: pdfBase64 }, { withCredentials: true });
      toast.success('Orden enviada con PDF adjunto');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar');
    }
  };

  const handleDuplicate = async (poId) => {
    try {
      await api.post(`/purchase-orders/${poId}/duplicate`, {}, { withCredentials: true });
      toast.success('Orden duplicada');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al duplicar');
    }
  };

  const exportPDF = async (po) => {
    const doc = new jsPDF();
    const company = await fetchCompanyInfo();
    
    // Header: Empresa arriba izquierda, Doc info derecha
    let y = await addDocumentHeader(doc, company, 'PURCHASE ORDER', po.po_number, po.created_at, po.total);
    
    // Vendor section - abajo de la empresa
    y = addPartySection(doc, 'Vendor To:', po.supplier_name, po.supplier_address || '', po.supplier_email, po.supplier_phone, y);
    
    // Project info (derecha)
    if (po.project_name) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text('Project:', 120, y - 16);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(po.project_name, 120, y - 10);
    }
    
    // Tasks table con espacio para descripción
    const tasks = po.items.map(item => ({
      description: item.description,
      scope: item.scope || '',
      details: item.details || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.amount
    }));
    y = addTasksTable(doc, tasks, y + 4);
    
    // Totals
    y = addTotalsSection(doc, po.subtotal, po.discount_amount || 0, po.tax_amount || 0, po.total, y);
    
    // Notes
    addNotesSection(doc, po.notes, po.terms, y);
    
    // Footer
    addFooter(doc, company);
    
    doc.save(`PO_${po.po_number}.pdf`);
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
            <p className="text-slate-600">
              Gestiona las compras a proveedores
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
                <div className="space-y-2">
                  <Label>Número de PO {selectedNomenclature ? '(editable)' : '(manual)'}</Label>
                  <Input 
                    value={form.custom_number} 
                    onChange={(e) => setForm({...form, custom_number: e.target.value})} 
                    placeholder="Ej: PO-2025-0150"
                  />
                  <p className="text-xs text-slate-500">
                    {selectedNomenclature 
                      ? 'Número generado automáticamente. Puede editarlo si lo desea.' 
                      : 'Ingrese un número personalizado o se generará automáticamente.'}
                  </p>
                </div>

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
                      <div key={idx} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600">Task #{idx + 1}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <RichTextEditor 
                          placeholder="Descripción del task / Scope of Work..." 
                          value={item.description}
                          onChange={(value) => handleItemChange(idx, 'description', value)}
                          minHeight="100px"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Cantidad</Label>
                            <Input 
                              type="number" 
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Precio Unit.</Label>
                            <Input 
                              type="number" 
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Total</Label>
                            <div className="h-9 flex items-center font-mono font-bold text-orange-600">
                              ${(parseFloat(item.amount) || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" onClick={addItem} className="mt-2 w-full">
                    <Plus className="w-4 h-4 mr-1" /> Agregar Task
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
            filteredPurchaseOrders.map(po => (
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
