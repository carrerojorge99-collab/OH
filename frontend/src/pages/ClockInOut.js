import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Clock, LogIn, LogOut, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment-timezone';
import 'moment/locale/es';

moment.locale('es');
moment.tz.setDefault('America/Puerto_Rico');

const MIN_PUNCHES = 4;

const ClockInOut = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punches, setPunches] = useState([]);
  const [activeClock, setActiveClock] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(new Date()), 250);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = Date.now();
      
      // Load history, active clock, and projects
      const [historyRes, activeRes, projectsRes] = await Promise.all([
        api.get(`/clock/history?date=${today}&_t=${timestamp}`, { 
          withCredentials: true,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        }),
        api.get(`/clock/active?_t=${timestamp}`, { 
          withCredentials: true,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        }),
        api.get(`/clock/projects?_t=${timestamp}`, { 
          withCredentials: true 
        })
      ]);
      
      console.log('📊 Punches loaded:', historyRes.data?.length || 0);
      console.log('📊 Active clock:', activeRes.data ? 'YES' : 'NO');
      console.log('📊 Projects loaded:', projectsRes.data?.length || 0);
      
      // Ordenar ponches cronológicamente (primer ponche del día primero)
      const sortedPunches = (historyRes.data || []).sort((a, b) => {
        return new Date(a.clock_in) - new Date(b.clock_in);
      });
      
      setPunches([...sortedPunches]);
      setActiveClock(activeRes.data ? {...activeRes.data} : null);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: 0, longitude: 0 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }),
        () => resolve({ latitude: 0, longitude: 0 }),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    });
  };

  const handleClockIn = async () => {
    if (!selectedProject) {
      toast.error('Por favor selecciona un proyecto');
      return;
    }

    setProcessing(true);
    try {
      const location = await getLocation();

      await api.post(
        `/clock/in`,
        null,
        {
          params: {
            project_id: selectedProject,
            latitude: location.latitude,
            longitude: location.longitude,
            notes: 'Ponche automático'
          },
          withCredentials: true
        }
      );

      toast.success('✅ Clock IN registrado');
      console.log('🔄 Reloading data after Clock IN...');
      
      // Wait a moment for backend to finish
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadData();
      console.log('✅ Data reloaded');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar entrada');
    } finally {
      setProcessing(false);
    }
  };

  const handleClockOut = async () => {
    setProcessing(true);
    try {
      const location = await getLocation();

      await api.post(
        `/clock/out`,
        null,
        {
          params: {
            latitude: location.latitude,
            longitude: location.longitude,
            notes: 'Ponche automático'
          },
          withCredentials: true
        }
      );

      toast.success('✅ Clock OUT registrado');
      console.log('🔄 Reloading data after Clock OUT...');
      
      // Wait a moment for backend to finish
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadData();
      console.log('✅ Data reloaded');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar salida');
    } finally {
      setProcessing(false);
    }
  };

  const canClockIn = () => {
    return !activeClock;
  };

  const canClockOut = () => {
    return !!activeClock;
  };

  const getStatusText = () => {
    if (!activeClock) return 'Sin ponche';
    return 'En turno';
  };

  // Count individual punch actions (each IN and OUT counts as 1 punch)
  const countPunches = () => {
    let count = 0;
    punches.forEach(punch => {
      count++; // Clock IN
      if (punch.clock_out) count++; // Clock OUT
    });
    return count;
  };
  
  const totalPunches = countPunches();
  const meetsMinimum = totalPunches >= MIN_PUNCHES;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Clock className="w-12 h-12 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Reloj de Ponche</h1>
                <p className="text-slate-600 mt-1">Mínimo {MIN_PUNCHES} ponches por día</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-mono font-bold text-blue-600">
                  {moment.tz('America/Puerto_Rico').format('h:mm:ss a')}
                </div>
                <div className="text-sm text-slate-600">
                  {moment.tz('America/Puerto_Rico').format('dddd, D [de] MMMM [de] YYYY')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Selection */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[300px]">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Proyecto a Trabajar:
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  disabled={activeClock}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed text-base"
                >
                  <option value="">-- Selecciona un proyecto --</option>
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {activeClock && (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ No puedes cambiar de proyecto mientras estés en turno
                  </p>
                )}
              </div>
              
              {activeClock && (
                <div className="flex-1 min-w-[200px] bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700 font-medium">
                    Trabajando en:
                  </p>
                  <p className="text-lg font-bold text-green-900 mt-1">
                    {activeClock.project_name}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                onClick={handleClockIn}
                disabled={!canClockIn() || processing || !selectedProject}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
              >
                <LogIn className="w-6 h-6 mr-2" />
                Clock IN
              </Button>

              <Button
                onClick={handleClockOut}
                disabled={!canClockOut() || processing}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-lg px-8 py-6"
              >
                <LogOut className="w-6 h-6 mr-2" />
                Clock OUT
              </Button>

              <div className="ml-auto flex gap-2">
                <Badge className={`text-sm py-2 px-4 ${
                  activeClock ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'
                }`}>
                  Estado: {getStatusText()}
                </Badge>
                <Badge className={`text-sm py-2 px-4 ${
                  meetsMinimum ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  Ponches hoy: {totalPunches}/{MIN_PUNCHES}
                </Badge>
              </div>
            </div>

            {!meetsMinimum && (
              <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">
                  Faltan {MIN_PUNCHES - totalPunches} ponche(s) para completar el mínimo diario
                </span>
              </div>
            )}

            {meetsMinimum && (
              <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">
                  ✅ Cumple el mínimo de {MIN_PUNCHES} ponches hoy
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Historial de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {punches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Hora</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Proyecto</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {punches.map((punch, idx) => (
                      <tr key={`${punch.clock_id}-${idx}-${punch.clock_in}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <Badge className={punch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                            {punch.status === 'active' ? 'IN' : 'OUT'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {moment(punch.clock_in).format('HH:mm:ss')}
                          {punch.clock_out && ` → ${moment(punch.clock_out).format('HH:mm:ss')}`}
                        </td>
                        <td className="px-4 py-3 text-sm">{punch.project_name}</td>
                        <td className="px-4 py-3 text-sm font-mono text-right">
                          {punch.hours_worked ? `${punch.hours_worked.toFixed(2)}h` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No hay ponches registrados hoy</p>
                <p className="text-sm mt-2">Haz click en "Clock IN" para comenzar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ClockInOut;
