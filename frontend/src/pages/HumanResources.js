import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Users, Upload, FileText, Trash2, Download, FolderOpen, User, Briefcase, Phone, Save, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import moment from 'moment';

const API = process.env.REACT_APP_BACKEND_URL;

const documentTypes = [
  { value: 'id', label: 'Identificación' },
  { value: 'contract', label: 'Contrato' },
  { value: 'resume', label: 'Currículum' },
  { value: 'certification', label: 'Certificación' },
  { value: 'license', label: 'Licencia' },
  { value: 'medical', label: 'Documento Médico' },
  { value: 'tax', label: 'Documento Fiscal' },
  { value: 'other', label: 'Otro' }
];

const emptyProfile = {
  phone: '', address: '', city: '', date_of_birth: '', gender: '', marital_status: '',
  nationality: '', id_number: '', department: '', position: '', hire_date: '',
  employment_type: '', worker_classification: 'employee', salary: 0, pay_frequency: '', bank_name: '', bank_account: '',
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

  useEffect(() => { loadEmployees(); }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadDocuments(selectedEmployee.user_id);
      setProfile({ ...emptyProfile, ...selectedEmployee.profile });
    }
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const response = await axios.get(`${API}/api/employees`, { withCredentials: true });
      setEmployees(response.data);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar empleados');
      setLoading(false);
    }
  };

  const loadDocuments = async (employeeId) => {
    try {
      const response = await axios.get(`${API}/api/employees/${employeeId}/documents`, { withCredentials: true });
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/employees/${selectedEmployee.user_id}/profile`, {
        ...profile, user_id: selectedEmployee.user_id
      }, { withCredentials: true });
      toast.success('Perfil guardado');
      loadEmployees();
    } catch (error) {
      toast.error('Error al guardar perfil');
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
      await axios.post(`${API}/api/employees/${selectedEmployee.user_id}/documents?document_type=${uploadForm.document_type}`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Documento subido');
      setUploadDialogOpen(false);
      setUploadForm({ document_type: '', file: null });
      loadDocuments(selectedEmployee.user_id);
    } catch (error) {
      toast.error('Error al subir documento');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    try {
      await axios.delete(`${API}/api/employees/${selectedEmployee.user_id}/documents/${docId}`, { withCredentials: true });
      toast.success('Documento eliminado');
      loadDocuments(selectedEmployee.user_id);
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const getDocTypeLabel = (type) => documentTypes.find(d => d.value === type)?.label || type;

  if (loading) return <Layout><div className="p-8">Cargando...</div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Recursos Humanos</h1>
            <p className="text-slate-600">Gestión de perfiles y documentos de empleados</p>
          </div>
          <Button onClick={() => navigate('/payroll')} className="bg-green-600 hover:bg-green-700">
            <Calculator className="w-4 h-4 mr-2" /> Procesar Nómina
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Employee List */}
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Empleados</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[700px] overflow-y-auto">
              {employees.map(emp => (
                <div key={emp.user_id} onClick={() => setSelectedEmployee(emp)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedEmployee?.user_id === emp.user_id ? 'bg-blue-100 border-blue-300 border' : 'bg-slate-50 hover:bg-slate-100 border border-transparent'}`}>
                  <p className="font-medium">{emp.name}</p>
                  <p className="text-sm text-slate-500">{emp.profile?.position || emp.email}</p>
                  <Badge variant="outline" className="mt-1 text-xs">{emp.role === 'admin' ? 'Admin' : emp.role === 'manager' ? 'Gerente' : 'Empleado'}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Profile & Documents Panel */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {selectedEmployee ? selectedEmployee.name : 'Selecciona un empleado'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedEmployee ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Selecciona un empleado para ver su perfil</p>
                </div>
              ) : (
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="employment">Empleo</TabsTrigger>
                    <TabsTrigger value="emergency">Emergencia</TabsTrigger>
                    <TabsTrigger value="documents">Documentos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><Label>Teléfono</Label><Input value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} placeholder="787-555-0000" /></div>
                      <div><Label>Fecha de Nacimiento</Label><Input type="date" value={profile.date_of_birth} onChange={(e) => setProfile({...profile, date_of_birth: e.target.value})} /></div>
                      <div><Label>Género</Label>
                        <Select value={profile.gender} onValueChange={(v) => setProfile({...profile, gender: v})}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Masculino</SelectItem>
                            <SelectItem value="female">Femenino</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Estado Civil</Label>
                        <Select value={profile.marital_status} onValueChange={(v) => setProfile({...profile, marital_status: v})}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Soltero/a</SelectItem>
                            <SelectItem value="married">Casado/a</SelectItem>
                            <SelectItem value="divorced">Divorciado/a</SelectItem>
                            <SelectItem value="widowed">Viudo/a</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Nacionalidad</Label><Input value={profile.nationality} onChange={(e) => setProfile({...profile, nationality: e.target.value})} placeholder="Puertorriqueño" /></div>
                      <div><Label>Cédula / ID</Label><Input value={profile.id_number} onChange={(e) => setProfile({...profile, id_number: e.target.value})} placeholder="000-00-0000" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label>Dirección</Label><Input value={profile.address} onChange={(e) => setProfile({...profile, address: e.target.value})} placeholder="Calle, Número" /></div>
                      <div><Label>Ciudad</Label><Input value={profile.city} onChange={(e) => setProfile({...profile, city: e.target.value})} placeholder="San Juan" /></div>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </TabsContent>

                  <TabsContent value="employment" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><Label>Departamento</Label><Input value={profile.department} onChange={(e) => setProfile({...profile, department: e.target.value})} placeholder="Operaciones" /></div>
                      <div><Label>Puesto</Label><Input value={profile.position} onChange={(e) => setProfile({...profile, position: e.target.value})} placeholder="Supervisor" /></div>
                      <div><Label>Fecha de Contratación</Label><Input type="date" value={profile.hire_date} onChange={(e) => setProfile({...profile, hire_date: e.target.value})} /></div>
                      <div><Label>Tipo de Empleo</Label>
                        <Select value={profile.employment_type} onValueChange={(v) => setProfile({...profile, employment_type: v})}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-time">Tiempo Completo</SelectItem>
                            <SelectItem value="part-time">Medio Tiempo</SelectItem>
                            <SelectItem value="contractor">Contratista</SelectItem>
                            <SelectItem value="intern">Pasante</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Salario</Label><Input type="number" value={profile.salary} onChange={(e) => setProfile({...profile, salary: parseFloat(e.target.value) || 0})} placeholder="0.00" /></div>
                      <div><Label>Frecuencia de Pago</Label>
                        <Select value={profile.pay_frequency} onValueChange={(v) => setProfile({...profile, pay_frequency: v})}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="biweekly">Quincenal</SelectItem>
                            <SelectItem value="monthly">Mensual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Banco</Label><Input value={profile.bank_name} onChange={(e) => setProfile({...profile, bank_name: e.target.value})} placeholder="Banco Popular" /></div>
                      <div><Label>Cuenta Bancaria</Label><Input value={profile.bank_account} onChange={(e) => setProfile({...profile, bank_account: e.target.value})} placeholder="****1234" /></div>
                    </div>
                    <div><Label>Notas</Label><Textarea value={profile.notes} onChange={(e) => setProfile({...profile, notes: e.target.value})} placeholder="Notas adicionales..." rows={3} /></div>
                    <Button onClick={handleSaveProfile} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </TabsContent>

                  <TabsContent value="emergency" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><Label>Nombre del Contacto</Label><Input value={profile.emergency_contact_name} onChange={(e) => setProfile({...profile, emergency_contact_name: e.target.value})} placeholder="Nombre completo" /></div>
                      <div><Label>Teléfono</Label><Input value={profile.emergency_contact_phone} onChange={(e) => setProfile({...profile, emergency_contact_phone: e.target.value})} placeholder="787-555-0000" /></div>
                      <div><Label>Relación</Label>
                        <Select value={profile.emergency_contact_relationship} onValueChange={(v) => setProfile({...profile, emergency_contact_relationship: v})}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spouse">Esposo/a</SelectItem>
                            <SelectItem value="parent">Padre/Madre</SelectItem>
                            <SelectItem value="sibling">Hermano/a</SelectItem>
                            <SelectItem value="child">Hijo/a</SelectItem>
                            <SelectItem value="friend">Amigo/a</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </TabsContent>

                  <TabsContent value="documents" className="mt-4">
                    <div className="flex justify-end mb-4">
                      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-blue-600 hover:bg-blue-700"><Upload className="w-4 h-4 mr-2" /> Subir Documento</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Subir Documento</DialogTitle></DialogHeader>
                          <form onSubmit={handleUpload} className="space-y-4">
                            <div><Label>Tipo de Documento</Label>
                              <Select value={uploadForm.document_type} onValueChange={(v) => setUploadForm({...uploadForm, document_type: v})}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                                <SelectContent>{documentTypes.map(dt => (<SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>))}</SelectContent>
                              </Select>
                            </div>
                            <div><Label>Archivo</Label><Input type="file" onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" /></div>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Subir</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {documents.length === 0 ? (
                      <div className="text-center py-8 text-slate-500"><FileText className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>No hay documentos</p></div>
                    ) : (
                      <div className="space-y-2">
                        {documents.map(doc => (
                          <div key={doc.doc_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="w-6 h-6 text-blue-600" />
                              <div>
                                <p className="font-medium text-sm">{doc.original_filename}</p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Badge variant="outline" className="text-xs">{getDocTypeLabel(doc.document_type)}</Badge>
                                  <span>{moment(doc.uploaded_at).format('DD/MM/YY')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => window.open(`${API}${doc.file_url}`, '_blank')}><Download className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(doc.doc_id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default HumanResources;
