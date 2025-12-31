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

  if (loading) return <Layout><div className="p-8 text-center">Cargando...</div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
            <User className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{user?.name || 'Mi Perfil'}</h1>
            <p className="text-slate-500">{user?.email}</p>
          </div>
        </div>

        <Tabs defaultValue="paystubs">
          <TabsList>
            <TabsTrigger value="paystubs">
              <DollarSign className="w-4 h-4 mr-1" /> Talonarios ({payStubs.length})
            </TabsTrigger>
            <TabsTrigger value="hours">
              <Clock className="w-4 h-4 mr-1" /> Mis Horas
            </TabsTrigger>
          </TabsList>

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
              <div className="grid gap-4 md:grid-cols-2">
                {payStubs.map(stub => (
                  <Card key={stub.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {moment(stub.period_start).format('DD MMM')} - {moment(stub.period_end).format('DD MMM YYYY')}
                          </CardTitle>
                          <p className="text-sm text-slate-500">{moment(stub.created_at).fromNow()}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700">
                          ${stub.net_pay?.toFixed(2)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
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
