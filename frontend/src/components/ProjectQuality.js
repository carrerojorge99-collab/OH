import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Plus, Trash2, Edit, Eye, CheckCircle, XCircle,
  ClipboardCheck, AlertTriangle, Package, FileText,
  Search, ChevronDown, ChevronUp, Save, Download
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import ProjectMRR from './ProjectMRR';
import ProjectInspections from './ProjectInspections';

const CHECKLIST_CATEGORIES = {
  general: 'General',
  electrical: 'Eléctrico',
  plumbing: 'Plomería',
  structural: 'Estructural',
  fire_protection: 'Protección Contra Incendios',
  hvac: 'HVAC',
  other: 'Otro',
};

const NC_CATEGORIES = {
  general: 'General',
  materials: 'Materiales',
  workmanship: 'Mano de Obra',
  design: 'Diseño',
  safety: 'Seguridad',
  other: 'Otro',
};

const SEVERITY_CONFIG = {
  critical: { label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-300' },
  major: { label: 'Mayor', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  minor: { label: 'Menor', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
};

const NC_STATUS_CONFIG = {
  open: { label: 'Abierto', color: 'bg-red-100 text-red-700' },
  in_progress: { label: 'En Proceso', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Cerrado', color: 'bg-slate-100 text-slate-700' },
};

const CL_STATUS_CONFIG = {
  open: { label: 'Abierto', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En Proceso', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-700' },
};

const ITEM_STATUS = {
  pending: { label: 'Pendiente', icon: '⏳' },
  pass: { label: 'Aprobado', icon: '✓' },
  fail: { label: 'Fallido', icon: '✗' },
  na: { label: 'N/A', icon: '—' },
};

// ================ Checklists Sub-Component ================
const QualityChecklists = ({ projectId }) => {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({
    title: '', category: 'general', inspector: '', inspection_date: '', notes: '',
    items: [{ description: '', status: 'pending', comments: '' }],
  });

  useEffect(() => { loadChecklists(); }, [projectId]);

  const loadChecklists = async () => {
    try {
      const res = await api.get(`/quality/checklists?project_id=${projectId}`, { withCredentials: true });
      setChecklists(res.data || []);
    } catch (e) {
      toast.error('Error al cargar checklists');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: '', category: 'general', inspector: '', inspection_date: '', notes: '', items: [{ description: '', status: 'pending', comments: '' }] });
    setEditingChecklist(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (cl) => {
    setEditingChecklist(cl);
    setForm({
      title: cl.title || '',
      category: cl.category || 'general',
      inspector: cl.inspector || '',
      inspection_date: cl.inspection_date || '',
      notes: cl.notes || '',
      items: cl.items?.length ? cl.items : [{ description: '', status: 'pending', comments: '' }],
    });
    setDialogOpen(true);
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', status: 'pending', comments: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Ingrese un título'); return; }
    if (!form.items.some(it => it.description.trim())) { toast.error('Agregue al menos un item'); return; }
    try {
      const payload = { ...form, project_id: projectId, items: form.items.filter(it => it.description.trim()) };
      if (editingChecklist) {
        await api.put(`/quality/checklists/${editingChecklist.checklist_id}`, payload, { withCredentials: true });
        toast.success('Checklist actualizado');
      } else {
        await api.post('/quality/checklists', payload, { withCredentials: true });
        toast.success('Checklist creado');
      }
      setDialogOpen(false);
      resetForm();
      loadChecklists();
    } catch (e) {
      toast.error('Error al guardar checklist');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este checklist?')) return;
    try {
      await api.delete(`/quality/checklists/${id}`, { withCredentials: true });
      toast.success('Checklist eliminado');
      loadChecklists();
    } catch (e) { toast.error('Error al eliminar'); }
  };

  const handleStatusChange = async (cl, newStatus) => {
    try {
      await api.put(`/quality/checklists/${cl.checklist_id}`, { status: newStatus }, { withCredentials: true });
      toast.success('Estado actualizado');
      loadChecklists();
    } catch (e) { toast.error('Error al actualizar estado'); }
  };

  const getChecklistStats = (cl) => {
    const items = cl.items || [];
    const total = items.length;
    const pass = items.filter(i => i.status === 'pass').length;
    const fail = items.filter(i => i.status === 'fail').length;
    return { total, pass, fail, pending: total - pass - fail - items.filter(i => i.status === 'na').length };
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-orange-500" />
          Checklists de Calidad ({checklists.length})
        </h3>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600" size="sm" data-testid="create-checklist-btn">
          <Plus className="w-4 h-4 mr-1" /> Nuevo Checklist
        </Button>
      </div>

      {checklists.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay checklists de calidad</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {checklists.map(cl => {
            const stats = getChecklistStats(cl);
            const isExpanded = expandedId === cl.checklist_id;
            return (
              <Card key={cl.checklist_id} className="border hover:shadow-sm transition-shadow" data-testid={`checklist-${cl.checklist_id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : cl.checklist_id)}>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      <div>
                        <p className="font-semibold">{cl.title}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{cl.checklist_number}</span>
                          <span>-</span>
                          <span>{CHECKLIST_CATEGORIES[cl.category] || cl.category}</span>
                          <span>-</span>
                          <span>{cl.inspector}</span>
                          <span>-</span>
                          <span>{moment(cl.inspection_date || cl.created_at).format('DD/MM/YYYY')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs mr-2">
                        <span className="text-green-600 font-medium">{stats.pass}P</span>
                        <span className="text-red-600 font-medium">{stats.fail}F</span>
                        <span className="text-slate-400">{stats.pending}?</span>
                      </div>
                      <Badge className={CL_STATUS_CONFIG[cl.status]?.color || 'bg-slate-100'}>{CL_STATUS_CONFIG[cl.status]?.label || cl.status}</Badge>
                      <Select value={cl.status} onValueChange={(v) => handleStatusChange(cl, v)}>
                        <SelectTrigger className="w-8 h-8 p-0 border-0"><span /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CL_STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(cl)} data-testid={`edit-checklist-${cl.checklist_id}`}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cl.checklist_id)} data-testid={`delete-checklist-${cl.checklist_id}`}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-500 border-b">
                            <th className="pb-2 w-8">#</th>
                            <th className="pb-2">Descripción</th>
                            <th className="pb-2 w-24 text-center">Estado</th>
                            <th className="pb-2">Comentarios</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(cl.items || []).map((item, idx) => (
                            <tr key={idx} className={`border-b last:border-0 ${item.status === 'fail' ? 'bg-red-50' : item.status === 'pass' ? 'bg-green-50' : ''}`}>
                              <td className="py-2 text-slate-400">{idx + 1}</td>
                              <td className="py-2">{item.description}</td>
                              <td className="py-2 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${item.status === 'pass' ? 'bg-green-100 text-green-700' : item.status === 'fail' ? 'bg-red-100 text-red-700' : item.status === 'na' ? 'bg-slate-100 text-slate-600' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {ITEM_STATUS[item.status]?.icon} {ITEM_STATUS[item.status]?.label}
                                </span>
                              </td>
                              <td className="py-2 text-slate-500 text-xs">{item.comments || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {cl.notes && <p className="mt-3 text-sm text-slate-600 italic">Notas: {cl.notes}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChecklist ? 'Editar Checklist' : 'Nuevo Checklist de Calidad'}</DialogTitle>
            <DialogDescription>Complete los campos para {editingChecklist ? 'actualizar' : 'crear'} el checklist de inspección.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Título *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Inspección eléctrica Piso 2" data-testid="checklist-title-input" />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="checklist-category-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHECKLIST_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Inspector</Label>
                <Input value={form.inspector} onChange={e => setForm(f => ({ ...f, inspector: e.target.value }))} placeholder="Nombre del inspector" />
              </div>
              <div>
                <Label>Fecha de Inspección</Label>
                <Input type="date" value={form.inspection_date} onChange={e => setForm(f => ({ ...f, inspection_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items de Inspección</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Agregar</Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 border rounded bg-slate-50">
                    <span className="text-xs text-slate-400 mt-2 w-6">{idx + 1}.</span>
                    <div className="flex-1 space-y-1">
                      <Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Descripción del item" className="text-sm" data-testid={`checklist-item-${idx}`} />
                      <div className="flex gap-2">
                        <Select value={item.status} onValueChange={v => updateItem(idx, 'status', v)}>
                          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(ITEM_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input value={item.comments} onChange={e => updateItem(idx, 'comments', e.target.value)} placeholder="Comentarios" className="text-xs h-8 flex-1" />
                      </div>
                    </div>
                    {form.items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="mt-1"><Trash2 className="w-3 h-3 text-red-400" /></Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Observaciones generales" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600" data-testid="save-checklist-btn">
              <Save className="w-4 h-4 mr-1" /> {editingChecklist ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ================ Non-Conformities Sub-Component ================
const NonConformities = ({ projectId, users }) => {
  const [ncs, setNcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNc, setEditingNc] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    title: '', description: '', category: 'general', severity: 'minor',
    location: '', assigned_to: '', corrective_action: '', due_date: '',
    resolution_notes: '', resolution_date: '',
  });

  useEffect(() => { loadNcs(); }, [projectId]);

  const loadNcs = async () => {
    try {
      const res = await api.get(`/quality/nonconformities?project_id=${projectId}`, { withCredentials: true });
      setNcs(res.data || []);
    } catch (e) {
      toast.error('Error al cargar no-conformidades');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', category: 'general', severity: 'minor', location: '', assigned_to: '', corrective_action: '', due_date: '', resolution_notes: '', resolution_date: '' });
    setEditingNc(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (nc) => {
    setEditingNc(nc);
    setForm({
      title: nc.title || '', description: nc.description || '', category: nc.category || 'general',
      severity: nc.severity || 'minor', location: nc.location || '', assigned_to: nc.assigned_to || '',
      corrective_action: nc.corrective_action || '', due_date: nc.due_date || '',
      resolution_notes: nc.resolution_notes || '', resolution_date: nc.resolution_date || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) { toast.error('Título y descripción son requeridos'); return; }
    try {
      const payload = { ...form, project_id: projectId };
      if (editingNc) {
        await api.put(`/quality/nonconformities/${editingNc.nc_id}`, payload, { withCredentials: true });
        toast.success('No-conformidad actualizada');
      } else {
        await api.post('/quality/nonconformities', payload, { withCredentials: true });
        toast.success('No-conformidad creada');
      }
      setDialogOpen(false);
      resetForm();
      loadNcs();
    } catch (e) { toast.error('Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta no-conformidad?')) return;
    try {
      await api.delete(`/quality/nonconformities/${id}`, { withCredentials: true });
      toast.success('No-conformidad eliminada');
      loadNcs();
    } catch (e) { toast.error('Error al eliminar'); }
  };

  const handleStatusChange = async (nc, newStatus) => {
    try {
      const updateData = { status: newStatus };
      if (newStatus === 'resolved' || newStatus === 'closed') {
        updateData.resolution_date = moment().format('YYYY-MM-DD');
      }
      await api.put(`/quality/nonconformities/${nc.nc_id}`, updateData, { withCredentials: true });
      toast.success('Estado actualizado');
      loadNcs();
    } catch (e) { toast.error('Error al actualizar'); }
  };

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return ncs;
    return ncs.filter(nc => nc.status === filterStatus);
  }, [ncs, filterStatus]);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          No-Conformidades ({ncs.length})
        </h3>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Filtrar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(NC_STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="bg-red-500 hover:bg-red-600" size="sm" data-testid="create-nc-btn">
            <Plus className="w-4 h-4 mr-1" /> Nueva NC
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{filterStatus !== 'all' ? 'No hay no-conformidades con ese estado' : 'No hay no-conformidades registradas'}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(nc => (
            <Card key={nc.nc_id} className={`border-l-4 ${nc.severity === 'critical' ? 'border-l-red-500' : nc.severity === 'major' ? 'border-l-orange-500' : 'border-l-yellow-500'}`} data-testid={`nc-${nc.nc_id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400 font-mono">{nc.nc_number}</span>
                      <Badge className={SEVERITY_CONFIG[nc.severity]?.color}>{SEVERITY_CONFIG[nc.severity]?.label}</Badge>
                      <Badge className={NC_STATUS_CONFIG[nc.status]?.color}>{NC_STATUS_CONFIG[nc.status]?.label}</Badge>
                      <Badge variant="outline" className="text-xs">{NC_CATEGORIES[nc.category] || nc.category}</Badge>
                    </div>
                    <p className="font-semibold">{nc.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{nc.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      {nc.location && <span>Ubicación: {nc.location}</span>}
                      {nc.assigned_to && <span>Asignado: {nc.assigned_to}</span>}
                      {nc.due_date && <span>Fecha límite: {moment(nc.due_date).format('DD/MM/YYYY')}</span>}
                      <span>Creado: {moment(nc.created_at).format('DD/MM/YYYY')}</span>
                    </div>
                    {nc.corrective_action && <p className="text-sm mt-2 bg-blue-50 p-2 rounded"><strong>Acción correctiva:</strong> {nc.corrective_action}</p>}
                    {nc.resolution_notes && <p className="text-sm mt-1 bg-green-50 p-2 rounded"><strong>Resolución:</strong> {nc.resolution_notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Select value={nc.status} onValueChange={(v) => handleStatusChange(nc, v)}>
                      <SelectTrigger className="w-8 h-8 p-0 border-0"><span /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(NC_STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(nc)} data-testid={`edit-nc-${nc.nc_id}`}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(nc.nc_id)} data-testid={`delete-nc-${nc.nc_id}`}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNc ? 'Editar No-Conformidad' : 'Nueva No-Conformidad'}</DialogTitle>
            <DialogDescription>Registre los detalles de la no-conformidad encontrada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Tubería mal soldada en Piso 3" data-testid="nc-title-input" />
            </div>
            <div>
              <Label>Descripción *</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Detalle del problema encontrado" data-testid="nc-description-input" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(NC_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severidad</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Ej: Piso 3, Área B" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Asignado a</Label>
                <Input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="Nombre del responsable" />
              </div>
              <div>
                <Label>Fecha Límite</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Acción Correctiva</Label>
              <Textarea value={form.corrective_action} onChange={e => setForm(f => ({ ...f, corrective_action: e.target.value }))} rows={2} placeholder="Describe la acción correctiva propuesta" />
            </div>
            {editingNc && (
              <div className="border-t pt-4">
                <div>
                  <Label>Notas de Resolución</Label>
                  <Textarea value={form.resolution_notes} onChange={e => setForm(f => ({ ...f, resolution_notes: e.target.value }))} rows={2} placeholder="Cómo se resolvió" />
                </div>
                <div className="mt-2">
                  <Label>Fecha de Resolución</Label>
                  <Input type="date" value={form.resolution_date} onChange={e => setForm(f => ({ ...f, resolution_date: e.target.value }))} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600" data-testid="save-nc-btn">
              <Save className="w-4 h-4 mr-1" /> {editingNc ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ================ Main Quality Component ================
const ProjectQuality = ({ projectId, projectName, projectNumber, project, users }) => {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [stats, setStats] = useState(null);

  useEffect(() => { loadStats(); }, [projectId]);

  const loadStats = async () => {
    try {
      const res = await api.get(`/quality/summary/${projectId}`, { withCredentials: true });
      setStats(res.data?.stats || null);
    } catch (e) {
      console.error('Error loading quality stats:', e);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await api.get(`/quality/summary/${projectId}`, { withCredentials: true });
      const data = res.data;
      
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(234, 88, 12);
      doc.text('REPORTE DE CALIDAD', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Proyecto: ${projectName || ''}`, 14, 35);
      doc.text(`No: ${projectNumber || ''}`, 14, 42);
      doc.text(`Fecha: ${moment().format('DD/MM/YYYY')}`, 14, 49);
      
      let y = 60;

      // Stats summary
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.text('Resumen', 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(0);
      const s = data.stats;
      doc.text(`Checklists: ${s.total_checklists} (${s.completed_checklists} completados, ${s.open_checklists} abiertos)`, 14, y); y += 6;
      doc.text(`No-Conformidades: ${s.total_nc} (${s.resolved_nc} resueltas, ${s.open_nc} abiertas, ${s.critical_nc} criticas)`, 14, y); y += 6;
      doc.text(`MRRs: ${s.total_mrrs}`, 14, y); y += 6;
      doc.text(`Pruebas de Presion: ${s.total_pressure_tests}`, 14, y); y += 12;

      // Checklists table
      if (data.checklists?.length) {
        doc.setFontSize(14);
        doc.setTextColor(234, 88, 12);
        doc.text('Checklists de Calidad', 14, y);
        y += 4;
        doc.autoTable({
          startY: y,
          head: [['No.', 'Titulo', 'Categoria', 'Inspector', 'Estado', 'Items']],
          body: data.checklists.map(cl => [
            cl.checklist_number,
            cl.title,
            CHECKLIST_CATEGORIES[cl.category] || cl.category,
            cl.inspector || '',
            CL_STATUS_CONFIG[cl.status]?.label || cl.status,
            `${(cl.items || []).filter(i => i.status === 'pass').length}/${(cl.items || []).length}`
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [234, 88, 12] },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // NC table
      if (data.nonconformities?.length) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setTextColor(234, 88, 12);
        doc.text('No-Conformidades', 14, y);
        y += 4;
        doc.autoTable({
          startY: y,
          head: [['No.', 'Titulo', 'Severidad', 'Estado', 'Ubicacion', 'Asignado']],
          body: data.nonconformities.map(nc => [
            nc.nc_number,
            nc.title,
            SEVERITY_CONFIG[nc.severity]?.label || nc.severity,
            NC_STATUS_CONFIG[nc.status]?.label || nc.status,
            nc.location || '',
            nc.assigned_to || ''
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [220, 38, 38] },
        });
      }

      doc.save(`Quality_Report_${projectNumber || projectId}.pdf`);
      toast.success('PDF de calidad descargado');
    } catch (e) {
      console.error('Error generating PDF:', e);
      toast.error('Error al generar PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.total_checklists}</p>
              <p className="text-xs text-orange-700">Checklists</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed_checklists}</p>
              <p className="text-xs text-green-700">Completados</p>
            </CardContent>
          </Card>
          <Card className={`border-red-200 ${stats.critical_nc > 0 ? 'bg-red-50 ring-2 ring-red-300' : 'bg-red-50'}`}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.total_nc}</p>
              <p className="text-xs text-red-700">No-Conformidades ({stats.critical_nc} crit.)</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.total_mrrs}</p>
              <p className="text-xs text-blue-700">MRRs</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.total_pressure_tests}</p>
              <p className="text-xs text-purple-700">Pruebas Presión</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PDF Download Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleDownloadPDF} data-testid="quality-pdf-btn">
          <Download className="w-4 h-4 mr-2" /> Descargar Reporte PDF
        </Button>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="bg-white border mb-4">
          <TabsTrigger value="checklists" data-testid="quality-checklists-tab" className="text-xs sm:text-sm">Checklists</TabsTrigger>
          <TabsTrigger value="nonconformities" data-testid="quality-nc-tab" className="text-xs sm:text-sm">No-Conformidades</TabsTrigger>
          <TabsTrigger value="mrr" data-testid="quality-mrr-tab" className="text-xs sm:text-sm">MRR</TabsTrigger>
          <TabsTrigger value="pressure" data-testid="quality-pressure-tab" className="text-xs sm:text-sm">Pruebas de Presión</TabsTrigger>
        </TabsList>

        <TabsContent value="checklists">
          <QualityChecklists projectId={projectId} />
        </TabsContent>

        <TabsContent value="nonconformities">
          <NonConformities projectId={projectId} users={users} />
        </TabsContent>

        <TabsContent value="mrr">
          <ProjectMRR projectId={projectId} projectName={projectName} projectNumber={projectNumber} />
        </TabsContent>

        <TabsContent value="pressure">
          <ProjectInspections projectId={projectId} project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectQuality;
