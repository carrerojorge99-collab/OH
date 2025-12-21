import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Users, Upload, FileText, Trash2, Download, User, Phone, Mail, MapPin, Calendar, DollarSign, Building, CreditCard, Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import moment from 'moment';

// Helper function to get initials safely
const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase() || '??';
};

const documentTypes = [
  { value: 'id', label: 'Identificación' },
  { value: 'contract', label: 'Contrato' },
  { value: 'resume', label: 'Currículum' },
  { value: 'certification', label: 'Certificación' },
  { value: 'license', label: 'Licencia' },
  { value: 'medical', label: 'Médico' },
  { value: 'tax', label: 'Fiscal' },
  { value: 'other', label: 'Otro' }
];

const emptyProfile = {
  phone: '', address: '', city: '', zipcode: '', country: '', date_of_birth: '', gender: '', marital_status: '',
  nationality: '', id_number: '', department: '', position: '', hire_date: '',
  employment_type: '', worker_classification: '', salary: 0, hourly_rate: 0, pay_frequency: '', bank_name: '', bank_account: '',
  routing_number: '', account_type: 'checking',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '', notes: ''
};

const HumanResources = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ document_type: '', file: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('info');

  useEffect(() => { loadEmployees(); }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadDocuments(selectedEmployee.user_id);
      const emp = selectedEmployee.profile || {};
      setProfile({
        phone: emp.phone || '', address: emp.address || '', city: emp.city || '', zipcode: emp.zipcode || '',
        country: emp.country || '', date_of_birth: emp.date_of_birth || '', gender: emp.gender || '',
        marital_status: emp.marital_status || '', nationality: emp.nationality || '', id_number: emp.id_number || '',
        department: emp.department || '', position: emp.position || '', hire_date: emp.hire_date || '',
        employment_type: emp.employment_type || '', worker_classification: emp.worker_classification || '',
        salary: emp.salary || 0, hourly_rate: emp.hourly_rate || 0, pay_frequency: emp.pay_frequency || '',
        bank_name: emp.bank_name || '', bank_account: emp.bank_account || '', routing_number: emp.routing_number || '',
        account_type: emp.account_type || 'checking', emergency_contact_name: emp.emergency_contact_name || '',
        emergency_contact_phone: emp.emergency_contact_phone || '', emergency_contact_relationship: emp.emergency_contact_relationship || '',
        notes: emp.notes || ''
      });
    }
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar empleados');
      setLoading(false);
    }
  };

  const loadDocuments = async (userId) => {
    try {
      const response = await api.get(`/employees/${userId}/documents`);
      setDocuments(response.data);
    } catch (error) {
      setDocuments([]);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put(`/employees/${selectedEmployee.user_id}/profile`, profile);
      toast.success('Perfil guardado');
      loadEmployees();
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
      await api.post(`/employees/${selectedEmployee.user_id}/documents?document_type=${uploadForm.document_type}`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Documento subido');
      setUploadDialogOpen(false);
      setUploadForm({ document_type: '', file: null });
      loadDocuments(selectedEmployee.user_id);
    } catch (error) {
      toast.error('Error al subir');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('¿Eliminar documento?')) return;
    try {
      await api.delete(`/employees/${selectedEmployee.user_id}/documents/${docId}`);
      toast.success('Eliminado');
      loadDocuments(selectedEmployee.user_id);
    } catch (error) {
      toast.error('Error');
    }
  };

  const filteredEmployees = employees.filter(e => 
    (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const Field = ({ label, icon: Icon, children }) => (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </Label>
      {children}
    </div>
  );

  if (loading) return <Layout><div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="flex h-[calc(100vh-120px)]">
        {/* Sidebar - Employee List */}
        <div className="w-72 border-r bg-slate-50/50 flex flex-col">
          <div className="p-4 border-b bg-white">
            <h1 className="text-lg font-semibold text-slate-900">Empleados</h1>
            <div className="relative mt-3">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input 
                placeholder="Buscar..." 
                className="pl-9 h-9 bg-slate-50" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredEmployees.map(emp => (
              <div 
                key={emp.user_id} 
                onClick={() => setSelectedEmployee(emp)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedEmployee?.user_id === emp.user_id 
                    ? 'bg-orange-50 border-l-2 border-orange-500' 
                    : 'hover:bg-white hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                    selectedEmployee?.user_id === emp.user_id ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {getInitials(emp.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{emp.name}</p>
                    <p className="text-xs text-slate-500 truncate">{emp.profile?.position || emp.email}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t bg-white">
            <Button onClick={() => navigate('/payroll')} className="w-full bg-orange-500 hover:bg-orange-600">
              <DollarSign className="w-4 h-4 mr-2" /> Nómina
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {!selectedEmployee ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400">Selecciona un empleado</p>
              </div>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="border-b bg-gradient-to-r from-slate-50 to-white p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-2xl font-bold text-orange-600">
                    {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedEmployee.name}</h2>
                    <p className="text-slate-500">{profile.position || 'Sin cargo'} • {profile.department || 'Sin departamento'}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">{selectedEmployee.role}</Badge>
                      <Badge className={profile.worker_classification === 'contractor' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}>
                        {profile.worker_classification === 'contractor' ? 'Contratista' : 'Empleado'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Tabs */}
              <div className="border-b px-6">
                <div className="flex gap-6">
                  {[
                    { id: 'info', label: 'Información' },
                    { id: 'payment', label: 'Pago' },
                    { id: 'docs', label: 'Documentos' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSection(tab.id)}
                      className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeSection === tab.id 
                          ? 'border-orange-500 text-orange-600' 
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {activeSection === 'info' && (
                  <div className="space-y-6 max-w-3xl">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" /> Personal
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="Teléfono" icon={Phone}>
                          <Input value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} placeholder="787-555-0000" />
                        </Field>
                        <Field label="Fecha Nacimiento" icon={Calendar}>
                          <Input type="date" value={profile.date_of_birth} onChange={(e) => setProfile({...profile, date_of_birth: e.target.value})} />
                        </Field>
                        <Field label="ID / Cédula">
                          <Input value={profile.id_number} onChange={(e) => setProfile({...profile, id_number: e.target.value})} />
                        </Field>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Dirección
                      </h3>
                      <div className="grid grid-cols-4 gap-4">
                        <Field label="Dirección" className="col-span-2">
                          <Input value={profile.address} onChange={(e) => setProfile({...profile, address: e.target.value})} />
                        </Field>
                        <Field label="Ciudad">
                          <Input value={profile.city} onChange={(e) => setProfile({...profile, city: e.target.value})} />
                        </Field>
                        <Field label="Código Postal">
                          <Input value={profile.zipcode} onChange={(e) => setProfile({...profile, zipcode: e.target.value})} />
                        </Field>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Building className="w-4 h-4" /> Empleo
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="Cargo">
                          <Input value={profile.position} onChange={(e) => setProfile({...profile, position: e.target.value})} />
                        </Field>
                        <Field label="Departamento">
                          <Input value={profile.department} onChange={(e) => setProfile({...profile, department: e.target.value})} />
                        </Field>
                        <Field label="Fecha Ingreso" icon={Calendar}>
                          <Input type="date" value={profile.hire_date} onChange={(e) => setProfile({...profile, hire_date: e.target.value})} />
                        </Field>
                        <Field label="Clasificación">
                          <Select value={profile.worker_classification} onValueChange={(v) => setProfile({...profile, worker_classification: v})}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">Empleado W-2</SelectItem>
                              <SelectItem value="contractor">Contratista 1099</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Tipo">
                          <Select value={profile.employment_type} onValueChange={(v) => setProfile({...profile, employment_type: v})}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full_time">Tiempo Completo</SelectItem>
                              <SelectItem value="part_time">Medio Tiempo</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3">Contacto de Emergencia</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="Nombre">
                          <Input value={profile.emergency_contact_name} onChange={(e) => setProfile({...profile, emergency_contact_name: e.target.value})} />
                        </Field>
                        <Field label="Teléfono">
                          <Input value={profile.emergency_contact_phone} onChange={(e) => setProfile({...profile, emergency_contact_phone: e.target.value})} />
                        </Field>
                        <Field label="Relación">
                          <Input value={profile.emergency_contact_relationship} onChange={(e) => setProfile({...profile, emergency_contact_relationship: e.target.value})} />
                        </Field>
                      </div>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </div>
                )}

                {activeSection === 'payment' && (
                  <div className="space-y-6 max-w-3xl">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> Compensación
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="Salario Fijo">
                          <Input type="number" value={profile.salary} onChange={(e) => setProfile({...profile, salary: parseFloat(e.target.value) || 0})} />
                        </Field>
                        <Field label="Tarifa por Hora">
                          <Input type="number" value={profile.hourly_rate} onChange={(e) => setProfile({...profile, hourly_rate: parseFloat(e.target.value) || 0})} />
                        </Field>
                        <Field label="Frecuencia de Pago">
                          <Select value={profile.pay_frequency} onValueChange={(v) => setProfile({...profile, pay_frequency: v})}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="biweekly">Bisemanal</SelectItem>
                              <SelectItem value="semimonthly">Quincenal</SelectItem>
                              <SelectItem value="monthly">Mensual</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Información Bancaria
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Banco">
                          <Input value={profile.bank_name} onChange={(e) => setProfile({...profile, bank_name: e.target.value})} />
                        </Field>
                        <Field label="Número de Cuenta">
                          <Input value={profile.bank_account} onChange={(e) => setProfile({...profile, bank_account: e.target.value})} />
                        </Field>
                        <Field label="Routing Number">
                          <Input value={profile.routing_number} onChange={(e) => setProfile({...profile, routing_number: e.target.value})} />
                        </Field>
                        <Field label="Tipo de Cuenta">
                          <Select value={profile.account_type} onValueChange={(v) => setProfile({...profile, account_type: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="checking">Checking</SelectItem>
                              <SelectItem value="savings">Savings</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </div>
                )}

                {activeSection === 'docs' && (
                  <div className="space-y-4 max-w-3xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-slate-900">Documentos</h3>
                      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                            <Upload className="w-4 h-4 mr-2" /> Subir
                          </Button>
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
                        <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-400">No hay documentos</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documents.map(doc => (
                          <div key={doc.document_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-orange-500" />
                              <div>
                                <p className="text-sm font-medium">{doc.filename}</p>
                                <p className="text-xs text-slate-500">{documentTypes.find(t => t.value === doc.document_type)?.label} • {moment(doc.uploaded_at).format('DD/MM/YY')}</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={doc.file_url} target="_blank" rel="noreferrer"><Download className="w-4 h-4" /></a>
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
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default HumanResources;
