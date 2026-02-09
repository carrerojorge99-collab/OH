import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { MapPin, Calendar, User, Clock, FolderKanban, ChevronDown, ChevronRight, Trash2, Edit2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');


const ClockHistory = () => {
  const [clockEntries, setClockEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [groupedEntries, setGroupedEntries] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({ clock_in_time: '', clock_out_time: '', project_id: '' });
  const [saving, setSaving] = useState(false);

  // Manual entry dialog state
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    user_id: '',
    project_id: '',
    date: moment().format('YYYY-MM-DD'),
    clock_in_time: '08:00',
    clock_out_time: '17:00',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [selectedUser, selectedProject, startDate, endDate, clockEntries]);

  // Group entries by user and date
  useEffect(() => {
    const grouped = {};
    
    filteredEntries.forEach(entry => {
      const key = `${entry.user_id}_${entry.date}`;
      if (!grouped[key]) {
        grouped[key] = {
          key,
          user_id: entry.user_id,
          user_name: entry.user_name,
          date: entry.date,
          entries: [],
          totalHours: 0,
          projects: new Set()
        };
      }
      grouped[key].entries.push(entry);
      grouped[key].totalHours += entry.hours_worked || 0;
      if (entry.project_name) {
        grouped[key].projects.add(entry.project_name);
      }
    });

    // Convert to array and sort entries within each group
    const groupedArray = Object.values(grouped).map(group => ({
      ...group,
      entries: group.entries.sort((a, b) => new Date(a.clock_in) - new Date(b.clock_in)),
      projects: Array.from(group.projects)
    }));

    // Sort by date descending
    groupedArray.sort((a, b) => new Date(b.date) - new Date(a.date));

    setGroupedEntries(groupedArray);
    
    // Auto-expand first group
    if (groupedArray.length > 0 && Object.keys(expandedGroups).length === 0) {
      setExpandedGroups({ [groupedArray[0].key]: true });
    }
  }, [filteredEntries]);

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    groupedEntries.forEach(g => { allExpanded[g.key] = true; });
    setExpandedGroups(allExpanded);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  const handleDeleteClock = async (clockId, userName, date) => {
    if (!window.confirm(`¿Eliminar el ponche de ${userName} del ${moment(date).format('DD/MM/YYYY')}?`)) {
      return;
    }
    
    try {
      await api.delete(`/clock/${clockId}`, { withCredentials: true });
      toast.success('Ponche eliminado exitosamente');
      loadData(); // Reload data
    } catch (error) {
      console.error('Error deleting clock:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar ponche');
    }
  };

  const handleOpenEditDialog = (entry) => {
    setEditingEntry(entry);
    // Extract time from ISO string
    const clockInTime = entry.clock_in ? moment(entry.clock_in).format('HH:mm') : '';
    const clockOutTime = entry.clock_out ? moment(entry.clock_out).format('HH:mm') : '';
    setEditForm({ 
      clock_in_time: clockInTime, 
      clock_out_time: clockOutTime,
      project_id: entry.project_id || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    
    setSaving(true);
    try {
      // Build the full datetime from date + time
      const date = editingEntry.date;
      const clockInFull = editForm.clock_in_time 
        ? `${date}T${editForm.clock_in_time}:00` 
        : null;
      const clockOutFull = editForm.clock_out_time 
        ? `${date}T${editForm.clock_out_time}:00` 
        : null;
      
      await api.put(`/clock/${editingEntry.clock_id}`, {
        clock_in: clockInFull,
        clock_out: clockOutFull,
        project_id: editForm.project_id || null
      }, { withCredentials: true });
      
      toast.success('Ponche actualizado exitosamente');
      setEditDialogOpen(false);
      setEditingEntry(null);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error updating clock:', error);
      toast.error(error.response?.data?.detail || 'Error al actualizar ponche');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateManualEntry = async () => {
    if (!manualForm.user_id || !manualForm.project_id || !manualForm.date || !manualForm.clock_in_time) {
      toast.error('Por favor complete los campos requeridos');
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/clock/manual', {
        user_id: manualForm.user_id,
        project_id: manualForm.project_id,
        date: manualForm.date,
        clock_in_time: manualForm.clock_in_time,
        clock_out_time: manualForm.clock_out_time || null,
        notes: manualForm.notes || null
      }, { withCredentials: true });
      
      toast.success('Ponche manual creado exitosamente');
      setManualDialogOpen(false);
      setManualForm({
        user_id: '',
        project_id: '',
        date: moment().format('YYYY-MM-DD'),
        clock_in_time: '08:00',
        clock_out_time: '17:00',
        notes: ''
      });
      loadData(); // Reload data
    } catch (error) {
      console.error('Error creating manual clock:', error);
      toast.error(error.response?.data?.detail || 'Error al crear ponche manual');
    } finally {
      setSaving(false);
    }
  };

  const loadData = async () => {
    try {
      const timestamp = Date.now();
      const [entriesRes, usersRes, projectsRes] = await Promise.all([
        api.get(`/clock/all?_t=${timestamp}`, { 
          withCredentials: true,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        }),
        api.get(`/users?_t=${timestamp}`, { withCredentials: true }),
        api.get(`/projects?_t=${timestamp}`, { withCredentials: true })
      ]);

      setClockEntries([...(entriesRes.data || [])]);
      setFilteredEntries([...(entriesRes.data || [])]);
      setUsers(usersRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      
      if (error.response?.status === 403) {
        setAccessDenied(true);
        toast.error('Solo los administradores pueden ver el historial de ponches');
      } else if (error.response?.status === 401) {
        toast.error('Sesión expirada. Por favor inicia sesión nuevamente');
      } else {
        toast.error(error.response?.data?.detail || 'Error al cargar datos');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = [...clockEntries];

    if (selectedUser !== 'all') {
      filtered = filtered.filter(entry => entry.user_id === selectedUser);
    }

    if (selectedProject !== 'all') {
      filtered = filtered.filter(entry => entry.project_id === selectedProject);
    }

    filtered = filtered.filter(entry => {
      const entryDate = moment(entry.date);
      return entryDate.isBetween(startDate, endDate, 'day', '[]');
    });

    filtered.sort((a, b) => new Date(b.clock_in) - new Date(a.clock_in));
    setFilteredEntries(filtered);
  };

  const getTotalHours = () => {
    return filteredEntries
      .filter(entry => entry.hours_worked)
      .reduce((sum, entry) => sum + entry.hours_worked, 0)
      .toFixed(2);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
            <p className="text-slate-600">Cargando historial...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (accessDenied) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-red-900 mb-2">Acceso Denegado</h2>
              <p className="text-red-700 mb-6">
                Solo los administradores pueden ver el historial completo de ponches.
              </p>
              <Button 
                onClick={() => window.history.back()}
                className="bg-red-600 hover:bg-red-700"
              >
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900">Historial de Ponches</h1>
          <Button 
            onClick={() => setManualDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ponche Manual
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Empleado</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los empleados</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.name || user.email || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Proyecto</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los proyectos</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.project_id} value={project.project_id}>
                        {project.name || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Fecha Inicio</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Fecha Fin</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm text-slate-600">
                <span className="font-semibold">{groupedEntries.length}</span> días con registros
                {filteredEntries.length > 0 && (
                  <>
                    <span className="mx-2">|</span>
                    <span className="font-semibold">{filteredEntries.length}</span> ponches totales
                    <span className="mx-2">|</span>
                    Total horas: <span className="font-semibold text-blue-600">{getTotalHours()}h</span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expandir Todo
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Colapsar Todo
                </Button>
                <Button onClick={loadData} className="bg-blue-600 hover:bg-blue-700">
                  Actualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grouped Clock Entries as Accordion */}
        <div className="space-y-3">
          {groupedEntries.length > 0 ? (
            groupedEntries.map((group) => (
              <Collapsible 
                key={group.key} 
                open={expandedGroups[group.key]} 
                onOpenChange={() => toggleGroup(group.key)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="cursor-pointer hover:bg-slate-50 transition-colors">
                      <CardHeader className="pb-3 border-b bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8">
                              {expandedGroups[group.key] ? (
                                <ChevronDown className="w-5 h-5 text-slate-500" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-slate-500" />
                              )}
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-slate-900">{group.user_name || 'Sin nombre'}</h3>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Calendar className="w-4 h-4" />
                                {moment(group.date).format('dddd, D [de] MMMM [de] YYYY')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <div className="text-2xl font-bold font-mono text-blue-600">
                                {group.totalHours.toFixed(2)}h
                              </div>
                              <Badge className="bg-blue-100 text-blue-700">
                                {group.entries.length} ponche{group.entries.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {group.projects.length > 0 && (
                          <div className="mt-2 ml-11 flex items-center gap-2 flex-wrap">
                            <FolderKanban className="w-4 h-4 text-slate-500" />
                            {group.projects.map((proj, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {proj}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardHeader>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {group.entries.map((entry, idx) => (
                          <div 
                            key={entry.clock_id} 
                            className={`p-4 rounded-lg border ${
                              entry.status === 'active' 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-sm font-medium flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <Badge className={entry.status === 'active' ? 'bg-green-500' : 'bg-slate-500'}>
                                    {entry.status === 'active' ? 'Activo' : 'Completado'}
                                  </Badge>
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium text-slate-700">Proyecto:</span>{' '}
                                  <span className="text-slate-600">{entry.project_name || 'Sin proyecto'}</span>
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                {entry.hours_worked > 0 && (
                                  <span className="font-mono font-semibold text-blue-600">
                                    {entry.hours_worked.toFixed(2)}h
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1 h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditDialog(entry);
                                  }}
                                  title="Editar ponche"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClock(entry.clock_id, entry.user_name, entry.date);
                                  }}
                                  title="Eliminar ponche"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-4 h-4 text-green-600" />
                                  <span className="font-medium">Entrada:</span>
                                  <span className="font-mono">{moment(entry.clock_in).format('HH:mm:ss')}</span>
                                </div>
                                {(entry.clock_in_address || (entry.clock_in_latitude !== 0 && entry.clock_in_latitude !== null && entry.clock_in_longitude !== 0 && entry.clock_in_longitude !== null)) && (
                                  <div className="flex items-center gap-2 text-xs text-slate-600 ml-6">
                                    <MapPin className="w-3 h-3 text-green-500" />
                                    {entry.clock_in_address ? (
                                      <span className="truncate max-w-[200px]" title={entry.clock_in_address}>{entry.clock_in_address}</span>
                                    ) : (
                                      <span>{entry.clock_in_latitude?.toFixed(4)}, {entry.clock_in_longitude?.toFixed(4)}</span>
                                    )}
                                    {entry.clock_in_latitude !== 0 && entry.clock_in_latitude !== null && entry.clock_in_longitude !== 0 && entry.clock_in_longitude !== null && (
                                      <a
                                        href={`https://www.google.com/maps?q=${entry.clock_in_latitude},${entry.clock_in_longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline flex items-center gap-1"
                                      >
                                        (Ver mapa)
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>

                              {entry.clock_out && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4 text-red-600" />
                                    <span className="font-medium">Salida:</span>
                                    <span className="font-mono">{moment(entry.clock_out).format('HH:mm:ss')}</span>
                                  </div>
                                  {(entry.clock_out_address || (entry.clock_out_latitude !== 0 && entry.clock_out_latitude !== null && entry.clock_out_longitude !== 0 && entry.clock_out_longitude !== null)) && (
                                    <div className="flex items-center gap-2 text-xs text-slate-600 ml-6">
                                      <MapPin className="w-3 h-3 text-red-500" />
                                      {entry.clock_out_address ? (
                                        <span className="truncate max-w-[200px]" title={entry.clock_out_address}>{entry.clock_out_address}</span>
                                      ) : (
                                        <span>{entry.clock_out_latitude?.toFixed(4)}, {entry.clock_out_longitude?.toFixed(4)}</span>
                                      )}
                                      {entry.clock_out_latitude !== 0 && entry.clock_out_latitude !== null && entry.clock_out_longitude !== 0 && entry.clock_out_longitude !== null && (
                                        <a
                                          href={`https://www.google.com/maps?q=${entry.clock_out_latitude},${entry.clock_out_longitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                          (Ver mapa)
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {entry.notes && entry.notes !== 'Ponche automático' && (
                              <div className="mt-2 text-sm text-slate-600 bg-white p-2 rounded border">
                                <span className="font-medium">Notas:</span> {entry.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          ) : (
            <Card>
              <CardContent className="p-12">
                <div className="text-center text-slate-500">
                  <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No hay registros de ponche para los filtros seleccionados</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Clock Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Editar Ponche
            </DialogTitle>
          </DialogHeader>
          
          {editingEntry && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg text-sm">
                <p><strong>Empleado:</strong> {editingEntry.user_name}</p>
                <p><strong>Fecha:</strong> {moment(editingEntry.date).format('dddd, D [de] MMMM [de] YYYY')}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_project" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-orange-600" />
                  Proyecto
                </Label>
                <Select
                  value={editForm.project_id}
                  onValueChange={(value) => setEditForm({...editForm, project_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin proyecto</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.project_id} value={project.project_id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clock_in_time" className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    Hora Entrada
                  </Label>
                  <Input
                    id="clock_in_time"
                    type="time"
                    value={editForm.clock_in_time}
                    onChange={(e) => setEditForm({...editForm, clock_in_time: e.target.value})}
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clock_out_time" className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    Hora Salida
                  </Label>
                  <Input
                    id="clock_out_time"
                    type="time"
                    value={editForm.clock_out_time}
                    onChange={(e) => setEditForm({...editForm, clock_out_time: e.target.value})}
                    className="font-mono"
                  />
                </div>
              </div>
              
              {editForm.clock_in_time && editForm.clock_out_time && (
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  <strong>Horas calculadas:</strong>{' '}
                  {(() => {
                    const start = moment(editForm.clock_in_time, 'HH:mm');
                    const end = moment(editForm.clock_out_time, 'HH:mm');
                    const diff = end.diff(start, 'hours', true);
                    return diff > 0 ? `${diff.toFixed(2)} horas` : 'Hora inválida';
                  })()}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={saving || !editForm.clock_in_time}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Clock Entry Dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Crear Ponche Manual (Día Completo)
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              Registre la entrada y salida para un día de trabajo completo
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual_user" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Empleado *
                </Label>
                <Select 
                  value={manualForm.user_id} 
                  onValueChange={(v) => setManualForm({...manualForm, user_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.name || user.email || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manual_project" className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Proyecto *
                </Label>
                <Select 
                  value={manualForm.project_id} 
                  onValueChange={(v) => setManualForm({...manualForm, project_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.project_id} value={project.project_id}>
                        {project.name || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Fecha *
              </Label>
              <Input
                id="manual_date"
                type="date"
                value={manualForm.date}
                onChange={(e) => setManualForm({...manualForm, date: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual_clock_in" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  Hora Entrada *
                </Label>
                <Input
                  id="manual_clock_in"
                  type="time"
                  value={manualForm.clock_in_time}
                  onChange={(e) => setManualForm({...manualForm, clock_in_time: e.target.value})}
                  className="font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manual_clock_out" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-600" />
                  Hora Salida *
                </Label>
                <Input
                  id="manual_clock_out"
                  type="time"
                  value={manualForm.clock_out_time}
                  onChange={(e) => setManualForm({...manualForm, clock_out_time: e.target.value})}
                  className="font-mono"
                />
              </div>
            </div>
            
            {manualForm.clock_in_time && manualForm.clock_out_time && (
              <div className="bg-green-50 p-3 rounded-lg text-sm text-green-700 border border-green-200">
                <strong>✓ Día completo:</strong>{' '}
                {(() => {
                  const start = moment(manualForm.clock_in_time, 'HH:mm');
                  const end = moment(manualForm.clock_out_time, 'HH:mm');
                  const diff = end.diff(start, 'hours', true);
                  return diff > 0 ? `${diff.toFixed(2)} horas trabajadas` : 'Hora inválida';
                })()}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="manual_notes">Notas (opcional)</Label>
              <Textarea
                id="manual_notes"
                value={manualForm.notes}
                onChange={(e) => setManualForm({...manualForm, notes: e.target.value})}
                placeholder="Ej: Olvidó ponchar, ajuste de horario..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setManualDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateManualEntry} 
              disabled={saving || !manualForm.user_id || !manualForm.project_id || !manualForm.date || !manualForm.clock_in_time || !manualForm.clock_out_time}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? 'Creando...' : 'Registrar Día Completo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ClockHistory;
