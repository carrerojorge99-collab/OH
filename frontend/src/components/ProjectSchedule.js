import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Plus, Calendar, Clock, Users, UserCheck, UserX, Check, X, 
  MoreVertical, Pencil, Trash2, Download, FileSpreadsheet,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle2
} from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

// Horarios predefinidos comunes
const PRESET_SCHEDULES = [
  { label: '7:00 AM - 3:00 PM', start: '07:00', end: '15:00' },
  { label: '8:00 AM - 4:00 PM', start: '08:00', end: '16:00' },
  { label: '8:00 AM - 5:00 PM', start: '08:00', end: '17:00' },
  { label: '9:00 AM - 5:00 PM', start: '09:00', end: '17:00' },
  { label: '3:00 PM - 11:00 PM', start: '15:00', end: '23:00' },
  { label: '6:00 AM - 2:00 PM', start: '06:00', end: '14:00' },
  { label: 'Personalizado', start: '', end: '' },
];

const ProjectSchedule = ({ projectId, projectName }) => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(moment().startOf('week'));
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'list'
  
  // Form state
  const [shiftForm, setShiftForm] = useState({
    date: moment().format('YYYY-MM-DD'),
    start_time: '08:00',
    end_time: '17:00',
    max_slots: 5,
    description: '',
    requires_approval: false,
    preset: '8:00 AM - 5:00 PM'
  });

  // Check if user can manage shifts (admin or PM)
  const canManageShifts = user?.role === 'super_admin' || user?.role === 'project_manager';

  const loadShifts = useCallback(async () => {
    try {
      const response = await api.get(`/schedules?project_id=${projectId}`, { withCredentials: true });
      setShifts(response.data);
    } catch (error) {
      console.error('Error loading shifts:', error);
      toast.error('Error al cargar turnos');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const handlePresetChange = (preset) => {
    const selected = PRESET_SCHEDULES.find(p => p.label === preset);
    if (selected && selected.start) {
      setShiftForm(prev => ({
        ...prev,
        preset,
        start_time: selected.start,
        end_time: selected.end
      }));
    } else {
      setShiftForm(prev => ({ ...prev, preset }));
    }
  };

  const resetForm = () => {
    setShiftForm({
      date: moment().format('YYYY-MM-DD'),
      start_time: '08:00',
      end_time: '17:00',
      max_slots: 5,
      description: '',
      requires_approval: false,
      preset: '8:00 AM - 5:00 PM'
    });
    setEditingShift(null);
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        project_id: projectId,
        date: shiftForm.date,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        max_slots: parseInt(shiftForm.max_slots),
        description: shiftForm.description,
        requires_approval: shiftForm.requires_approval
      };

      if (editingShift) {
        await api.put(`/schedules/${editingShift.shift_id}`, payload, { withCredentials: true });
        toast.success('Turno actualizado exitosamente');
      } else {
        await api.post('/schedules', payload, { withCredentials: true });
        toast.success('Turno creado exitosamente');
      }

      setShiftDialogOpen(false);
      resetForm();
      loadShifts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar turno');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('¿Eliminar este turno? Los empleados asignados serán notificados.')) return;
    try {
      await api.delete(`/schedules/${shiftId}`, { withCredentials: true });
      toast.success('Turno eliminado');
      loadShifts();
    } catch (error) {
      toast.error('Error al eliminar turno');
    }
  };

  const handleClaimShift = async (shiftId) => {
    try {
      await api.post(`/schedules/${shiftId}/claim`, {}, { withCredentials: true });
      toast.success('Te has registrado en este turno');
      loadShifts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrarte en el turno');
    }
  };

  const handleUnclaimShift = async (shiftId) => {
    try {
      await api.post(`/schedules/${shiftId}/unclaim`, {}, { withCredentials: true });
      toast.success('Has cancelado tu registro en este turno');
      loadShifts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cancelar registro');
    }
  };

  const handleApproveAssignment = async (shiftId, userId, approved) => {
    try {
      await api.post(`/schedules/${shiftId}/approve`, {
        user_id: userId,
        approved
      }, { withCredentials: true });
      toast.success(approved ? 'Solicitud aprobada' : 'Solicitud rechazada');
      loadShifts();
    } catch (error) {
      toast.error('Error al procesar solicitud');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get(`/schedules/export/excel?project_id=${projectId}`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `schedule_${projectId}_${moment().format('YYYY-MM-DD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel descargado');
    } catch (error) {
      toast.error('Error al exportar Excel');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await api.get(`/schedules/export/pdf?project_id=${projectId}`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `schedule_${projectId}_${moment().format('YYYY-MM-DD')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al exportar PDF');
    }
  };

  const openEditDialog = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      max_slots: shift.max_slots,
      description: shift.description || '',
      requires_approval: shift.requires_approval || false,
      preset: 'Personalizado'
    });
    setShiftDialogOpen(true);
  };

  // Get shifts for the current week
  const getWeekShifts = () => {
    const weekStart = selectedWeek.clone();
    const weekEnd = weekStart.clone().endOf('week');
    return shifts.filter(shift => {
      const shiftDate = moment(shift.date);
      return shiftDate.isBetween(weekStart, weekEnd, 'day', '[]');
    });
  };

  // Get shifts grouped by day for calendar view
  const getShiftsByDay = () => {
    const weekShifts = getWeekShifts();
    const days = {};
    for (let i = 0; i < 7; i++) {
      const day = selectedWeek.clone().add(i, 'days').format('YYYY-MM-DD');
      days[day] = weekShifts.filter(s => s.date === day);
    }
    return days;
  };

  // Check if current user has claimed a shift
  const hasUserClaimed = (shift) => {
    return shift.assignments?.some(a => a.user_id === user?.user_id);
  };

  // Get user's assignment status
  const getUserAssignmentStatus = (shift) => {
    const assignment = shift.assignments?.find(a => a.user_id === user?.user_id);
    return assignment?.status || null;
  };

  // Format time for display
  const formatTime = (time) => {
    return moment(time, 'HH:mm').format('h:mm A');
  };

  const navigateWeek = (direction) => {
    setSelectedWeek(prev => prev.clone().add(direction, 'weeks'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Programación de Turnos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {canManageShifts 
              ? 'Crea turnos y gestiona la asignación del equipo' 
              : 'Selecciona los turnos disponibles para trabajar'}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Export buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="export-schedule-btn">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create shift button - only for managers */}
          {canManageShifts && (
            <Button 
              onClick={() => { resetForm(); setShiftDialogOpen(true); }}
              className="rounded-full bg-blue-600 hover:bg-blue-700"
              data-testid="create-shift-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Turno
            </Button>
          )}
        </div>
      </div>

      {/* Week Navigation */}
      <Card className="border-slate-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigateWeek(-1)} data-testid="prev-week-btn">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            
            <div className="text-center">
              <h3 className="font-semibold">
                {selectedWeek.format('D MMM')} - {selectedWeek.clone().endOf('week').format('D MMM, YYYY')}
              </h3>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => setSelectedWeek(moment().startOf('week'))}
                className="text-blue-600"
              >
                Ir a esta semana
              </Button>
            </div>
            
            <Button variant="ghost" size="sm" onClick={() => navigateWeek(1)} data-testid="next-week-btn">
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {Object.entries(getShiftsByDay()).map(([date, dayShifts]) => {
          const dayMoment = moment(date);
          const isToday = dayMoment.isSame(moment(), 'day');
          const isPast = dayMoment.isBefore(moment(), 'day');
          
          return (
            <Card 
              key={date} 
              className={`border-slate-200 ${isToday ? 'ring-2 ring-blue-500' : ''} ${isPast ? 'opacity-60' : ''}`}
            >
              <CardHeader className="py-3 px-4">
                <div className={`text-center ${isToday ? 'text-blue-600' : ''}`}>
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    {dayMoment.format('ddd')}
                  </div>
                  <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : ''}`}>
                    {dayMoment.format('D')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-2 px-3 space-y-2">
                {dayShifts.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-4">
                    Sin turnos
                  </div>
                ) : (
                  dayShifts.map(shift => {
                    const slotsAvailable = shift.max_slots - (shift.assignments?.filter(a => a.status === 'confirmed').length || 0);
                    const userClaimed = hasUserClaimed(shift);
                    const userStatus = getUserAssignmentStatus(shift);
                    
                    return (
                      <div 
                        key={shift.shift_id}
                        className={`p-3 rounded-lg border text-sm ${
                          userClaimed 
                            ? userStatus === 'confirmed' 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-yellow-50 border-yellow-200'
                            : slotsAvailable > 0 
                              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer' 
                              : 'bg-slate-100 border-slate-200'
                        }`}
                        data-testid={`shift-card-${shift.shift_id}`}
                      >
                        {/* Time */}
                        <div className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</span>
                        </div>
                        
                        {/* Slots info */}
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span>{shift.assignments?.filter(a => a.status === 'confirmed').length || 0}/{shift.max_slots} asignados</span>
                        </div>
                        
                        {/* Description */}
                        {shift.description && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {shift.description}
                          </div>
                        )}
                        
                        {/* User status badge */}
                        {userClaimed && (
                          <Badge 
                            variant={userStatus === 'confirmed' ? 'success' : 'warning'}
                            className="mt-2 text-xs"
                          >
                            {userStatus === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                          </Badge>
                        )}
                        
                        {/* Actions */}
                        <div className="mt-2 flex gap-1">
                          {!isPast && !userClaimed && slotsAvailable > 0 && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full text-xs h-7"
                              onClick={() => handleClaimShift(shift.shift_id)}
                              data-testid={`claim-shift-${shift.shift_id}`}
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              Tomar Turno
                            </Button>
                          )}
                          
                          {!isPast && userClaimed && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full text-xs h-7 text-red-600 hover:text-red-700"
                              onClick={() => handleUnclaimShift(shift.shift_id)}
                              data-testid={`unclaim-shift-${shift.shift_id}`}
                            >
                              <UserX className="w-3 h-3 mr-1" />
                              Cancelar
                            </Button>
                          )}
                          
                          {canManageShifts && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(shift)}>
                                  <Pencil className="w-3 h-3 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteShift(shift.shift_id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-3 h-3 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                
                {/* Quick add for managers */}
                {canManageShifts && !isPast && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      resetForm();
                      setShiftForm(prev => ({ ...prev, date }));
                      setShiftDialogOpen(true);
                    }}
                    data-testid={`quick-add-shift-${date}`}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending Approvals Section - Only for managers */}
      {canManageShifts && shifts.some(s => s.assignments?.some(a => a.status === 'pending')) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Solicitudes Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shifts.filter(s => s.assignments?.some(a => a.status === 'pending')).map(shift => (
                <div key={shift.shift_id} className="bg-white p-3 rounded-lg border">
                  <div className="font-medium text-sm mb-2">
                    {moment(shift.date).format('dddd D MMM')} - {formatTime(shift.start_time)} a {formatTime(shift.end_time)}
                  </div>
                  <div className="space-y-2">
                    {shift.assignments?.filter(a => a.status === 'pending').map(assignment => (
                      <div key={assignment.user_id} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <span className="text-sm">{assignment.user_name}</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApproveAssignment(shift.shift_id, assignment.user_id, true)}
                            data-testid={`approve-${shift.shift_id}-${assignment.user_id}`}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleApproveAssignment(shift.shift_id, assignment.user_id, false)}
                            data-testid={`reject-${shift.shift_id}-${assignment.user_id}`}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Shifts Summary */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Mis Turnos Esta Semana</CardTitle>
        </CardHeader>
        <CardContent>
          {getWeekShifts().filter(s => hasUserClaimed(s)).length === 0 ? (
            <p className="text-sm text-muted-foreground">No tienes turnos asignados esta semana</p>
          ) : (
            <div className="grid gap-2">
              {getWeekShifts().filter(s => hasUserClaimed(s)).map(shift => {
                const status = getUserAssignmentStatus(shift);
                return (
                  <div 
                    key={shift.shift_id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {moment(shift.date).format('dddd D MMM')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                      </div>
                    </div>
                    <Badge variant={status === 'confirmed' ? 'success' : 'warning'}>
                      {status === 'confirmed' ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmado</>
                      ) : (
                        <><AlertCircle className="w-3 h-3 mr-1" /> Pendiente</>
                      )}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Shift Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={(open) => { setShiftDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingShift ? 'Editar Turno' : 'Crear Nuevo Turno'}</DialogTitle>
            <DialogDescription>
              Define el horario y capacidad del turno
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateShift}>
            <div className="space-y-4 py-4">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="shift-date">Fecha *</Label>
                <Input
                  id="shift-date"
                  type="date"
                  value={shiftForm.date}
                  onChange={(e) => setShiftForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                  data-testid="shift-date-input"
                />
              </div>

              {/* Preset Schedule */}
              <div className="space-y-2">
                <Label>Horario Predefinido</Label>
                <Select value={shiftForm.preset} onValueChange={handlePresetChange}>
                  <SelectTrigger data-testid="shift-preset-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_SCHEDULES.map(preset => (
                      <SelectItem key={preset.label} value={preset.label}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Time (shown when Personalizado is selected) */}
              {shiftForm.preset === 'Personalizado' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shift-start">Hora Inicio *</Label>
                    <Input
                      id="shift-start"
                      type="time"
                      value={shiftForm.start_time}
                      onChange={(e) => setShiftForm(prev => ({ ...prev, start_time: e.target.value }))}
                      required
                      data-testid="shift-start-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shift-end">Hora Fin *</Label>
                    <Input
                      id="shift-end"
                      type="time"
                      value={shiftForm.end_time}
                      onChange={(e) => setShiftForm(prev => ({ ...prev, end_time: e.target.value }))}
                      required
                      data-testid="shift-end-input"
                    />
                  </div>
                </div>
              )}

              {/* Display selected time if preset */}
              {shiftForm.preset !== 'Personalizado' && (
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                  <Clock className="w-4 h-4 inline mr-2" />
                  {formatTime(shiftForm.start_time)} - {formatTime(shiftForm.end_time)}
                </div>
              )}

              {/* Max Slots */}
              <div className="space-y-2">
                <Label htmlFor="shift-slots">Máximo de Personas *</Label>
                <Input
                  id="shift-slots"
                  type="number"
                  min="1"
                  max="100"
                  value={shiftForm.max_slots}
                  onChange={(e) => setShiftForm(prev => ({ ...prev, max_slots: e.target.value }))}
                  required
                  data-testid="shift-slots-input"
                />
                <p className="text-xs text-muted-foreground">
                  Cantidad máxima de empleados que pueden tomar este turno
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="shift-desc">Descripción (opcional)</Label>
                <Textarea
                  id="shift-desc"
                  placeholder="Ej: Turno de instalación en área norte..."
                  value={shiftForm.description}
                  onChange={(e) => setShiftForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  data-testid="shift-description-input"
                />
              </div>

              {/* Requires Approval */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="shift-approval"
                  checked={shiftForm.requires_approval}
                  onChange={(e) => setShiftForm(prev => ({ ...prev, requires_approval: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                  data-testid="shift-approval-checkbox"
                />
                <Label htmlFor="shift-approval" className="text-sm font-normal">
                  Requiere aprobación del administrador
                </Label>
              </div>
              {shiftForm.requires_approval && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  Los empleados que seleccionen este turno quedarán pendientes hasta que un administrador apruebe su solicitud.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShiftDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="save-shift-btn">
                {editingShift ? 'Actualizar' : 'Crear Turno'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectSchedule;
