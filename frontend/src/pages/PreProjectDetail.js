import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import moment from 'moment';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  ArrowLeft, Plus, Save, Trash2, Edit, Calendar, User, Building2,
  Phone, Mail, MapPin, DollarSign, Target, FileText, FolderKanban,
  Upload, Download, File, Image as ImageIcon, MoreVertical, MessageSquare,
  CheckCircle2, Clock, AlertCircle, RefreshCw, Folder, FolderOpen, 
  FolderPlus, ChevronRight, Home, Move, Package, Wrench, Store, Send, UserPlus, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

// Stage configuration
const STAGES = [
  { id: 'new', title: 'Nuevo', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'contacted', title: 'Contactado', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'negotiation', title: 'En Negociación', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'quoted', title: 'Cotizado', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'won', title: 'Ganado', color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'lost', title: 'Perdido', color: 'bg-red-100 text-red-700 border-red-300' },
];

const PreProjectDetail = () => {
  const { preProjectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [preProject, setPreProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [laborRates, setLaborRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Logs state
  const [logs, setLogs] = useState([]);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [logTypeFilter, setLogTypeFilter] = useState('all');
  const [logForm, setLogForm] = useState({
    log_type: 'note',
    title: '',
    description: '',
    hours_worked: '',
    assigned_to: ''
  });
  
  // Documents state
  const [documents, setDocuments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docNote, setDocNote] = useState('');
  
  // Materials Estimate state
  const [materials, setMaterials] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [hardwareStores, setHardwareStores] = useState([]);
  const [newStoreName, setNewStoreName] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  
  // Edit pre-project form
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadData();
  }, [preProjectId]);

  const loadData = async () => {
    const ts = Date.now();
    const cfg = { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } };
    try {
      const [preProjectRes, usersRes, laborRatesRes, logsRes, docsRes, storesRes] = await Promise.all([
        api.get(`/pre-projects/${preProjectId}?_t=${ts}`, cfg),
        api.get(`/users?_t=${ts}`, cfg),
        api.get(`/labor-rates?_t=${ts}`, cfg).catch(() => ({ data: [] })),
        api.get(`/pre-projects/${preProjectId}/logs?_t=${ts}`, cfg).catch(() => ({ data: [] })),
        api.get(`/pre-projects/${preProjectId}/documents?_t=${ts}`, cfg).catch(() => ({ data: [] })),
        api.get(`/hardware-stores?_t=${ts}`, cfg).catch(() => ({ data: [] })),
      ]);
      
      const ppData = preProjectRes.data;
      setPreProject(ppData);
      setUsers(usersRes.data);
      setLaborRates(laborRatesRes.data || []);
      setLogs(logsRes.data || []);
      setDocuments(docsRes.data || []);
      setMaterials(ppData.materials_estimate || []);
      setEquipment(ppData.equipment_estimate || []);
      setHardwareStores(storesRes.data || []);
      
      setEditForm({
        title: ppData.title || '',
        description: ppData.description || '',
        client_name: ppData.client_name || '',
        client_company: ppData.client_company || '',
        client_phone: ppData.client_phone || '',
        client_email: ppData.client_email || '',
        location: ppData.location || '',
        work_type: ppData.work_type || '',
        estimated_budget: ppData.estimated_budget || 0,
        close_probability: ppData.close_probability || 50,
        stage: ppData.stage || 'new',
        assigned_to: ppData.assigned_to || '',
        contact_date: ppData.contact_date || '',
        next_action: ppData.next_action || '',
        next_action_date: ppData.next_action_date || '',
        notes: ppData.notes || '',
        ready_for_estimate: ppData.ready_for_estimate || false
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar pre-proyecto');
      navigate('/pre-projects');
    } finally {
      setLoading(false);
    }
  };

  // Update pre-project
  const handleUpdatePreProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/pre-projects/${preProjectId}`, editForm, { withCredentials: true });
      toast.success('Pre-proyecto actualizado');
      setEditDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  // Toggle ready for estimate
  const handleToggleReadyForEstimate = async () => {
    try {
      const newValue = !preProject.ready_for_estimate;
      await api.put(`/pre-projects/${preProjectId}`, {
        ...preProject,
        ready_for_estimate: newValue
      }, { withCredentials: true });
      toast.success(newValue ? 'Marcado como listo para estimar' : 'Desmarcado');
      loadData();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  // Stage change
  const handleStageChange = async (newStage) => {
    try {
      await api.put(`/pre-projects/${preProjectId}/stage`, { stage: newStage }, { withCredentials: true });
      toast.success('Etapa actualizada');
      loadData();
    } catch (error) {
      toast.error('Error al cambiar etapa');
    }
  };

  // Delete pre-project
  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este pre-proyecto? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/pre-projects/${preProjectId}`, { withCredentials: true });
      toast.success('Pre-proyecto eliminado');
      navigate('/pre-projects');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  // Convert to project
  const handleConvertToProject = async () => {
    if (!window.confirm('¿Convertir este pre-proyecto en un proyecto?')) return;
    try {
      await api.post(`/pre-projects/${preProjectId}/convert-to-project`, {}, { withCredentials: true });
      toast.success('Convertido a proyecto exitosamente');
      navigate('/projects');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al convertir');
    }
  };

  // Mark as completed by designer
  const handleMarkCompleted = async () => {
    if (!window.confirm('¿Marcar este pre-proyecto como completado? Se notificará a todos los Project Managers.')) return;
    try {
      const res = await api.post(`/pre-projects/${preProjectId}/mark-completed`, {}, { withCredentials: true });
      toast.success(res.data.message);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al marcar como completado');
    }
  };

  // Claim pre-project as PM
  const handleClaimProject = async () => {
    if (!window.confirm('¿Quieres reclamar este pre-proyecto? Serás el PM responsable.')) return;
    try {
      const res = await api.post(`/pre-projects/${preProjectId}/claim`, {}, { withCredentials: true });
      toast.success(res.data.message);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al reclamar el proyecto');
    }
  };

  // Release/Reassign pre-project (super_admin only)
  const handleReleaseProject = async () => {
    if (!window.confirm('¿Liberar este pre-proyecto? Quedará disponible para que otro PM lo reclame.')) return;
    try {
      const res = await api.post(`/pre-projects/${preProjectId}/reassign`, {}, { withCredentials: true });
      toast.success(res.data.message);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al liberar el proyecto');
    }
  };

  // Check if current user can edit
  const canEdit = () => {
    if (!preProject || !user) return false;
    if (user.role === 'super_admin') return true;
    if (preProject.claimed_by_pm && preProject.claimed_by_pm !== user.user_id) return false;
    return true;
  };

  // Logs functions
  const resetLogForm = () => {
    setLogForm({ log_type: 'note', title: '', description: '', hours_worked: '', assigned_to: '' });
    setEditingLogId(null);
  };

  const handleSubmitLog = async (e) => {
    e.preventDefault();
    if (!logForm.title || !logForm.description) {
      toast.error('Complete los campos requeridos');
      return;
    }

    try {
      const payload = {
        log_type: logForm.log_type,
        title: logForm.title,
        description: logForm.description,
        hours_worked: logForm.hours_worked ? parseFloat(logForm.hours_worked) : null,
        assigned_to: logForm.assigned_to || null
      };

      if (editingLogId) {
        await api.put(`/pre-projects/${preProjectId}/logs/${editingLogId}`, payload, { withCredentials: true });
        toast.success('Registro actualizado');
      } else {
        await api.post(`/pre-projects/${preProjectId}/logs`, payload, { withCredentials: true });
        toast.success('Registro creado');
        if (logForm.assigned_to) {
          const assignedUser = users.find(u => u.user_id === logForm.assigned_to);
          if (assignedUser) {
            toast.info(`Se notificará a ${assignedUser.name} por email`);
          }
        }
      }

      setLogDialogOpen(false);
      resetLogForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar registro');
    }
  };

  const handleEditLog = (log) => {
    setEditingLogId(log.log_id);
    setLogForm({
      log_type: log.log_type,
      title: log.title,
      description: log.description,
      hours_worked: log.hours_worked || '',
      assigned_to: log.assigned_to || ''
    });
    setLogDialogOpen(true);
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try {
      await api.delete(`/pre-projects/${preProjectId}/logs/${logId}`, { withCredentials: true });
      toast.success('Registro eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar registro');
    }
  };

  // Document functions
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.error(`${invalidFiles.length} archivo(s) superan el límite de 10MB`);
    }

    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);
    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    setUploadingFile(true);
    let successCount = 0;

    for (const file of validFiles) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        await api.post(`/pre-projects/${preProjectId}/documents`, formData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        successCount++;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} documento(s) subido(s)`);
      loadData();
    }

    setUploadingFile(false);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);
    if (validFiles.length === 0) {
      toast.error('Archivos muy grandes (máx 10MB)');
      return;
    }

    setUploadingFile(true);
    let successCount = 0;

    for (const file of validFiles) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        await api.post(`/pre-projects/${preProjectId}/documents`, formData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        successCount++;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} documento(s) subido(s)`);
      loadData();
    }

    setUploadingFile(false);
  };

  const handleDownloadDocument = async (doc) => {
    try {
      // Si tiene URL de Cloudinary, abrir directamente
      if (doc.url) {
        window.open(doc.url, '_blank');
        return;
      }
      
      // Fallback para archivos legacy en servidor local
      const response = await api.get(`/pre-projects/${preProjectId}/documents/${doc.document_id}/download`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Error al descargar');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    try {
      await api.delete(`/pre-projects/${preProjectId}/documents/${docId}`, { withCredentials: true });
      toast.success('Documento eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  // Check if file is a CAD file (DWG, DXF, DWF)
  const isCADFile = (filename) => {
    if (!filename) return false;
    const ext = filename.toLowerCase().split('.').pop();
    return ['dwg', 'dxf', 'dwf'].includes(ext);
  };

  // Open CAD file in ShareCAD viewer
  const openCADPreview = (doc) => {
    if (!doc.url) {
      toast.error('El archivo no tiene URL disponible');
      return;
    }
    // ShareCAD viewer URL
    const shareCADUrl = `https://sharecad.org/cadframe/load?url=${encodeURIComponent(doc.url)}`;
    window.open(shareCADUrl, '_blank');
  };

  const openNoteDialog = (doc) => {
    setSelectedDoc(doc);
    setDocNote(doc.note || '');
    setNoteDialogOpen(true);
  };

  const handleSaveDocNote = async () => {
    if (!selectedDoc) return;
    try {
      await api.put(`/pre-projects/${preProjectId}/documents/${selectedDoc.document_id}/note`, 
        { note: docNote }, 
        { withCredentials: true }
      );
      toast.success('Nota guardada');
      setNoteDialogOpen(false);
      setSelectedDoc(null);
      loadData();
    } catch (error) {
      toast.error('Error al guardar nota');
    }
  };

  // Materials estimate functions
  const addMaterialRow = () => {
    setMaterials([...materials, {
      description: '',
      quantity: 0,
      unit: 'unidad',
      unit_cost: 0,
      total: 0,
      store: ''
    }]);
  };

  const updateMaterialRow = (index, field, value) => {
    const updated = [...materials];
    updated[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_cost') {
      const qty = Number(updated[index].quantity) || 0;
      const cost = Number(updated[index].unit_cost) || 0;
      updated[index].total = qty * cost;
    }
    
    setMaterials(updated);
  };

  const deleteMaterialRow = (index) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const addEquipmentRow = () => {
    setEquipment([...equipment, {
      description: '',
      quantity: 0,
      days: 0,
      rate: 0,
      total: 0
    }]);
  };

  const updateEquipmentRow = (index, field, value) => {
    const updated = [...equipment];
    updated[index][field] = value;
    
    if (field === 'quantity' || field === 'days' || field === 'rate') {
      const qty = Number(updated[index].quantity) || 0;
      const days = Number(updated[index].days) || 0;
      const rate = Number(updated[index].rate) || 0;
      updated[index].total = qty * days * rate;
    }
    
    setEquipment(updated);
  };

  const deleteEquipmentRow = (index) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  const handleSaveMaterialsEstimate = async () => {
    setSaving(true);
    try {
      await api.put(`/pre-projects/${preProjectId}/materials-estimate`, {
        materials,
        equipment
      }, { withCredentials: true });
      toast.success('Estimado de materiales guardado');
      loadData();
    } catch (error) {
      toast.error('Error al guardar estimado');
    } finally {
      setSaving(false);
    }
  };

  // Transfer materials to cost estimate
  const handleTransferToEstimate = async () => {
    if (materials.length === 0 && equipment.length === 0) {
      toast.error('No hay materiales ni equipos para transferir');
      return;
    }
    
    setTransferring(true);
    try {
      const res = await api.post(`/pre-projects/${preProjectId}/transfer-to-estimate`, {
        estimate_name: `Estimado - ${preProject?.title || 'Pre-Proyecto'}`
      }, { withCredentials: true });
      
      toast.success(`Transferido exitosamente: ${res.data.estimate_number}`);
      setTransferDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al transferir');
    } finally {
      setTransferring(false);
    }
  };

  // Add custom hardware store
  const handleAddStore = async () => {
    if (!newStoreName.trim()) return;
    
    try {
      await api.post('/hardware-stores', { name: newStoreName.trim() }, { withCredentials: true });
      toast.success('Ferretería agregada');
      setNewStoreName('');
      // Reload stores
      const storesRes = await api.get('/hardware-stores', { withCredentials: true });
      setHardwareStores(storesRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agregar ferretería');
    }
  };

  // Calculate totals
  const totalMaterials = useMemo(() => 
    materials.reduce((sum, m) => sum + (Number(m.total) || 0), 0), [materials]);
  
  const totalEquipment = useMemo(() => 
    equipment.reduce((sum, e) => sum + (Number(e.total) || 0), 0), [equipment]);
  
  const grandTotal = totalMaterials + totalEquipment;

  // Group materials by store
  const materialsByStore = useMemo(() => {
    const grouped = {};
    materials.forEach((m, index) => {
      const store = m.store || 'Sin Ferretería';
      if (!grouped[store]) {
        grouped[store] = [];
      }
      grouped[store].push({ ...m, originalIndex: index });
    });
    return grouped;
  }, [materials]);

  const storeTotals = useMemo(() => {
    const totals = {};
    materials.forEach(m => {
      const store = m.store || 'Sin Ferretería';
      if (!totals[store]) totals[store] = 0;
      totals[store] += Number(m.total) || 0;
    });
    return totals;
  }, [materials]);

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-blue-600" />;
    if (fileType?.includes('pdf')) return <FileText className="w-8 h-8 text-red-600" />;
    if (fileType?.includes('word') || fileType?.includes('document')) return <FileText className="w-8 h-8 text-blue-600" />;
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return <FileText className="w-8 h-8 text-green-600" />;
    return <File className="w-8 h-8 text-slate-600" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </Layout>
    );
  }

  if (!preProject) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Pre-proyecto no encontrado</p>
          <Button onClick={() => navigate('/pre-projects')} className="mt-4">
            Volver a Pre-Proyectos
          </Button>
        </div>
      </Layout>
    );
  }

  const stageConfig = STAGES.find(s => s.id === preProject.stage) || STAGES[0];
  const assignedUser = users.find(u => u.user_id === preProject.assigned_to);

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate('/pre-projects')}
            className="mb-4 -ml-2"
            data-testid="back-to-preprojects"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Pre-Proyectos
          </Button>
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900" data-testid="preproject-title">
                  {preProject.title}
                </h1>
                <Badge className={`${stageConfig.color} border`}>{stageConfig.title}</Badge>
                {preProject.ready_for_estimate && (
                  <Badge className="bg-green-100 text-green-700 border-green-300 border">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Listo para Estimar
                  </Badge>
                )}
                {preProject.completed_by_designer && !preProject.claimed_by_pm && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 border">
                    <Clock className="w-3 h-3 mr-1" />
                    Disponible para PM
                  </Badge>
                )}
                {preProject.claimed_by_pm_name && (
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300 border">
                    <User className="w-3 h-3 mr-1" />
                    PM: {preProject.claimed_by_pm_name}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-2">{preProject.description}</p>
              
              {/* Read-only warning for other PMs */}
              {preProject.claimed_by_pm && preProject.claimed_by_pm !== user?.user_id && user?.role !== 'super_admin' && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Este pre-proyecto está asignado a <strong>{preProject.claimed_by_pm_name}</strong>. Solo puedes ver la información, no editarla.
                </div>
              )}
              
              {/* Client Info Summary */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {preProject.client_name}
                  {preProject.client_company && ` - ${preProject.client_company}`}
                </span>
                {preProject.client_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {preProject.client_phone}
                  </span>
                )}
                {preProject.estimated_budget > 0 && (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <DollarSign className="w-4 h-4" />
                    ${preProject.estimated_budget.toLocaleString()}
                  </span>
                )}
                {assignedUser && (
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {assignedUser.name}
                  </span>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {/* Designer: Mark as Completed */}
              {(user?.role === 'designer' || user?.role === 'super_admin') && !preProject.completed_by_designer && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleMarkCompleted}
                  className="bg-amber-600 hover:bg-amber-700"
                  data-testid="mark-completed-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Marcar Completado
                </Button>
              )}
              
              {/* PM: Claim Project */}
              {(user?.role === 'project_manager' || user?.role === 'super_admin') && 
               preProject.completed_by_designer && !preProject.claimed_by_pm && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleClaimProject}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="claim-project-btn"
                >
                  <User className="w-4 h-4 mr-1" />
                  Reclamar Proyecto
                </Button>
              )}
              
              {/* Super Admin: Release Project */}
              {user?.role === 'super_admin' && preProject.claimed_by_pm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReleaseProject}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  data-testid="release-project-btn"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Liberar Proyecto
                </Button>
              )}
              
              <Button
                variant={preProject.ready_for_estimate ? "default" : "outline"}
                size="sm"
                onClick={handleToggleReadyForEstimate}
                className={preProject.ready_for_estimate ? "bg-green-600 hover:bg-green-700" : ""}
                data-testid="toggle-ready-estimate"
                disabled={!canEdit()}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {preProject.ready_for_estimate ? "Listo ✓" : "Marcar Listo"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                data-testid="edit-preproject"
                disabled={!canEdit()}
              >
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
              {preProject.stage === 'won' && !preProject.converted_to_project && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConvertToProject}
                  className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                  data-testid="convert-to-project"
                  disabled={!canEdit()}
                >
                  <FolderKanban className="w-4 h-4 mr-1" />
                  Convertir a Proyecto
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                data-testid="delete-preproject"
                disabled={!canEdit()}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
            </div>
          </div>
        </div>

        {/* Stage Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-600 mr-2">Etapa:</span>
              {STAGES.map((stage) => (
                <Button
                  key={stage.id}
                  variant={preProject.stage === stage.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStageChange(stage.id)}
                  className={preProject.stage === stage.id ? `${stage.color.replace('bg-', 'bg-').split(' ')[0]} hover:opacity-80` : ''}
                  data-testid={`stage-${stage.id}`}
                >
                  {stage.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="info" className="text-xs sm:text-sm px-3 py-2">Información</TabsTrigger>
            <TabsTrigger value="materials" className="text-xs sm:text-sm px-3 py-2">Est. Materiales</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs sm:text-sm px-3 py-2">Bitácora</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm px-3 py-2">Documentos</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Client Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Información del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-500">Nombre</Label>
                    <p className="font-medium">{preProject.client_name}</p>
                  </div>
                  {preProject.client_company && (
                    <div>
                      <Label className="text-xs text-slate-500">Empresa</Label>
                      <p>{preProject.client_company}</p>
                    </div>
                  )}
                  {preProject.client_phone && (
                    <div>
                      <Label className="text-xs text-slate-500">Teléfono</Label>
                      <p>{preProject.client_phone}</p>
                    </div>
                  )}
                  {preProject.client_email && (
                    <div>
                      <Label className="text-xs text-slate-500">Email</Label>
                      <p>{preProject.client_email}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderKanban className="w-5 h-5" />
                    Información del Proyecto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {preProject.work_type && (
                    <div>
                      <Label className="text-xs text-slate-500">Tipo de Trabajo</Label>
                      <p>{preProject.work_type}</p>
                    </div>
                  )}
                  {preProject.location && (
                    <div>
                      <Label className="text-xs text-slate-500">Ubicación</Label>
                      <p className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {preProject.location}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500">Presupuesto Estimado</Label>
                      <p className="font-semibold text-green-600">
                        ${(preProject.estimated_budget || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Probabilidad de Cierre</Label>
                      <p className={`font-semibold ${
                        preProject.close_probability >= 70 ? 'text-green-600' :
                        preProject.close_probability >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {preProject.close_probability}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Follow-up Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Seguimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {preProject.contact_date && (
                    <div>
                      <Label className="text-xs text-slate-500">Fecha de Contacto</Label>
                      <p>{moment(preProject.contact_date).format('DD/MM/YYYY')}</p>
                    </div>
                  )}
                  {preProject.next_action && (
                    <div>
                      <Label className="text-xs text-slate-500">Próxima Acción</Label>
                      <p>{preProject.next_action}</p>
                    </div>
                  )}
                  {preProject.next_action_date && (
                    <div>
                      <Label className="text-xs text-slate-500">Fecha Próxima Acción</Label>
                      <p>{moment(preProject.next_action_date).format('DD/MM/YYYY')}</p>
                    </div>
                  )}
                  {assignedUser && (
                    <div>
                      <Label className="text-xs text-slate-500">Responsable</Label>
                      <p className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {assignedUser.name}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Notas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {preProject.notes || 'Sin notas'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Materials Estimate Tab */}
          <TabsContent value="materials" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Estimado de Materiales por Ferretería
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={materials.length === 0 && equipment.length === 0}>
                        <Send className="w-4 h-4 mr-2" />
                        Transferir a Estimación
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Transferir a Estimación de Costos</DialogTitle>
                        <DialogDescription>
                          Se creará una nueva estimación de costos con los materiales y equipos actuales, organizados por ferretería.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <div className="space-y-2 text-sm">
                          <p><strong>Total Materiales:</strong> ${totalMaterials.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                          <p><strong>Total Equipos:</strong> ${totalEquipment.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                          <p className="font-bold text-lg pt-2 border-t">Gran Total: ${grandTotal.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                          
                          {Object.keys(storeTotals).length > 0 && (
                            <div className="mt-4 p-3 bg-slate-50 rounded">
                              <p className="font-semibold mb-2">Desglose por Ferretería:</p>
                              {Object.entries(storeTotals).map(([store, total]) => (
                                <p key={store} className="flex justify-between">
                                  <span>{store}:</span>
                                  <span>${total.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleTransferToEstimate} disabled={transferring}>
                          {transferring ? 'Transfiriendo...' : 'Crear Estimación'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={handleSaveMaterialsEstimate} disabled={saving} data-testid="save-materials">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar Estimado'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add custom store */}
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <Store className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-amber-700">Agregar Ferretería:</span>
                  <Input
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="Nombre de la ferretería"
                    className="h-8 w-48"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddStore} disabled={!newStoreName.trim()}>
                    <Plus className="w-4 h-4 mr-1" /> Agregar
                  </Button>
                </div>

                {/* Materials Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      <Store className="w-4 h-4" /> Materiales por Ferretería
                    </h3>
                    <Button variant="outline" size="sm" onClick={addMaterialRow} data-testid="add-material">
                      <Plus className="w-4 h-4 mr-1" /> Agregar Material
                    </Button>
                  </div>
                  
                  {materials.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="px-3 py-2 text-left w-40">Ferretería</th>
                            <th className="px-3 py-2 text-left">Descripción</th>
                            <th className="px-3 py-2 text-center w-24">Cantidad</th>
                            <th className="px-3 py-2 text-center w-24">Unidad</th>
                            <th className="px-3 py-2 text-right w-32">Costo Unitario</th>
                            <th className="px-3 py-2 text-right w-32">Total</th>
                            <th className="px-3 py-2 w-16"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {materials.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="px-3 py-2">
                                <Select
                                  value={item.store || 'none'}
                                  onValueChange={(v) => updateMaterialRow(index, 'store', v === 'none' ? '' : v)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Ferretería" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sin Ferretería</SelectItem>
                                    {hardwareStores.map(store => (
                                      <SelectItem key={store.store_id} value={store.name}>
                                        {store.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  value={item.description}
                                  onChange={(e) => updateMaterialRow(index, 'description', e.target.value)}
                                  placeholder="Descripción del material"
                                  className="h-8"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateMaterialRow(index, 'quantity', e.target.value)}
                                  className="h-8 text-center"
                                  min="0"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Select
                                  value={item.unit || 'unidad'}
                                  onValueChange={(v) => updateMaterialRow(index, 'unit', v)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unidad">Unidad</SelectItem>
                                    <SelectItem value="pie">Pie</SelectItem>
                                    <SelectItem value="metro">Metro</SelectItem>
                                    <SelectItem value="galon">Galón</SelectItem>
                                    <SelectItem value="libra">Libra</SelectItem>
                                    <SelectItem value="kg">Kg</SelectItem>
                                    <SelectItem value="caja">Caja</SelectItem>
                                    <SelectItem value="rollo">Rollo</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  value={item.unit_cost}
                                  onChange={(e) => updateMaterialRow(index, 'unit_cost', e.target.value)}
                                  className="h-8 text-right"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-green-600">
                                ${(item.total || 0).toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteMaterialRow(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-blue-50 font-semibold">
                          <tr>
                            <td colSpan="5" className="px-3 py-2 text-right">Subtotal Materiales:</td>
                            <td className="px-3 py-2 text-right text-blue-600">
                              ${totalMaterials.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                      
                      {/* Store breakdown */}
                      {Object.keys(storeTotals).length > 0 && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {Object.entries(storeTotals).map(([store, total]) => (
                            <div key={store} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                              <div className="flex items-center gap-2 mb-1">
                                <Store className="w-4 h-4 text-amber-600" />
                                <span className="font-medium text-amber-800 text-sm">{store}</span>
                              </div>
                              <p className="text-lg font-bold text-amber-700">
                                ${total.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No hay materiales agregados</p>
                      <Button variant="outline" size="sm" onClick={addMaterialRow} className="mt-2">
                        <Plus className="w-4 h-4 mr-1" /> Agregar Primer Material
                      </Button>
                    </div>
                  )}
                </div>

                {/* Equipment Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700">Equipos</h3>
                    <Button variant="outline" size="sm" onClick={addEquipmentRow} data-testid="add-equipment">
                      <Plus className="w-4 h-4 mr-1" /> Agregar Equipo
                    </Button>
                  </div>
                  
                  {equipment.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="px-3 py-2 text-left">Descripción</th>
                            <th className="px-3 py-2 text-center w-24">Cantidad</th>
                            <th className="px-3 py-2 text-center w-24">Días</th>
                            <th className="px-3 py-2 text-right w-32">Tarifa/Día</th>
                            <th className="px-3 py-2 text-right w-32">Total</th>
                            <th className="px-3 py-2 w-16"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {equipment.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="px-3 py-2">
                                <Input
                                  value={item.description}
                                  onChange={(e) => updateEquipmentRow(index, 'description', e.target.value)}
                                  placeholder="Descripción del equipo"
                                  className="h-8"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateEquipmentRow(index, 'quantity', e.target.value)}
                                  className="h-8 text-center"
                                  min="0"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  value={item.days}
                                  onChange={(e) => updateEquipmentRow(index, 'days', e.target.value)}
                                  className="h-8 text-center"
                                  min="0"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  value={item.rate}
                                  onChange={(e) => updateEquipmentRow(index, 'rate', e.target.value)}
                                  className="h-8 text-right"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-green-600">
                                ${(item.total || 0).toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteEquipmentRow(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-orange-50 font-semibold">
                          <tr>
                            <td colSpan="4" className="px-3 py-2 text-right">Subtotal Equipos:</td>
                            <td className="px-3 py-2 text-right text-orange-600">
                              ${totalEquipment.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                      <Wrench className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No hay equipos agregados</p>
                      <Button variant="outline" size="sm" onClick={addEquipmentRow} className="mt-2">
                        <Plus className="w-4 h-4 mr-1" /> Agregar Primer Equipo
                      </Button>
                    </div>
                  )}
                </div>

                {/* Grand Total */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>TOTAL ESTIMADO:</span>
                    <span className="text-green-600">
                      ${grandTotal.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab (Bitácora) */}
          <TabsContent value="logs" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Bitácora del Pre-Proyecto</CardTitle>
                <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="new-log-btn">
                      <Plus className="w-4 h-4 mr-2" /> Nuevo Registro
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingLogId ? 'Editar Registro' : 'Nuevo Registro de Bitácora'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitLog} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Tipo de Registro *</Label>
                          <Select value={logForm.log_type} onValueChange={(v) => setLogForm({...logForm, log_type: v})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="note">Nota General</SelectItem>
                              <SelectItem value="contact">Contacto con Cliente</SelectItem>
                              <SelectItem value="visit">Visita al Sitio</SelectItem>
                              <SelectItem value="meeting">Reunión</SelectItem>
                              <SelectItem value="update">Actualización</SelectItem>
                              <SelectItem value="problem">Problema</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Horas</Label>
                          <Input 
                            type="number" 
                            step="0.5"
                            value={logForm.hours_worked} 
                            onChange={(e) => setLogForm({...logForm, hours_worked: e.target.value})}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Título *</Label>
                        <Input 
                          value={logForm.title} 
                          onChange={(e) => setLogForm({...logForm, title: e.target.value})}
                          placeholder="Resumen breve"
                          required
                        />
                      </div>
                      <div>
                        <Label>Descripción *</Label>
                        <Textarea 
                          value={logForm.description} 
                          onChange={(e) => setLogForm({...logForm, description: e.target.value})}
                          placeholder="Descripción detallada..."
                          rows={4}
                          required
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4" />
                          Asignar Responsable (recibirá notificación por email)
                        </Label>
                        <Select 
                          value={logForm.assigned_to || "none"} 
                          onValueChange={(v) => setLogForm({...logForm, assigned_to: v === "none" ? "" : v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar responsable" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {users.map(u => (
                              <SelectItem key={u.user_id} value={u.user_id}>
                                {u.name} {u.email ? `(${u.email})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => { setLogDialogOpen(false); resetLogForm(); }}>
                          Cancelar
                        </Button>
                        <Button type="submit">
                          {editingLogId ? 'Actualizar' : 'Guardar'} Registro
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {/* Filter by type */}
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <span className="text-sm text-slate-600">Filtrar:</span>
                  <div className="flex gap-2 flex-wrap">
                    {['all', 'note', 'contact', 'visit', 'meeting', 'update', 'problem'].map(type => (
                      <Button
                        key={type}
                        variant={logTypeFilter === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLogTypeFilter(type)}
                      >
                        {type === 'all' ? 'Todos' : 
                         type === 'note' ? 'Nota' :
                         type === 'contact' ? 'Contacto' :
                         type === 'visit' ? 'Visita' :
                         type === 'meeting' ? 'Reunión' :
                         type === 'update' ? 'Actualización' : 'Problema'}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Logs list */}
                <div className="space-y-4">
                  {logs.filter(l => logTypeFilter === 'all' || l.log_type === logTypeFilter).length > 0 ? (
                    logs
                      .filter(l => logTypeFilter === 'all' || l.log_type === logTypeFilter)
                      .map(log => (
                        <div key={log.log_id} className={`p-4 rounded-lg border ${
                          log.log_type === 'problem' ? 'bg-red-50 border-red-200' :
                          log.log_type === 'contact' ? 'bg-green-50 border-green-200' :
                          log.log_type === 'visit' ? 'bg-blue-50 border-blue-200' :
                          log.log_type === 'meeting' ? 'bg-purple-50 border-purple-200' :
                          'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge className={
                                  log.log_type === 'note' ? 'bg-slate-100 text-slate-700' :
                                  log.log_type === 'contact' ? 'bg-green-100 text-green-700' :
                                  log.log_type === 'visit' ? 'bg-blue-100 text-blue-700' :
                                  log.log_type === 'meeting' ? 'bg-purple-100 text-purple-700' :
                                  log.log_type === 'update' ? 'bg-orange-100 text-orange-700' :
                                  'bg-red-100 text-red-700'
                                }>
                                  {log.log_type === 'note' ? 'Nota' :
                                   log.log_type === 'contact' ? 'Contacto' :
                                   log.log_type === 'visit' ? 'Visita' :
                                   log.log_type === 'meeting' ? 'Reunión' :
                                   log.log_type === 'update' ? 'Actualización' : 'Problema'}
                                </Badge>
                                <h4 className="font-semibold">{log.title}</h4>
                                {log.hours_worked > 0 && (
                                  <Badge variant="outline" className="ml-2">
                                    {log.hours_worked}h
                                  </Badge>
                                )}
                                {log.assigned_to_name && (
                                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 border">
                                    <UserPlus className="w-3 h-3 mr-1" />
                                    Responsable: {log.assigned_to_name}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-slate-700 whitespace-pre-wrap">{log.description}</p>
                              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <User className="w-4 h-4" /> Creado por: {log.user_name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" /> {moment(log.created_at).format('DD/MM/YYYY HH:mm')}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditLog(log)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLog(log.log_id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No hay registros en la bitácora</p>
                      <p className="text-sm mt-2">Crea el primer registro para documentar el seguimiento</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Documentos</CardTitle>
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="doc-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    multiple
                  />
                  <Button
                    onClick={() => document.getElementById('doc-upload').click()}
                    disabled={uploadingFile}
                    data-testid="upload-doc-btn"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingFile ? 'Subiendo...' : 'Subir Documentos'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative transition-all ${isDragging ? 'bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg' : ''}`}
              >
                {isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-50/90 z-10 rounded-lg pointer-events-none">
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                      <p className="text-blue-600 font-medium">Suelta los archivos aquí</p>
                    </div>
                  </div>
                )}

                {documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc) => (
                      <Card key={doc.document_id} className="border-slate-200 hover:border-blue-300 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              {getFileIcon(doc.file_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 truncate mb-1" title={doc.original_filename}>
                                {doc.original_filename}
                              </h3>
                              <p className="text-xs text-slate-500 mb-1">{formatFileSize(doc.file_size)}</p>
                              <p className="text-xs text-slate-600 mb-2">
                                Por: <span className="font-medium">{doc.uploaded_by_name}</span>
                              </p>
                              
                              {/* Document Note */}
                              {doc.note && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                                  <p className="text-xs text-yellow-800">
                                    <strong>Nota:</strong> {doc.note}
                                  </p>
                                </div>
                              )}
                              
                              <div className="flex gap-2 flex-wrap">
                                {/* CAD Preview Button */}
                                {isCADFile(doc.original_filename) && doc.url && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => openCADPreview(doc)}
                                    className="text-xs bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Preview CAD
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="text-xs"
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  {doc.url ? 'Ver' : 'Descargar'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openNoteDialog(doc)}
                                  className="text-xs"
                                >
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  {doc.note ? 'Editar Nota' : 'Agregar Nota'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteDocument(doc.document_id)}
                                  className="text-xs text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-lg">
                    <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">No hay documentos aún</p>
                    <p className="text-sm mb-4">Arrastra archivos aquí o usa el botón para subir</p>
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('doc-upload').click()}
                      disabled={uploadingFile}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Subir Documentos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Note Dialog */}
            <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nota del Documento</DialogTitle>
                  <DialogDescription>
                    {selectedDoc?.original_filename}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label>Nota</Label>
                  <Textarea
                    value={docNote}
                    onChange={(e) => setDocNote(e.target.value)}
                    placeholder="Escribe una nota sobre este documento..."
                    rows={4}
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveDocNote}>
                    Guardar Nota
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>

        {/* Edit Pre-Project Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Pre-Proyecto</DialogTitle>
              <DialogDescription>Actualiza la información del pre-proyecto</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdatePreProject} className="space-y-6">
              {/* Project Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Información del Proyecto
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Título *</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Descripción</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Tipo de Trabajo</Label>
                    <Input
                      value={editForm.work_type}
                      onChange={(e) => setEditForm({ ...editForm, work_type: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Ubicación</Label>
                    <Input
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre del Cliente *</Label>
                    <Input
                      value={editForm.client_name}
                      onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Empresa</Label>
                    <Input
                      value={editForm.client_company}
                      onChange={(e) => setEditForm({ ...editForm, client_company: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={editForm.client_phone}
                      onChange={(e) => setEditForm({ ...editForm, client_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editForm.client_email}
                      onChange={(e) => setEditForm({ ...editForm, client_email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Financial */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Información Financiera
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Presupuesto Estimado ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editForm.estimated_budget}
                      onChange={(e) => setEditForm({ ...editForm, estimated_budget: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Probabilidad de Cierre (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.close_probability}
                      onChange={(e) => setEditForm({ ...editForm, close_probability: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Etapa</Label>
                    <Select value={editForm.stage} onValueChange={(v) => setEditForm({ ...editForm, stage: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Follow-up */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Seguimiento
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha de Contacto</Label>
                    <Input
                      type="date"
                      value={editForm.contact_date}
                      onChange={(e) => setEditForm({ ...editForm, contact_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Responsable</Label>
                    <Select value={editForm.assigned_to} onValueChange={(v) => setEditForm({ ...editForm, assigned_to: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => ['super_admin', 'admin', 'project_manager', 'designer'].includes(u.role)).map(u => (
                          <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Próxima Acción</Label>
                    <Input
                      value={editForm.next_action}
                      onChange={(e) => setEditForm({ ...editForm, next_action: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Fecha Próxima Acción</Label>
                    <Input
                      type="date"
                      value={editForm.next_action_date}
                      onChange={(e) => setEditForm({ ...editForm, next_action_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>Notas</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Ready for estimate checkbox */}
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <Checkbox
                  id="ready-for-estimate"
                  checked={editForm.ready_for_estimate}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, ready_for_estimate: checked })}
                />
                <Label htmlFor="ready-for-estimate" className="text-green-700 cursor-pointer">
                  Marcar como listo para estimar
                </Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default PreProjectDetail;
