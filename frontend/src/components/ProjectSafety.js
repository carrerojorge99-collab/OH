import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import moment from 'moment';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { 
  Plus, Trash2, Edit, Eye, CheckCircle,
  ClipboardCheck, AlertTriangle, Users,
  Calendar, Shield, Search,
  MoreVertical, Clock,
  ThumbsUp, ThumbsDown, AlertCircle,
  BookOpen, Upload, Camera, Video, X,
  Download, FileText, StickyNote, Paperclip
} from 'lucide-react';
import {
  generateSafetyDashboardReport,
  generateIncidentsReport,
  generateToolboxTalksReport,
  generateChecklistsReport,
  generateObservationsReport
} from '../utils/pdfGenerator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';

const categoryLabels = {
  general: 'General',
  altura: 'Trabajo en Alturas',
  epp: 'EPP',
  quimicos: 'Materiales Peligrosos',
  electrico: 'Seguridad Eléctrica',
  especial: 'Trabajos Especiales',
  ergonomia: 'Ergonomía',
  emergencia: 'Emergencias'
};

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

const ProjectSafety = ({ projectId, projectName, users = [] }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
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
    category: 'general',
    assigned_to: '',
    due_date: '',
    items: [{ description: '', category: 'general' }]
  });
  
  // Observations
  const [observations, setObservations] = useState([]);
  const [observationDialogOpen, setObservationDialogOpen] = useState(false);
  const [editingObservation, setEditingObservation] = useState(null);
  const [viewingObservation, setViewingObservation] = useState(null);
  const [observationForm, setObservationForm] = useState({
    title: '',
    description: '',
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
  const [toolboxTopics, setToolboxTopics] = useState([]);
  const [topicsLibraryOpen, setTopicsLibraryOpen] = useState(false);
  const [selectedTopicCategory, setSelectedTopicCategory] = useState('all');
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [externalCount, setExternalCount] = useState(0);
  const [externalNames, setExternalNames] = useState(['']);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [toolboxForm, setToolboxForm] = useState({
    title: '',
    topic: '',
    description: '',
    key_points: [],
    quiz_questions: [],
    category: 'general',
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
    loadDashboard();
  }, [projectId]);

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
      loadToolboxTopics();
    } else if (activeTab === 'incidents') {
      loadIncidents();
    }
  }, [activeTab, projectId]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/safety/dashboard?project_id=${projectId}`);
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
      const response = await api.get(`/safety/checklists?project_id=${projectId}`);
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
      const response = await api.get('/safety/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadToolboxTopics = async () => {
    try {
      const response = await api.get('/safety/toolbox-topics');
      setToolboxTopics(response.data);
    } catch (error) {
      console.error('Error loading toolbox topics:', error);
    }
  };

  const loadObservations = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/safety/observations?project_id=${projectId}`);
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
      const response = await api.get(`/safety/toolbox-talks?project_id=${projectId}`);
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
      const response = await api.get(`/safety/incidents?project_id=${projectId}`);
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
      const payload = { ...checklistForm, project_id: projectId };
      if (editingChecklist) {
        await api.put(`/safety/checklists/${editingChecklist.checklist_id}`, payload);
        toast.success('Checklist actualizado');
      } else {
        await api.post('/safety/checklists', payload);
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
      await api.delete(`/safety/checklists/${checklistId}`);
      toast.success('Checklist eliminado');
      loadChecklists();
    } catch (error) {
      console.error('Error deleting checklist:', error);
      toast.error('Error al eliminar checklist');
    }
  };

  const handleCheckItem = async (checklistId, itemId, isChecked, notes = '') => {
    try {
      await api.post(`/safety/checklists/${checklistId}/check-item`, {
        item_id: itemId,
        is_checked: isChecked,
        notes
      });
      const response = await api.get(`/safety/checklists/${checklistId}`);
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
      category: 'general',
      assigned_to: '',
      due_date: '',
      items: [{ description: '', category: 'general' }]
    });
  };

  // Observation handlers
  const handleSaveObservation = async () => {
    try {
      const payload = { ...observationForm, project_id: projectId };
      if (editingObservation) {
        await api.put(`/safety/observations/${editingObservation.observation_id}`, payload);
        toast.success('Observación actualizada');
      } else {
        await api.post('/safety/observations', payload);
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
      await api.delete(`/safety/observations/${observationId}`);
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
      const payload = { ...toolboxForm, project_id: projectId };
      if (editingToolbox) {
        await api.put(`/safety/toolbox-talks/${editingToolbox.talk_id}`, payload);
        toast.success('Toolbox Talk actualizado');
      } else {
        await api.post('/safety/toolbox-talks', payload);
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
      await api.delete(`/safety/toolbox-talks/${talkId}`);
      toast.success('Toolbox Talk eliminado');
      loadToolboxTalks();
    } catch (error) {
      console.error('Error deleting toolbox talk:', error);
      toast.error('Error al eliminar Toolbox Talk');
    }
  };

  const handleCompleteToolbox = async (talkId) => {
    try {
      await api.put(`/safety/toolbox-talks/${talkId}`, { status: 'completed' });
      toast.success('Toolbox Talk completado');
      loadToolboxTalks();
      if (viewingToolbox?.talk_id === talkId) {
        const response = await api.get(`/safety/toolbox-talks/${talkId}`);
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
      key_points: [],
      quiz_questions: [],
      category: 'general',
      scheduled_date: '',
      duration_minutes: 15,
      location: '',
      presenter: '',
      attendees: [],
      notes: ''
    });
  };

  const handleSelectTopic = (topic) => {
    setToolboxForm({
      ...toolboxForm,
      title: topic.title,
      topic: topic.title,
      description: topic.description,
      key_points: topic.key_points || [],
      quiz_questions: topic.quiz_questions || [],
      category: topic.category,
      duration_minutes: topic.duration_minutes
    });
    setTopicsLibraryOpen(false);
    setToolboxDialogOpen(true);
    toast.success(`Tema "${topic.title}" seleccionado`);
  };

  // Media upload handler
  const handleMediaUpload = async (file, entityType, entityId, refreshFn) => {
    if (!file) return;
    
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        `/safety/upload?entity_type=${entityType}&entity_id=${entityId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      toast.success('Archivo subido correctamente');
      if (refreshFn) refreshFn();
      return response.data;
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error(error.response?.data?.detail || 'Error al subir archivo');
      return null;
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleMediaDelete = async (filename, entityType, entityId, refreshFn) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    
    try {
      await api.delete(`/safety/media/${filename}?entity_type=${entityType}&entity_id=${entityId}`);
      toast.success('Archivo eliminado');
      if (refreshFn) refreshFn();
    } catch (error) {
      console.error('Error deleting media:', error);
      toast.error('Error al eliminar archivo');
    }
  };

  // Attendance handler for Toolbox Talks
  const handleSaveAttendance = async (talkId) => {
    try {
      const payload = {
        employee_ids: selectedEmployees,
        external_count: externalCount,
        external_names: externalNames.filter(n => n.trim() !== '')
      };
      
      await api.post(`/safety/toolbox-talks/${talkId}/attendance-bulk`, payload);
      toast.success('Asistencia registrada');
      
      const response = await api.get(`/safety/toolbox-talks/${talkId}`);
      setViewingToolbox(response.data);
      setAttendanceDialogOpen(false);
      loadToolboxTalks();
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Error al guardar asistencia');
    }
  };

  const openAttendanceDialog = (talk) => {
    setSelectedEmployees(talk.attendance_records?.filter(r => r.type === 'employee').map(r => r.user_id) || []);
    const externals = talk.attendance_records?.filter(r => r.type === 'external') || [];
    setExternalCount(externals.length || talk.external_attendee_count || 0);
    setExternalNames(externals.map(e => e.user_name) || ['']);
    setAttendanceDialogOpen(true);
  };

  // Incident handlers
  const handleSaveIncident = async () => {
    try {
      const payload = { ...incidentForm, project_id: projectId };
      if (editingIncident) {
        await api.put(`/safety/incidents/${editingIncident.incident_id}`, payload);
        toast.success('Incidente actualizado');
      } else {
        await api.post('/safety/incidents', payload);
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
      await api.delete(`/safety/incidents/${incidentId}`);
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

  const getUserName = (userId) => {
    const user = users.find(u => u.user_id === userId);
    return user?.name || 'Sin asignar';
  };

  // Render Dashboard
  const renderDashboard = () => {
    if (!dashboardData) return <div className="text-center py-8">Cargando...</div>;
    
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => {
              generateSafetyDashboardReport(dashboardData, projectName);
              toast.success('Reporte PDF generado');
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar Reporte
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Días sin Incidentes</p>
                  <p className="text-3xl font-bold text-green-600">{dashboardData.incidents?.days_without_incident || 0}</p>
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
                  <p className="text-3xl font-bold">{dashboardData.checklists?.completed || 0}/{dashboardData.checklists?.total || 0}</p>
                  <p className="text-sm text-gray-400">{dashboardData.checklists?.completion_rate || 0}% completado</p>
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
                      {dashboardData.observations?.positive || 0}
                    </span>
                    <span className="flex items-center text-red-600">
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      {dashboardData.observations?.negative || 0}
                    </span>
                  </div>
                  <p className="text-sm text-yellow-600">{dashboardData.observations?.open || 0} abiertas</p>
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
                  <p className="text-3xl font-bold">{dashboardData.toolbox_talks?.completed || 0}</p>
                  <p className="text-sm text-blue-600">{dashboardData.toolbox_talks?.scheduled || 0} programados</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Incidents Alert */}
        {dashboardData.incidents?.critical > 0 && (
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
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="w-5 h-5" />
                Checklists Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recent_checklists?.length > 0 ? (
                  dashboardData.recent_checklists.map(checklist => (
                    <div key={checklist.checklist_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{checklist.title}</p>
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
                  <p className="text-gray-500 text-center py-4 text-sm">No hay checklists recientes</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Incidents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="w-5 h-5" />
                Incidentes Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recent_incidents?.length > 0 ? (
                  dashboardData.recent_incidents.map(incident => (
                    <div key={incident.incident_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{incident.title}</p>
                        <p className="text-xs text-gray-500">{moment(incident.incident_date).format('DD/MM/YYYY')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={severityColors[incident.severity]}>
                          {severityLabels[incident.severity]}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm">No hay incidentes recientes</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Render Checklists Tab
  const renderChecklists = () => {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar checklists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                generateChecklistsReport(checklists, projectName);
                toast.success('Reporte PDF generado');
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button size="sm" onClick={() => { resetChecklistForm(); setChecklistDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {checklists
            .filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(checklist => (
            <Card key={checklist.checklist_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold">{checklist.title}</h3>
                      <Badge className={statusColors[checklist.status]}>
                        {statusLabels[checklist.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{checklist.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
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
                  <Label>Categoría</Label>
                  <Select
                    value={checklistForm.category}
                    onValueChange={(value) => setChecklistForm({...checklistForm, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Asignado a</Label>
                  <Select
                    value={checklistForm.assigned_to || "none"}
                    onValueChange={(value) => setChecklistForm({...checklistForm, assigned_to: value === "none" ? "" : value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
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
  };

  // Render Observations Tab
  const renderObservations = () => {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar observaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                generateObservationsReport(observations, projectName);
                toast.success('Reporte PDF generado');
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button 
              variant="outline"
              size="sm"
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
              size="sm"
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
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold">{observation.title}</h3>
                        <Badge className={statusColors[observation.status]}>
                          {statusLabels[observation.status]}
                        </Badge>
                        <Badge className={priorityColors[observation.priority]}>
                          {observation.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{observation.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                        <span>📍 {observation.location || 'Sin ubicación'}</span>
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
                      <DropdownMenuItem onClick={() => setViewingObservation(observation)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver / Fotos
                      </DropdownMenuItem>
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
                          await api.put(`/safety/observations/${observation.observation_id}`, { status: 'resolved' });
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
                  <Label>Ubicación</Label>
                  <Input
                    value={observationForm.location}
                    onChange={(e) => setObservationForm({...observationForm, location: e.target.value})}
                    placeholder="Ej: Área de construcción norte"
                  />
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
                        value={observationForm.assigned_to || "none"}
                        onValueChange={(value) => setObservationForm({...observationForm, assigned_to: value === "none" ? "" : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar responsable" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
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

        {/* View Observation Dialog with Media */}
        <Dialog open={!!viewingObservation} onOpenChange={() => setViewingObservation(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewingObservation?.observation_type === 'positive' ? (
                  <ThumbsUp className="w-5 h-5 text-green-600" />
                ) : (
                  <ThumbsDown className="w-5 h-5 text-red-600" />
                )}
                {viewingObservation?.title}
              </DialogTitle>
            </DialogHeader>
            {viewingObservation && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Tipo</p>
                    <Badge className={viewingObservation.observation_type === 'positive' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {viewingObservation.observation_type === 'positive' ? 'Positiva' : 'Negativa'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estado</p>
                    <Badge className={statusColors[viewingObservation.status]}>
                      {statusLabels[viewingObservation.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ubicación</p>
                    <p className="font-medium">{viewingObservation.location || 'No especificada'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prioridad</p>
                    <Badge className={priorityColors[viewingObservation.priority]}>
                      {viewingObservation.priority}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Descripción</p>
                  <p className="text-sm">{viewingObservation.description}</p>
                </div>

                {viewingObservation.corrective_action && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Acción Correctiva</p>
                    <p className="text-sm text-yellow-700">{viewingObservation.corrective_action}</p>
                  </div>
                )}

                {/* Media Gallery */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Fotos y Videos ({viewingObservation.media?.length || 0})
                    </p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            await handleMediaUpload(file, 'observation', viewingObservation.observation_id, async () => {
                              const response = await api.get(`/safety/observations/${viewingObservation.observation_id}`);
                              setViewingObservation(response.data);
                              loadObservations();
                            });
                          }
                          e.target.value = '';
                        }}
                        disabled={uploadingMedia}
                      />
                      <Button variant="outline" size="sm" asChild disabled={uploadingMedia}>
                        <span>
                          <Upload className="w-4 h-4 mr-1" />
                          {uploadingMedia ? 'Subiendo...' : 'Subir'}
                        </span>
                      </Button>
                    </label>
                  </div>
                  {viewingObservation.media?.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {viewingObservation.media.map((media, idx) => (
                        <div key={idx} className="relative group">
                          {media.media_type === 'photo' ? (
                            <img
                              src={media.url}
                              alt={media.original_filename}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Video className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          <button
                            onClick={() => handleMediaDelete(media.filename, 'observation', viewingObservation.observation_id, async () => {
                              const response = await api.get(`/safety/observations/${viewingObservation.observation_id}`);
                              setViewingObservation(response.data);
                              loadObservations();
                            })}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">No hay archivos adjuntos</p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingObservation(null)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // Render Toolbox Talks Tab
  const renderToolboxTalks = () => {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar charlas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                generateToolboxTalksReport(toolboxTalks, projectName);
                toast.success('Reporte PDF generado');
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setTopicsLibraryOpen(true)}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Biblioteca
            </Button>
            <Button size="sm" onClick={() => { resetToolboxForm(); setToolboxDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Charla
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {toolboxTalks
            .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(talk => (
            <Card key={talk.talk_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold">{talk.title}</h3>
                      <Badge className={statusColors[talk.status]}>
                        {statusLabels[talk.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{talk.topic}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                      {talk.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {moment(talk.scheduled_date).format('DD/MM/YYYY')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {talk.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {talk.total_attendees || 0} asistentes
                      </span>
                    </div>
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
                      <DropdownMenuItem onClick={() => {
                        setEditingToolbox(talk);
                        setToolboxForm(talk);
                        setToolboxDialogOpen(true);
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {talk.status === 'scheduled' && (
                        <DropdownMenuItem onClick={() => handleCompleteToolbox(talk.talk_id)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marcar Completada
                        </DropdownMenuItem>
                      )}
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
              </CardContent>
            </Card>
          ))}
          {toolboxTalks.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No hay Toolbox Talks programados</p>
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
              <DialogTitle>{editingToolbox ? 'Editar Toolbox Talk' : 'Nuevo Toolbox Talk'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Título *</Label>
                  <Input
                    value={toolboxForm.title}
                    onChange={(e) => setToolboxForm({...toolboxForm, title: e.target.value})}
                    placeholder="Ej: Seguridad en Trabajo en Alturas"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Tema</Label>
                  <Input
                    value={toolboxForm.topic}
                    onChange={(e) => setToolboxForm({...toolboxForm, topic: e.target.value})}
                    placeholder="Tema de la charla..."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={toolboxForm.description}
                    onChange={(e) => setToolboxForm({...toolboxForm, description: e.target.value})}
                    placeholder="Descripción detallada..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Fecha programada</Label>
                  <Input
                    type="date"
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
                  />
                </div>
                <div>
                  <Label>Ubicación</Label>
                  <Input
                    value={toolboxForm.location}
                    onChange={(e) => setToolboxForm({...toolboxForm, location: e.target.value})}
                    placeholder="Lugar de la charla"
                  />
                </div>
                <div>
                  <Label>Presentador</Label>
                  <Input
                    value={toolboxForm.presenter}
                    onChange={(e) => setToolboxForm({...toolboxForm, presenter: e.target.value})}
                    placeholder="Nombre del presentador"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setToolboxDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveToolbox} disabled={!toolboxForm.title}>
                {editingToolbox ? 'Guardar Cambios' : 'Crear Charla'}
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
                    <p className="text-sm text-gray-500">Estado</p>
                    <Badge className={statusColors[viewingToolbox.status]}>
                      {statusLabels[viewingToolbox.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha</p>
                    <p className="font-medium">{viewingToolbox.scheduled_date ? moment(viewingToolbox.scheduled_date).format('DD/MM/YYYY') : 'No programada'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duración</p>
                    <p className="font-medium">{viewingToolbox.duration_minutes} minutos</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Asistentes</p>
                    <p className="font-medium">{viewingToolbox.total_attendees || 0}</p>
                  </div>
                </div>

                {viewingToolbox.description && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Descripción</p>
                    <p className="text-sm">{viewingToolbox.description}</p>
                  </div>
                )}

                {viewingToolbox.key_points?.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Puntos Clave</p>
                    <ul className="list-disc list-inside space-y-1">
                      {viewingToolbox.key_points.map((point, idx) => (
                        <li key={idx} className="text-sm">{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Attendance Management */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Asistencia</p>
                    <Button variant="outline" size="sm" onClick={() => openAttendanceDialog(viewingToolbox)}>
                      <Users className="w-4 h-4 mr-2" />
                      Registrar Asistencia
                    </Button>
                  </div>
                  {viewingToolbox.attendance_records?.length > 0 ? (
                    <div className="space-y-2">
                      {viewingToolbox.attendance_records.map((record, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{record.user_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {record.type === 'employee' ? 'Empleado' : 'Externo'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">No hay asistencia registrada</p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingToolbox(null)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Attendance Dialog */}
        <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Asistencia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Empleados</Label>
                <div className="max-h-40 overflow-y-auto space-y-2 border rounded p-2">
                  {users.map(user => (
                    <div key={user.user_id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedEmployees.includes(user.user_id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEmployees([...selectedEmployees, user.user_id]);
                          } else {
                            setSelectedEmployees(selectedEmployees.filter(id => id !== user.user_id));
                          }
                        }}
                      />
                      <span className="text-sm">{user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Asistentes Externos</Label>
                <div className="space-y-2 mt-2">
                  {externalNames.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={name}
                        onChange={(e) => {
                          const newNames = [...externalNames];
                          newNames[idx] = e.target.value;
                          setExternalNames(newNames);
                        }}
                        placeholder={`Nombre externo ${idx + 1}`}
                      />
                      {externalNames.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExternalNames(externalNames.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExternalNames([...externalNames, ''])}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Externo
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => handleSaveAttendance(viewingToolbox?.talk_id)}>
                Guardar Asistencia
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Topics Library Dialog */}
        <Dialog open={topicsLibraryOpen} onOpenChange={setTopicsLibraryOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Biblioteca de Temas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant={selectedTopicCategory === 'all' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSelectedTopicCategory('all')}
                >
                  Todos
                </Button>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={selectedTopicCategory === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTopicCategory(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="grid gap-3">
                {toolboxTopics
                  .filter(t => selectedTopicCategory === 'all' || t.category === selectedTopicCategory)
                  .map(topic => (
                  <Card key={topic.topic_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleSelectTopic(topic)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{topic.title}</h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{topic.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{categoryLabels[topic.category] || topic.category}</Badge>
                            <span className="text-xs text-gray-400">{topic.duration_minutes} min</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {toolboxTopics.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No hay temas disponibles</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // Render Incidents Tab
  const renderIncidents = () => {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar incidentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                generateIncidentsReport(incidents, projectName);
                toast.success('Reporte PDF generado');
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button size="sm" variant="destructive" onClick={() => { resetIncidentForm(); setIncidentDialogOpen(true); }}>
              <AlertCircle className="w-4 h-4 mr-2" />
              Reportar Incidente
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {incidents
            .filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(incident => (
            <Card key={incident.incident_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${severityColors[incident.severity]}`}>
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold">{incident.title}</h3>
                        <Badge className={severityColors[incident.severity]}>
                          {severityLabels[incident.severity]}
                        </Badge>
                        <Badge className={statusColors[incident.status]}>
                          {statusLabels[incident.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{incident.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {moment(incident.incident_date).format('DD/MM/YYYY')}
                        </span>
                        {incident.location && <span>📍 {incident.location}</span>}
                      </div>
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
                <p className="text-gray-500">No hay incidentes reportados</p>
                <p className="text-sm text-green-600 mt-2">¡Excelente récord de seguridad!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Incident Dialog */}
        <Dialog open={incidentDialogOpen} onOpenChange={setIncidentDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                {editingIncident ? 'Editar Incidente' : 'Reportar Incidente'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Título del Incidente *</Label>
                  <Input
                    value={incidentForm.title}
                    onChange={(e) => setIncidentForm({...incidentForm, title: e.target.value})}
                    placeholder="Breve descripción del incidente"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Descripción Detallada *</Label>
                  <Textarea
                    value={incidentForm.description}
                    onChange={(e) => setIncidentForm({...incidentForm, description: e.target.value})}
                    placeholder="Describa lo que ocurrió..."
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
                  <Label>Ubicación</Label>
                  <Input
                    value={incidentForm.location}
                    onChange={(e) => setIncidentForm({...incidentForm, location: e.target.value})}
                    placeholder="Lugar exacto del incidente"
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
                      <SelectItem value="injury">Lesión</SelectItem>
                      <SelectItem value="near_miss">Casi Accidente</SelectItem>
                      <SelectItem value="property_damage">Daño a Propiedad</SelectItem>
                      <SelectItem value="environmental">Ambiental</SelectItem>
                      <SelectItem value="security">Seguridad</SelectItem>
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
                      <SelectItem value="minor">Menor</SelectItem>
                      <SelectItem value="moderate">Moderado</SelectItem>
                      <SelectItem value="serious">Serio</SelectItem>
                      <SelectItem value="critical">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Descripción de Lesiones</Label>
                  <Textarea
                    value={incidentForm.injuries_description}
                    onChange={(e) => setIncidentForm({...incidentForm, injuries_description: e.target.value})}
                    placeholder="Describa las lesiones si las hubo..."
                    rows={2}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Acciones Inmediatas Tomadas</Label>
                  <Textarea
                    value={incidentForm.immediate_actions}
                    onChange={(e) => setIncidentForm({...incidentForm, immediate_actions: e.target.value})}
                    placeholder="¿Qué acciones se tomaron inmediatamente?"
                    rows={2}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIncidentDialogOpen(false)}>Cancelar</Button>
              <Button 
                variant="destructive"
                onClick={handleSaveIncident} 
                disabled={!incidentForm.title || !incidentForm.description}
              >
                {editingIncident ? 'Guardar Cambios' : 'Reportar Incidente'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Incident Dialog */}
        <Dialog open={!!viewingIncident} onOpenChange={() => setViewingIncident(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                {viewingIncident?.title}
              </DialogTitle>
            </DialogHeader>
            {viewingIncident && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Severidad</p>
                    <Badge className={severityColors[viewingIncident.severity]}>
                      {severityLabels[viewingIncident.severity]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estado</p>
                    <Badge className={statusColors[viewingIncident.status]}>
                      {statusLabels[viewingIncident.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha</p>
                    <p className="font-medium">{moment(viewingIncident.incident_date).format('DD/MM/YYYY')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ubicación</p>
                    <p className="font-medium">{viewingIncident.location || 'No especificada'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Descripción</p>
                  <p className="text-sm">{viewingIncident.description}</p>
                </div>

                {viewingIncident.injuries_description && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-1">Lesiones Reportadas</p>
                    <p className="text-sm text-red-700">{viewingIncident.injuries_description}</p>
                  </div>
                )}

                {viewingIncident.immediate_actions && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-1">Acciones Inmediatas</p>
                    <p className="text-sm text-blue-700">{viewingIncident.immediate_actions}</p>
                  </div>
                )}

                {/* Media Gallery */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Evidencia Fotográfica ({viewingIncident.media?.length || 0})
                    </p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            await handleMediaUpload(file, 'incident', viewingIncident.incident_id, async () => {
                              const response = await api.get(`/safety/incidents/${viewingIncident.incident_id}`);
                              setViewingIncident(response.data);
                              loadIncidents();
                            });
                          }
                          e.target.value = '';
                        }}
                        disabled={uploadingMedia}
                      />
                      <Button variant="outline" size="sm" asChild disabled={uploadingMedia}>
                        <span>
                          <Upload className="w-4 h-4 mr-1" />
                          {uploadingMedia ? 'Subiendo...' : 'Subir'}
                        </span>
                      </Button>
                    </label>
                  </div>
                  {viewingIncident.media?.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {viewingIncident.media.map((media, idx) => (
                        <div key={idx} className="relative group">
                          {media.media_type === 'photo' ? (
                            <img
                              src={media.url}
                              alt={media.original_filename}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Video className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          <button
                            onClick={() => handleMediaDelete(media.filename, 'incident', viewingIncident.incident_id, async () => {
                              const response = await api.get(`/safety/incidents/${viewingIncident.incident_id}`);
                              setViewingIncident(response.data);
                              loadIncidents();
                            })}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">No hay evidencia adjunta</p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingIncident(null)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
            <Shield className="w-4 h-4 mr-1 hidden sm:inline" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="checklists" className="text-xs sm:text-sm">
            <ClipboardCheck className="w-4 h-4 mr-1 hidden sm:inline" />
            Checklists
          </TabsTrigger>
          <TabsTrigger value="observations" className="text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 mr-1 hidden sm:inline" />
            Observaciones
          </TabsTrigger>
          <TabsTrigger value="toolbox" className="text-xs sm:text-sm">
            <Users className="w-4 h-4 mr-1 hidden sm:inline" />
            Toolbox
          </TabsTrigger>
          <TabsTrigger value="incidents" className="text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 mr-1 hidden sm:inline" />
            Incidentes
          </TabsTrigger>
          <TabsTrigger value="daily-logs" className="text-xs sm:text-sm">
            <FileText className="w-4 h-4 mr-1 hidden sm:inline" />
            Daily Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            renderDashboard()
          )}
        </TabsContent>

        <TabsContent value="checklists" className="mt-6">
          {renderChecklists()}
        </TabsContent>

        <TabsContent value="observations" className="mt-6">
          {renderObservations()}
        </TabsContent>

        <TabsContent value="toolbox" className="mt-6">
          {renderToolboxTalks()}
        </TabsContent>

        <TabsContent value="incidents" className="mt-6">
          {renderIncidents()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectSafety;
