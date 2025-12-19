import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, Plus, Pencil, Trash2, User, FolderKanban, CheckSquare, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadLogs();
  }, [filterType]);

  const loadLogs = async () => {
    try {
      const params = filterType !== 'all' ? `?entity_type=${filterType}` : '';
      const response = await axios.get(`${API}/api/audit-logs${params}`, { withCredentials: true });
      setLogs(response.data);
    } catch (error) {
      toast.error('Error al cargar historial');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'create':
        return <Badge className="bg-green-100 text-green-700 border-green-200"><Plus className="w-3 h-3 mr-1" />Creado</Badge>;
      case 'update':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Pencil className="w-3 h-3 mr-1" />Actualizado</Badge>;
      case 'delete':
        return <Badge className="bg-red-100 text-red-700 border-red-200"><Trash2 className="w-3 h-3 mr-1" />Eliminado</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case 'project':
        return <FolderKanban className="w-4 h-4" />;
      case 'task':
        return <CheckSquare className="w-4 h-4" />;
      case 'expense':
        return <DollarSign className="w-4 h-4" />;
      case 'user':
        return <User className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getEntityLabel = (entityType) => {
    const labels = {
      'project': 'Proyecto',
      'task': 'Tarea',
      'expense': 'Gasto',
      'user': 'Usuario',
      'category': 'Categoría',
      'labor': 'Salario',
      'timesheet': 'Timesheet'
    };
    return labels[entityType] || entityType;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Cargando historial...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">Historial de Cambios</h1>
            <p className="text-muted-foreground mt-2">Registro de todas las acciones realizadas en el sistema</p>
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Tipos</SelectItem>
              <SelectItem value="project">Proyectos</SelectItem>
              <SelectItem value="task">Tareas</SelectItem>
              <SelectItem value="expense">Gastos</SelectItem>
              <SelectItem value="user">Usuarios</SelectItem>
              <SelectItem value="category">Categorías</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs Timeline */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tight">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length > 0 ? (
              <div className="space-y-4">
                {logs.map((log, index) => (
                  <div
                    key={log.log_id}
                    className={`flex items-start gap-4 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors ${
                      index === 0 ? 'border-blue-200 bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        {getEntityIcon(log.entity_type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getActionBadge(log.action)}
                          <span className="text-sm font-medium text-slate-600">
                            {getEntityLabel(log.entity_type)}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {moment(log.timestamp).fromNow()}
                        </span>
                      </div>

                      <p className="text-sm text-slate-900 font-medium mb-1">
                        {log.entity_name}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <User className="w-3 h-3" />
                        <span>{log.user_name}</span>
                        <span className="text-slate-400">•</span>
                        <span>{moment(log.timestamp).format('DD/MM/YYYY HH:mm')}</span>
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(log.details).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium text-slate-600 mb-2">No hay registros</p>
                <p className="text-sm">Los cambios realizados en el sistema aparecerán aquí</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AuditLog;
