import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  User,
  MoreVertical,
  Edit,
  Trash2,
  ArrowRight,
  FileText,
  FolderKanban,
  TrendingUp,
  Target,
  MessageSquare,
  GripVertical,
  Filter,
  LayoutGrid,
  List,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

// Stage configuration
const STAGES = [
  { id: 'new', title: 'Nuevo', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'contacted', title: 'Contactado', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'negotiation', title: 'En Negociación', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'quoted', title: 'Cotizado', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'won', title: 'Ganado', color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'lost', title: 'Perdido', color: 'bg-red-100 text-red-700 border-red-300' },
];

// Droppable Column Component
const KanbanColumn = ({ id, title, color, count, children, totalBudget }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-h-[500px] rounded-xl border ${isOver ? 'ring-2 ring-orange-400 bg-orange-50' : 'bg-slate-50'}`}
    >
      <div className={`p-3 rounded-t-xl ${color.split(' ')[0]} border-b`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-sm ${color.split(' ')[1]}`}>{title}</h3>
            <Badge variant="secondary" className="text-xs">{count}</Badge>
          </div>
          {totalBudget > 0 && (
            <span className="text-xs font-medium text-slate-600">
              ${totalBudget.toLocaleString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

// Draggable Card Component
const PreProjectCard = ({ preProject, onEdit, onDelete, onConvert, onNavigate, users }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: preProject.pre_project_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignedUser = users.find(u => u.user_id === preProject.assigned_to);
  const stageConfig = STAGES.find(s => s.id === preProject.stage) || STAGES[0];

  const getProbabilityColor = (prob) => {
    if (prob >= 70) return 'text-green-600';
    if (prob >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group"
    >
      <Card className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-slate-200">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-slate-600"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0" onClick={() => onNavigate(preProject.pre_project_id)}>
              <h4 className="font-semibold text-sm text-slate-900 truncate" data-testid={`preproject-title-${preProject.pre_project_id}`}>
                {preProject.title}
              </h4>
              <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{preProject.client_name}</span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(preProject)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {preProject.stage === 'won' && !preProject.converted_to_project && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onConvert(preProject, 'project')}>
                      <FolderKanban className="w-4 h-4 mr-2" />
                      Convertir a Proyecto
                    </DropdownMenuItem>
                  </>
                )}
                {!preProject.converted_to_estimate && (
                  <DropdownMenuItem onClick={() => onConvert(preProject, 'estimate')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Convertir a Estimación
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(preProject)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {preProject.client_company && (
            <p className="text-xs text-slate-500 mt-1 truncate pl-5">{preProject.client_company}</p>
          )}

          <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
            {preProject.estimated_budget > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Presupuesto
                </span>
                <span className="font-medium text-slate-700">
                  ${preProject.estimated_budget.toLocaleString()}
                </span>
              </div>
            )}
            
            {preProject.close_probability !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Probabilidad
                </span>
                <span className={`font-medium ${getProbabilityColor(preProject.close_probability)}`}>
                  {preProject.close_probability}%
                </span>
              </div>
            )}

            {assignedUser && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <User className="w-3 h-3" />
                <span className="truncate">{assignedUser.name}</span>
              </div>
            )}

            {preProject.next_action_date && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="w-3 h-3" />
                <span>{new Date(preProject.next_action_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {(preProject.converted_to_project || preProject.converted_to_estimate || preProject.ready_for_estimate || preProject.completed_by_designer || preProject.claimed_by_pm) && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
              {preProject.completed_by_designer && !preProject.claimed_by_pm && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  Disponible para PM
                </Badge>
              )}
              {preProject.claimed_by_pm_name && (
                <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                  <User className="w-3 h-3 mr-1" />
                  PM: {preProject.claimed_by_pm_name}
                </Badge>
              )}
              {preProject.ready_for_estimate && !preProject.converted_to_project && (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  Listo para Estimar
                </Badge>
              )}
              {preProject.converted_to_project && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <FolderKanban className="w-3 h-3 mr-1" />
                  Convertido a Proyecto
                </Badge>
              )}
              {preProject.converted_to_estimate && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  <FileText className="w-3 h-3 mr-1" />
                  Estimación creada
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const PreProjects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preProjects, setPreProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterAssigned, setFilterAssigned] = useState('all');
  const [viewMode, setViewMode] = useState('kanban'); // kanban or list
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stats, setStats] = useState({ by_stage: {}, total_count: 0, total_budget: 0 });
  const [activeId, setActiveId] = useState(null);

  const [formData, setFormData] = useState({
    client_name: '',
    client_company: '',
    client_phone: '',
    client_email: '',
    title: '',
    description: '',
    location: '',
    work_type: '',
    estimated_budget: 0,
    close_probability: 50,
    contact_date: '',
    next_action: '',
    next_action_date: '',
    assigned_to: '',
    stage: 'new',
    notes: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [preProjectsRes, usersRes, statsRes] = await Promise.all([
        api.get('/pre-projects'),
        api.get('/users'),
        api.get('/pre-projects/stats')
      ]);
      setPreProjects(preProjectsRes.data);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredPreProjects = useMemo(() => {
    return preProjects.filter(pp => {
      const matchesSearch = 
        pp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pp.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pp.client_company?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = filterStage === 'all' || pp.stage === filterStage;
      const matchesAssigned = filterAssigned === 'all' || pp.assigned_to === filterAssigned;
      return matchesSearch && matchesStage && matchesAssigned;
    });
  }, [preProjects, searchTerm, filterStage, filterAssigned]);

  const getPreProjectsByStage = (stageId) => {
    return filteredPreProjects.filter(pp => pp.stage === stageId);
  };

  const getStageTotalBudget = (stageId) => {
    return getPreProjectsByStage(stageId).reduce((sum, pp) => sum + (pp.estimated_budget || 0), 0);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activePreProject = preProjects.find(pp => pp.pre_project_id === active.id);
    if (!activePreProject) return;

    // Check if dropped on a column
    const targetStage = STAGES.find(s => s.id === over.id);
    if (targetStage && activePreProject.stage !== targetStage.id) {
      try {
        await api.put(`/pre-projects/${activePreProject.pre_project_id}/stage`, {
          stage: targetStage.id
        });
        
        setPreProjects(prev =>
          prev.map(pp =>
            pp.pre_project_id === activePreProject.pre_project_id
              ? { ...pp, stage: targetStage.id }
              : pp
          )
        );
        
        toast.success(`Movido a "${targetStage.title}"`);
        loadData(); // Refresh stats
      } catch (error) {
        console.error('Error updating stage:', error);
        toast.error('Error al actualizar etapa');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_company: '',
      client_phone: '',
      client_email: '',
      title: '',
      description: '',
      location: '',
      work_type: '',
      estimated_budget: 0,
      close_probability: 50,
      contact_date: '',
      next_action: '',
      next_action_date: '',
      assigned_to: '',
      stage: 'new',
      notes: ''
    });
    setEditingItem(null);
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        client_name: item.client_name || '',
        client_company: item.client_company || '',
        client_phone: item.client_phone || '',
        client_email: item.client_email || '',
        title: item.title || '',
        description: item.description || '',
        location: item.location || '',
        work_type: item.work_type || '',
        estimated_budget: item.estimated_budget || 0,
        close_probability: item.close_probability || 50,
        contact_date: item.contact_date || '',
        next_action: item.next_action || '',
        next_action_date: item.next_action_date || '',
        assigned_to: item.assigned_to || '',
        stage: item.stage || 'new',
        notes: item.notes || ''
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.client_name) {
      toast.error('Título y nombre del cliente son requeridos');
      return;
    }

    try {
      const payload = {
        ...formData,
        estimated_budget: parseFloat(formData.estimated_budget) || 0,
        close_probability: parseInt(formData.close_probability) || 50
      };

      if (editingItem) {
        await api.put(`/pre-projects/${editingItem.pre_project_id}`, payload);
        toast.success('Pre-proyecto actualizado');
      } else {
        await api.post('/pre-projects', payload);
        toast.success('Pre-proyecto creado');
      }
      
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving pre-project:', error);
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (preProject) => {
    if (!window.confirm(`¿Eliminar "${preProject.title}"?`)) return;
    
    try {
      await api.delete(`/pre-projects/${preProject.pre_project_id}`);
      toast.success('Pre-proyecto eliminado');
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleConvert = async (preProject, type) => {
    const confirmMsg = type === 'project' 
      ? `¿Convertir "${preProject.title}" en un proyecto?`
      : `¿Crear una estimación de costos para "${preProject.title}"?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const endpoint = type === 'project' 
        ? `/pre-projects/${preProject.pre_project_id}/convert-to-project`
        : `/pre-projects/${preProject.pre_project_id}/convert-to-estimate`;
      
      const response = await api.post(endpoint);
      
      toast.success(response.data.message);
      loadData();
    } catch (error) {
      console.error('Error converting:', error);
      toast.error('Error al convertir');
    }
  };

  const activePreProject = activeId ? preProjects.find(pp => pp.pre_project_id === activeId) : null;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
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
            <h1 className="text-2xl font-bold text-slate-900" data-testid="preprojects-title">Pre-Proyectos</h1>
            <p className="text-sm text-slate-500 mt-1">Pipeline de oportunidades y prospectos</p>
          </div>
          <Button onClick={() => handleOpenDialog()} data-testid="create-preproject-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Oportunidad
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Oportunidades</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_count}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Pipeline Total</p>
                  <p className="text-2xl font-bold text-slate-900">${stats.total_budget?.toLocaleString() || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">En Negociación</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.by_stage?.negotiation?.count || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Ganados</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.by_stage?.won?.count || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por título, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="search-preprojects"
            />
          </div>
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-full sm:w-40" data-testid="filter-stage">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las etapas</SelectItem>
              {STAGES.map(stage => (
                <SelectItem key={stage.id} value={stage.id}>{stage.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAssigned} onValueChange={setFilterAssigned}>
            <SelectTrigger className="w-full sm:w-40" data-testid="filter-assigned">
              <SelectValue placeholder="Responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {users.filter(u => ['super_admin', 'admin', 'project_manager'].includes(u.role)).map(u => (
                <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('kanban')}
              data-testid="view-kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              data-testid="view-list"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        {viewMode === 'kanban' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
              {STAGES.map(stage => {
                const stageItems = getPreProjectsByStage(stage.id);
                return (
                  <KanbanColumn
                    key={stage.id}
                    id={stage.id}
                    title={stage.title}
                    color={stage.color}
                    count={stageItems.length}
                    totalBudget={getStageTotalBudget(stage.id)}
                  >
                    <SortableContext items={stageItems.map(pp => pp.pre_project_id)}>
                      {stageItems.map(pp => (
                        <PreProjectCard
                          key={pp.pre_project_id}
                          preProject={pp}
                          onEdit={handleOpenDialog}
                          onDelete={handleDelete}
                          onConvert={handleConvert}
                          onNavigate={(id) => navigate(`/pre-projects/${id}`)}
                          users={users}
                        />
                      ))}
                    </SortableContext>
                    {stageItems.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-sm">
                        Sin oportunidades
                      </div>
                    )}
                  </KanbanColumn>
                );
              })}
            </div>

            <DragOverlay>
              {activePreProject && (
                <Card className="bg-white shadow-xl border-2 border-orange-400 opacity-90 w-64">
                  <CardContent className="p-3">
                    <h4 className="font-semibold text-sm">{activePreProject.title}</h4>
                    <p className="text-xs text-slate-500">{activePreProject.client_name}</p>
                  </CardContent>
                </Card>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredPreProjects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  No se encontraron pre-proyectos
                </CardContent>
              </Card>
            ) : (
              filteredPreProjects.map(pp => {
                const stageConfig = STAGES.find(s => s.id === pp.stage) || STAGES[0];
                const assignedUser = users.find(u => u.user_id === pp.assigned_to);
                return (
                  <Card 
                    key={pp.pre_project_id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/pre-projects/${pp.pre_project_id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-slate-900">{pp.title}</h3>
                            <Badge className={`${stageConfig.color} border text-xs`}>
                              {stageConfig.title}
                            </Badge>
                            {pp.ready_for_estimate && (
                              <Badge className="bg-green-100 text-green-700 border-green-300 border text-xs">
                                Listo para Estimar
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {pp.client_name}
                            </span>
                            {pp.client_company && (
                              <span className="text-slate-400">{pp.client_company}</span>
                            )}
                            {pp.estimated_budget > 0 && (
                              <span className="flex items-center gap-1 text-green-600 font-medium">
                                <DollarSign className="w-4 h-4" />
                                ${pp.estimated_budget.toLocaleString()}
                              </span>
                            )}
                            {assignedUser && (
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {assignedUser.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(pp)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {pp.stage === 'won' && !pp.converted_to_project && (
                                <DropdownMenuItem onClick={() => handleConvert(pp, 'project')}>
                                  <FolderKanban className="w-4 h-4 mr-2" />
                                  Convertir a Proyecto
                                </DropdownMenuItem>
                              )}
                              {!pp.converted_to_estimate && (
                                <DropdownMenuItem onClick={() => handleConvert(pp, 'estimate')}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Convertir a Estimación
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(pp)} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Pre-Proyecto' : 'Nueva Oportunidad'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Actualiza la información del pre-proyecto' : 'Ingresa los datos de la nueva oportunidad'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Información del Proyecto
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ej: Instalación de tubería industrial"
                      required
                      data-testid="input-title"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descripción del proyecto..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="work_type">Tipo de Trabajo</Label>
                    <Input
                      id="work_type"
                      value={formData.work_type}
                      onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                      placeholder="Ej: Construcción, Inspección..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Ubicación</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Ciudad o dirección"
                    />
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_name">Nombre del Cliente *</Label>
                    <Input
                      id="client_name"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      placeholder="Nombre completo"
                      required
                      data-testid="input-client-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_company">Empresa</Label>
                    <Input
                      id="client_company"
                      value={formData.client_company}
                      onChange={(e) => setFormData({ ...formData, client_company: e.target.value })}
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_phone">Teléfono</Label>
                    <Input
                      id="client_phone"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                      placeholder="787-123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_email">Email</Label>
                    <Input
                      id="client_email"
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      placeholder="cliente@empresa.com"
                    />
                  </div>
                </div>
              </div>

              {/* Financial & Probability */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Información Financiera
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="estimated_budget">Presupuesto Estimado ($)</Label>
                    <Input
                      id="estimated_budget"
                      type="number"
                      min="0"
                      step="100"
                      value={formData.estimated_budget}
                      onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
                      data-testid="input-budget"
                    />
                  </div>
                  <div>
                    <Label htmlFor="close_probability">Probabilidad de Cierre (%)</Label>
                    <Input
                      id="close_probability"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.close_probability}
                      onChange={(e) => setFormData({ ...formData, close_probability: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stage">Etapa</Label>
                    <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                      <SelectTrigger id="stage" data-testid="select-stage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Follow-up */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Seguimiento
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_date">Fecha de Contacto</Label>
                    <Input
                      id="contact_date"
                      type="date"
                      value={formData.contact_date}
                      onChange={(e) => setFormData({ ...formData, contact_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="assigned_to">Responsable</Label>
                    <Select value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
                      <SelectTrigger id="assigned_to" data-testid="select-assigned">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => ['super_admin', 'admin', 'project_manager'].includes(u.role)).map(u => (
                          <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="next_action">Próxima Acción</Label>
                    <Input
                      id="next_action"
                      value={formData.next_action}
                      onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
                      placeholder="Ej: Llamar para seguimiento"
                    />
                  </div>
                  <div>
                    <Label htmlFor="next_action_date">Fecha Próxima Acción</Label>
                    <Input
                      id="next_action_date"
                      type="date"
                      value={formData.next_action_date}
                      onChange={(e) => setFormData({ ...formData, next_action_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" data-testid="submit-preproject">
                  {editingItem ? 'Guardar Cambios' : 'Crear Pre-Proyecto'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default PreProjects;
