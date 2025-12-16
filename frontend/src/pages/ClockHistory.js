import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { MapPin, Calendar, User, Clock, FolderKanban, Download } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClockHistory = () => {
  const [clockEntries, setClockEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [startDate, setStartDate] = useState(moment().subtract(7, 'days').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [selectedUser, selectedProject, startDate, endDate, clockEntries]);

  const loadData = async () => {
    try {
      const [entriesRes, usersRes, projectsRes] = await Promise.all([
        axios.get(`${API}/clock/all`, { withCredentials: true }),
        axios.get(`${API}/users`, { withCredentials: true }),
        axios.get(`${API}/projects`, { withCredentials: true })
      ]);

      setClockEntries(entriesRes.data);
      setFilteredEntries(entriesRes.data); // Initialize filtered entries
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Show specific error message
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

    // Filter by user
    if (selectedUser !== 'all') {
      filtered = filtered.filter(entry => entry.user_id === selectedUser);
    }

    // Filter by project
    if (selectedProject !== 'all') {
      filtered = filtered.filter(entry => entry.project_id === selectedProject);
    }

    // Filter by date range
    filtered = filtered.filter(entry => {
      const entryDate = moment(entry.date);
      return entryDate.isBetween(startDate, endDate, 'day', '[]');
    });

    // Sort by date descending
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
                <span className="font-semibold">{filteredEntries.length}</span> registros encontrados
                {filteredEntries.length > 0 && (
                  <span className="ml-4">
                    Total horas: <span className="font-semibold text-blue-600">{getTotalHours()}h</span>
                  </span>
                )}
              </div>
              <Button 
                onClick={filterEntries}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Actualizar Búsqueda
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Clock Entries List */}
        <div className="space-y-3">
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <Card key={entry.clock_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-slate-900">{entry.user_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <FolderKanban className="w-4 h-4" />
                            {entry.project_name}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span className="font-medium">Fecha:</span>
                            <span>{moment(entry.date).format('DD/MM/YYYY')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-green-500" />
                            <span className="font-medium">Entrada:</span>
                            <span>{moment(entry.clock_in).format('HH:mm:ss')}</span>
                          </div>
                          {entry.clock_out && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-red-500" />
                              <span className="font-medium">Salida:</span>
                              <span>{moment(entry.clock_out).format('HH:mm:ss')}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          {entry.clock_in_latitude && entry.clock_in_longitude && (
                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                              <div className="flex-1">
                                <span className="font-medium">Ubicación entrada:</span>
                                <a
                                  href={`https://www.google.com/maps?q=${entry.clock_in_latitude},${entry.clock_in_longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-600 hover:underline"
                                >
                                  Ver en mapa →
                                </a>
                                <div className="text-xs text-slate-500 mt-1">
                                  {entry.clock_in_latitude.toFixed(6)}, {entry.clock_in_longitude.toFixed(6)}
                                </div>
                              </div>
                            </div>
                          )}
                          {entry.clock_out_latitude && entry.clock_out_longitude && (
                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                              <div className="flex-1">
                                <span className="font-medium">Ubicación salida:</span>
                                <a
                                  href={`https://www.google.com/maps?q=${entry.clock_out_latitude},${entry.clock_out_longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-600 hover:underline"
                                >
                                  Ver en mapa →
                                </a>
                                <div className="text-xs text-slate-500 mt-1">
                                  {entry.clock_out_latitude.toFixed(6)}, {entry.clock_out_longitude.toFixed(6)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {entry.notes && (
                        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                          <span className="font-medium">Notas:</span> {entry.notes}
                        </div>
                      )}
                    </div>

                    <div className="text-right ml-4">
                      {entry.status === 'active' ? (
                        <Badge className="bg-green-100 text-green-700 text-sm">Activo</Badge>
                      ) : (
                        <>
                          <div className="text-2xl font-bold font-mono text-blue-600 mb-1">
                            {entry.hours_worked?.toFixed(2)}h
                          </div>
                          <Badge className="bg-slate-100 text-slate-700 text-sm">Completado</Badge>
                        </>
                      )}
                    </div>
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
