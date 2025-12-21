import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CheckCircle, XCircle, Clock, DollarSign, FileText, User, Calendar, Package, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const Approvals = () => {
  const [requests, setRequests] = useState([]);
  const [legacyApprovals, setLegacyApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState({});
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reqRes, appRes] = await Promise.all([
        api.get('/requests'),
        api.get('/approvals')
      ]);
      setRequests(reqRes.data);
      setLegacyApprovals(appRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (id, status) => {
    try {
      await api.put(`/requests/${id}`, { status, notes: reviewNotes[id] || '' });
      toast.success(status === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada');
      setReviewNotes({ ...reviewNotes, [id]: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar');
    }
  };

  const handleLegacyAction = async (id, status) => {
    try {
      await api.put(`/approvals/${id}`, { status, notes: reviewNotes[id] || '' });
      toast.success(status === 'approved' ? 'Aprobado' : 'Rechazado');
      loadData();
    } catch (error) {
      toast.error('Error al procesar');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'vacation': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'permission': return <Clock className="w-5 h-5 text-purple-500" />;
      case 'overtime': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'sick_leave': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'material_purchase': return <Package className="w-5 h-5 text-green-500" />;
      case 'emergency_expense': return <DollarSign className="w-5 h-5 text-red-500" />;
      case 'additional_resource': return <User className="w-5 h-5 text-blue-500" />;
      case 'equipment_rental': return <Package className="w-5 h-5 text-yellow-500" />;
      case 'purchase_order': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'expense': return <DollarSign className="w-5 h-5 text-green-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'vacation': 'Vacaciones',
      'permission': 'Permiso',
      'overtime': 'Tiempo Extra',
      'sick_leave': 'Licencia Médica',
      'material_purchase': 'Compra de Materiales',
      'emergency_expense': 'Gasto de Emergencia',
      'additional_resource': 'Recurso Adicional',
      'equipment_rental': 'Alquiler de Equipo',
      'purchase_order': 'Orden de Compra',
      'expense': 'Gasto'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'critical': return <Badge className="bg-red-500 text-white animate-pulse">CRÍTICO</Badge>;
      case 'urgent': return <Badge className="bg-orange-500 text-white">URGENTE</Badge>;
      default: return null;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');
  const pendingLegacy = legacyApprovals.filter(a => a.status === 'pending');

  const employeeRequests = pendingRequests.filter(r => r.category === 'employee');
  const projectRequests = pendingRequests.filter(r => r.category === 'project');

  if (loading) return <Layout><div className="p-8 text-center">Cargando...</div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Centro de Aprobaciones</h1>
          <p className="text-slate-500">Gestiona las solicitudes pendientes de tu equipo</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{pendingRequests.length + pendingLegacy.length}</div>
              <div className="text-sm text-yellow-700">Pendientes</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{employeeRequests.length}</div>
              <div className="text-sm text-blue-700">Solicitudes Personal</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{projectRequests.length}</div>
              <div className="text-sm text-green-700">Solicitudes Proyecto</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{processedRequests.length}</div>
              <div className="text-sm text-purple-700">Procesadas</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pendientes ({pendingRequests.length + pendingLegacy.length})
            </TabsTrigger>
            <TabsTrigger value="employee">Personal ({employeeRequests.length})</TabsTrigger>
            <TabsTrigger value="project">Proyectos ({projectRequests.length})</TabsTrigger>
            <TabsTrigger value="processed">Historial</TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending" className="mt-4 space-y-4">
            {pendingRequests.length === 0 && pendingLegacy.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  No hay solicitudes pendientes
                </CardContent>
              </Card>
            ) : (
              <>
                {/* New Request System */}
                {pendingRequests.map(req => (
                  <Card key={req.id} className="border-l-4 border-l-yellow-400">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          {getTypeIcon(req.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={req.category === 'employee' ? 'border-blue-300 text-blue-700' : 'border-green-300 text-green-700'}>
                              {req.category === 'employee' ? 'Personal' : 'Proyecto'}
                            </Badge>
                            <Badge variant="secondary">{getTypeLabel(req.type)}</Badge>
                            {getUrgencyBadge(req.urgency)}
                          </div>
                          <h3 className="font-semibold text-lg text-slate-900">{req.title}</h3>
                          <p className="text-sm text-slate-600">Solicitado por: <strong>{req.requested_by_name}</strong></p>
                          {req.description && <p className="text-sm text-slate-500 mt-1">{req.description}</p>}
                          
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                            {req.start_date && (
                              <span>📅 {moment(req.start_date).format('DD/MM/YYYY')} {req.end_date && `- ${moment(req.end_date).format('DD/MM/YYYY')}`}</span>
                            )}
                            {req.hours && <span>⏱️ {req.hours} horas</span>}
                            {req.amount > 0 && <span>💰 ${req.amount.toLocaleString()}</span>}
                            {req.project_name && <span>📁 {req.project_name}</span>}
                            <span>🕐 {moment(req.requested_at).fromNow()}</span>
                          </div>

                          {req.notes && (
                            <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                              <strong>Notas:</strong> {req.notes}
                            </div>
                          )}

                          <div className="mt-3">
                            <Textarea
                              placeholder="Notas de revisión (opcional)..."
                              value={reviewNotes[req.id] || ''}
                              onChange={(e) => setReviewNotes({...reviewNotes, [req.id]: e.target.value})}
                              className="mb-2"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => handleRequestAction(req.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                              </Button>
                              <Button 
                                onClick={() => handleRequestAction(req.id, 'rejected')}
                                variant="destructive"
                              >
                                <XCircle className="w-4 h-4 mr-1" /> Rechazar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Legacy Approvals */}
                {pendingLegacy.map(app => (
                  <Card key={app.id} className="border-l-4 border-l-orange-400">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          {getTypeIcon(app.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary">{getTypeLabel(app.type)}</Badge>
                            {getStatusBadge(app.status)}
                          </div>
                          <h3 className="font-semibold text-slate-900">{app.reference_name || 'Sin nombre'}</h3>
                          <p className="text-sm text-slate-600">Solicitado por: {app.requested_by_name || 'N/A'}</p>
                          {app.amount > 0 && <p className="text-sm text-slate-500">Monto: ${app.amount?.toLocaleString()}</p>}
                          <p className="text-xs text-slate-400 mt-1">{moment(app.requested_at).fromNow()}</p>

                          <div className="mt-3">
                            <Textarea
                              placeholder="Notas de revisión..."
                              value={reviewNotes[app.id] || ''}
                              onChange={(e) => setReviewNotes({...reviewNotes, [app.id]: e.target.value})}
                              className="mb-2"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button onClick={() => handleLegacyAction(app.id, 'approved')} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                              </Button>
                              <Button onClick={() => handleLegacyAction(app.id, 'rejected')} variant="destructive">
                                <XCircle className="w-4 h-4 mr-1" /> Rechazar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          {/* Employee Requests Tab */}
          <TabsContent value="employee" className="mt-4 space-y-4">
            {employeeRequests.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-500">No hay solicitudes de personal pendientes</CardContent></Card>
            ) : (
              employeeRequests.map(req => (
                <Card key={req.id} className="border-l-4 border-l-blue-400">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-blue-50 rounded-lg">{getTypeIcon(req.type)}</div>
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-1">{getTypeLabel(req.type)}</Badge>
                        <h3 className="font-semibold text-slate-900">{req.title}</h3>
                        <p className="text-sm text-slate-600">De: <strong>{req.requested_by_name}</strong></p>
                        {req.start_date && <p className="text-sm text-slate-500">📅 {moment(req.start_date).format('DD/MM/YYYY')} - {moment(req.end_date).format('DD/MM/YYYY')}</p>}
                        {req.hours && <p className="text-sm text-slate-500">⏱️ {req.hours} horas</p>}
                        <div className="mt-3 flex gap-2">
                          <Button onClick={() => handleRequestAction(req.id, 'approved')} size="sm" className="bg-green-600">Aprobar</Button>
                          <Button onClick={() => handleRequestAction(req.id, 'rejected')} size="sm" variant="destructive">Rechazar</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Project Requests Tab */}
          <TabsContent value="project" className="mt-4 space-y-4">
            {projectRequests.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-500">No hay solicitudes de proyecto pendientes</CardContent></Card>
            ) : (
              projectRequests.map(req => (
                <Card key={req.id} className="border-l-4 border-l-green-400">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-green-50 rounded-lg">{getTypeIcon(req.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{getTypeLabel(req.type)}</Badge>
                          {getUrgencyBadge(req.urgency)}
                        </div>
                        <h3 className="font-semibold text-slate-900">{req.title}</h3>
                        <p className="text-sm text-slate-600">Proyecto: <strong>{req.project_name}</strong></p>
                        <p className="text-sm text-slate-600">De: {req.requested_by_name}</p>
                        {req.amount > 0 && <p className="text-sm font-semibold text-green-600">💰 ${req.amount.toLocaleString()}</p>}
                        <div className="mt-3 flex gap-2">
                          <Button onClick={() => handleRequestAction(req.id, 'approved')} size="sm" className="bg-green-600">Aprobar</Button>
                          <Button onClick={() => handleRequestAction(req.id, 'rejected')} size="sm" variant="destructive">Rechazar</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Processed Tab */}
          <TabsContent value="processed" className="mt-4 space-y-3">
            {processedRequests.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-500">No hay historial</CardContent></Card>
            ) : (
              processedRequests.slice(0, 50).map(req => (
                <Card key={req.id} className={`opacity-80 ${req.status === 'approved' ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-red-400'}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(req.status)}
                          <span className="font-medium">{req.title}</span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {req.requested_by_name} • {getTypeLabel(req.type)} • {moment(req.reviewed_at).format('DD/MM/YYYY')}
                        </p>
                      </div>
                      <div className="text-sm text-slate-500">
                        Por: {req.reviewed_by_name}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Approvals;
