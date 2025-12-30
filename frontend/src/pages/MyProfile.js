import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { User, DollarSign, Clock, FileText, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';
import jsPDF from 'jspdf';

moment.locale('es');

const MyProfile = () => {
  const { user } = useAuth();
  const [payStubs, setPayStubs] = useState([]);
  const [clockHistory, setClockHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stubsRes, clockRes] = await Promise.all([
        api.get('/pay-stubs/my'),
        api.get('/clock/history')
      ]);
      setPayStubs(stubsRes.data);
      // Filter only current user's clock entries
      const myClocks = clockRes.data.filter(c => c.user_id === user?.user_id);
      setClockHistory(myClocks.slice(0, 20));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPayStub = (stub) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, 220, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('TALONARIO DE PAGO', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Período: ${moment(stub.period_start).format('DD/MM/YYYY')} - ${moment(stub.period_end).format('DD/MM/YYYY')}`, 105, 30, { align: 'center' });
    
    // Employee Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('EMPLEADO', 20, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(stub.employee_name || 'N/A', 20, 58);
    doc.text(`ID: ${stub.employee_id?.slice(-8) || 'N/A'}`, 20, 65);
    
    // Earnings
    let y = 85;
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y - 8, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('INGRESOS', 20, y);
    
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.text(`Horas Trabajadas: ${stub.hours_worked?.toFixed(2) || 0}`, 20, y);
    doc.text(`$${stub.hourly_rate?.toFixed(2) || 0}/hr`, 150, y);
    
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Pago Bruto:', 20, y);
    doc.text(`$${stub.gross_pay?.toFixed(2) || 0}`, 150, y);
    
    // Deductions
    y += 20;
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y - 8, 180, 10, 'F');
    doc.text('DEDUCCIONES', 20, y);
    
    y += 12;
    doc.setFont('helvetica', 'normal');
    const ded = stub.deductions || {};
    doc.text('Hacienda:', 20, y);
    doc.text(`-$${(ded.hacienda || 0).toFixed(2)}`, 150, y);
    
    y += 8;
    doc.text('Seguro Social:', 20, y);
    doc.text(`-$${(ded.social_security || 0).toFixed(2)}`, 150, y);
    
    y += 8;
    doc.text('Medicare:', 20, y);
    doc.text(`-$${(ded.medicare || 0).toFixed(2)}`, 150, y);
    
    if (ded.other > 0) {
      y += 8;
      doc.text('Otras deducciones:', 20, y);
      doc.text(`-$${(ded.other || 0).toFixed(2)}`, 150, y);
    }
    
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Deducciones:', 20, y);
    doc.text(`-$${stub.total_deductions?.toFixed(2) || 0}`, 150, y);
    
    // Net Pay
    y += 20;
    doc.setFillColor(249, 115, 22);
    doc.rect(15, y - 8, 180, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('PAGO NETO:', 20, y + 2);
    doc.text(`$${stub.net_pay?.toFixed(2) || 0}`, 150, y + 2);
    
    // Footer
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.text(`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`, 105, 280, { align: 'center' });
    
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
