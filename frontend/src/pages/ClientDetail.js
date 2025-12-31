import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api, { getBackendUrl } from '../utils/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import moment from 'moment';
import { Building2, Upload, Download, Trash2, FileText } from 'lucide-react';

const documentTypes = [
  { value: 'contract', label: 'Contrato' },
  { value: 'proposal', label: 'Propuesta' },
  { value: 'permit', label: 'Permiso' },
  { value: 'insurance', label: 'Seguro' },
  { value: 'tax', label: 'Documento Fiscal' },
  { value: 'other', label: 'Otro' }
];

const ClientDetail = () => {
  const { clientId } = useParams();
  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ document_type: '', file: null });
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    try {
      const [clientRes, docsRes] = await Promise.all([
        api.get(`/clients/${clientId}`),
        api.get(`/clients/${clientId}/documents`)
      ]);
      setClient(clientRes.data);
      setDocuments(docsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/clients/${clientId}`, client);
      toast.success('Guardado');
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
      await api.post(`/clients/${clientId}/documents?document_type=${uploadForm.document_type}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Documento subido');
      setUploadOpen(false);
      setUploadForm({ document_type: '', file: null });
      loadData();
    } catch (error) {
      toast.error('Error al subir');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('¿Eliminar documento?')) return;
    try {
      await api.delete(`/clients/${clientId}/documents/${docId}`);
      toast.success('Eliminado');
      loadData();
    } catch (error) {
      toast.error('Error');
    }
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  if (!client) return <Layout><div className="text-center py-12">Cliente no encontrado</div></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b">
          <div className="w-16 h-16 rounded-xl bg-orange-100 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{client.company_name || client.name}</h1>
            <p className="text-slate-500">{client.contact_person || 'Sin contacto'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-6">
            {['profile', 'documents'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2 text-sm font-medium border-b-2 ${activeTab === tab ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'}`}>
                {tab === 'profile' ? 'Perfil' : 'Documentos'}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" /> Información de Empresa</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Nombre Empresa</Label><Input value={client.company_name || ''} onChange={(e) => setClient({...client, company_name: e.target.value})} /></div>
                  <div><Label>Persona de Contacto</Label><Input value={client.contact_person || ''} onChange={(e) => setClient({...client, contact_person: e.target.value})} /></div>
                  <div><Label>Email</Label><Input value={client.company_email || ''} onChange={(e) => setClient({...client, company_email: e.target.value})} /></div>
                  <div><Label>Teléfono</Label><Input value={client.company_phone || ''} onChange={(e) => setClient({...client, company_phone: e.target.value})} /></div>
                  <div className="col-span-2"><Label>Dirección</Label><Input value={client.company_address || ''} onChange={(e) => setClient({...client, company_address: e.target.value})} /></div>
                  <div><Label>Tax ID / EIN</Label><Input value={client.tax_id || ''} onChange={(e) => setClient({...client, tax_id: e.target.value})} /></div>
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea value={client.notes || ''} onChange={(e) => setClient({...client, notes: e.target.value})} className="min-h-[100px]" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600"><Upload className="w-4 h-4 mr-2" /> Subir Documento</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Subir Documento</DialogTitle></DialogHeader>
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div>
                      <Label>Tipo</Label>
                      <Select value={uploadForm.document_type} onValueChange={(v) => setUploadForm({...uploadForm, document_type: v})}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {documentTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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

            {documents.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500">No hay documentos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.document_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="font-medium text-sm">{doc.filename}</p>
                        <p className="text-xs text-slate-500">{documentTypes.find(t => t.value === doc.document_type)?.label} • {moment(doc.uploaded_at).format('DD/MM/YY')}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => window.open(`${getBackendUrl()}/api/clients/${clientId}/documents/${doc.document_id}/download`, '_blank')}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.document_id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientDetail;
