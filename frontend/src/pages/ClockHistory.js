import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { MapPin, Calendar, User, Clock, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClockHistory = () => {
  const [clockEntries, setClockEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [groupedEntries, setGroupedEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

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
  }, [filteredEntries]);

  const loadData = async () => {
    try {
      const timestamp = Date.now();
      const [entriesRes, usersRes, projectsRes] = await Promise.all([
        axios.get(`${API}/clock/all?_t=${timestamp}`, { 
          withCredentials: true,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        }),
        axios.get(`${API}/users?_t=${timestamp}`, { withCredentials: true }),
        axios.get(`${API}/projects?_t=${timestamp}`, { withCredentials: true })
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
                        {user.name}
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
                        {project.name}
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

            <div className="mt-4 flex items-center justify-between">
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
              <Button 
                onClick={loadData}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grouped Clock Entries */}
        <div className="space-y-4">
          {groupedEntries.length > 0 ? (
            groupedEntries.map((group) => (
              <Card key={`${group.user_id}_${group.date}`} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 border-b bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900">{group.user_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          {moment(group.date).format('dddd, D [de] MMMM [de] YYYY')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-blue-600">
                        {group.totalHours.toFixed(2)}h
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">
                        {group.entries.length} ponche{group.entries.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                  {group.projects.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <FolderKanban className="w-4 h-4 text-slate-500" />
                      {group.projects.map((proj, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {proj}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
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
                              <span className="text-slate-600">{entry.project_name}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            {entry.hours_worked > 0 && (
                              <span className="font-mono font-semibold text-blue-600">
                                {entry.hours_worked.toFixed(2)}h
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-green-600" />
                              <span className="font-medium">Entrada:</span>
                              <span className="font-mono">{moment(entry.clock_in).format('HH:mm:ss')}</span>
                            </div>
                            {entry.clock_in_latitude && entry.clock_in_longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${entry.clock_in_latitude},${entry.clock_in_longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                              >
                                <MapPin className="w-3 h-3" /> Ver mapa
                              </a>
                            )}
                          </div>

                          {entry.clock_out && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-red-600" />
                                <span className="font-medium">Salida:</span>
                                <span className="font-mono">{moment(entry.clock_out).format('HH:mm:ss')}</span>
                              </div>
                              {entry.clock_out_latitude && entry.clock_out_longitude && (
                                <a
                                  href={`https://www.google.com/maps?q=${entry.clock_out_latitude},${entry.clock_out_longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                                >
                                  <MapPin className="w-3 h-3" /> Ver mapa
                                </a>
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
              </Card>
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
    </Layout>
  );
};

export default ClockHistory;
