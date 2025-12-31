import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Card, CardContent, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Calendar, DollarSign, Users, FolderKanban, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';


const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  
  // Roles que pueden crear proyectos
  const canCreateProject = user?.role && ['super_admin', 'admin', 'project_manager'].includes(user.role);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'planning',
    priority: 'medium',
    budget_total: 0,
    project_value: 0,
    payment_status: 'pending',
    po_summary: '',
    resource: '',
    initials: '',
    project_number: '',
    client: '',
    sponsor: '',
    po_number: '',
    po_quantity: 0,
    proposal_number: '',
    team_members: [],
    location_latitude: null,
    location_longitude: null,
    geofence_radius: 100,
    geofence_enabled: false
  });

  useEffect(() => {
    loadProjects();
    loadUsers();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(() => {
      loadProjects();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
      const matchesPayment = paymentFilter === 'all' || (project.payment_status || 'pending') === paymentFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesPayment;
    });
    setFilteredProjects(filtered);
  }, [searchTerm, statusFilter, priorityFilter, paymentFilter, projects]);

  const loadProjects = async () => {
    try {
      const response = await api.get(`/projects`, { 
        withCredentials: true,
        headers: { 'Cache-Control': 'no-cache' }
      });
      setProjects(response.data);
      setFilteredProjects(response.data);
    } catch (error) {
      toast.error('Error al cargar proyectos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get(`/users`, { withCredentials: true });
      setUsers(response.data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await api.post(`/projects`, formData, { withCredentials: true });
      toast.success('Proyecto creado exitosamente');
      setDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'planning',
        priority: 'medium',
        budget_total: 0,
        project_value: 0,
        payment_status: 'pending',
        po_summary: '',
        resource: '',
        initials: '',
        project_number: '',
        client: '',
        sponsor: '',
        po_number: '',
        po_quantity: 0,
        proposal_number: '',
        team_members: [],
        location_latitude: null,
        location_longitude: null,
        geofence_radius: 100,
        geofence_enabled: false
      });
      loadProjects();
    } catch (error) {
      toast.error('Error al crear proyecto');
      console.error(error);
    }
  };

  const handleDeleteProject = async (e, projectId, projectName) => {
    e.stopPropagation(); // Evitar que se abra el proyecto al hacer clic en eliminar
    
    if (!window.confirm(`¿Estás seguro de eliminar el proyecto "${projectName}"? Esta acción eliminará todos los datos asociados (tareas, gastos, documentos, etc.) y no se puede deshacer.`)) return;
    
    try {
      await api.delete(`/projects/${projectId}`, { withCredentials: true });
      toast.success('Proyecto eliminado exitosamente');
      loadProjects();
    } catch (error) {
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Error al eliminar proyecto');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'planning': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'on_hold': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-blue-600';
      case 'low': return 'text-slate-600';
      default: return 'text-slate-600';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Cargando proyectos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 md:space-y-8 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#0F172A]">Proyectos</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Gestiona todos tus proyectos en un solo lugar</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setLoading(true); loadProjects(); }}
              className="rounded-full"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {canCreateProject && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="create-project-button" className="rounded-full bg-blue-600 hover:bg-blue-700 font-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Proyecto
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-semibold tracking-tight">Crear Nuevo Proyecto</DialogTitle>
                <DialogDescription>Completa los detalles del proyecto</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Proyecto *</Label>
                    <Input
                      id="name"
                      data-testid="project-name-input"
                      placeholder="Ej: Desarrollo Web para Cliente XYZ"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción *</Label>
                    <Textarea
                      id="description"
                      data-testid="project-description-input"
                      placeholder="Describe el alcance, objetivos y entregables del proyecto..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Fecha de Inicio *</Label>
                      <Input
                        id="start_date"
                        data-testid="project-start-date-input"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="end_date">Fecha de Fin *</Label>
                      <Input
                        id="end_date"
                        data-testid="project-end-date-input"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Estado</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger data-testid="project-status-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planning">Planificación</SelectItem>
                          <SelectItem value="in_progress">En Progreso</SelectItem>
                          <SelectItem value="on_hold">En Espera</SelectItem>
                          <SelectItem value="completed">Completado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="priority">Prioridad</Label>
                      <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                        <SelectTrigger data-testid="project-priority-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baja</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment_status">Estado de Pago</Label>
                      <Select value={formData.payment_status} onValueChange={(value) => setFormData({ ...formData, payment_status: value })}>
                        <SelectTrigger data-testid="project-payment-status-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente de Pago</SelectItem>
                          <SelectItem value="partial">Pago Parcial</SelectItem>
                          <SelectItem value="paid">Pagado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="budget_total">Presupuesto (Costos) *</Label>
                      <Input
                        id="budget_total"
                        data-testid="project-budget-input"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.budget_total}
                        onChange={(e) => setFormData({ ...formData, budget_total: parseFloat(e.target.value) || 0 })}
                        required
                      />
                      <p className="text-xs text-slate-500">Total de gastos estimados del proyecto</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="project_value">Valor del Proyecto (Ingreso) *</Label>
                      <Input
                        id="project_value"
                        data-testid="project-value-input"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.project_value}
                        onChange={(e) => setFormData({ ...formData, project_value: parseFloat(e.target.value) || 0 })}
                        required
                      />
                      <p className="text-xs text-slate-500">Valor total que se cobrará al cliente</p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-slate-50 p-3 rounded-md border border-slate-200">
                    💡 Ganancia estimada: ${((formData.project_value || 0) - (formData.budget_total || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>

                  {/* Sección de información adicional */}
                  <div className="pt-4 border-t border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">Información Adicional de Orden de Compra</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="client">Cliente</Label>
                        <Input
                          id="client"
                          placeholder="Nombre del cliente"
                          value={formData.client}
                          onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sponsor">Patrocinador</Label>
                        <Input
                          id="sponsor"
                          placeholder="Nombre del patrocinador"
                          value={formData.sponsor}
                          onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="project_number">Número de Proyecto</Label>
                        <Input
                          id="project_number"
                          placeholder="Ej: PROJ-2025-001"
                          value={formData.project_number}
                          onChange={(e) => setFormData({ ...formData, project_number: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="po_number">No. de PO</Label>
                        <Input
                          id="po_number"
                          placeholder="Ej: PO-12345"
                          value={formData.po_number}
                          onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="proposal_number">No. Propuesta</Label>
                        <Input
                          id="proposal_number"
                          placeholder="Ej: PROP-2025-001"
                          value={formData.proposal_number}
                          onChange={(e) => setFormData({ ...formData, proposal_number: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="resource">Recurso</Label>
                        <Input
                          id="resource"
                          placeholder="Nombre del recurso asignado"
                          value={formData.resource}
                          onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="initials">Iniciales</Label>
                        <Input
                          id="initials"
                          placeholder="Ej: JD"
                          value={formData.initials}
                          onChange={(e) => setFormData({ ...formData, initials: e.target.value })}
                          maxLength={5}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="po_quantity">Cantidad del PO</Label>
                        <Input
                          id="po_quantity"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={formData.po_quantity}
                          onChange={(e) => setFormData({ ...formData, po_quantity: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <Label htmlFor="po_summary">Resumen de PO</Label>
                      <Textarea
                        id="po_summary"
                        placeholder="Descripción breve de la orden de compra..."
                        value={formData.po_summary}
                        onChange={(e) => setFormData({ ...formData, po_summary: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Geofencing */}
                  <div className="p-4 border rounded-lg bg-green-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Restricción de Ubicación</Label>
                        <p className="text-xs text-slate-500">Solo permitir ponches dentro del área del proyecto</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.geofence_enabled || false}
                        onChange={(e) => setFormData({ ...formData, geofence_enabled: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </div>
                    {formData.geofence_enabled && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Latitud</Label>
                          <Input
                            type="number"
                            step="0.000001"
                            placeholder="18.4655"
                            value={formData.location_latitude || ''}
                            onChange={(e) => setFormData({ ...formData, location_latitude: parseFloat(e.target.value) || null })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Longitud</Label>
                          <Input
                            type="number"
                            step="0.000001"
                            placeholder="-66.1057"
                            value={formData.location_longitude || ''}
                            onChange={(e) => setFormData({ ...formData, location_longitude: parseFloat(e.target.value) || null })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Radio (m)</Label>
                          <Input
                            type="number"
                            min="10"
                            value={formData.geofence_radius || 100}
                            onChange={(e) => setFormData({ ...formData, geofence_radius: parseInt(e.target.value) || 100 })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button data-testid="submit-project-button" type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Crear Proyecto
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="search-projects-input"
              type="search"
              placeholder="Buscar proyectos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] md:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="planning">Planificación</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="on_hold">En Espera</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[160px] md:w-[180px]">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Prioridades</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[160px] md:w-[180px]">
                <SelectValue placeholder="Estado de Pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Pagos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
              </SelectContent>
            </Select>

            {(statusFilter !== 'all' || priorityFilter !== 'all' || paymentFilter !== 'all' || searchTerm) && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setPaymentFilter('all');
                }}
              >
                Limpiar Filtros
              </Button>
            )}
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.project_id}
                data-testid={`project-card-${project.project_id}`}
                className="project-card border-slate-200 shadow-sm hover:shadow-md cursor-pointer"
                onClick={() => navigate(`/projects/${project.project_id}`)}
              >
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0 mr-2">
                      {project.project_number && (
                        <div className="mb-2">
                          <span className="inline-flex items-center text-xs font-semibold font-mono bg-slate-100 text-slate-700 px-2 sm:px-3 py-1 rounded-md border border-slate-300">
                            📋 {project.project_number}
                          </span>
                        </div>
                      )}
                      <h3 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight text-[#0F172A] mb-1 line-clamp-1">
                        {project.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">{project.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 -mt-1 flex-shrink-0"
                      onClick={(e) => handleDeleteProject(e, project.project_id, project.name)}
                      title="Eliminar proyecto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                    <div className="flex items-center text-xs sm:text-sm text-slate-600">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{project.start_date} - {project.end_date}</span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                        <span className="font-mono font-semibold text-[#0F172A]">
                          ${project.budget_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 ml-6 sm:ml-2">
                        / ${project.budget_spent.toLocaleString('es-MX', { minimumFractionDigits: 2 })} gastado
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 sm:pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <Badge className={`${getStatusColor(project.status)} border text-xs`}>
                        {project.status}
                      </Badge>
                      <Badge className={`border text-xs ${
                        project.payment_status === 'paid' ? 'bg-green-100 text-green-700 border-green-300' :
                        project.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                        'bg-red-100 text-red-700 border-red-300'
                      }`}>
                        {project.payment_status === 'paid' && '✓ Pagado'}
                        {project.payment_status === 'partial' && '◐ Parcial'}
                        {project.payment_status === 'pending' && '⊗ Pendiente'}
                        {!project.payment_status && '⊗ Pendiente'}
                      </Badge>
                    </div>
                    <span className={`text-xs font-medium uppercase ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderKanban className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600 mb-2">
                {searchTerm ? 'No se encontraron proyectos' : 'No hay proyectos creados'}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {searchTerm ? 'Intenta con otro término de búsqueda' : 'Comienza creando tu primer proyecto'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setDialogOpen(true)} className="rounded-full bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Proyecto
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Projects;
