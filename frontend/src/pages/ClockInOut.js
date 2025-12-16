import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Clock, LogIn, LogOut, Calendar, User, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClockInOut = () => {
  const [activeClock, setActiveClock] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    loadData();
    
    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Calculate elapsed time if clocked in
    if (activeClock) {
      const clockInTime = new Date(activeClock.clock_in);
      const elapsed = Math.floor((currentTime - clockInTime) / 1000);
      setElapsedTime(elapsed);
    }
  }, [currentTime, activeClock]);

  const loadData = async () => {
    try {
      const [activeRes, projectsRes, historyRes] = await Promise.all([
        axios.get(`${API}/clock/active`, { withCredentials: true }),
        axios.get(`${API}/clock/projects`, { withCredentials: true }),
        axios.get(`${API}/clock/history?date=${new Date().toISOString().split('T')[0]}`, { withCredentials: true })
      ]);

      setActiveClock(activeRes.data);
      setProjects(projectsRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Tu navegador no soporta geolocalización'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          let errorMessage = 'Error al obtener ubicación';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Debes permitir el acceso a tu ubicación para poder ponchar';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Información de ubicación no disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado al obtener ubicación';
              break;
            default:
              errorMessage = 'Error desconocido al obtener ubicación';
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const handleClockIn = async () => {
    if (!selectedProject) {
      toast.error('Selecciona un proyecto');
      return;
    }

    try {
      toast.info('Obteniendo tu ubicación GPS...', { duration: 2000 });
      
      const location = await getLocation();
      
      await axios.post(
        `${API}/clock/in`,
        null,
        {
          params: { 
            project_id: selectedProject, 
            notes,
            latitude: location.latitude,
            longitude: location.longitude
          },
          withCredentials: true
        }
      );
      
      toast.success('¡Ponche de entrada registrado con ubicación!');
      
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Ponche registrado', {
          body: `Entrada registrada en ${projects.find(p => p.project_id === selectedProject)?.name}`,
          icon: '/logo192.png'
        });
      }
      
      setNotes('');
      setSelectedProject('');
      loadData();
    } catch (error) {
      if (error.message && error.message.includes('ubicación')) {
        toast.error(error.message, { duration: 5000 });
      } else {
        toast.error(error.response?.data?.detail || 'Error al registrar entrada');
      }
    }
  };

  const handleClockOut = async () => {
    try {
      toast.info('Obteniendo tu ubicación GPS...', { duration: 2000 });
      
      const location = await getLocation();
      
      await axios.post(
        `${API}/clock/out`,
        null,
        {
          params: { 
            notes,
            latitude: location.latitude,
            longitude: location.longitude
          },
          withCredentials: true
        }
      );
      
      toast.success('¡Ponche de salida registrado con ubicación! Horas agregadas al timesheet');
      
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const hours = (elapsedTime / 3600).toFixed(2);
        new Notification('Ponche de salida', {
          body: `${hours} horas registradas en ${activeClock.project_name}`,
          icon: '/logo192.png'
        });
      }
      
      setNotes('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar salida');
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] mb-2">Control de Asistencia</h1>
          <p className="text-muted-foreground">Registra tu entrada y salida diaria</p>
          <div className="mt-4 text-2xl font-mono font-bold text-blue-600">
            {currentTime.toLocaleTimeString('es-MX')}
          </div>
          <p className="text-sm text-slate-600">{moment().format('dddd, D [de] MMMM [de] YYYY')}</p>
          
          {/* Quick Clock Out Button */}
          {activeClock && (
            <div className="flex justify-center pt-2">
              <Button
                onClick={handleClockOut}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 shadow-lg"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Salida Rápida
              </Button>
            </div>
          )}
        </div>

        {/* Active Clock Status */}
        {activeClock ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-600 mb-4 animate-pulse">
                  <Clock className="w-10 h-10 text-white" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-green-900 mb-1">Poncheado en:</h2>
                  <p className="text-xl font-semibold text-green-700">{activeClock.project_name}</p>
                </div>

                <div className="bg-white rounded-lg p-4 inline-block">
                  <p className="text-sm text-slate-600 mb-1">Tiempo transcurrido</p>
                  <p className="text-4xl font-mono font-bold text-green-600">{formatTime(elapsedTime)}</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Entrada: {moment(activeClock.clock_in).format('HH:mm:ss')}
                  </p>
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas opcionales sobre el trabajo realizado..."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleClockOut}
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-lg px-8 py-6 h-auto"
                >
                  <LogOut className="w-6 h-6 mr-2" />
                  Ponchar Salida
                </Button>

                <p className="text-xs text-green-700">
                  Las horas se registrarán automáticamente en el timesheet del proyecto
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 mb-4">
                  <LogIn className="w-10 h-10 text-white" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-blue-900 mb-2">Ponchar Entrada</h2>
                  <p className="text-slate-600">Selecciona el proyecto en el que vas a trabajar</p>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Seleccionar proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.project_id} value={project.project_id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas opcionales (qué vas a hacer hoy)..."
                    rows={3}
                  />

                  <Button
                    onClick={handleClockIn}
                    disabled={!selectedProject}
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700 text-lg px-8 py-6 h-auto"
                  >
                    <LogIn className="w-6 h-6 mr-2" />
                    Ponchar Entrada
                  </Button>

                  {projects.length === 0 && (
                    <p className="text-sm text-orange-600">
                      ⚠️ No tienes proyectos asignados. Contacta a tu administrador.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's History */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Historial de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.clock_id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <FolderKanban className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{entry.project_name}</p>
                        <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                          <span className="flex items-center gap-1">
                            <LogIn className="w-3 h-3" />
                            {moment(entry.clock_in).format('HH:mm')}
                          </span>
                          {entry.clock_out && (
                            <>
                              <span>→</span>
                              <span className="flex items-center gap-1">
                                <LogOut className="w-3 h-3" />
                                {moment(entry.clock_out).format('HH:mm')}
                              </span>
                            </>
                          )}
                        </div>
                        {entry.clock_in_latitude && entry.clock_in_longitude && (
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                            📍 Ubicación registrada
                            <a 
                              href={`https://www.google.com/maps?q=${entry.clock_in_latitude},${entry.clock_in_longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-green-700"
                            >
                              Ver en mapa
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {entry.status === 'active' ? (
                        <Badge className="bg-green-100 text-green-700">Activo</Badge>
                      ) : (
                        <>
                          <p className="text-lg font-bold font-mono text-blue-600">
                            {entry.hours_worked?.toFixed(2)}h
                          </p>
                          <Badge className="bg-slate-100 text-slate-700 mt-1">Completado</Badge>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay ponches registrados hoy</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              💡 Consejos
            </h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Poncha entrada al comenzar tu jornada laboral</li>
              <li>• Poncha salida cuando termines de trabajar</li>
              <li>• Las horas se registran automáticamente en el timesheet</li>
              <li>• 📍 Tu ubicación GPS es obligatoria para verificar asistencia</li>
              <li>• Asegúrate de permitir acceso a ubicación en tu navegador</li>
              <li>• Solo puedes tener un ponche activo a la vez</li>
              <li>• Agrega notas para documentar mejor tu trabajo</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ClockInOut;
