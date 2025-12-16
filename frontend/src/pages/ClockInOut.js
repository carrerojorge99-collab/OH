import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Clock, LogIn, LogOut, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const MIN_PUNCHES = 4;

const ClockInOut = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punches, setPunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPunches();
    const timer = setInterval(() => setCurrentTime(new Date()), 250);
    return () => clearInterval(timer);
  }, []);

  const loadPunches = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const res = await axios.get(`${API}/clock/history?date=${today}&_t=${timestamp}`, { 
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      console.log('📊 Punches loaded:', res.data?.length || 0);
      // Force new array reference to trigger React update
      setPunches([...(res.data || [])]);
    } catch (error) {
      console.error('Error loading punches:', error);
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

  const getDefaultProject = async () => {
    try {
      const res = await axios.get(`${API}/clock/projects`, { withCredentials: true });
      return res.data[0]?.project_id || null;
    } catch {
      return null;
    }
  };

  const handleClockIn = async () => {
    setProcessing(true);
    try {
      const [location, projectId] = await Promise.all([
        getLocation(),
        getDefaultProject()
      ]);

      if (!projectId) {
        toast.error('No hay proyectos disponibles');
        return;
      }

      await axios.post(
        `${API}/clock/in`,
        null,
        {
          params: {
            project_id: projectId,
            latitude: location.latitude,
            longitude: location.longitude,
            notes: 'Ponche automático'
          },
          withCredentials: true
        }
      );

      toast.success('✅ Clock IN registrado');
      console.log('🔄 Reloading punches after Clock IN...');
      
      // Wait a moment for backend to finish
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadPunches();
      console.log('✅ Punches reloaded');
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

      await axios.post(
        `${API}/clock/out`,
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
      console.log('🔄 Reloading punches after Clock OUT...');
      
      // Wait a moment for backend to finish
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadPunches();
      console.log('✅ Punches reloaded');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar salida');
    } finally {
      setProcessing(false);
    }
  };

  const getLastType = () => {
    if (!punches.length) return null;
    const last = punches[punches.length - 1];
    return last.status === 'active' ? 'IN' : 'OUT';
  };

  const canClockIn = () => {
    const lastType = getLastType();
    return !lastType || lastType === 'OUT';
  };

  const canClockOut = () => {
    return getLastType() === 'IN';
  };

  const meetsMinimum = punches.length >= MIN_PUNCHES;

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
                  {currentTime.toLocaleTimeString('es-MX')}
                </div>
                <div className="text-sm text-slate-600">
                  {moment().format('dddd, D [de] MMMM [de] YYYY')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                onClick={handleClockIn}
                disabled={!canClockIn() || processing}
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
                  !getLastType() ? 'bg-slate-200 text-slate-700' :
                  getLastType() === 'IN' ? 'bg-green-100 text-green-700' :
                  'bg-slate-200 text-slate-700'
                }`}>
                  Estado: {!getLastType() ? 'Sin ponche' : getLastType() === 'IN' ? 'En turno' : 'Fuera de turno'}
                </Badge>
                <Badge className={`text-sm py-2 px-4 ${
                  meetsMinimum ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  Ponches hoy: {punches.length}/{MIN_PUNCHES}
                </Badge>
              </div>
            </div>

            {!meetsMinimum && (
              <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">
                  Faltan {MIN_PUNCHES - punches.length} ponche(s) para completar el mínimo diario
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
                      <tr key={punch.clock_id} className="hover:bg-slate-50">
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
