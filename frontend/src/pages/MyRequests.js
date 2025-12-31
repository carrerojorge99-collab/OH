import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar, Clock, DollarSign, Package, Plus, Trash2, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const REQUEST_TYPES = {
  employee: [
    { value: 'vacation', label: 'Vacaciones', icon: Calendar },
    { value: 'permission', label: 'Permiso', icon: Clock },
    { value: 'overtime', label: 'Tiempo Extra', icon: Clock },
    { value: 'sick_leave', label: 'Licencia Médica', icon: AlertCircle },
  ],
  project: [
    { value: 'material_purchase', label: 'Compra de Materiales', icon: Package },
    { value: 'emergency_expense', label: 'Gasto de Emergencia', icon: DollarSign },
    { value: 'additional_resource', label: 'Recurso Adicional', icon: Plus },
    { value: 'equipment_rental', label: 'Alquiler de Equipo', icon: Package },
  ]
};

const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const [form, setForm] = useState({
    category: 'employee',
    type: 'vacation',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    hours: '',
    project_id: '',
    project_name: '',
    amount: '',
    urgency: 'normal',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reqRes, projRes] = await Promise.all([
        api.get('/requests/my'),
        api.get('/projects')
      ]);
      setRequests(reqRes.data);
      setProjects(projRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title || !form.type) {
      toast.error('Complete los campos requeridos');
      return;
    }

    try {
      const payload = {
        ...form,
        amount: form.amount ? parseFloat(form.amount) : 0,
        hours: form.hours ? parseFloat(form.hours) : null
      };
      
      await api.post('/requests', payload);
      toast.success('Solicitud enviada exitosamente');
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar solicitud');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('¿Cancelar esta solicitud?')) return;
    try {
      await api.delete(`/requests/${id}`);
      toast.success('Solicitud cancelada');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cancelar');
    }
  };

  const resetForm = () => {
    setForm({
      category: 'employee',
      type: 'vacation',
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      hours: '',
      project_id: '',
      project_name: '',
      amount: '',
      urgency: 'normal',
      notes: ''
    });
  };

  const handleCategoryChange = (cat) => {
    setForm({
      ...form,
      category: cat,
      type: cat === 'employee' ? 'vacation' : 'material_purchase'
    });
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.project_id === projectId);
    setForm({
      ...form,
      project_id: projectId,
      project_name: project?.name || ''
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getTypeLabel = (type) => {
    const allTypes = [...REQUEST_TYPES.employee, ...REQUEST_TYPES.project];
    return allTypes.find(t => t.value === type)?.label || type;
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'critical': return <Badge className="bg-red-500 text-white">Crítico</Badge>;
      case 'urgent': return <Badge className="bg-orange-500 text-white">Urgente</Badge>;
      default: return null;
    }
  };

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return r.status === 'pending';
    if (activeTab === 'employee') return r.category === 'employee';
    if (activeTab === 'project') return r.category === 'project';
    return true;
  });

  if (loading) return <Layout><div className="p-8 text-center">Cargando...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Mis Solicitudes</h1>
            <p className="text-sm sm:text-base text-slate-500">Gestiona tus solicitudes de permisos, vacaciones y proyectos</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> Nueva Solicitud
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nueva Solicitud</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    type="button"
                    variant={form.category === 'employee' ? 'default' : 'outline'}
                    className={form.category === 'employee' ? 'bg-blue-600' : ''}
                    onClick={() => handleCategoryChange('employee')}
                  >
                    <Calendar className="w-4 h-4 mr-2" /> Personal
                  </Button>
                  <Button 
                    type="button"
                    variant={form.category === 'project' ? 'default' : 'outline'}
                    className={form.category === 'project' ? 'bg-green-600' : ''}
                    onClick={() => handleCategoryChange('project')}
                  >
                    <Package className="w-4 h-4 mr-2" /> Proyecto
                  </Button>
                </div>

                {/* Type Selection */}
                <div>
                  <Label>Tipo de Solicitud *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REQUEST_TYPES[form.category].map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div>
                  <Label>Título / Asunto *</Label>
                  <Input 
                    value={form.title} 
                    onChange={(e) => setForm({...form, title: e.target.value})}
                    placeholder="Ej: Vacaciones de fin de año"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <Label>Descripción</Label>
                  <Textarea 
                    value={form.description}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    placeholder="Detalles adicionales..."
                    rows={3}
                  />
                </div>

                {/* Employee-specific fields */}
                {form.category === 'employee' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fecha Inicio</Label>
                      <Input 
                        type="date" 
                        value={form.start_date}
                        onChange={(e) => setForm({...form, start_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Fecha Fin</Label>
                      <Input 
                        type="date"
                        value={form.end_date}
                        onChange={(e) => setForm({...form, end_date: e.target.value})}
                      />
                    </div>
                    {form.type === 'overtime' && (
                      <div className="col-span-2">
                        <Label>Horas Solicitadas</Label>
                        <Input 
                          type="number"
                          value={form.hours}
                          onChange={(e) => setForm({...form, hours: e.target.value})}
                          placeholder="Ej: 4"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Project-specific fields */}
                {form.category === 'project' && (
                  <>
                    <div>
                      <Label>Proyecto *</Label>
                      <Select value={form.project_id} onValueChange={handleProjectChange}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar proyecto" /></SelectTrigger>
                        <SelectContent>
                          {projects.map(p => (
                            <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Monto Estimado ($)</Label>
                        <Input 
                          type="number"
                          value={form.amount}
                          onChange={(e) => setForm({...form, amount: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Urgencia</Label>
                        <Select value={form.urgency} onValueChange={(v) => setForm({...form, urgency: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                            <SelectItem value="critical">Crítico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {/* Notes */}
                <div>
                  <Label>Notas Adicionales</Label>
                  <Textarea 
                    value={form.notes}
                    onChange={(e) => setForm({...form, notes: e.target.value})}
                    placeholder="Información adicional para el aprobador..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                    <Send className="w-4 h-4 mr-2" /> Enviar Solicitud
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todas ({requests.length})</TabsTrigger>
            <TabsTrigger value="pending">Pendientes ({requests.filter(r => r.status === 'pending').length})</TabsTrigger>
            <TabsTrigger value="employee">Personales</TabsTrigger>
            <TabsTrigger value="project">Proyectos</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  No hay solicitudes en esta categoría
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map(req => (
                  <Card key={req.id} className={`${req.status === 'pending' ? 'border-yellow-200 bg-yellow-50/30' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={req.category === 'employee' ? 'border-blue-300 text-blue-700' : 'border-green-300 text-green-700'}>
                              {req.category === 'employee' ? 'Personal' : 'Proyecto'}
                            </Badge>
                            <Badge variant="secondary">{getTypeLabel(req.type)}</Badge>
                            {getStatusBadge(req.status)}
                            {getUrgencyBadge(req.urgency)}
                          </div>
                          <h3 className="font-semibold text-slate-900">{req.title}</h3>
                          {req.description && <p className="text-sm text-slate-600 mt-1">{req.description}</p>}
                          
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                            {req.start_date && (
                              <span>📅 {moment(req.start_date).format('DD/MM/YYYY')} {req.end_date && `- ${moment(req.end_date).format('DD/MM/YYYY')}`}</span>
                            )}
                            {req.hours && <span>⏱️ {req.hours} horas</span>}
                            {req.amount > 0 && <span>💰 ${req.amount.toLocaleString()}</span>}
                            {req.project_name && <span>📁 {req.project_name}</span>}
                            <span>🕐 {moment(req.requested_at).fromNow()}</span>
                          </div>

                          {req.status !== 'pending' && req.reviewed_by_name && (
                            <div className="mt-2 text-sm">
                              <span className={req.status === 'approved' ? 'text-green-600' : 'text-red-600'}>
                                {req.status === 'approved' ? '✓ Aprobado' : '✗ Rechazado'} por {req.reviewed_by_name}
                              </span>
                              {req.review_notes && <p className="text-slate-500 italic">"{req.review_notes}"</p>}
                            </div>
                          )}
                        </div>

                        {req.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleCancel(req.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default MyRequests;
