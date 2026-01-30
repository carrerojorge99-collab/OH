import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { User, DollarSign, Clock, FileText, Download, Edit2, Save, X, CheckSquare, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';
import jsPDF from 'jspdf';
import { fetchCompanyInfo, addPayStubHeader, addPaySection, addFooter } from '../utils/pdfGenerator';
import CloudinaryUpload from '../components/CloudinaryUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

moment.locale('es');

const MyProfile = () => {
  const { user } = useAuth();
  const [payStubs, setPayStubs] = useState([]);
  const [clockHistory, setClockHistory] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [profile, setProfile] = useState({});
  const [editingProfile, setEditingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const requests = [
        api.get('/pay-stubs/my'),
        api.get('/clock/history'),
        api.get('/my-tasks'),
        api.get(`/employees/${user?.user_id}/profile`)
      ];
      
      const [stubsRes, clockRes, tasksRes, profileRes] = await Promise.all(requests);
      setPayStubs(stubsRes.data);
      // Filter only current user's clock entries
      const myClocks = clockRes.data.filter(c => c.user_id === user?.user_id);
      setClockHistory(myClocks.slice(0, 20));
      setMyTasks(tasksRes.data || []);
      setProfile(profileRes.data || {});
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };
  
  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put(`/employees/${user?.user_id}/profile/self`, profile);
      toast.success('Perfil actualizado correctamente');
      setEditingProfile(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar el perfil');
    } finally {
      setSavingProfile(false);
    }
  };
  
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const task = myTasks.find(t => t.task_id === taskId);
      if (!task) return;
      
      await api.put(`/tasks/${taskId}/status`, { status: newStatus });
      toast.success('Estado de tarea actualizado');
      
      // Refresh tasks
      const tasksRes = await api.get('/my-tasks');
      setMyTasks(tasksRes.data || []);
    } catch (error) {
      toast.error('Error al actualizar el estado');
    }
  };

  const downloadPayStub = async (stub) => {
    const doc = new jsPDF();
    const company = await fetchCompanyInfo();
    
    // Header with company info and document title
    const period = `${moment(stub.period_start).format('DD/MM/YYYY')} - ${moment(stub.period_end).format('DD/MM/YYYY')}`;
    let y = await addPayStubHeader(doc, company, period);
    
    // Employee Info Section
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 115, 22);
    doc.text('EMPLEADO', 15, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.text(stub.employee_name || 'N/A', 15, y + 6);
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`ID: ${stub.employee_id?.slice(-8) || 'N/A'}`, 15, y + 12);
    
    y += 24;
    
    // Earnings Section
    const earnings = [
      { label: `Horas Trabajadas: ${stub.hours_worked?.toFixed(2) || 0}`, value: `$${stub.hourly_rate?.toFixed(2) || 0}/hr` },
      { label: 'Pago Bruto:', value: `$${stub.gross_pay?.toFixed(2) || 0}` }
    ];
    y = addPaySection(doc, 'INGRESOS', earnings, y);
    
    // Deductions Section
    const ded = stub.deductions || {};
    const deductions = [
      { label: 'Hacienda:', value: `-$${(ded.hacienda || 0).toFixed(2)}` },
      { label: 'Seguro Social:', value: `-$${(ded.social_security || 0).toFixed(2)}` },
      { label: 'Medicare:', value: `-$${(ded.medicare || 0).toFixed(2)}` }
    ];
    if (ded.other > 0) {
      deductions.push({ label: 'Otras deducciones:', value: `-$${(ded.other || 0).toFixed(2)}` });
    }
    deductions.push({ label: 'Total Deducciones:', value: `-$${stub.total_deductions?.toFixed(2) || 0}` });
    y = addPaySection(doc, 'DEDUCCIONES', deductions, y);
    
    // Net Pay Section (highlighted)
    y = addPaySection(doc, 'PAGO NETO', [{ label: '', value: `$${stub.net_pay?.toFixed(2) || 0}` }], y, true);
    
    // Footer
    addFooter(doc, company);
    
    doc.save(`talonario_${stub.employee_name?.replace(/\s+/g, '_')}_${moment(stub.period_end).format('YYYYMMDD')}.pdf`);
    toast.success('Talonario descargado');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'todo': return 'bg-slate-100 text-slate-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'review': return 'bg-yellow-100 text-yellow-700';
      case 'done': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };
  
  const getStatusLabel = (status) => {
    switch(status) {
      case 'todo': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'review': return 'En Revisión';
      case 'done': return 'Completada';
      default: return status;
    }
  };
  
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) return <Layout><div className="p-8 text-center">Cargando...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex-shrink-0">
            {editingProfile ? (
              <CloudinaryUpload
                folder="users"
                currentImage={profile.picture || user?.picture}
                label="Cambiar foto"
                previewSize="sm"
                onUploadComplete={(result) => {
                  handleProfileChange('picture', result?.url || '');
                }}
              />
            ) : (
              profile.picture || user?.picture ? (
                <img 
                  src={profile.picture || user?.picture} 
                  alt={user?.name}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-orange-100 flex items-center justify-center">
                  <User className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
                </div>
              )
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{user?.name || 'Mi Perfil'}</h1>
            <p className="text-sm sm:text-base text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex flex-wrap gap-1 h-auto p-1 bg-slate-100 rounded-lg">
            <TabsTrigger value="info" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
              <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Info
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
              <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Tareas ({myTasks.length})
            </TabsTrigger>
            <TabsTrigger value="paystubs" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Talonarios
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Horas
            </TabsTrigger>
          </TabsList>
          
          {/* Personal Info Tab */}
          <TabsContent value="info" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Mi Información</CardTitle>
                  {!editingProfile ? (
                    <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
                      <Edit2 className="w-4 h-4 mr-1" /> Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)}>
                        <X className="w-4 h-4 mr-1" /> Cancelar
                      </Button>
                      <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
                        <Save className="w-4 h-4 mr-1" /> {savingProfile ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Personal Info Section */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">Datos Personales</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500">Teléfono</Label>
                      {editingProfile ? (
                        <Input 
                          value={profile.phone || ''} 
                          onChange={(e) => handleProfileChange('phone', e.target.value)}
                          placeholder="(xxx) xxx-xxxx"
                        />
                      ) : (
                        <p className="text-sm font-medium">{profile.phone || 'No especificado'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Fecha de Nacimiento</Label>
                      {editingProfile ? (
                        <Input 
                          type="date"
                          value={profile.date_of_birth || ''} 
                          onChange={(e) => handleProfileChange('date_of_birth', e.target.value)}
                        />
                      ) : (
                        <p className="text-sm font-medium">{profile.date_of_birth ? moment(profile.date_of_birth).format('DD/MM/YYYY') : 'No especificado'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Género</Label>
                      {editingProfile ? (
                        <Select value={profile.gender || ''} onValueChange={(v) => handleProfileChange('gender', v)}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Masculino</SelectItem>
                            <SelectItem value="female">Femenino</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm font-medium">{profile.gender === 'male' ? 'Masculino' : profile.gender === 'female' ? 'Femenino' : profile.gender || 'No especificado'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Estado Civil</Label>
                      {editingProfile ? (
                        <Select value={profile.marital_status || ''} onValueChange={(v) => handleProfileChange('marital_status', v)}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Soltero/a</SelectItem>
                            <SelectItem value="married">Casado/a</SelectItem>
                            <SelectItem value="divorced">Divorciado/a</SelectItem>
                            <SelectItem value="widowed">Viudo/a</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm font-medium">
                          {profile.marital_status === 'single' ? 'Soltero/a' : 
                           profile.marital_status === 'married' ? 'Casado/a' : 
                           profile.marital_status === 'divorced' ? 'Divorciado/a' : 
                           profile.marital_status === 'widowed' ? 'Viudo/a' : 'No especificado'}
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-slate-500">Dirección</Label>
                      {editingProfile ? (
                        <Input 
                          value={profile.address || ''} 
                          onChange={(e) => handleProfileChange('address', e.target.value)}
                          placeholder="Calle, número, etc."
                        />
                      ) : (
                        <p className="text-sm font-medium">{profile.address || 'No especificado'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Ciudad</Label>
                      {editingProfile ? (
                        <Input 
                          value={profile.city || ''} 
                          onChange={(e) => handleProfileChange('city', e.target.value)}
                        />
                      ) : (
                        <p className="text-sm font-medium">{profile.city || 'No especificado'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Código Postal</Label>
                      {editingProfile ? (
                        <Input 
                          value={profile.zipcode || ''} 
                          onChange={(e) => handleProfileChange('zipcode', e.target.value)}
                        />
                      ) : (
                        <p className="text-sm font-medium">{profile.zipcode || 'No especificado'}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Emergency Contact Section */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">Contacto de Emergencia</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500">Nombre</Label>
                      {editingProfile ? (
                        <Input 
                          value={profile.emergency_contact_name || ''} 
                          onChange={(e) => handleProfileChange('emergency_contact_name', e.target.value)}
                        />
                      ) : (
                        <p className="text-sm font-medium">{profile.emergency_contact_name || 'No especificado'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Teléfono</Label>
                      {editingProfile ? (
                        <Input 
                          value={profile.emergency_contact_phone || ''} 
                          onChange={(e) => handleProfileChange('emergency_contact_phone', e.target.value)}
                        />
                      ) : (
                        <p className="text-sm font-medium">{profile.emergency_contact_phone || 'No especificado'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Relación</Label>
                      {editingProfile ? (
                        <Input 
                          value={profile.emergency_contact_relationship || ''} 
                          onChange={(e) => handleProfileChange('emergency_contact_relationship', e.target.value)}
                          placeholder="Ej: Esposo/a, Padre, Hermano"
                        />
                      ) : (
                        <p className="text-sm font-medium">{profile.emergency_contact_relationship || 'No especificado'}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Employment Info (Read Only) */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">Información Laboral</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500">Departamento</Label>
                      <p className="text-sm font-medium">{profile.department || 'No especificado'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Posición</Label>
                      <p className="text-sm font-medium">{profile.position || 'No especificado'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Fecha de Ingreso</Label>
                      <p className="text-sm font-medium">{profile.hire_date ? moment(profile.hire_date).format('DD/MM/YYYY') : 'No especificado'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Tipo de Empleo</Label>
                      <p className="text-sm font-medium">{profile.employment_type || 'No especificado'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-4">
            {myTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  No tienes tareas asignadas
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myTasks.map(task => (
                  <Card key={task.task_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{task.title}</h3>
                          <p className="text-sm text-slate-500 line-clamp-2 mt-1">{task.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                            </Badge>
                            {task.project_name && (
                              <Badge variant="outline" className="text-xs">
                                {task.project_name}
                              </Badge>
                            )}
                            {task.due_date && (
                              <Badge variant="outline" className={`text-xs ${moment(task.due_date).isBefore(moment()) && task.status !== 'done' ? 'border-red-300 text-red-600' : ''}`}>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {moment(task.due_date).format('DD/MM/YYYY')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select 
                            value={task.status} 
                            onValueChange={(value) => updateTaskStatus(task.task_id, value)}
                          >
                            <SelectTrigger className={`w-[140px] text-xs ${getStatusColor(task.status)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">Pendiente</SelectItem>
                              <SelectItem value="in_progress">En Progreso</SelectItem>
                              <SelectItem value="review">En Revisión</SelectItem>
                              <SelectItem value="done">Completada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pay Stubs Tab */}
          <TabsContent value="paystubs" className="mt-4">
            {payStubs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  No hay talonarios disponibles
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {payStubs.map(stub => (
                  <Card key={stub.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base sm:text-lg">
                            {moment(stub.period_start).format('DD MMM')} - {moment(stub.period_end).format('DD MMM YYYY')}
                          </CardTitle>
                          <p className="text-xs sm:text-sm text-slate-500">{moment(stub.created_at).fromNow()}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700">
                          ${stub.net_pay?.toFixed(2)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mb-3">
                        <div>
                          <span className="text-slate-500">Horas:</span>
                          <span className="ml-1 font-medium">{stub.hours_worked?.toFixed(1)}h</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Bruto:</span>
                          <span className="ml-1 font-medium">${stub.gross_pay?.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Deducciones:</span>
                          <span className="ml-1 font-medium text-red-600">-${stub.total_deductions?.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Método:</span>
                          <span className="ml-1 font-medium capitalize">{stub.payment_method}</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => downloadPayStub(stub)}
                      >
                        <Download className="w-4 h-4 mr-1" /> Descargar PDF
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Hours Tab */}
          <TabsContent value="hours" className="mt-4">
            {clockHistory.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  No hay registros de horas
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Group by date */}
                {Object.entries(
                  clockHistory.reduce((groups, entry) => {
                    const date = entry.date;
                    if (!groups[date]) groups[date] = [];
                    groups[date].push(entry);
                    return groups;
                  }, {})
                ).map(([date, entries]) => {
                  const totalHours = entries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
                  return (
                    <Card key={date}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-slate-900">
                            {moment(date).format('dddd, DD MMM YYYY')}
                          </div>
                          <Badge className="bg-blue-100 text-blue-700">
                            {totalHours.toFixed(2)}h total
                          </Badge>
                        </div>
                        <div className="space-y-2 ml-2 border-l-2 border-slate-200 pl-3">
                          {entries.map((entry, idx) => {
                            const clockInTime = entry.clock_in ? moment(entry.clock_in).format('h:mm A') : '--:--';
                            const clockOutTime = entry.clock_out ? moment(entry.clock_out).format('h:mm A') : null;
                            return (
                              <div key={entry.clock_id || idx} className="flex items-center justify-between text-sm py-1">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    <span className="font-mono font-medium text-slate-800">
                                      {clockInTime}
                                    </span>
                                    <span className="text-slate-400">-</span>
                                    <span className={`font-mono font-medium ${clockOutTime ? 'text-slate-800' : 'text-green-600'}`}>
                                      {clockOutTime || 'Activo'}
                                    </span>
                                  </div>
                                  {entry.project_name && (
                                    <Badge variant="outline" className="text-xs">
                                      {entry.project_name}
                                    </Badge>
                                  )}
                                </div>
                                <span className={`text-sm font-medium ${entry.status === 'active' ? 'text-green-600' : 'text-blue-600'}`}>
                                  {entry.status === 'active' ? '🟢 En curso' : `${(entry.hours_worked || 0).toFixed(2)}h`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default MyProfile;
