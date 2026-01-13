import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Calculator, Clock, Users, Download, Edit2, Check, Save, FileText, Printer, History, Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchCompanyInfo, addReportHeader, addReportTable, addFooter, addPayStubHeader, addPaySection } from '../utils/pdfGenerator';


const Payroll = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [payrollSettings, setPayrollSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [payPeriod, setPayPeriod] = useState({ start: '', end: '' });
  const [payrollData, setPayrollData] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [editingHours, setEditingHours] = useState(null);
  const [saving, setSaving] = useState(false);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  // Start with 'all' and update to current year if data exists
  const [yearFilter, setYearFilter] = useState('all');
  const [yearInitialized, setYearInitialized] = useState(false);

  // Generate available years from payroll history
  const availableYears = useMemo(() => {
    const years = new Set();
    payrollHistory.forEach(p => {
      if (p.period_start) {
        years.add(new Date(p.period_start).getFullYear());
      }
      if (p.created_at) {
        years.add(new Date(p.created_at).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [payrollHistory]);

  // Filter payroll history by year
  const filteredPayrollHistory = useMemo(() => {
    if (yearFilter === 'all') return payrollHistory;
    return payrollHistory.filter(p => {
      const year = p.period_start ? new Date(p.period_start).getFullYear() : new Date(p.created_at).getFullYear();
      return year === parseInt(yearFilter);
    });
  }, [payrollHistory, yearFilter]);

  // Auto-set year filter to current year if available
  useEffect(() => {
    if (!yearInitialized && payrollHistory.length > 0) {
      const currentYear = new Date().getFullYear();
      if (availableYears.includes(currentYear)) {
        setYearFilter(currentYear.toString());
      }
      setYearInitialized(true);
    }
  }, [payrollHistory, availableYears, yearInitialized]);

  useEffect(() => {
    loadData();
    loadPayrollHistory();
  }, []);

  const loadData = async () => {
    try {
      const [empRes, settingsRes] = await Promise.all([
        api.get(`/employees?_t=${Date.now()}`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        api.get(`/payroll-settings?_t=${Date.now()}`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } })
      ]);
      // Include ALL employees EXCEPT clients
      const nonClientEmployees = empRes.data.filter(e => e.role !== 'client');
      setEmployees(nonClientEmployees);
      setPayrollSettings(settingsRes.data);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar datos');
      setLoading(false);
    }
  };

  const loadPayrollHistory = async () => {
    try {
      const res = await api.get('/payroll/history', { withCredentials: true });
      setPayrollHistory(res.data || []);
    } catch (error) {
      console.error('Error loading payroll history:', error);
    }
  };

  // Load saved payroll by period
  const loadSavedPayroll = (run) => {
    setPayPeriod({ start: run.period_start, end: run.period_end });
    // Transform saved employees data back to payrollData format
    const savedData = (run.employees || []).map(emp => ({
      employee: {
        user_id: emp.user_id || emp.employee_id,
        name: emp.name || emp.employee_name,
        profile: {
          position: emp.position || '',
          hourly_rate: emp.rate || 0,
          salary: emp.is_hourly ? 0 : emp.rate,
          payment_method: emp.payment_method || 'check'
        }
      },
      hoursWorked: emp.hours || emp.hours_worked || 0,
      hourlyRate: emp.is_hourly ? (emp.rate || 0) : 0,
      fixedSalary: emp.is_hourly ? 0 : (emp.rate || 0),
      grossPay: emp.grossPay || emp.gross_pay || 0,
      deductions: {
        ...(emp.hacienda > 0 ? { 'Hacienda': emp.hacienda } : {}),
        ...(emp.ss > 0 ? { 'Seguro Social': emp.ss } : {}),
        ...(emp.medicare > 0 ? { 'Medicare': emp.medicare } : {}),
        ...(emp.otherDeductions > 0 ? { 'Retención 10%': emp.otherDeductions } : {})
      },
      totalDeductions: emp.deductions || emp.total_deductions || 0,
      netPay: emp.netPay || emp.net_pay || 0,
      isContractor: emp.is_contractor || emp.type === 'contractor',
      isExemptFromDeduction: false,
      isHourly: emp.is_hourly || false,
      hasPayConfig: (emp.rate || 0) > 0
    }));
    setPayrollData(savedData);
    setShowHistory(false);
    toast.success(`Nómina del ${run.period_start} al ${run.period_end} cargada`);
  };

  const fetchClockHours = async (userId) => {
    try {
      const response = await api.get(`/clock/all`, {
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
      // Recargar datos frescos antes de calcular
      const [empRes, settingsRes] = await Promise.all([
        api.get(`/employees`),
        api.get(`/payroll-settings`)
      ]);
      // Include ALL employees EXCEPT clients
      const freshEmployees = empRes.data.filter(e => e.role !== 'client');
      const freshSettings = settingsRes.data;
      setEmployees(freshEmployees);
      setPayrollSettings(freshSettings);

      const results = await Promise.all(freshEmployees.map(async (emp) => {
        const profile = emp.profile || {};
        const hourlyRate = profile.hourly_rate || 0;
        const fixedSalary = profile.salary || 0;
        const isContractor = profile.worker_classification === 'contractor';
        
        // Fetch clock hours for this employee
        const clockHours = await fetchClockHours(emp.user_id);
        
        // Calculate gross pay: if hourly rate, multiply by hours; otherwise use fixed salary
        let grossPay = 0;
        let hoursWorked = clockHours;
        
        // Determine if employee has pay configured
        const hasPayConfig = hourlyRate > 0 || fixedSalary > 0;
        
        if (hourlyRate > 0) {
          grossPay = hourlyRate * hoursWorked;
        } else if (fixedSalary > 0) {
          grossPay = fixedSalary;
        }
        
        let deductions = {};
        let totalDeductions = 0;

        if (grossPay > 0) {
          if (isContractor) {
            const contractorDed = grossPay * (freshSettings.contractor_percent || 10) / 100;
            deductions = { 'Retención 10%': contractorDed };
            totalDeductions = contractorDed;
          } else {
            const hacienda = grossPay * (freshSettings.hacienda_percent || 0) / 100;
            const ss = grossPay * (freshSettings.social_security_percent || 6.2) / 100;
            const medicare = grossPay * (freshSettings.medicare_percent || 1.45) / 100;
            deductions = {
              'Hacienda': hacienda,
              'Seguro Social': ss,
              'Medicare': medicare
            };
            totalDeductions = hacienda + ss + medicare;
          }
        }

        return {
          employee: emp,
          hoursWorked,
          hourlyRate,
          fixedSalary,
          grossPay,
          deductions,
          totalDeductions,
          netPay: grossPay - totalDeductions,
          isContractor,
          isExemptFromDeduction: false, // By default, no one is exempt
          isHourly: hourlyRate > 0,
          hasPayConfig,
          paymentMethod: profile.payment_method || 'check'
        };
      }));

      // Filter: Only show employees with hours worked OR fixed salary
      const employeesWithActivity = results.filter(r => r.hoursWorked > 0 || r.fixedSalary > 0);
      
      if (employeesWithActivity.length === 0) {
        toast.warning('No hay empleados con horas registradas en este período');
      }

      setPayrollData(employeesWithActivity);
      setProcessing(false);
      toast.success(`Nómina calculada: ${employeesWithActivity.length} empleados con actividad`);
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
        if (item.isExemptFromDeduction) {
          // Exempt: No deductions
          item.deductions = {};
          totalDeductions = 0;
        } else if (item.isContractor) {
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

  // Toggle exemption from contractor deduction for an employee
  const toggleContractorExemption = (idx, isExempt) => {
    setPayrollData(prev => {
      const updated = [...prev];
      const item = updated[idx];
      item.isExemptFromDeduction = isExempt;
      
      // Recalculate deductions based on exemption status
      if (item.grossPay > 0) {
        let totalDeductions = 0;
        if (isExempt) {
          // Exempt: No deductions applied
          item.deductions = {};
          totalDeductions = 0;
        } else if (item.isContractor) {
          // Contractor not exempt: Apply 10% retention
          const contractorDed = item.grossPay * (payrollSettings.contractor_percent || 10) / 100;
          item.deductions = { 'Retención 10%': contractorDed };
          totalDeductions = contractorDed;
        } else {
          // Regular employee not exempt: Apply standard deductions
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
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    const company = await fetchCompanyInfo();
    
    // Header with company info and report title
    const subtitle = `Período: ${moment(payPeriod.start).format('DD/MM/YYYY')} - ${moment(payPeriod.end).format('DD/MM/YYYY')}`;
    let y = await addReportHeader(doc, company, 'REPORTE DE NÓMINA', subtitle);

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

    const footerRow = ['TOTALES', '', `${totals.hours.toFixed(2)} hrs`, `$${totals.gross.toFixed(2)}`, `$${totals.deductions.toFixed(2)}`, `$${totals.net.toFixed(2)}`];

    addReportTable(doc, 
      ['Empleado', 'Tipo', 'Horas', 'Salario Bruto', 'Deducciones', 'Neto'],
      tableData,
      y,
      { 
        footerRow,
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 30, halign: 'right' }
        }
      }
    );

    addFooter(doc, company);
    doc.save(`Nomina_${payPeriod.start}_${payPeriod.end}.pdf`);
  };

  const savePayroll = async () => {
    if (payrollData.length === 0) {
      toast.error('No hay datos de nómina para guardar');
      return;
    }
    
    setSaving(true);
    try {
      const totals = payrollData.reduce((acc, p) => ({
        hours: acc.hours + (p.isHourly ? p.hoursWorked : 0),
        gross: acc.gross + p.grossPay,
        deductions: acc.deductions + p.totalDeductions,
        net: acc.net + p.netPay
      }), { hours: 0, gross: 0, deductions: 0, net: 0 });

      const payload = {
        period_start: payPeriod.start,
        period_end: payPeriod.end,
        employees: payrollData.map(p => ({
          employee_id: p.employee.id,
          user_id: p.employee.user_id,
          name: p.employee.name,
          employee_name: p.employee.name,
          type: p.isContractor ? 'contractor' : 'employee',
          is_contractor: p.isContractor,
          is_hourly: p.isHourly,
          hours: p.hoursWorked,
          hours_worked: p.hoursWorked,
          rate: p.isHourly ? p.hourlyRate : (p.employee.profile?.salary || 0),
          grossPay: p.grossPay,
          gross_pay: p.grossPay,
          hacienda: p.deductions['Hacienda'] || 0,
          ss: p.deductions['Seguro Social'] || 0,
          medicare: p.deductions['Medicare'] || 0,
          otherDeductions: p.deductions['Retención 10%'] || 0,
          deductions: p.totalDeductions,
          total_deductions: p.totalDeductions,
          netPay: p.netPay,
          net_pay: p.netPay,
          payment_method: p.employee.profile?.payment_method || 'check'
        })),
        totals
      };

      await api.post(`/payroll/process`, payload, { withCredentials: true });
      toast.success('Nómina guardada exitosamente');
      loadPayrollHistory(); // Reload history after saving
    } catch (error) {
      toast.error('Error al guardar nómina');
    } finally {
      setSaving(false);
    }
  };

  const downloadNACHA = async () => {
    try {
      const nachaData = {
        employees: payrollData.map(p => ({
          employee_id: p.employee.user_id,
          employee_name: p.employee.name,
          net_pay: p.netPay,
          routing_number: p.employee.profile?.routing_number || '',
          bank_account: p.employee.profile?.bank_account || '',
          account_type: p.employee.profile?.account_type || 'checking'
        }))
      };
      
      const response = await api.post('/payroll/nacha', nachaData, { 
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NACHA_${payPeriod.start}_${payPeriod.end}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Archivo NACHA descargado');
    } catch (error) {
      toast.error('Error al generar NACHA');
    }
  };

  // Generate individual pay stub PDF for an employee
  const generatePayStubPDF = async (payrollItem) => {
    const doc = new jsPDF();
    const company = await fetchCompanyInfo();
    const p = payrollItem;
    
    // Header with company info and document title
    const period = `${moment(payPeriod.start).format('DD/MM/YYYY')} - ${moment(payPeriod.end).format('DD/MM/YYYY')}`;
    let y = await addPayStubHeader(doc, company, period);
    
    // Employee Info Section
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 115, 22);
    doc.text('EMPLEADO', 15, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.text(p.employee.name || 'N/A', 15, y + 6);
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Posición: ${p.employee.profile?.position || 'N/A'}`, 15, y + 12);
    doc.text(`Tipo: ${p.isContractor ? 'Contratista' : 'Empleado'}`, 15, y + 17);
    
    y += 28;
    
    // Earnings Section
    const earnings = [];
    if (p.isHourly) {
      earnings.push({ label: `Horas Trabajadas: ${p.hoursWorked?.toFixed(2) || 0}`, value: `$${p.hourlyRate?.toFixed(2) || 0}/hr` });
    } else {
      earnings.push({ label: 'Salario Fijo:', value: `$${p.fixedSalary?.toFixed(2) || 0}` });
    }
    earnings.push({ label: 'Pago Bruto:', value: `$${p.grossPay?.toFixed(2) || 0}` });
    y = addPaySection(doc, 'INGRESOS', earnings, y);
    
    // Deductions Section
    const deductions = [];
    Object.entries(p.deductions || {}).forEach(([key, value]) => {
      deductions.push({ label: `${key}:`, value: `-$${(value || 0).toFixed(2)}` });
    });
    deductions.push({ label: 'Total Deducciones:', value: `-$${p.totalDeductions?.toFixed(2) || 0}` });
    y = addPaySection(doc, 'DEDUCCIONES', deductions, y);
    
    // Net Pay Section (highlighted)
    y = addPaySection(doc, 'PAGO NETO', [{ label: '', value: `$${p.netPay?.toFixed(2) || 0}` }], y, true);
    
    // Payment Method
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Método de Pago: ${p.employee.profile?.payment_method === 'direct_deposit' ? 'Depósito Directo' : 'Cheque'}`, 15, y + 5);
    
    // Footer
    addFooter(doc, company);
    
    doc.save(`Talonario_${p.employee.name?.replace(/\s+/g, '_')}_${moment(payPeriod.end).format('YYYYMMDD')}.pdf`);
    toast.success(`Talonario de ${p.employee.name} generado`);
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
              <p className="text-slate-600">
                Calcular pagos y deducciones basado en horas trabajadas
                {yearFilter !== 'all' && <span className="text-blue-600 font-medium"> - Año {yearFilter}</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los años</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => { setLoading(true); loadData(); loadPayrollHistory(); }}
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
              <History className="w-4 h-4 mr-2" /> {showHistory ? 'Ocultar' : 'Ver'} Historial ({filteredPayrollHistory.length})
            </Button>
          </div>
        </div>

        {/* Payroll History */}
        {showHistory && filteredPayrollHistory.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Historial de Nóminas Guardadas</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left p-3">Período</th>
                      <th className="text-center p-3">Empleados</th>
                      <th className="text-right p-3">Total Bruto</th>
                      <th className="text-right p-3">Total Deducciones</th>
                      <th className="text-right p-3">Total Neto</th>
                      <th className="text-left p-3">Procesado Por</th>
                      <th className="text-left p-3">Fecha</th>
                      <th className="text-center p-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayrollHistory.map((run, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{run.period_start} al {run.period_end}</td>
                        <td className="p-3 text-center">{run.employees?.length || 0}</td>
                        <td className="p-3 text-right font-mono">${(run.totals?.gross || 0).toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-red-600">-${(run.totals?.deductions || 0).toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-green-600 font-bold">${(run.totals?.net || 0).toFixed(2)}</td>
                        <td className="p-3">{run.processed_by_name || 'N/A'}</td>
                        <td className="p-3 text-xs text-slate-500">{run.processed_at ? moment(run.processed_at).format('DD/MM/YYYY HH:mm') : 'N/A'}</td>
                        <td className="p-3 text-center">
                          <Button size="sm" variant="outline" onClick={() => loadSavedPayroll(run)}>
                            Cargar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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
                <>
                  <Button onClick={savePayroll} disabled={saving} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" /> {saving ? 'Guardando...' : 'Guardar Nómina'}
                  </Button>
                  <Button onClick={exportPDF} variant="outline"><Download className="w-4 h-4 mr-2" /> Exportar PDF</Button>
                  <Button onClick={downloadNACHA} variant="outline"><FileText className="w-4 h-4 mr-2" /> NACHA</Button>
                </>
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
                      <th className="text-center p-3">Exento</th>
                      <th className="text-center p-3">Horas Trabajadas</th>
                      <th className="text-right p-3">Tarifa/Salario</th>
                      <th className="text-right p-3">Salario Bruto</th>
                      <th className="text-right p-3">Deducciones</th>
                      <th className="text-right p-3">Neto a Pagar</th>
                      <th className="text-center p-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollData.map((p, idx) => (
                      <tr key={idx} className={`border-b hover:bg-slate-50 ${!p.hasPayConfig ? 'bg-yellow-50' : ''} ${p.isExemptFromDeduction ? 'bg-green-50' : ''}`}>
                        <td className="p-3">
                          <p className="font-medium">{p.employee.name}</p>
                          <p className="text-xs text-slate-500">{p.employee.profile?.position || 'Sin posición'}</p>
                          {!p.hasPayConfig && (
                            <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400 mt-1">
                              Sin tarifa configurada
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge className={p.isContractor ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                            {p.isContractor ? 'Contratista' : 'Empleado'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={p.isExemptFromDeduction}
                            onCheckedChange={(checked) => toggleContractorExemption(idx, checked)}
                            disabled={p.grossPay <= 0}
                            title={p.isExemptFromDeduction ? 'Exento de retención' : 'Con retención'}
                          />
                        </td>
                        <td className="p-3 text-center">
                          {p.isHourly || !p.hasPayConfig ? (
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
                                  <span className={`font-mono ${p.hoursWorked === 0 ? 'text-slate-400' : ''}`}>
                                    {p.hoursWorked.toFixed(2)} hrs
                                  </span>
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
                          {p.isHourly ? `$${p.hourlyRate.toFixed(2)}/hr` : 
                           p.fixedSalary > 0 ? `$${p.fixedSalary.toFixed(2)}` : 
                           <span className="text-yellow-600">$0.00</span>}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {p.grossPay > 0 ? `$${p.grossPay.toFixed(2)}` : <span className="text-slate-400">$0.00</span>}
                        </td>
                        <td className="p-3 text-right">
                          <p className={`font-mono ${p.totalDeductions > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            -${p.totalDeductions.toFixed(2)}
                          </p>
                          {p.totalDeductions > 0 && (
                            <div className="text-xs text-slate-500">
                              {Object.entries(p.deductions).map(([k, v]) => (
                                <span key={k} className="mr-2">{k}: ${v.toFixed(2)}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-green-600">
                          {p.netPay > 0 ? `$${p.netPay.toFixed(2)}` : <span className="text-slate-400">$0.00</span>}
                        </td>
                        <td className="p-3 text-center">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => generatePayStubPDF(p)}
                            disabled={p.netPay <= 0}
                            title={p.netPay <= 0 ? 'No hay pago para generar talonario' : 'Imprimir talonario'}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold">
                    <tr>
                      <td colSpan="3" className="p-3">TOTALES</td>
                      <td className="p-3 text-center font-mono">{payrollData.reduce((a, p) => a + (p.isHourly ? p.hoursWorked : 0), 0).toFixed(2)} hrs</td>
                      <td className="p-3"></td>
                      <td className="p-3 text-right font-mono">${payrollData.reduce((a, p) => a + p.grossPay, 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-red-600">-${payrollData.reduce((a, p) => a + p.totalDeductions, 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-green-600">${payrollData.reduce((a, p) => a + p.netPay, 0).toFixed(2)}</td>
                      <td className="p-3"></td>
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
              <p>No hay empleados registrados en el sistema</p>
              <p className="text-sm">Ve a Recursos Humanos para agregar empleados</p>
            </CardContent>
          </Card>
        )}

        {payrollData.length === 0 && employees.length > 0 && (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <Calculator className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">{employees.length} empleados disponibles</p>
              <p className="text-sm">Selecciona un período y haz clic en &quot;Calcular Nómina&quot; para ver los resultados</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Payroll;
