import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Users, Upload, FileText, Trash2, Download, FolderOpen } from 'lucide-react';
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

const HumanResources = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ document_type: '', file: null });

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadDocuments(selectedEmployee.user_id);
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
      toast.error('Error al cargar documentos');
    }
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
      await axios.post(
        `${API}/api/employees/${selectedEmployee.user_id}/documents?document_type=${uploadForm.document_type}`,
        formData,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
      );
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
            <p className="text-slate-600">Gestión de documentos de empleados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Empleados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {employees.map(emp => (
                <div
                  key={emp.user_id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedEmployee?.user_id === emp.user_id
                      ? 'bg-blue-100 border-blue-300 border'
                      : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <p className="font-medium">{emp.name}</p>
                  <p className="text-sm text-slate-500">{emp.email}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {emp.role === 'admin' ? 'Administrador' : emp.role === 'manager' ? 'Gerente' : 'Empleado'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Documents Panel */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                {selectedEmployee ? `Documentos de ${selectedEmployee.name}` : 'Selecciona un empleado'}
              </CardTitle>
              {selectedEmployee && (
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Upload className="w-4 h-4 mr-2" /> Subir Documento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Subir Documento</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpload} className="space-y-4">
                      <div>
                        <Label>Tipo de Documento</Label>
                        <Select value={uploadForm.document_type} onValueChange={(v) => setUploadForm({...uploadForm, document_type: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {documentTypes.map(dt => (
                              <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Archivo</Label>
                        <Input
                          type="file"
                          onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                        Subir
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {!selectedEmployee ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Selecciona un empleado para ver sus documentos</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No hay documentos cargados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <div key={doc.doc_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="font-medium">{doc.original_filename}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Badge variant="outline">{getDocTypeLabel(doc.document_type)}</Badge>
                            <span>{moment(doc.uploaded_at).format('DD/MM/YYYY')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`${API}${doc.file_url}`, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(doc.doc_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default HumanResources;
