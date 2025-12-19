import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Calculator, DollarSign, Users, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = process.env.REACT_APP_BACKEND_URL;

const Payroll = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [payrollSettings, setPayrollSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [payPeriod, setPayPeriod] = useState({ start: '', end: '' });
  const [payrollData, setPayrollData] = useState([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [empRes, settingsRes] = await Promise.all([
        api.get(`/api/employees`, { withCredentials: true }),
        api.get(`/api/payroll-settings`, { withCredentials: true })
      ]);
      setEmployees(empRes.data.filter(e => e.profile?.salary > 0));
      setPayrollSettings(settingsRes.data);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar datos');
      setLoading(false);
    }
  };

  const calculatePayroll = () => {
    if (!payPeriod.start || !payPeriod.end) {
      toast.error('Selecciona el período de pago');
      return;
    }

    setProcessing(true);
    const results = employees.map(emp => {
      const profile = emp.profile || {};
      const salary = profile.salary || 0;
      const isContractor = profile.worker_classification === 'contractor';
      
      let deductions = {};
      let totalDeductions = 0;

      if (isContractor) {
        const contractorDed = salary * (payrollSettings.contractor_percent || 10) / 100;
        deductions = { 'Retención 10%': contractorDed };
        totalDeductions = contractorDed;
      } else {
        const hacienda = salary * (payrollSettings.hacienda_percent || 0) / 100;
        const ss = salary * (payrollSettings.social_security_percent || 6.2) / 100;
        const medicare = salary * (payrollSettings.medicare_percent || 1.45) / 100;
        deductions = {
          'Hacienda': hacienda,
          'Seguro Social': ss,
          'Medicare': medicare
        };
        totalDeductions = hacienda + ss + medicare;
      }

      return {
        employee: emp,
        grossPay: salary,
        deductions,
        totalDeductions,
        netPay: salary - totalDeductions,
        isContractor
      };
    });

    setPayrollData(results);
    setProcessing(false);
    toast.success('Nómina calculada');
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
      `$${p.grossPay.toFixed(2)}`,
      `$${p.totalDeductions.toFixed(2)}`,
      `$${p.netPay.toFixed(2)}`
    ]);

    const totals = payrollData.reduce((acc, p) => ({
      gross: acc.gross + p.grossPay,
      deductions: acc.deductions + p.totalDeductions,
      net: acc.net + p.netPay
    }), { gross: 0, deductions: 0, net: 0 });

    tableData.push(['TOTALES', '', `$${totals.gross.toFixed(2)}`, `$${totals.deductions.toFixed(2)}`, `$${totals.net.toFixed(2)}`]);

    autoTable(doc, {
      startY: 42,
      head: [['Empleado', 'Tipo', 'Salario Bruto', 'Deducciones', 'Neto']],
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
              <p className="text-slate-600">Calcular pagos y deducciones</p>
            </div>
          </div>
        </div>

        {/* Period Selection */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" /> Período de Pago</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div><Label>Fecha Inicio</Label><Input type="date" value={payPeriod.start} onChange={(e) => setPayPeriod({...payPeriod, start: e.target.value})} /></div>
              <div><Label>Fecha Fin</Label><Input type="date" value={payPeriod.end} onChange={(e) => setPayPeriod({...payPeriod, end: e.target.value})} /></div>
              <Button onClick={calculatePayroll} disabled={processing} className="bg-blue-600 hover:bg-blue-700">
                <Calculator className="w-4 h-4 mr-2" /> Calcular Nómina
              </Button>
              {payrollData.length > 0 && (
                <Button onClick={exportPDF} variant="outline"><Download className="w-4 h-4 mr-2" /> Exportar PDF</Button>
              )}
            </div>
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
              <p>No hay empleados con salario configurado</p>
              <p className="text-sm">Ve a Recursos Humanos y configura el salario en el perfil de cada empleado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Payroll;
