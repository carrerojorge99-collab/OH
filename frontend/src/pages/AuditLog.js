import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, Plus, Pencil, Trash2, User, FolderKanban, CheckSquare, DollarSign, Download, Search, Filter, Calendar, Clock, Package, Receipt, Users, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchCompanyInfo, addReportHeader, addReportTable, addFooter } from '../utils/pdfGenerator';

moment.locale('es');

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadLogs();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await api.get('/audit-logs?limit=1000');
      setLogs(response.data);
    } catch (error) {
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar logs localmente
  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.entity_type !== filterType) return false;
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterUser !== 'all' && log.user_id !== filterUser) return false;
    if (dateFrom && moment(log.timestamp).isBefore(moment(dateFrom), 'day')) return false;
    if (dateTo && moment(log.timestamp).isAfter(moment(dateTo), 'day')) return false;
    if (searchTerm && !(log.entity_name || '').toLowerCase().includes(searchTerm.toLowerCase()) && 
        !(log.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const exportPDF = async () => {
    const doc = new jsPDF();
    const company = await fetchCompanyInfo();
    
    // Build subtitle with filters
    let filterText = '';
    if (filterType !== 'all') filterText += `Tipo: ${getEntityLabel(filterType)} | `;
    if (filterAction !== 'all') filterText += `Acción: ${filterAction} | `;
    if (dateFrom) filterText += `Desde: ${dateFrom} | `;
    if (dateTo) filterText += `Hasta: ${dateTo}`;
    if (!filterText) filterText = 'Sin filtros aplicados';
    
    // Header with company info
    let y = await addReportHeader(doc, company, 'INFORME DE AUDITORÍA', filterText.replace(/ \| $/, ''));
    
    // Record count
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total registros: ${filteredLogs.length}`, 15, y);
    y += 8;
    
    // Table data
    const tableData = filteredLogs.map(log => [
      moment(log.timestamp).format('DD/MM/YY HH:mm'),
      log.user_name || 'N/A',
      getActionLabel(log.action),
      getEntityLabel(log.entity_type),
      (log.entity_name || '').substring(0, 40),
      log.details?.changes ? Object.keys(log.details.changes).join(', ').substring(0, 30) : '-'
    ]);
    
    addReportTable(doc,
      ['Fecha', 'Usuario', 'Acción', 'Tipo', 'Entidad', 'Cambios'],
      tableData,
      y,
      {
        fontSize: 7,
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 22 },
          4: { cellWidth: 50 },
          5: { cellWidth: 40 }
        }
      }
    );
    
    // Footer with page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
    }
    
    doc.save(`Auditoria_${moment().format('YYYYMMDD_HHmm')}.pdf`);
    toast.success('PDF generado');
  };

  const getActionLabel = (action) => {
    const labels = { create: 'Creado', update: 'Actualizado', delete: 'Eliminado', login: 'Login', logout: 'Logout' };
    return labels[action] || action;
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'create':
        return <Badge className="bg-green-100 text-green-700"><Plus className="w-3 h-3 mr-1" />Creado</Badge>;
      case 'update':
        return <Badge className="bg-blue-100 text-blue-700"><Pencil className="w-3 h-3 mr-1" />Actualizado</Badge>;
      case 'delete':
        return <Badge className="bg-red-100 text-red-700"><Trash2 className="w-3 h-3 mr-1" />Eliminado</Badge>;
      case 'login':
        return <Badge className="bg-purple-100 text-purple-700">Login</Badge>;
      case 'approve':
        return <Badge className="bg-emerald-100 text-emerald-700"><FileCheck className="w-3 h-3 mr-1" />Aprobado</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  const getEntityIcon = (entityType) => {
    const icons = {
      project: <FolderKanban className="w-4 h-4" />,
      task: <CheckSquare className="w-4 h-4" />,
      expense: <DollarSign className="w-4 h-4" />,
      user: <User className="w-4 h-4" />,
      invoice: <Receipt className="w-4 h-4" />,
      estimate: <FileText className="w-4 h-4" />,
      purchase_order: <Package className="w-4 h-4" />,
      employee: <Users className="w-4 h-4" />,
      payroll: <DollarSign className="w-4 h-4" />,
      change_order: <FileCheck className="w-4 h-4" />,
      approval: <FileCheck className="w-4 h-4" />
    };
    return icons[entityType] || <FileText className="w-4 h-4" />;
  };

  const getEntityLabel = (entityType) => {
    const labels = {
      project: 'Proyecto', task: 'Tarea', expense: 'Gasto', user: 'Usuario',
      category: 'Categoría', labor: 'Salario', timesheet: 'Timesheet',
      invoice: 'Factura', estimate: 'Estimado', purchase_order: 'Orden Compra',
      employee: 'Empleado', payroll: 'Nómina', change_order: 'Change Order',
      approval: 'Aprobación', document: 'Documento', comment: 'Comentario'
    };
    return labels[entityType] || entityType;
  };

  const clearFilters = () => {
    setFilterType('all');
    setFilterAction('all');
    setFilterUser('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  const handleClearAuditLogs = async () => {
    if (!window.confirm('⚠️ ¿Estás seguro de eliminar TODO el historial de auditoría? Esta acción no se puede deshacer.')) {
      return;
    }
    
    const password = window.prompt('Por seguridad, ingresa tu contraseña de Super Admin:');
    if (!password) {
      toast.error('Operación cancelada - Se requiere contraseña');
      return;
    }
    
    try {
      const response = await api.post('/audit-logs/clear', { password }, { withCredentials: true });
      toast.success(response.data.message || 'Historial de auditoría eliminado');
      setLogs([]);
    } catch (error) {
      console.error('Error clearing audit logs:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar historial');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Historial de Auditoría</h1>
            <p className="text-muted-foreground mt-1">Registro completo de todas las acciones del sistema</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleClearAuditLogs} variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" /> Limpiar Historial
            </Button>
            <Button onClick={exportPDF} className="bg-orange-600 hover:bg-orange-700">
              <Download className="w-4 h-4 mr-2" /> Exportar PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <Label className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400" />
                  <Input 
                    placeholder="Nombre..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="project">Proyectos</SelectItem>
                    <SelectItem value="task">Tareas</SelectItem>
                    <SelectItem value="expense">Gastos</SelectItem>
                    <SelectItem value="invoice">Facturas</SelectItem>
                    <SelectItem value="estimate">Estimados</SelectItem>
                    <SelectItem value="purchase_order">Órdenes</SelectItem>
                    <SelectItem value="employee">Empleados</SelectItem>
                    <SelectItem value="payroll">Nómina</SelectItem>
                    <SelectItem value="approval">Aprobaciones</SelectItem>
                    <SelectItem value="user">Usuarios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Acción</Label>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="create">Creado</SelectItem>
                    <SelectItem value="update">Actualizado</SelectItem>
                    <SelectItem value="delete">Eliminado</SelectItem>
                    <SelectItem value="approve">Aprobado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Usuario</Label>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>{u.name || u.email || 'Sin nombre'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Desde</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
              </div>
              
              <div>
                <Label className="text-xs">Hasta</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-slate-500">
                Mostrando {filteredLogs.length} de {logs.length} registros
              </span>
              <Button variant="outline" size="sm" onClick={clearFilters}>Limpiar Filtros</Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No hay registros que coincidan con los filtros</p>
                </div>
              ) : (
                filteredLogs.slice(0, 100).map((log, index) => (
                  <div key={log.log_id} className={`flex items-start gap-4 p-4 hover:bg-slate-50 ${index === 0 ? 'bg-orange-50/30' : ''}`}>
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
                      {getEntityIcon(log.entity_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getActionBadge(log.action)}
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {getEntityLabel(log.entity_type)}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium text-slate-900 truncate">{log.entity_name || 'N/A'}</p>
                      
                      {log.details?.changes && (
                        <p className="text-xs text-slate-500 mt-1">
                          Campos: {Object.keys(log.details.changes).join(', ')}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <User className="w-3 h-3" />
                        <span>{log.user_name || 'N/A'}</span>
                        <span>•</span>
                        <Calendar className="w-3 h-3" />
                        <span>{moment(log.timestamp).format('DD/MM/YYYY HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AuditLog;
