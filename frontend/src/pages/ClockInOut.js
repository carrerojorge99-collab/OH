import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
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

      // Explicitly set to null if no active clock
      setActiveClock(activeRes.data || null);
      setProjects(projectsRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      // Don't show error toast on initial load
      if (!loading) {
        toast.error('Error al cargar datos');
      }
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
      await loadData();
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
      await loadData(); // Ensure data is reloaded
    } catch (error) {
      if (error.message && error.message.includes('ubicación')) {
        toast.error(error.message, { duration: 5000 });
      } else {
        toast.error(error.response?.data?.detail || 'Error al registrar salida');
      }
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

        {/* Status Card */}
        {activeClock && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600 animate-pulse">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-green-900">Poncheado en:</h3>
                  <p className="text-lg font-semibold text-green-700">{activeClock.project_name}</p>
                </div>

                <div className="bg-white rounded-lg p-4 inline-block">
                  <p className="text-sm text-slate-600 mb-1">Tiempo transcurrido</p>
                  <p className="text-3xl font-mono font-bold text-green-600">{formatTime(elapsedTime)}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Entrada: {moment(activeClock.clock_in).format('HH:mm:ss')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons - ALWAYS VISIBLE */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Clock IN Button */}
          <Card className="border-blue-200">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <LogIn className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-900">Entrada</h3>
                </div>
                
                <div>
                  <Label className="text-left block mb-2">Proyecto</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.project_id} value={project.project_id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-left block mb-2">Notas (Opcional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Descripción breve..."
                    rows={2}
                  />
                </div>

                <Button
                  onClick={handleClockIn}
                  disabled={!selectedProject || activeClock}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Ponchar Entrada
                </Button>
                
                {activeClock && (
                  <p className="text-xs text-amber-600 text-center">
                    ⚠️ Ya tienes un ponche activo
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Clock OUT Button */}
          <Card className="border-red-200">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <LogOut className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-red-900">Salida</h3>
                </div>
                
                {activeClock ? (
                  <>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-red-700 font-medium">
                        Proyecto: {activeClock.project_name}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        Tiempo: {formatTime(elapsedTime)}
                      </p>
                    </div>

                    <div>
                      <Label className="text-left block mb-2">Notas de Salida</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="¿Qué completaste?"
                        rows={2}
                      />
                    </div>

                    <Button
                      onClick={handleClockOut}
                      className="w-full bg-red-600 hover:bg-red-700"
                      size="lg"
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      Ponchar Salida
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[200px]">
                    <p className="text-slate-400 text-center">
                      Primero debes hacer<br />ponche de entrada
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

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
