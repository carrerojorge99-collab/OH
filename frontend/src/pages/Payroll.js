import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Calculator, Clock, Users, Download, Edit2, Check, Save } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Payroll = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [payrollSettings, setPayrollSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [payPeriod, setPayPeriod] = useState({ start: '', end: '' });
  const [payrollData, setPayrollData] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [editingHours, setEditingHours] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [empRes, settingsRes] = await Promise.all([
        axios.get(`${API}/employees?_t=${Date.now()}`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        axios.get(`${API}/payroll-settings?_t=${Date.now()}`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } })
      ]);
      // Include employees with salary OR hourly_rate
      setEmployees(empRes.data.filter(e => e.profile?.salary > 0 || e.profile?.hourly_rate > 0));
      setPayrollSettings(settingsRes.data);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar datos');
      setLoading(false);
    }
  };

  const fetchClockHours = async (userId) => {
    try {
      const response = await axios.get(`${API}/clock/all`, {
        params: {
          user_id: userId,
          start_date: payPeriod.start,
          end_date: payPeriod.end
        },
        withCredentials: true
      });
      // Sum up all hours worked in the period
      const totalHours = response.data.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
      return totalHours;
    } catch (error) {
      console.error('Error fetching clock hours:', error);
      return 0;
    }
  };

  const calculatePayroll = async () => {
    if (!payPeriod.start || !payPeriod.end) {
      toast.error('Selecciona el período de pago');
      return;
    }

    setProcessing(true);
    
    try {
      const results = await Promise.all(employees.map(async (emp) => {
        const profile = emp.profile || {};
        const hourlyRate = profile.hourly_rate || 0;
        const fixedSalary = profile.salary || 0;
        const isContractor = profile.worker_classification === 'contractor';
        
        // Fetch clock hours for this employee
        const clockHours = await fetchClockHours(emp.user_id);
        
        // Calculate gross pay: if hourly rate, multiply by hours; otherwise use fixed salary
        let grossPay = 0;
        let hoursWorked = clockHours;
        
        if (hourlyRate > 0) {
          grossPay = hourlyRate * hoursWorked;
        } else {
          grossPay = fixedSalary;
        }
        
        let deductions = {};
        let totalDeductions = 0;

        if (isContractor) {
          const contractorDed = grossPay * (payrollSettings.contractor_percent || 10) / 100;
          deductions = { 'Retención 10%': contractorDed };
          totalDeductions = contractorDed;
        } else {
          const hacienda = grossPay * (payrollSettings.hacienda_percent || 0) / 100;
          const ss = grossPay * (payrollSettings.social_security_percent || 6.2) / 100;
          const medicare = grossPay * (payrollSettings.medicare_percent || 1.45) / 100;
          deductions = {
            'Hacienda': hacienda,
            'Seguro Social': ss,
            'Medicare': medicare
          };
          totalDeductions = hacienda + ss + medicare;
        }

        return {
          employee: emp,
          hoursWorked,
          hourlyRate,
          grossPay,
          deductions,
          totalDeductions,
          netPay: grossPay - totalDeductions,
          isContractor,
          isHourly: hourlyRate > 0
        };
      }));

      setPayrollData(results);
      setProcessing(false);
      toast.success('Nómina calculada');
    } catch (error) {
      toast.error('Error al calcular nómina');
      setProcessing(false);
    }
  };

  const updateEmployeeHours = (idx, newHours) => {
    setPayrollData(prev => {
      const updated = [...prev];
      const item = updated[idx];
      item.hoursWorked = parseFloat(newHours) || 0;
      
      // Recalculate if hourly
      if (item.isHourly) {
        item.grossPay = item.hourlyRate * item.hoursWorked;
        
        // Recalculate deductions
        let totalDeductions = 0;
        if (item.isContractor) {
          const contractorDed = item.grossPay * (payrollSettings.contractor_percent || 10) / 100;
          item.deductions = { 'Retención 10%': contractorDed };
          totalDeductions = contractorDed;
        } else {
          const hacienda = item.grossPay * (payrollSettings.hacienda_percent || 0) / 100;
          const ss = item.grossPay * (payrollSettings.social_security_percent || 6.2) / 100;
          const medicare = item.grossPay * (payrollSettings.medicare_percent || 1.45) / 100;
          item.deductions = {
            'Hacienda': hacienda,
            'Seguro Social': ss,
            'Medicare': medicare
          };
          totalDeductions = hacienda + ss + medicare;
        }
        item.totalDeductions = totalDeductions;
        item.netPay = item.grossPay - totalDeductions;
      }
      
      return updated;
    });
    setEditingHours(null);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte de Nómina', 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${moment(payPeriod.start).format('DD/MM/YYYY')} - ${moment(payPeriod.end).format('DD/MM/YYYY')}`, 14, 28);
    doc.text(`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`, 14, 34);

    const tableData = payrollData.map(p => [
      p.employee.name,
      p.isContractor ? 'Contratista' : 'Empleado',
      p.isHourly ? `${p.hoursWorked.toFixed(2)} hrs` : 'Fijo',
      `$${p.grossPay.toFixed(2)}`,
      `$${p.totalDeductions.toFixed(2)}`,
      `$${p.netPay.toFixed(2)}`
    ]);

    const totals = payrollData.reduce((acc, p) => ({
      hours: acc.hours + (p.isHourly ? p.hoursWorked : 0),
      gross: acc.gross + p.grossPay,
      deductions: acc.deductions + p.totalDeductions,
      net: acc.net + p.netPay
    }), { hours: 0, gross: 0, deductions: 0, net: 0 });

    tableData.push(['TOTALES', '', `${totals.hours.toFixed(2)} hrs`, `$${totals.gross.toFixed(2)}`, `$${totals.deductions.toFixed(2)}`, `$${totals.net.toFixed(2)}`]);

    autoTable(doc, {
      startY: 42,
      head: [['Empleado', 'Tipo', 'Horas', 'Salario Bruto', 'Deducciones', 'Neto']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175] },
      footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`Nomina_${payPeriod.start}_${payPeriod.end}.pdf`);
  };

  if (loading) return <Layout><div className="p-8">Cargando...</div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/hr')}><ArrowLeft className="w-4 h-4 mr-2" /> Volver a RH</Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Procesar Nómina</h1>
              <p className="text-slate-600">Calcular pagos y deducciones basado en horas trabajadas</p>
            </div>
          </div>
        </div>

        {/* Period Selection */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" /> Período de Pago</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div><Label>Fecha Inicio</Label><Input type="date" value={payPeriod.start} onChange={(e) => setPayPeriod({...payPeriod, start: e.target.value})} /></div>
              <div><Label>Fecha Fin</Label><Input type="date" value={payPeriod.end} onChange={(e) => setPayPeriod({...payPeriod, end: e.target.value})} /></div>
              <Button onClick={calculatePayroll} disabled={processing} className="bg-blue-600 hover:bg-blue-700">
                <Calculator className="w-4 h-4 mr-2" /> {processing ? 'Calculando...' : 'Calcular Nómina'}
              </Button>
              {payrollData.length > 0 && (
                <Button onClick={exportPDF} variant="outline"><Download className="w-4 h-4 mr-2" /> Exportar PDF</Button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">Las horas trabajadas se obtienen automáticamente de los ponches del empleado</p>
          </CardContent>
        </Card>

        {/* Settings Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600">Hacienda</p>
              <p className="text-xl font-bold text-blue-800">{payrollSettings.hacienda_percent || 0}%</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600">Seguro Social</p>
              <p className="text-xl font-bold text-blue-800">{payrollSettings.social_security_percent || 6.2}%</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600">Medicare</p>
              <p className="text-xl font-bold text-blue-800">{payrollSettings.medicare_percent || 1.45}%</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50">
            <CardContent className="p-4">
              <p className="text-xs text-amber-600">Contratistas</p>
              <p className="text-xl font-bold text-amber-800">{payrollSettings.contractor_percent || 10}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Results */}
        {payrollData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Resultado de Nómina ({payrollData.length} empleados)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left p-3">Empleado</th>
                      <th className="text-left p-3">Tipo</th>
                      <th className="text-center p-3">Horas Trabajadas</th>
                      <th className="text-right p-3">Tarifa/Salario</th>
                      <th className="text-right p-3">Salario Bruto</th>
                      <th className="text-right p-3">Deducciones</th>
                      <th className="text-right p-3">Neto a Pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollData.map((p, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-medium">{p.employee.name}</p>
                          <p className="text-xs text-slate-500">{p.employee.profile?.position}</p>
                        </td>
                        <td className="p-3">
                          <Badge className={p.isContractor ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                            {p.isContractor ? 'Contratista' : 'Empleado'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          {p.isHourly ? (
                            <div className="flex items-center justify-center gap-2">
                              {editingHours === idx ? (
                                <div className="flex items-center gap-1">
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    defaultValue={p.hoursWorked}
                                    className="w-20 h-8 text-center"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') updateEmployeeHours(idx, e.target.value);
                                      if (e.key === 'Escape') setEditingHours(null);
                                    }}
                                    autoFocus
                                  />
                                  <Button size="sm" variant="ghost" onClick={(e) => updateEmployeeHours(idx, e.target.previousSibling.value)}>
                                    <Check className="w-4 h-4 text-green-600" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  <span className="font-mono">{p.hoursWorked.toFixed(2)} hrs</span>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingHours(idx)} title="Editar horas">
                                    <Edit2 className="w-3 h-3 text-slate-400" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Salario Fijo</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-xs">
                          {p.isHourly ? `$${p.hourlyRate.toFixed(2)}/hr` : `$${p.employee.profile?.salary?.toFixed(2) || '0.00'}`}
                        </td>
                        <td className="p-3 text-right font-mono">${p.grossPay.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <p className="font-mono text-red-600">-${p.totalDeductions.toFixed(2)}</p>
                          <div className="text-xs text-slate-500">
                            {Object.entries(p.deductions).map(([k, v]) => (
                              <span key={k} className="mr-2">{k}: ${v.toFixed(2)}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-green-600">${p.netPay.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold">
                    <tr>
                      <td colSpan="2" className="p-3">TOTALES</td>
                      <td className="p-3 text-center font-mono">{payrollData.reduce((a, p) => a + (p.isHourly ? p.hoursWorked : 0), 0).toFixed(2)} hrs</td>
                      <td className="p-3"></td>
                      <td className="p-3 text-right font-mono">${payrollData.reduce((a, p) => a + p.grossPay, 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-red-600">-${payrollData.reduce((a, p) => a + p.totalDeductions, 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-green-600">${payrollData.reduce((a, p) => a + p.netPay, 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {payrollData.length === 0 && employees.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No hay empleados con salario o tarifa por hora configurados</p>
              <p className="text-sm">Ve a Recursos Humanos y configura el salario o tarifa por hora en el perfil de cada empleado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Payroll;
