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
import { 
  Building2, Upload, Download, Trash2, FileText, ArrowLeft, Save, 
  Plus, Mail, Phone, MapPin, DollarSign, Calendar, Eye, Edit
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

  useEffect(() => {
    loadData();
  }, [profileId]);

  const loadData = async () => {
    try {
      const [clientRes, estimatesRes, docsRes] = await Promise.all([
        api.get(`/client-profiles/${profileId}`),
        api.get(`/client-profiles/${profileId}/estimates`),
        api.get(`/client-profiles/${profileId}/documents`)
      ]);
      setClient(clientRes.data);
      setEstimates(estimatesRes.data || []);
      setDocuments(docsRes.data || []);
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

  const navigateToNewEstimate = () => {
    // Navigate to old estimates page with client pre-selected
    navigate(`/estimates-legacy?client_profile_id=${profileId}&company=${encodeURIComponent(client.company_name || '')}&contact=${encodeURIComponent(client.contact_name || '')}&email=${encodeURIComponent(client.email || '')}&phone=${encodeURIComponent(client.phone || '')}&address=${encodeURIComponent(client.address || '')}`);
  };

  // Calculate stats
  const totalEstimates = estimates.length;
  const totalValue = estimates.reduce((sum, e) => sum + (e.total || 0), 0);
  const approvedEstimates = estimates.filter(e => e.status === 'approved').length;

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
          <Button variant="outline" className="mt-4" onClick={() => navigate('/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Clientes
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
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/clients')}>
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
            <Button onClick={navigateToNewEstimate} className="bg-orange-500 hover:bg-orange-600">
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
                  <Button onClick={navigateToNewEstimate} size="sm" className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Estimado
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {estimates.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">No hay estimados para este cliente</p>
                    <Button onClick={navigateToNewEstimate} variant="outline" className="mt-4">
                      <Plus className="w-4 h-4 mr-2" /> Crear Primer Estimado
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {estimates.map(estimate => (
                      <div 
                        key={estimate.estimate_id} 
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => navigate(`/estimates?view=${estimate.estimate_id}`)}
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
                        <div className="text-right">
                          <p className="font-bold text-lg">${(estimate.total || 0).toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                          <Badge className={statusColors[estimate.status]}>
                            {statusLabels[estimate.status] || estimate.status}
                          </Badge>
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
      </div>
    </Layout>
  );
};

export default ClientProfileDetail;
