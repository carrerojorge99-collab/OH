import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import moment from 'moment';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import { 
  Plus, Trash2, Edit, Eye, CheckCircle, XCircle, 
  ClipboardCheck, AlertTriangle, MessageSquare, Users,
  Calendar, Shield, TrendingUp, TrendingDown, Search,
  Filter, MoreVertical, ChevronRight, Clock, FileText,
  ThumbsUp, ThumbsDown, AlertCircle, Activity, RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-purple-100 text-purple-800',
  open: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  reported: 'bg-yellow-100 text-yellow-800',
  investigating: 'bg-orange-100 text-orange-800',
  action_taken: 'bg-blue-100 text-blue-800'
};

const statusLabels = {
  draft: 'Borrador',
  in_progress: 'En Progreso',
  completed: 'Completado',
  archived: 'Archivado',
  open: 'Abierto',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  scheduled: 'Programado',
  cancelled: 'Cancelado',
  reported: 'Reportado',
  investigating: 'Investigando',
  action_taken: 'Acción Tomada'
};

const severityColors = {
  minor: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  serious: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

const severityLabels = {
  minor: 'Menor',
  moderate: 'Moderado',
  serious: 'Serio',
  critical: 'Crítico'
};

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const Safety = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  
  // Checklists
  const [checklists, setChecklists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [viewingChecklist, setViewingChecklist] = useState(null);
  const [checklistForm, setChecklistForm] = useState({
    title: '',
    description: '',
    project_id: '',
    template_id: '',
    category: 'general',
    assigned_to: '',
    due_date: '',
    items: [{ description: '', category: 'general' }]
  });
  
  // Observations
  const [observations, setObservations] = useState([]);
  const [observationDialogOpen, setObservationDialogOpen] = useState(false);
  const [editingObservation, setEditingObservation] = useState(null);
  const [observationForm, setObservationForm] = useState({
    title: '',
    description: '',
    project_id: '',
    location: '',
    observation_type: 'positive',
    category: 'general',
    priority: 'medium',
    assigned_to: '',
    corrective_action: '',
    due_date: ''
  });
  
  // Toolbox Talks
  const [toolboxTalks, setToolboxTalks] = useState([]);
  const [toolboxDialogOpen, setToolboxDialogOpen] = useState(false);
  const [editingToolbox, setEditingToolbox] = useState(null);
  const [viewingToolbox, setViewingToolbox] = useState(null);
  const [toolboxForm, setToolboxForm] = useState({
    title: '',
    topic: '',
    description: '',
    project_id: '',
    scheduled_date: '',
    duration_minutes: 15,
    location: '',
    presenter: '',
    attendees: [],
    notes: ''
  });
  
  // Incidents
  const [incidents, setIncidents] = useState([]);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [viewingIncident, setViewingIncident] = useState(null);
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    description: '',
    project_id: '',
    incident_date: moment().format('YYYY-MM-DD'),
    incident_time: '',
    location: '',
    incident_type: 'other',
    severity: 'minor',
    persons_involved: [],
    witnesses: [],
    injuries_description: '',
    property_damage: '',
    immediate_actions: '',
    root_cause: '',
    corrective_actions: [],
    preventive_actions: []
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboard();
    } else if (activeTab === 'checklists') {
      loadChecklists();
      loadTemplates();
    } else if (activeTab === 'observations') {
      loadObservations();
    } else if (activeTab === 'toolbox') {
      loadToolboxTalks();
    } else if (activeTab === 'incidents') {
      loadIncidents();
    }
  }, [activeTab, selectedProject]);

  const loadInitialData = async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        api.get('/api/projects'),
        api.get('/api/users')
      ]);
      setProjects(projectsRes.data);
      setUsers(usersRes.data);
      loadDashboard();
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Error al cargar datos iniciales');
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const params = selectedProject ? `?project_id=${selectedProject}` : '';
      const response = await api.get(`/api/safety/dashboard${params}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChecklists = async () => {
    setLoading(true);
    try {
      const params = selectedProject ? `?project_id=${selectedProject}` : '';
      const response = await api.get(`/api/safety/checklists${params}`);
      setChecklists(response.data);
    } catch (error) {
      console.error('Error loading checklists:', error);
      toast.error('Error al cargar checklists');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await api.get('/api/safety/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadObservations = async () => {
    setLoading(true);
    try {
      const params = selectedProject ? `?project_id=${selectedProject}` : '';
      const response = await api.get(`/api/safety/observations${params}`);
      setObservations(response.data);
    } catch (error) {
      console.error('Error loading observations:', error);
      toast.error('Error al cargar observaciones');
    } finally {
      setLoading(false);
    }
  };

  const loadToolboxTalks = async () => {
    setLoading(true);
    try {
      const params = selectedProject ? `?project_id=${selectedProject}` : '';
      const response = await api.get(`/api/safety/toolbox-talks${params}`);
      setToolboxTalks(response.data);
    } catch (error) {
      console.error('Error loading toolbox talks:', error);
      toast.error('Error al cargar Toolbox Talks');
    } finally {
      setLoading(false);
    }
  };

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const params = selectedProject ? `?project_id=${selectedProject}` : '';
      const response = await api.get(`/api/safety/incidents${params}`);
      setIncidents(response.data);
    } catch (error) {
      console.error('Error loading incidents:', error);
      toast.error('Error al cargar incidentes');
    } finally {
      setLoading(false);
    }
  };

  // Checklist handlers
  const handleSaveChecklist = async () => {
    try {
      if (editingChecklist) {
        await api.put(`/api/safety/checklists/${editingChecklist.checklist_id}`, checklistForm);
        toast.success('Checklist actualizado');
      } else {
        await api.post('/api/safety/checklists', checklistForm);
        toast.success('Checklist creado');
      }
      setChecklistDialogOpen(false);
      setEditingChecklist(null);
      resetChecklistForm();
      loadChecklists();
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast.error('Error al guardar checklist');
    }
  };

  const handleDeleteChecklist = async (checklistId) => {
    if (!window.confirm('¿Eliminar este checklist?')) return;
    try {
      await api.delete(`/api/safety/checklists/${checklistId}`);
      toast.success('Checklist eliminado');
      loadChecklists();
    } catch (error) {
      console.error('Error deleting checklist:', error);
      toast.error('Error al eliminar checklist');
    }
  };

  const handleCheckItem = async (checklistId, itemId, isChecked, notes = '') => {
    try {
      await api.post(`/api/safety/checklists/${checklistId}/check-item`, {
        item_id: itemId,
        is_checked: isChecked,
        notes
      });
      // Reload the viewing checklist
      const response = await api.get(`/api/safety/checklists/${checklistId}`);
      setViewingChecklist(response.data);
      loadChecklists();
    } catch (error) {
      console.error('Error checking item:', error);
      toast.error('Error al actualizar item');
    }
  };

  const resetChecklistForm = () => {
    setChecklistForm({
      title: '',
      description: '',
      project_id: '',
      template_id: '',
      category: 'general',
      assigned_to: '',
      due_date: '',
      items: [{ description: '', category: 'general' }]
    });
  };

  // Observation handlers
  const handleSaveObservation = async () => {
    try {
      if (editingObservation) {
        await api.put(`/api/safety/observations/${editingObservation.observation_id}`, observationForm);
        toast.success('Observación actualizada');
      } else {
        await api.post('/api/safety/observations', observationForm);
        toast.success('Observación creada');
      }
      setObservationDialogOpen(false);
      setEditingObservation(null);
      resetObservationForm();
      loadObservations();
    } catch (error) {
      console.error('Error saving observation:', error);
      toast.error('Error al guardar observación');
    }
  };

  const handleDeleteObservation = async (observationId) => {
    if (!window.confirm('¿Eliminar esta observación?')) return;
    try {
      await api.delete(`/api/safety/observations/${observationId}`);
      toast.success('Observación eliminada');
      loadObservations();
    } catch (error) {
      console.error('Error deleting observation:', error);
      toast.error('Error al eliminar observación');
    }
  };

  const resetObservationForm = () => {
    setObservationForm({
      title: '',
      description: '',
      project_id: '',
      location: '',
      observation_type: 'positive',
      category: 'general',
      priority: 'medium',
      assigned_to: '',
      corrective_action: '',
      due_date: ''
    });
  };

  // Toolbox Talk handlers
  const handleSaveToolbox = async () => {
    try {
      if (editingToolbox) {
        await api.put(`/api/safety/toolbox-talks/${editingToolbox.talk_id}`, toolboxForm);
        toast.success('Toolbox Talk actualizado');
      } else {
        await api.post('/api/safety/toolbox-talks', toolboxForm);
        toast.success('Toolbox Talk creado');
      }
      setToolboxDialogOpen(false);
      setEditingToolbox(null);
      resetToolboxForm();
      loadToolboxTalks();
    } catch (error) {
      console.error('Error saving toolbox talk:', error);
      toast.error('Error al guardar Toolbox Talk');
    }
  };

  const handleDeleteToolbox = async (talkId) => {
    if (!window.confirm('¿Eliminar este Toolbox Talk?')) return;
    try {
      await api.delete(`/api/safety/toolbox-talks/${talkId}`);
      toast.success('Toolbox Talk eliminado');
      loadToolboxTalks();
    } catch (error) {
      console.error('Error deleting toolbox talk:', error);
      toast.error('Error al eliminar Toolbox Talk');
    }
  };

  const handleCompleteToolbox = async (talkId) => {
    try {
      await api.put(`/api/safety/toolbox-talks/${talkId}`, { status: 'completed' });
      toast.success('Toolbox Talk completado');
      loadToolboxTalks();
      if (viewingToolbox?.talk_id === talkId) {
        const response = await api.get(`/api/safety/toolbox-talks/${talkId}`);
        setViewingToolbox(response.data);
      }
    } catch (error) {
      console.error('Error completing toolbox talk:', error);
      toast.error('Error al completar Toolbox Talk');
    }
  };

  const resetToolboxForm = () => {
    setToolboxForm({
      title: '',
      topic: '',
      description: '',
      project_id: '',
      scheduled_date: '',
      duration_minutes: 15,
      location: '',
      presenter: '',
      attendees: [],
      notes: ''
    });
  };

  // Incident handlers
  const handleSaveIncident = async () => {
    try {
      if (editingIncident) {
        await api.put(`/api/safety/incidents/${editingIncident.incident_id}`, incidentForm);
        toast.success('Incidente actualizado');
      } else {
        await api.post('/api/safety/incidents', incidentForm);
        toast.success('Incidente reportado');
      }
      setIncidentDialogOpen(false);
      setEditingIncident(null);
      resetIncidentForm();
      loadIncidents();
    } catch (error) {
      console.error('Error saving incident:', error);
      toast.error('Error al guardar incidente');
    }
  };

  const handleDeleteIncident = async (incidentId) => {
    if (!window.confirm('¿Eliminar este incidente?')) return;
    try {
      await api.delete(`/api/safety/incidents/${incidentId}`);
      toast.success('Incidente eliminado');
      loadIncidents();
    } catch (error) {
      console.error('Error deleting incident:', error);
      toast.error('Error al eliminar incidente');
    }
  };

  const resetIncidentForm = () => {
    setIncidentForm({
      title: '',
      description: '',
      project_id: '',
      incident_date: moment().format('YYYY-MM-DD'),
      incident_time: '',
      location: '',
      incident_type: 'other',
      severity: 'minor',
      persons_involved: [],
      witnesses: [],
      injuries_description: '',
      property_damage: '',
      immediate_actions: '',
      root_cause: '',
      corrective_actions: [],
      preventive_actions: []
    });
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.project_id === projectId);
    return project?.name || 'Sin proyecto';
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.user_id === userId);
    return user?.name || 'Sin asignar';
  };

  // Render Dashboard Tab
  const renderDashboard = () => {
    if (!dashboardData) return <div className="text-center py-8">Cargando...</div>;
    
    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Días sin Incidentes</p>
                  <p className="text-3xl font-bold text-green-600">{dashboardData.incidents.days_without_incident}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Checklists Completados</p>
                  <p className="text-3xl font-bold">{dashboardData.checklists.completed}/{dashboardData.checklists.total}</p>
                  <p className="text-sm text-gray-400">{dashboardData.checklists.completion_rate}% completado</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <ClipboardCheck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Observaciones</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center text-green-600">
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      {dashboardData.observations.positive}
                    </span>
                    <span className="flex items-center text-red-600">
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      {dashboardData.observations.negative}
                    </span>
                  </div>
                  <p className="text-sm text-yellow-600">{dashboardData.observations.open} abiertas</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Toolbox Talks</p>
                  <p className="text-3xl font-bold">{dashboardData.toolbox_talks.completed}</p>
                  <p className="text-sm text-blue-600">{dashboardData.toolbox_talks.scheduled} programados</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Incidents Alert */}
        {dashboardData.incidents.critical > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">
                    {dashboardData.incidents.critical} incidente(s) crítico(s) requieren atención
                  </p>
                  <p className="text-sm text-red-600">
                    {dashboardData.incidents.open} incidentes abiertos en total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Items Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Checklists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Checklists Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recent_checklists.length > 0 ? (
                  dashboardData.recent_checklists.map(checklist => (
                    <div key={checklist.checklist_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{checklist.title}</p>
                        <p className="text-sm text-gray-500">{getProjectName(checklist.project_id)}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={statusColors[checklist.status]}>
                          {statusLabels[checklist.status]}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">{checklist.completion_percentage}%</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay checklists recientes</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Toolbox Talks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Toolbox Talks Próximos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.upcoming_talks.length > 0 ? (
                  dashboardData.upcoming_talks.map(talk => (
                    <div key={talk.talk_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{talk.title}</p>
                        <p className="text-sm text-gray-500">{talk.topic}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{moment(talk.scheduled_date).format('DD/MM/YYYY')}</p>
                        <p className="text-sm text-gray-500">{talk.duration_minutes} min</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay charlas programadas</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Observations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Observaciones Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recent_observations.length > 0 ? (
                  dashboardData.recent_observations.map(obs => (
                    <div key={obs.observation_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {obs.observation_type === 'positive' ? (
                          <ThumbsUp className="w-5 h-5 text-green-600" />
                        ) : (
                          <ThumbsDown className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">{obs.title}</p>
                          <p className="text-sm text-gray-500">{obs.location}</p>
                        </div>
                      </div>
                      <Badge className={statusColors[obs.status]}>
                        {statusLabels[obs.status]}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay observaciones recientes</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Incidents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Incidentes Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recent_incidents.length > 0 ? (
                  dashboardData.recent_incidents.map(incident => (
                    <div key={incident.incident_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        <p className="text-sm text-gray-500">{moment(incident.incident_date).format('DD/MM/YYYY')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={severityColors[incident.severity]}>
                          {severityLabels[incident.severity]}
                        </Badge>
                        <Badge className={statusColors[incident.status]}>
                          {statusLabels[incident.status]}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay incidentes recientes</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Render Checklists Tab
  const renderChecklists = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar checklists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        <Button onClick={() => { resetChecklistForm(); setChecklistDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Checklist
        </Button>
      </div>

      <div className="grid gap-4">
        {checklists
          .filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(checklist => (
          <Card key={checklist.checklist_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{checklist.title}</h3>
                    <Badge className={statusColors[checklist.status]}>
                      {statusLabels[checklist.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{checklist.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>Proyecto: {getProjectName(checklist.project_id)}</span>
                    <span>Asignado: {getUserName(checklist.assigned_to)}</span>
                    {checklist.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {moment(checklist.due_date).format('DD/MM/YYYY')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold">{checklist.completion_percentage}%</p>
                    <Progress value={checklist.completion_percentage} className="w-24 h-2" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewingChecklist(checklist)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver / Completar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setEditingChecklist(checklist);
                        setChecklistForm({
                          ...checklist,
                          items: checklist.items || [{ description: '', category: 'general' }]
                        });
                        setChecklistDialogOpen(true);
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteChecklist(checklist.checklist_id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {checklists.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardCheck className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No hay checklists de seguridad</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { resetChecklistForm(); setChecklistDialogOpen(true); }}
              >
                Crear primer checklist
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Checklist Dialog */}
      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChecklist ? 'Editar Checklist' : 'Nuevo Checklist de Seguridad'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input
                  value={checklistForm.title}
                  onChange={(e) => setChecklistForm({...checklistForm, title: e.target.value})}
                  placeholder="Ej: Inspección diaria de andamios"
                />
              </div>
              <div className="col-span-2">
                <Label>Descripción</Label>
                <Textarea
                  value={checklistForm.description}
                  onChange={(e) => setChecklistForm({...checklistForm, description: e.target.value})}
                  placeholder="Descripción del checklist..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Proyecto</Label>
                <Select
                  value={checklistForm.project_id}
                  onValueChange={(value) => setChecklistForm({...checklistForm, project_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoría</Label>
                <Select
                  value={checklistForm.category}
                  onValueChange={(value) => setChecklistForm({...checklistForm, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="ppe">EPP</SelectItem>
                    <SelectItem value="equipment">Equipos</SelectItem>
                    <SelectItem value="scaffolding">Andamios</SelectItem>
                    <SelectItem value="electrical">Eléctrico</SelectItem>
                    <SelectItem value="confined_space">Espacio Confinado</SelectItem>
                    <SelectItem value="excavation">Excavaciones</SelectItem>
                    <SelectItem value="fire">Protección contra Incendios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Asignado a</Label>
                <Select
                  value={checklistForm.assigned_to}
                  onValueChange={(value) => setChecklistForm({...checklistForm, assigned_to: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha límite</Label>
                <Input
                  type="date"
                  value={checklistForm.due_date}
                  onChange={(e) => setChecklistForm({...checklistForm, due_date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Items del Checklist</Label>
              <div className="space-y-2">
                {checklistForm.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...checklistForm.items];
                        newItems[index].description = e.target.value;
                        setChecklistForm({...checklistForm, items: newItems});
                      }}
                      placeholder={`Item ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newItems = checklistForm.items.filter((_, i) => i !== index);
                        setChecklistForm({...checklistForm, items: newItems});
                      }}
                      disabled={checklistForm.items.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChecklistForm({
                    ...checklistForm,
                    items: [...checklistForm.items, { description: '', category: 'general' }]
                  })}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Item
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveChecklist} disabled={!checklistForm.title || checklistForm.items.every(i => !i.description)}>
              {editingChecklist ? 'Guardar Cambios' : 'Crear Checklist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Complete Checklist Dialog */}
      <Dialog open={!!viewingChecklist} onOpenChange={() => setViewingChecklist(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              {viewingChecklist?.title}
            </DialogTitle>
          </DialogHeader>
          {viewingChecklist && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Progreso</p>
                  <p className="text-2xl font-bold">{viewingChecklist.completion_percentage}%</p>
                </div>
                <Badge className={statusColors[viewingChecklist.status]}>
                  {statusLabels[viewingChecklist.status]}
                </Badge>
              </div>
              
              <Progress value={viewingChecklist.completion_percentage} className="h-3" />

              <div className="space-y-2">
                {viewingChecklist.items?.map((item) => (
                  <div 
                    key={item.item_id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      item.is_checked ? 'bg-green-50 border-green-200' : 'bg-white'
                    }`}
                  >
                    <Checkbox
                      checked={item.is_checked}
                      onCheckedChange={(checked) => handleCheckItem(viewingChecklist.checklist_id, item.item_id, checked)}
                    />
                    <div className="flex-1">
                      <p className={item.is_checked ? 'line-through text-gray-500' : ''}>
                        {item.description}
                      </p>
                      {item.is_checked && item.checked_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          Completado: {moment(item.checked_at).format('DD/MM/YYYY HH:mm')}
                        </p>
                      )}
                    </div>
                    {item.is_checked && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingChecklist(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Render Observations Tab
  const renderObservations = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar observaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="border-green-500 text-green-600 hover:bg-green-50"
            onClick={() => { 
              resetObservationForm(); 
              setObservationForm(prev => ({...prev, observation_type: 'positive'}));
              setObservationDialogOpen(true); 
            }}
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Positiva
          </Button>
          <Button 
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-50"
            onClick={() => { 
              resetObservationForm(); 
              setObservationForm(prev => ({...prev, observation_type: 'negative'}));
              setObservationDialogOpen(true); 
            }}
          >
            <ThumbsDown className="w-4 h-4 mr-2" />
            Negativa
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {observations
          .filter(o => o.title.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(observation => (
          <Card key={observation.observation_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {observation.observation_type === 'positive' ? (
                    <div className="p-2 bg-green-100 rounded-full">
                      <ThumbsUp className="w-5 h-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="p-2 bg-red-100 rounded-full">
                      <ThumbsDown className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{observation.title}</h3>
                      <Badge className={statusColors[observation.status]}>
                        {statusLabels[observation.status]}
                      </Badge>
                      <Badge className={priorityColors[observation.priority]}>
                        {observation.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{observation.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>📍 {observation.location || 'Sin ubicación'}</span>
                      <span>Proyecto: {getProjectName(observation.project_id)}</span>
                      <span>Por: {observation.created_by_name}</span>
                    </div>
                    {observation.observation_type === 'negative' && observation.corrective_action && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                        <span className="font-medium">Acción correctiva: </span>
                        {observation.corrective_action}
                      </div>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditingObservation(observation);
                      setObservationForm(observation);
                      setObservationDialogOpen(true);
                    }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {observation.status === 'open' && (
                      <DropdownMenuItem onClick={async () => {
                        await api.put(`/api/safety/observations/${observation.observation_id}`, { status: 'resolved' });
                        toast.success('Observación resuelta');
                        loadObservations();
                      }}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Marcar como Resuelta
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => handleDeleteObservation(observation.observation_id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
        {observations.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No hay observaciones de seguridad</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { resetObservationForm(); setObservationDialogOpen(true); }}
              >
                Registrar primera observación
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Observation Dialog */}
      <Dialog open={observationDialogOpen} onOpenChange={setObservationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {observationForm.observation_type === 'positive' ? (
                <ThumbsUp className="w-5 h-5 text-green-600" />
              ) : (
                <ThumbsDown className="w-5 h-5 text-red-600" />
              )}
              {editingObservation ? 'Editar Observación' : `Nueva Observación ${observationForm.observation_type === 'positive' ? 'Positiva' : 'Negativa'}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input
                  value={observationForm.title}
                  onChange={(e) => setObservationForm({...observationForm, title: e.target.value})}
                  placeholder="Ej: Buen uso de EPP observado"
                />
              </div>
              <div className="col-span-2">
                <Label>Descripción *</Label>
                <Textarea
                  value={observationForm.description}
                  onChange={(e) => setObservationForm({...observationForm, description: e.target.value})}
                  placeholder="Describa la observación..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Proyecto</Label>
                <Select
                  value={observationForm.project_id}
                  onValueChange={(value) => setObservationForm({...observationForm, project_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input
                  value={observationForm.location}
                  onChange={(e) => setObservationForm({...observationForm, location: e.target.value})}
                  placeholder="Ej: Área de construcción norte"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={observationForm.observation_type}
                  onValueChange={(value) => setObservationForm({...observationForm, observation_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positiva</SelectItem>
                    <SelectItem value="negative">Negativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select
                  value={observationForm.priority}
                  onValueChange={(value) => setObservationForm({...observationForm, priority: value})}
                >
                  <SelectTrigger>
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
              {observationForm.observation_type === 'negative' && (
                <>
                  <div className="col-span-2">
                    <Label>Acción Correctiva Requerida</Label>
                    <Textarea
                      value={observationForm.corrective_action}
                      onChange={(e) => setObservationForm({...observationForm, corrective_action: e.target.value})}
                      placeholder="Describa la acción correctiva necesaria..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Asignado a</Label>
                    <Select
                      value={observationForm.assigned_to}
                      onValueChange={(value) => setObservationForm({...observationForm, assigned_to: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar responsable" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fecha límite</Label>
                    <Input
                      type="date"
                      value={observationForm.due_date}
                      onChange={(e) => setObservationForm({...observationForm, due_date: e.target.value})}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObservationDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveObservation} disabled={!observationForm.title || !observationForm.description}>
              {editingObservation ? 'Guardar Cambios' : 'Registrar Observación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Render Toolbox Talks Tab
  const renderToolboxTalks = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar charlas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        <Button onClick={() => { resetToolboxForm(); setToolboxDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Charla
        </Button>
      </div>

      <div className="grid gap-4">
        {toolboxTalks
          .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(talk => (
          <Card key={talk.talk_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{talk.title}</h3>
                      <Badge className={statusColors[talk.status]}>
                        {statusLabels[talk.status]}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-purple-600">{talk.topic}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {moment(talk.scheduled_date).format('DD/MM/YYYY HH:mm')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {talk.duration_minutes} min
                      </span>
                      <span>📍 {talk.location || 'Sin ubicación'}</span>
                      <span>Presentador: {talk.presenter_name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Asistentes</p>
                    <p className="text-xl font-bold">{talk.attendance_records?.length || 0}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewingToolbox(talk)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalles
                      </DropdownMenuItem>
                      {talk.status === 'scheduled' && (
                        <DropdownMenuItem onClick={() => handleCompleteToolbox(talk.talk_id)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marcar Completada
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => {
                        setEditingToolbox(talk);
                        setToolboxForm(talk);
                        setToolboxDialogOpen(true);
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteToolbox(talk.talk_id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {toolboxTalks.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No hay Toolbox Talks programadas</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { resetToolboxForm(); setToolboxDialogOpen(true); }}
              >
                Programar primera charla
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Toolbox Talk Dialog */}
      <Dialog open={toolboxDialogOpen} onOpenChange={setToolboxDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingToolbox ? 'Editar Toolbox Talk' : 'Nueva Charla de Seguridad'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input
                  value={toolboxForm.title}
                  onChange={(e) => setToolboxForm({...toolboxForm, title: e.target.value})}
                  placeholder="Ej: Seguridad en alturas"
                />
              </div>
              <div className="col-span-2">
                <Label>Tema *</Label>
                <Input
                  value={toolboxForm.topic}
                  onChange={(e) => setToolboxForm({...toolboxForm, topic: e.target.value})}
                  placeholder="Ej: Uso correcto del arnés de seguridad"
                />
              </div>
              <div className="col-span-2">
                <Label>Descripción</Label>
                <Textarea
                  value={toolboxForm.description}
                  onChange={(e) => setToolboxForm({...toolboxForm, description: e.target.value})}
                  placeholder="Puntos a cubrir en la charla..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Proyecto</Label>
                <Select
                  value={toolboxForm.project_id}
                  onValueChange={(value) => setToolboxForm({...toolboxForm, project_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha y Hora *</Label>
                <Input
                  type="datetime-local"
                  value={toolboxForm.scheduled_date}
                  onChange={(e) => setToolboxForm({...toolboxForm, scheduled_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Duración (minutos)</Label>
                <Input
                  type="number"
                  value={toolboxForm.duration_minutes}
                  onChange={(e) => setToolboxForm({...toolboxForm, duration_minutes: parseInt(e.target.value) || 15})}
                  min="5"
                  max="120"
                />
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input
                  value={toolboxForm.location}
                  onChange={(e) => setToolboxForm({...toolboxForm, location: e.target.value})}
                  placeholder="Ej: Sala de reuniones"
                />
              </div>
              <div className="col-span-2">
                <Label>Notas</Label>
                <Textarea
                  value={toolboxForm.notes}
                  onChange={(e) => setToolboxForm({...toolboxForm, notes: e.target.value})}
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToolboxDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveToolbox} disabled={!toolboxForm.title || !toolboxForm.topic || !toolboxForm.scheduled_date}>
              {editingToolbox ? 'Guardar Cambios' : 'Programar Charla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Toolbox Talk Dialog */}
      <Dialog open={!!viewingToolbox} onOpenChange={() => setViewingToolbox(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {viewingToolbox?.title}
            </DialogTitle>
          </DialogHeader>
          {viewingToolbox && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Tema</p>
                  <p className="font-medium">{viewingToolbox.topic}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <Badge className={statusColors[viewingToolbox.status]}>
                    {statusLabels[viewingToolbox.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="font-medium">{moment(viewingToolbox.scheduled_date).format('DD/MM/YYYY HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duración</p>
                  <p className="font-medium">{viewingToolbox.duration_minutes} minutos</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Presentador</p>
                  <p className="font-medium">{viewingToolbox.presenter_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ubicación</p>
                  <p className="font-medium">{viewingToolbox.location || 'No especificada'}</p>
                </div>
              </div>

              {viewingToolbox.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Descripción</p>
                  <p className="text-sm">{viewingToolbox.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-2">Registro de Asistencia ({viewingToolbox.attendance_records?.length || 0})</p>
                {viewingToolbox.attendance_records?.length > 0 ? (
                  <div className="space-y-2">
                    {viewingToolbox.attendance_records.map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{record.user_name}</span>
                        <span className="text-sm text-gray-500">{moment(record.attended_at).format('HH:mm')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay asistentes registrados</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {viewingToolbox?.status === 'scheduled' && (
              <Button onClick={() => handleCompleteToolbox(viewingToolbox.talk_id)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar Completada
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewingToolbox(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Render Incidents Tab
  const renderIncidents = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar incidentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        <Button onClick={() => { resetIncidentForm(); setIncidentDialogOpen(true); }} className="bg-red-600 hover:bg-red-700">
          <AlertCircle className="w-4 h-4 mr-2" />
          Reportar Incidente
        </Button>
      </div>

      <div className="grid gap-4">
        {incidents
          .filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(incident => (
          <Card key={incident.incident_id} className={`hover:shadow-md transition-shadow ${incident.severity === 'critical' ? 'border-red-300' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${severityColors[incident.severity].replace('text-', 'bg-').replace('-800', '-200')}`}>
                    <AlertCircle className={`w-6 h-6 ${severityColors[incident.severity].split(' ')[1]}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{incident.title}</h3>
                      <Badge className={severityColors[incident.severity]}>
                        {severityLabels[incident.severity]}
                      </Badge>
                      <Badge className={statusColors[incident.status]}>
                        {statusLabels[incident.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{incident.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {moment(incident.incident_date).format('DD/MM/YYYY')}
                        {incident.incident_time && ` ${incident.incident_time}`}
                      </span>
                      <span>📍 {incident.location || 'Sin ubicación'}</span>
                      <span>Reportado por: {incident.reported_by_name}</span>
                    </div>
                    {incident.injuries_description && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                        <span className="font-medium text-red-800">Lesiones: </span>
                        {incident.injuries_description}
                      </div>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewingIncident(incident)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setEditingIncident(incident);
                      setIncidentForm(incident);
                      setIncidentDialogOpen(true);
                    }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {incident.status !== 'closed' && (
                      <DropdownMenuItem onClick={async () => {
                        await api.put(`/api/safety/incidents/${incident.incident_id}`, { status: 'closed' });
                        toast.success('Incidente cerrado');
                        loadIncidents();
                      }}>
                        <XCircle className="w-4 h-4 mr-2" />
                        Cerrar Incidente
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => handleDeleteIncident(incident.incident_id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
        {incidents.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 mx-auto text-green-400 mb-4" />
              <p className="text-green-600 font-semibold">¡Excelente! No hay incidentes reportados</p>
              <p className="text-gray-500 text-sm mt-1">Mantengamos este récord de seguridad</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Incident Dialog */}
      <Dialog open={incidentDialogOpen} onOpenChange={setIncidentDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              {editingIncident ? 'Editar Incidente' : 'Reportar Incidente de Seguridad'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Título del Incidente *</Label>
                <Input
                  value={incidentForm.title}
                  onChange={(e) => setIncidentForm({...incidentForm, title: e.target.value})}
                  placeholder="Ej: Caída desde altura"
                />
              </div>
              <div className="col-span-2">
                <Label>Descripción del Incidente *</Label>
                <Textarea
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({...incidentForm, description: e.target.value})}
                  placeholder="Describa qué sucedió..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Fecha del Incidente *</Label>
                <Input
                  type="date"
                  value={incidentForm.incident_date}
                  onChange={(e) => setIncidentForm({...incidentForm, incident_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Hora del Incidente</Label>
                <Input
                  type="time"
                  value={incidentForm.incident_time}
                  onChange={(e) => setIncidentForm({...incidentForm, incident_time: e.target.value})}
                />
              </div>
              <div>
                <Label>Proyecto</Label>
                <Select
                  value={incidentForm.project_id}
                  onValueChange={(value) => setIncidentForm({...incidentForm, project_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input
                  value={incidentForm.location}
                  onChange={(e) => setIncidentForm({...incidentForm, location: e.target.value})}
                  placeholder="Ej: Piso 3, área de construcción"
                />
              </div>
              <div>
                <Label>Tipo de Incidente</Label>
                <Select
                  value={incidentForm.incident_type}
                  onValueChange={(value) => setIncidentForm({...incidentForm, incident_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fall">Caída</SelectItem>
                    <SelectItem value="struck_by">Golpeado por objeto</SelectItem>
                    <SelectItem value="caught_in">Atrapamiento</SelectItem>
                    <SelectItem value="electrical">Eléctrico</SelectItem>
                    <SelectItem value="fire">Incendio</SelectItem>
                    <SelectItem value="chemical">Químico</SelectItem>
                    <SelectItem value="vehicle">Vehículo</SelectItem>
                    <SelectItem value="ergonomic">Ergonómico</SelectItem>
                    <SelectItem value="near_miss">Casi accidente</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severidad *</Label>
                <Select
                  value={incidentForm.severity}
                  onValueChange={(value) => setIncidentForm({...incidentForm, severity: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Menor - Sin lesiones</SelectItem>
                    <SelectItem value="moderate">Moderado - Lesión leve</SelectItem>
                    <SelectItem value="serious">Serio - Atención médica requerida</SelectItem>
                    <SelectItem value="critical">Crítico - Hospitalización/Fatalidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Descripción de Lesiones</Label>
                <Textarea
                  value={incidentForm.injuries_description}
                  onChange={(e) => setIncidentForm({...incidentForm, injuries_description: e.target.value})}
                  placeholder="Describa las lesiones sufridas, si las hay..."
                  rows={2}
                />
              </div>
              <div className="col-span-2">
                <Label>Daños a la Propiedad</Label>
                <Textarea
                  value={incidentForm.property_damage}
                  onChange={(e) => setIncidentForm({...incidentForm, property_damage: e.target.value})}
                  placeholder="Describa daños a equipos, materiales o instalaciones..."
                  rows={2}
                />
              </div>
              <div className="col-span-2">
                <Label>Acciones Inmediatas Tomadas</Label>
                <Textarea
                  value={incidentForm.immediate_actions}
                  onChange={(e) => setIncidentForm({...incidentForm, immediate_actions: e.target.value})}
                  placeholder="¿Qué acciones se tomaron inmediatamente después del incidente?"
                  rows={2}
                />
              </div>
              <div className="col-span-2">
                <Label>Causa Raíz (si se conoce)</Label>
                <Textarea
                  value={incidentForm.root_cause}
                  onChange={(e) => setIncidentForm({...incidentForm, root_cause: e.target.value})}
                  placeholder="¿Cuál fue la causa principal del incidente?"
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncidentDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleSaveIncident} 
              disabled={!incidentForm.title || !incidentForm.description || !incidentForm.incident_date}
              className="bg-red-600 hover:bg-red-700"
            >
              {editingIncident ? 'Guardar Cambios' : 'Reportar Incidente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Incident Dialog */}
      <Dialog open={!!viewingIncident} onOpenChange={() => setViewingIncident(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className={`w-5 h-5 ${severityColors[viewingIncident?.severity]?.split(' ')[1]}`} />
              {viewingIncident?.title}
            </DialogTitle>
          </DialogHeader>
          {viewingIncident && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={severityColors[viewingIncident.severity]}>
                  {severityLabels[viewingIncident.severity]}
                </Badge>
                <Badge className={statusColors[viewingIncident.status]}>
                  {statusLabels[viewingIncident.status]}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Fecha y Hora</p>
                  <p className="font-medium">
                    {moment(viewingIncident.incident_date).format('DD/MM/YYYY')}
                    {viewingIncident.incident_time && ` a las ${viewingIncident.incident_time}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ubicación</p>
                  <p className="font-medium">{viewingIncident.location || 'No especificada'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Proyecto</p>
                  <p className="font-medium">{getProjectName(viewingIncident.project_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reportado por</p>
                  <p className="font-medium">{viewingIncident.reported_by_name}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Descripción</p>
                <p className="text-sm bg-gray-50 p-3 rounded">{viewingIncident.description}</p>
              </div>

              {viewingIncident.injuries_description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Lesiones</p>
                  <p className="text-sm bg-red-50 p-3 rounded text-red-800">{viewingIncident.injuries_description}</p>
                </div>
              )}

              {viewingIncident.property_damage && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Daños a la Propiedad</p>
                  <p className="text-sm bg-orange-50 p-3 rounded text-orange-800">{viewingIncident.property_damage}</p>
                </div>
              )}

              {viewingIncident.immediate_actions && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Acciones Inmediatas</p>
                  <p className="text-sm bg-blue-50 p-3 rounded">{viewingIncident.immediate_actions}</p>
                </div>
              )}

              {viewingIncident.root_cause && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Causa Raíz</p>
                  <p className="text-sm bg-yellow-50 p-3 rounded">{viewingIncident.root_cause}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingIncident(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7 text-green-600" />
              Módulo de Seguridad
            </h1>
            <p className="text-gray-500">Gestión de seguridad ocupacional y prevención de riesgos</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los proyectos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los proyectos</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              if (activeTab === 'dashboard') loadDashboard();
              else if (activeTab === 'checklists') loadChecklists();
              else if (activeTab === 'observations') loadObservations();
              else if (activeTab === 'toolbox') loadToolboxTalks();
              else if (activeTab === 'incidents') loadIncidents();
            }}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="checklists" className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Checklists
            </TabsTrigger>
            <TabsTrigger value="observations" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Observaciones
            </TabsTrigger>
            <TabsTrigger value="toolbox" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Toolbox Talks
            </TabsTrigger>
            <TabsTrigger value="incidents" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Incidentes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">{renderDashboard()}</TabsContent>
          <TabsContent value="checklists">{renderChecklists()}</TabsContent>
          <TabsContent value="observations">{renderObservations()}</TabsContent>
          <TabsContent value="toolbox">{renderToolboxTalks()}</TabsContent>
          <TabsContent value="incidents">{renderIncidents()}</TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Safety;
