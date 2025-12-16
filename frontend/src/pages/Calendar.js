import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Calendar as CalendarIcon, FolderKanban, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

moment.locale('es');
const localizer = momentLocalizer(moment);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        axios.get(`${API}/projects`, { withCredentials: true }),
        axios.get(`${API}/tasks`, { withCredentials: true })
      ]);

      const projectEvents = projectsRes.data.map(project => ({
        id: `project-${project.project_id}`,
        title: `📁 ${project.name}`,
        start: new Date(project.start_date),
        end: new Date(project.end_date),
        type: 'project',
        status: project.status,
        data: project,
        allDay: true
      }));

      // Get tasks with due dates
      const taskEvents = tasksRes.data
        .filter(task => task.due_date)
        .map(task => ({
          id: `task-${task.task_id}`,
          title: `✓ ${task.title}`,
          start: new Date(task.due_date),
          end: new Date(task.due_date),
          type: 'task',
          status: task.status,
          data: task,
          allDay: true
        }));

      setEvents([...projectEvents, ...taskEvents]);
    } catch (error) {
      toast.error('Error al cargar datos del calendario');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3174ad';
    
    if (event.type === 'project') {
      switch (event.status) {
        case 'completed':
          backgroundColor = '#10B981';
          break;
        case 'in_progress':
          backgroundColor = '#2563EB';
          break;
        case 'planning':
          backgroundColor = '#8B5CF6';
          break;
        case 'on_hold':
          backgroundColor = '#F97316';
          break;
        case 'cancelled':
          backgroundColor = '#6B7280';
          break;
        default:
          backgroundColor = '#3174ad';
      }
    } else if (event.type === 'task') {
      switch (event.status) {
        case 'done':
          backgroundColor = '#10B981';
          break;
        case 'in_progress':
          backgroundColor = '#F59E0B';
          break;
        case 'todo':
          backgroundColor = '#6B7280';
          break;
        default:
          backgroundColor = '#3174ad';
      }
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  const messages = {
    allDay: 'Todo el día',
    previous: 'Anterior',
    next: 'Siguiente',
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
    agenda: 'Agenda',
    date: 'Fecha',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'No hay eventos en este rango',
    showMore: (total) => `+ Ver más (${total})`
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Cargando calendario...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">Calendario de Proyectos</h1>
            <p className="text-muted-foreground mt-2">Visualiza fechas y deadlines de proyectos y tareas</p>
          </div>
        </div>

        {/* Legend */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#8B5CF6]"></div>
                <span>Planificación</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#2563EB]"></div>
                <span>En Progreso</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#F97316]"></div>
                <span>En Espera</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#10B981]"></div>
                <span>Completado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#6B7280]"></div>
                <span>Cancelado/Pendiente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#F59E0B]"></div>
                <span>Tarea en Progreso</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div style={{ height: '600px' }}>
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={handleSelectEvent}
                messages={messages}
                views={['month', 'week', 'day', 'agenda']}
                view={currentView}
                onView={(view) => setCurrentView(view)}
                date={currentDate}
                onNavigate={(date) => setCurrentDate(date)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Event Details */}
        {selectedEvent && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
                {selectedEvent.type === 'project' ? <FolderKanban className="w-5 h-5" /> : <CheckSquare className="w-5 h-5" />}
                Detalles del {selectedEvent.type === 'project' ? 'Proyecto' : 'Tarea'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">{selectedEvent.title.replace('📁 ', '').replace('✓ ', '')}</h3>
                {selectedEvent.type === 'project' && selectedEvent.data.description && (
                  <p className="text-sm text-slate-600 mb-3">{selectedEvent.data.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-600">Fecha de Inicio</p>
                  <p className="text-base font-semibold">{moment(selectedEvent.start).format('DD/MM/YYYY')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Fecha de Fin</p>
                  <p className="text-base font-semibold">{moment(selectedEvent.end).format('DD/MM/YYYY')}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">Estado</p>
                <Badge className={`
                  ${selectedEvent.status === 'completed' || selectedEvent.status === 'done' ? 'bg-green-100 text-green-700' : ''}
                  ${selectedEvent.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : ''}
                  ${selectedEvent.status === 'planning' || selectedEvent.status === 'todo' ? 'bg-purple-100 text-purple-700' : ''}
                  ${selectedEvent.status === 'on_hold' ? 'bg-orange-100 text-orange-700' : ''}
                  ${selectedEvent.status === 'cancelled' ? 'bg-slate-100 text-slate-700' : ''}
                `}>
                  {selectedEvent.status}
                </Badge>
              </div>

              {selectedEvent.type === 'project' && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Presupuesto</p>
                    <p className="text-lg font-bold font-mono text-[#0F172A]">
                      ${selectedEvent.data.budget_total?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Valor del Proyecto</p>
                    <p className="text-lg font-bold font-mono text-[#0F172A]">
                      ${selectedEvent.data.project_value?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Calendar;
