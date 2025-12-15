import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Clock, CheckCircle, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const QuickTimesheet = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    loadProjects();
    
    // Check if there's a running timer in localStorage
    const savedTimer = localStorage.getItem('quickTimesheet');
    if (savedTimer) {
      const data = JSON.parse(savedTimer);
      const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
      setTimerSeconds(elapsed);
      setIsTimerRunning(true);
      setSelectedProject(data.projectId);
      setDescription(data.description);
    }
  }, []);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`, { withCredentials: true });
      setProjects(response.data.filter(p => p.status !== 'completed'));
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const startTimer = () => {
    if (!selectedProject) {
      toast.error('Selecciona un proyecto primero');
      return;
    }

    const timerData = {
      projectId: selectedProject,
      description,
      startTime: Date.now()
    };
    localStorage.setItem('quickTimesheet', JSON.stringify(timerData));
    setIsTimerRunning(true);
    setTimerSeconds(0);
    toast.success('Timer iniciado');
  };

  const stopTimer = async () => {
    const calculatedHours = (timerSeconds / 3600).toFixed(2);
    setHours(calculatedHours);
    setIsTimerRunning(false);
    localStorage.removeItem('quickTimesheet');
    
    // Auto-save
    await handleQuickSave(calculatedHours);
  };

  const handleQuickSave = async (hoursToSave = hours) => {
    if (!selectedProject || !hoursToSave) {
      toast.error('Completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/timesheet`,
        {
          project_id: selectedProject,
          user_id: '',
          user_name: 'Usuario Móvil',
          task_id: null,
          date: new Date().toISOString().split('T')[0],
          hours_worked: parseFloat(hoursToSave),
          description: description || 'Registro desde móvil'
        },
        { withCredentials: true }
      );
      
      toast.success('Horas registradas exitosamente');
      
      // Show notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Timesheet registrado', {
          body: `${hoursToSave} horas guardadas en ${projects.find(p => p.project_id === selectedProject)?.name}`,
          icon: '/logo192.png'
        });
      }
      
      // Reset form
      setHours('');
      setDescription('');
      setTimerSeconds(0);
    } catch (error) {
      toast.error('Error al registrar horas');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Card className="border-blue-200 shadow-md">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-blue-600" />
          Registro Rápido de Horas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Timer Display */}
        {isTimerRunning && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
            <div className="text-3xl font-mono font-bold text-blue-600 mb-2">
              {formatTime(timerSeconds)}
            </div>
            <p className="text-sm text-slate-600">Timer en ejecución</p>
          </div>
        )}

        {/* Project Select */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Proyecto</label>
          <Select 
            value={selectedProject} 
            onValueChange={setSelectedProject}
            disabled={isTimerRunning}
          >
            <SelectTrigger>
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

        {/* Hours Input (only if not using timer) */}
        {!isTimerRunning && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Horas</label>
            <Input
              type="number"
              step="0.25"
              min="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="2.5"
              className="text-lg"
            />
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Descripción</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿En qué trabajaste?"
            disabled={isTimerRunning}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isTimerRunning ? (
            <>
              <Button
                onClick={startTimer}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!selectedProject}
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar Timer
              </Button>
              <Button
                onClick={() => handleQuickSave()}
                disabled={loading || !hours || !selectedProject}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </>
          ) : (
            <Button
              onClick={stopTimer}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <Pause className="w-4 h-4 mr-2" />
              Detener y Guardar
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center">
          💡 El timer sigue funcionando incluso si cierras la app
        </p>
      </CardContent>
    </Card>
  );
};

export default QuickTimesheet;
