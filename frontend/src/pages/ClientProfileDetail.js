import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getBackendUrl } from '../utils/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import moment from 'moment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchCompanyInfo, addDocumentHeader, addPartySection, addTasksTable, addTotalsSection, addNotesSection, addFooter } from '../utils/pdfGenerator';
import { 
  Building2, Upload, Download, Trash2, FileText, ArrowLeft, Save, 
  Plus, Mail, Phone, MapPin, DollarSign, Calendar, Eye, Edit, X
} from 'lucide-react';

const documentCategories = [
  { value: 'contract', label: 'Contrato' },
  { value: 'proposal', label: 'Propuesta' },
  { value: 'quote', label: 'Cotización' },
  { value: 'purchase_order', label: 'Orden de Compra' },
  { value: 'insurance', label: 'Seguro' },
  { value: 'tax', label: 'Documento Fiscal' },
  { value: 'other', label: 'Otro' }
];

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

const ClientProfileDetail = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [estimates, setEstimates] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ document_type: '', file: null });
  const [activeTab, setActiveTab] = useState('info');
  
  // Estimate form state
  const [estimateDialogOpen, setEstimateDialogOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [taxTypes, setTaxTypes] = useState([]);
  const [estimateForm, setEstimateForm] = useState({
    title: '',
    description: '',
    items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
    selected_taxes: [],
    discount_percent: 0,
    notes: '',
    terms: 'Este estimado es válido por 30 días.',
    valid_until: moment().add(30, 'days').format('YYYY-MM-DD'),
    custom_number: ''
  });

  useEffect(() => {
    loadData();
  }, [profileId]);

  const loadData = async () => {
    try {
      const [clientRes, estimatesRes, docsRes, taxRes] = await Promise.all([
        api.get(`/client-profiles/${profileId}`),
        api.get(`/client-profiles/${profileId}/estimates`),
        api.get(`/client-profiles/${profileId}/documents`),
        api.get('/tax-types').catch(() => ({ data: [] }))
      ]);
      setClient(clientRes.data);
      setEstimates(estimatesRes.data || []);
      setDocuments(docsRes.data || []);
      setTaxTypes(taxRes.data || []);
    } catch (error) {
      toast.error('Error al cargar datos del cliente');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/client-profiles/${profileId}`, client);
      toast.success('Cliente actualizado');
    } catch (error) {
      toast.error('Error al guardar');
    }
    setSaving(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.document_type) {
      toast.error('Selecciona tipo y archivo');
      return;
    }
    const formData = new FormData();
    formData.append('file', uploadForm.file);
    try {
      await api.post(`/client-profiles/${profileId}/documents?document_type=${uploadForm.document_type}`, formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      toast.success('Documento subido');
      setUploadOpen(false);
      setUploadForm({ document_type: '', file: null });
      loadData();
    } catch (error) {
      toast.error('Error al subir documento');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    try {
      await api.delete(`/client-profiles/${profileId}/documents/${docId}`);
      toast.success('Documento eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  // Estimate functions
  const resetEstimateForm = () => {
    setEstimateForm({
      title: '',
      description: '',
      items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
      selected_taxes: [],
      discount_percent: 0,
      notes: '',
      terms: 'Este estimado es válido por 30 días.',
      valid_until: moment().add(30, 'days').format('YYYY-MM-DD'),
      custom_number: ''
    });
    setEditingEstimate(null);
  };

  const openNewEstimate = () => {
    resetEstimateForm();
    setEstimateDialogOpen(true);
  };

  const openEditEstimate = (estimate) => {
    setEstimateForm({
      title: estimate.title || '',
      description: estimate.description || '',
      items: estimate.items || [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
      selected_taxes: estimate.selected_taxes || [],
      discount_percent: estimate.discount_percent || 0,
      notes: estimate.notes || '',
      terms: estimate.terms || '',
      valid_until: estimate.valid_until || '',
      custom_number: estimate.estimate_number || ''
    });
    setEditingEstimate(estimate.estimate_id);
    setEstimateDialogOpen(true);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...estimateForm.items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = (parseFloat(newItems[index].quantity) || 0) * (parseFloat(newItems[index].unit_price) || 0);
    }
    setEstimateForm({ ...estimateForm, items: newItems });
  };

  const addItem = () => {
    setEstimateForm({
      ...estimateForm,
      items: [...estimateForm.items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]
    });
  };

  const removeItem = (index) => {
    if (estimateForm.items.length > 1) {
      const newItems = estimateForm.items.filter((_, i) => i !== index);
      setEstimateForm({ ...estimateForm, items: newItems });
    }
  };

  const toggleTax = (tax) => {
    const exists = estimateForm.selected_taxes.find(t => t.name === tax.name);
    if (exists) {
      setEstimateForm({
        ...estimateForm,
        selected_taxes: estimateForm.selected_taxes.filter(t => t.name !== tax.name)
      });
    } else {
      setEstimateForm({
        ...estimateForm,
        selected_taxes: [...estimateForm.selected_taxes, { name: tax.name, percentage: tax.percentage }]
      });
    }
  };

  const calculateEstimateTotals = () => {
    const subtotal = estimateForm.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const discountAmount = subtotal * (parseFloat(estimateForm.discount_percent) || 0) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = estimateForm.selected_taxes.reduce((sum, t) => sum + (taxableAmount * t.percentage / 100), 0);
    const total = taxableAmount + taxAmount;
    return { subtotal, discountAmount, taxAmount, total };
  };

  const handleEstimateSubmit = async (e) => {
    e.preventDefault();
    
    if (!estimateForm.title || estimateForm.items.length === 0) {
      toast.error('Complete los campos requeridos');
      return;
    }

    const totalTaxRate = estimateForm.selected_taxes.reduce((sum, t) => sum + (t.percentage || 0), 0);

    try {
      const payload = {
        client_profile_id: profileId,
        client_company: client.company_name || '',
        client_name: client.contact_name || '',
        client_email: client.email || '',
        client_phone: client.phone || '',
        client_address: client.address || '',
        title: estimateForm.title,
        description: estimateForm.description,
        items: estimateForm.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.amount) || 0
        })),
        tax_rate: totalTaxRate,
        selected_taxes: estimateForm.selected_taxes,
        discount_percent: parseFloat(estimateForm.discount_percent) || 0,
        notes: estimateForm.notes,
        terms: estimateForm.terms,
        valid_until: estimateForm.valid_until,
        custom_number: estimateForm.custom_number
      };

      if (editingEstimate) {
        await api.put(`/estimates/${editingEstimate}`, payload, { withCredentials: true });
        toast.success('Estimado actualizado');
      } else {
        await api.post(`/estimates`, payload, { withCredentials: true });
        toast.success('Estimado creado');
      }
      
      setEstimateDialogOpen(false);
      resetEstimateForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar estimado');
    }
  };

  const exportPDF = async (estimate) => {
    try {
      const doc = new jsPDF();
      const company = await fetchCompanyInfo();
      
      let y = await addDocumentHeader(doc, company, 'ESTIMATE', estimate.estimate_number, estimate.created_at, estimate.total);
      
      const clientDisplayName = estimate.client_company 
        ? `${estimate.client_company}\nAttn: ${estimate.client_name}`
        : estimate.client_name;
      y = addPartySection(doc, 'Bill To:', clientDisplayName, estimate.client_address || '', estimate.client_email, estimate.client_phone, y);
      
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Valid Until: ${estimate.valid_until ? moment(estimate.valid_until).format('MMM DD, YYYY') : 'N/A'}`, 120, y - 10);
      
      if (estimate.title) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(estimate.title, 15, y);
        y += 6;
      }
      
      if (estimate.description) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const descLines = doc.splitTextToSize(estimate.description, 170);
        doc.text(descLines, 15, y);
        y += descLines.length * 4 + 4;
      }
      
      y = addTasksTable(doc, estimate.items, y + 4);
      
      let taxDetails = null;
      if (estimate.selected_taxes && estimate.selected_taxes.length > 0) {
        const taxableAmount = estimate.subtotal - (estimate.discount_amount || 0);
        taxDetails = estimate.selected_taxes.map(t => ({
          name: t.name,
          percentage: t.percentage,
          amount: taxableAmount * t.percentage / 100
        }));
      }
      y = addTotalsSection(doc, estimate.subtotal, estimate.discount_amount || 0, estimate.tax_amount || 0, estimate.total, y, taxDetails);
      
      addNotesSection(doc, estimate.notes, estimate.terms, y);
      addFooter(doc, company);
      
      doc.save(`Estimate_${estimate.estimate_number}.pdf`);
      toast.success('PDF descargado');
    } catch (error) {
      console.error('PDF Error:', error);
      toast.error('Error al generar PDF');
    }
  };

  const handleDeleteEstimate = async (estimateId) => {
    if (!window.confirm('¿Eliminar este estimado?')) return;
    try {
      await api.delete(`/estimates/${estimateId}`);
      toast.success('Estimado eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  // Calculate stats
  const totalEstimates = estimates.length;
  const totalValue = estimates.reduce((sum, e) => sum + (e.total || 0), 0);
  const approvedEstimates = estimates.filter(e => e.status === 'approved').length;
  const estimateTotals = calculateEstimateTotals();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Cliente no encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/estimados')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Estimados
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/estimados')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{client.company_name || 'Sin nombre'}</h1>
              <p className="text-slate-500">{client.contact_name || 'Sin contacto asignado'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={openNewEstimate} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Estimado
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalEstimates}</p>
                  <p className="text-xs text-slate-500">Estimados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalValue.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-slate-500">Valor Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedEstimates}</p>
                  <p className="text-xs text-slate-500">Aprobados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{documents.length}</p>
                  <p className="text-xs text-slate-500">Documentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="estimates">Estimados</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" /> Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre de Empresa</Label>
                    <Input 
                      value={client.company_name || ''} 
                      onChange={(e) => setClient({...client, company_name: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Persona de Contacto</Label>
                    <Input 
                      value={client.contact_name || ''} 
                      onChange={(e) => setClient({...client, contact_name: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={client.email || ''} 
                      onChange={(e) => setClient({...client, email: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input 
                      value={client.phone || ''} 
                      onChange={(e) => setClient({...client, phone: e.target.value})} 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Dirección</Label>
                    <Input 
                      value={client.address || ''} 
                      onChange={(e) => setClient({...client, address: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Tax ID / EIN</Label>
                    <Input 
                      value={client.tax_id || ''} 
                      onChange={(e) => setClient({...client, tax_id: e.target.value})} 
                    />
                  </div>
                </div>
                <div>
                  <Label>Notas</Label>
                  <Textarea 
                    value={client.notes || ''} 
                    onChange={(e) => setClient({...client, notes: e.target.value})} 
                    className="min-h-[100px]"
                    placeholder="Notas adicionales sobre el cliente..."
                  />
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estimates Tab */}
          <TabsContent value="estimates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Estimados del Cliente
                  </CardTitle>
                  <Button onClick={openNewEstimate} size="sm" className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Estimado
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {estimates.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">No hay estimados para este cliente</p>
                    <Button onClick={openNewEstimate} variant="outline" className="mt-4">
                      <Plus className="w-4 h-4 mr-2" /> Crear Primer Estimado
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {estimates.map(estimate => (
                      <div 
                        key={estimate.estimate_id} 
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border">
                            <FileText className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="font-medium">{estimate.estimate_number}</p>
                            <p className="text-sm text-slate-500">{estimate.title || 'Sin título'}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {moment(estimate.created_at).format('DD/MM/YYYY')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-lg">${(estimate.total || 0).toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                            <Badge className={statusColors[estimate.status]}>
                              {statusLabels[estimate.status] || estimate.status}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => exportPDF(estimate)} title="Descargar PDF">
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditEstimate(estimate)} title="Editar">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteEstimate(estimate.estimate_id)} title="Eliminar">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" /> Documentos del Cliente
                  </CardTitle>
                  <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                        <Upload className="w-4 h-4 mr-2" /> Subir Documento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Subir Documento</DialogTitle></DialogHeader>
                      <form onSubmit={handleUpload} className="space-y-4">
                        <div>
                          <Label>Categoría</Label>
                          <Select value={uploadForm.document_type} onValueChange={(v) => setUploadForm({...uploadForm, document_type: v})}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                            <SelectContent>
                              {documentCategories.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Archivo</Label>
                          <Input type="file" onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})} />
                        </div>
                        <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">Subir</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">No hay documentos</p>
                    <p className="text-sm text-slate-400">Sube contratos, propuestas y otros documentos del cliente</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div key={doc.document_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-orange-500" />
                          <div>
                            <p className="font-medium text-sm">{doc.filename}</p>
                            <p className="text-xs text-slate-500">
                              {documentCategories.find(t => t.value === doc.document_type)?.label || doc.document_type} 
                              {' • '}
                              {moment(doc.uploaded_at).format('DD/MM/YY')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.open(`${getBackendUrl()}/api/client-profiles/${profileId}/documents/${doc.document_id}/download`, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteDocument(doc.document_id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Estimate Creation/Edit Dialog */}
        <Dialog open={estimateDialogOpen} onOpenChange={setEstimateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEstimate ? 'Editar Estimado' : 'Nuevo Estimado'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEstimateSubmit} className="space-y-6">
              {/* Client Info (readonly) */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-600 mb-2">Cliente</p>
                <p className="font-semibold">{client.company_name || client.contact_name}</p>
                <p className="text-sm text-slate-500">{client.email} • {client.phone}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Título del Estimado *</Label>
                  <Input 
                    value={estimateForm.title} 
                    onChange={(e) => setEstimateForm({...estimateForm, title: e.target.value})}
                    placeholder="Ej: Propuesta de servicios"
                    required
                  />
                </div>
                <div>
                  <Label>Válido hasta</Label>
                  <Input 
                    type="date"
                    value={estimateForm.valid_until} 
                    onChange={(e) => setEstimateForm({...estimateForm, valid_until: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Descripción</Label>
                <Textarea 
                  value={estimateForm.description} 
                  onChange={(e) => setEstimateForm({...estimateForm, description: e.target.value})}
                  placeholder="Descripción del trabajo..."
                  className="min-h-[60px]"
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Ítems</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-4 h-4 mr-1" /> Añadir
                  </Button>
                </div>
                <div className="space-y-2">
                  {estimateForm.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 bg-slate-50 rounded">
                      <div className="col-span-5">
                        <Input 
                          placeholder="Descripción"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input 
                          type="number"
                          placeholder="Cant."
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="Precio"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 text-right font-medium">
                        ${(parseFloat(item.amount) || 0).toFixed(2)}
                      </div>
                      <div className="col-span-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} disabled={estimateForm.items.length === 1}>
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Taxes */}
              {taxTypes.length > 0 && (
                <div>
                  <Label>Impuestos</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {taxTypes.map(tax => (
                      <Badge 
                        key={tax.name}
                        variant={estimateForm.selected_taxes.find(t => t.name === tax.name) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTax(tax)}
                      >
                        {tax.name} ({tax.percentage}%)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Descuento (%)</Label>
                  <Input 
                    type="number"
                    step="0.1"
                    value={estimateForm.discount_percent} 
                    onChange={(e) => setEstimateForm({...estimateForm, discount_percent: e.target.value})}
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="p-4 bg-orange-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${estimateTotals.subtotal.toFixed(2)}</span>
                </div>
                {estimateTotals.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuento:</span>
                    <span>-${estimateTotals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {estimateTotals.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Impuestos:</span>
                    <span>${estimateTotals.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${estimateTotals.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Notas</Label>
                  <Textarea 
                    value={estimateForm.notes} 
                    onChange={(e) => setEstimateForm({...estimateForm, notes: e.target.value})}
                    placeholder="Notas adicionales..."
                    className="min-h-[80px]"
                  />
                </div>
                <div>
                  <Label>Términos y Condiciones</Label>
                  <Textarea 
                    value={estimateForm.terms} 
                    onChange={(e) => setEstimateForm({...estimateForm, terms: e.target.value})}
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEstimateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                  {editingEstimate ? 'Actualizar' : 'Crear'} Estimado
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ClientProfileDetail;
