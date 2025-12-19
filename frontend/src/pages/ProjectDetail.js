import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  ArrowLeft, Plus, FileDown, CheckCircle2, Circle, Clock,
  DollarSign, Calendar, Tag, MessageSquare, Trash2, Pencil, TrendingUp, TrendingDown,
  Upload, Download, File, FileText, Image as ImageIcon, LayoutGrid, List, User, Edit
} from 'lucide-react';
import KanbanBoard from '../components/KanbanBoard';
import Timer from '../components/Timer';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  exportTimesheetToExcel, 
  exportTimesheetToPDF, 
  exportLaborToExcel, 
  exportLaborToPDF 
} from '../utils/exportUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [labor, setLabor] = useState([]);
  const [timesheet, setTimesheet] = useState([]);
  const [filteredTimesheet, setFilteredTimesheet] = useState([]);
  const [selectedTimesheetUser, setSelectedTimesheetUser] = useState('all');
  const [comments, setComments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editExpenseDialogOpen, setEditExpenseDialogOpen] = useState(false);
  const [laborDialogOpen, setLaborDialogOpen] = useState(false);
  const [editLaborDialogOpen, setEditLaborDialogOpen] = useState(false);
  const [timesheetDialogOpen, setTimesheetDialogOpen] = useState(false);
  const [editTimesheetDialogOpen, setEditTimesheetDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingLaborId, setEditingLaborId] = useState(null);
  const [editingTimesheetId, setEditingTimesheetId] = useState(null);
  
  // Project Logs state
  const [projectLogs, setProjectLogs] = useState([]);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [logTypeFilter, setLogTypeFilter] = useState('all');
  const [logForm, setLogForm] = useState({
    log_type: 'work',
    title: '',
    description: '',
    hours_worked: ''
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    progress: 0
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    allocated_amount: 0
  });

  const [expenseForm, setExpenseForm] = useState({
    category_id: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const [laborForm, setLaborForm] = useState({
    labor_category: '',
    hours_per_week: 0,
    hourly_rate: 0,
    estimated_total_hours: 0,
    consumed_hours: 0,
    overtime_hours: 0,
    overtime_rate: 0,
    expenses: 0,
    comments: ''
  });

  const [timesheetForm, setTimesheetForm] = useState({
    user_id: '',
    user_name: '',
    date: new Date().toISOString().split('T')[0],
    hours_worked: 0,
    description: '',
    task_id: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'planning',
    priority: 'medium',
    budget_total: 0,
    project_value: 0,
    payment_status: 'pending',
    po_summary: '',
    resource: '',
    initials: '',
    project_number: '',
    client: '',
    sponsor: '',
    po_number: '',
    po_quantity: 0,
    proposal_number: ''
  });

  // Required documents state
  const [requiredDocsFromClient, setRequiredDocsFromClient] = useState([]);
  const [requiredDocsToClient, setRequiredDocsToClient] = useState([]);
  const [projectDocStatus, setProjectDocStatus] = useState({});


    loadRequiredDocuments();


  useEffect(() => {
    loadProjectData();
    loadUsers();
  }, [projectId]);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, { withCredentials: true });
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  useEffect(() => {
    if (project) {
      setEditForm({
        name: project.name,
        description: project.description,
        start_date: project.start_date,
        end_date: project.end_date,
        status: project.status,
        priority: project.priority,
        budget_total: project.budget_total,
        project_value: project.project_value || 0,
        payment_status: project.payment_status || 'pending',
        po_summary: project.po_summary || '',
        resource: project.resource || '',
        initials: project.initials || '',
        project_number: project.project_number || '',
        client: project.client || '',
        sponsor: project.sponsor || '',
        po_number: project.po_number || '',
        po_quantity: project.po_quantity || 0,
        proposal_number: project.proposal_number || '',
        location_latitude: project.location_latitude || null,
        location_longitude: project.location_longitude || null,
        geofence_radius: project.geofence_radius || 100,
        geofence_enabled: project.geofence_enabled || false
      });
    }
  }, [project]);

  // Filter timesheet by user
  useEffect(() => {
    if (selectedTimesheetUser === 'all') {
      setFilteredTimesheet(timesheet);
    } else {
      setFilteredTimesheet(timesheet.filter(entry => entry.user_id === selectedTimesheetUser));
    }
  }, [selectedTimesheetUser, timesheet]);

  const loadProjectData = async () => {
    const ts = Date.now();
    const cfg = { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } };
    try {
      const [projectRes, tasksRes, categoriesRes, expensesRes, laborRes, timesheetRes, commentsRes, documentsRes, statsRes, logsRes] = await Promise.all([
        axios.get(`${API}/projects/${projectId}?_t=${ts}`, cfg),
        axios.get(`${API}/tasks?project_id=${projectId}&_t=${ts}`, cfg),
        axios.get(`${API}/budget/categories?project_id=${projectId}&_t=${ts}`, cfg),
        axios.get(`${API}/expenses?project_id=${projectId}&_t=${ts}`, cfg),
        axios.get(`${API}/labor?project_id=${projectId}&_t=${ts}`, cfg),
        axios.get(`${API}/timesheet?project_id=${projectId}&_t=${ts}`, cfg),
        axios.get(`${API}/comments?project_id=${projectId}&_t=${ts}`, cfg),
        axios.get(`${API}/documents?project_id=${projectId}&_t=${ts}`, cfg),
        axios.get(`${API}/projects/${projectId}/stats?_t=${ts}`, cfg),
        axios.get(`${API}/project-logs?project_id=${projectId}&_t=${ts}`, cfg)
      ]);
      
      setProject(projectRes.data);
      setTasks(tasksRes.data);
      setCategories(categoriesRes.data);
      setExpenses(expensesRes.data);
      setLabor(laborRes.data);
      setTimesheet(timesheetRes.data);
      setComments(commentsRes.data);
      setDocuments(documentsRes.data);
      setStats(statsRes.data);
      setProjectLogs(logsRes.data || []);
    } catch (error) {
      toast.error('Error al cargar datos del proyecto');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/tasks`, {
        project_id: projectId,
        ...taskForm
      }, { withCredentials: true });
      
      toast.success('Tarea creada exitosamente');
      setTaskDialogOpen(false);
      setTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', due_date: '', progress: 0 });
      loadProjectData();
    } catch (error) {
      toast.error('Error al crear tarea');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/budget/categories`, {
        project_id: projectId,
        ...categoryForm
      }, { withCredentials: true });
      
      toast.success('Categoría creada exitosamente');
      setCategoryDialogOpen(false);
      setCategoryForm({ name: '', allocated_amount: 0 });
      loadProjectData();
    } catch (error) {
      toast.error('Error al crear categoría');
    }


  // Load required documents and project status
  const loadRequiredDocuments = async () => {
    try {
      const [docsRes, statusRes] = await Promise.all([
        axios.get(`${API}/required-documents`, { withCredentials: true }),
        axios.get(`${API}/projects/${projectId}/document-status`, { withCredentials: true })
      ]);
      
      setRequiredDocsFromClient(docsRes.data.from_client || []);
      setRequiredDocsToClient(docsRes.data.to_client || []);
      setProjectDocStatus(statusRes.data || {});
    } catch (error) {
      console.error('Error loading required documents:', error);
    }
  };

  const toggleDocumentStatus = async (documentId, direction) => {
    try {
      const currentStatus = projectDocStatus[documentId] || false;
      const newStatus = !currentStatus;
      
      await axios.post(`${API}/projects/${projectId}/document-status`, {
        document_id: documentId,
        direction: direction,
        status: newStatus
      }, { withCredentials: true });
      
      setProjectDocStatus(prev => ({
        ...prev,
        [documentId]: newStatus
      }));
      
      toast.success(newStatus ? 'Documento marcado como completado' : 'Documento marcado como pendiente');
    } catch (error) {
      toast.error('Error al actualizar estado del documento');
    }
  };

  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category.category_id);
    setCategoryForm({
      name: category.name,
      allocated_amount: category.allocated_amount
    });
    setEditCategoryDialogOpen(true);
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/budget/categories/${editingCategoryId}`, {
        project_id: projectId,
        ...categoryForm
      }, { withCredentials: true });
      
      toast.success('Categoría actualizada exitosamente');
      setEditCategoryDialogOpen(false);
      setCategoryForm({ name: '', allocated_amount: 0 });
      setEditingCategoryId(null);
      loadProjectData();
    } catch (error) {
      toast.error('Error al actualizar categoría');
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${categoryName}"? Esta acción no se puede deshacer.`)) return;
    
    try {
      await axios.delete(`${API}/budget/categories/${categoryId}`, { withCredentials: true });
      toast.success('Categoría eliminada exitosamente');
      loadProjectData();
    } catch (error) {
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Error al eliminar categoría');
      }
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/expenses`, {
        project_id: projectId,
        ...expenseForm
      }, { withCredentials: true });
      
      toast.success('Gasto registrado exitosamente');
      setExpenseDialogOpen(false);
      setExpenseForm({ category_id: '', description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
      loadProjectData();
    } catch (error) {
      toast.error('Error al registrar gasto');
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.expense_id);
    setExpenseForm({
      category_id: expense.category_id,
      description: expense.description,
      amount: expense.amount,
      date: expense.date
    });
    setEditExpenseDialogOpen(true);
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/expenses/${editingExpenseId}`, {
        project_id: projectId,
        ...expenseForm
      }, { withCredentials: true });
      
      toast.success('Gasto actualizado exitosamente');
      setEditExpenseDialogOpen(false);
      setExpenseForm({ category_id: '', description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
      setEditingExpenseId(null);
      loadProjectData();
    } catch (error) {
      toast.error('Error al actualizar gasto');
    }
  };

  const handleDeleteExpense = async (expenseId, expenseDescription) => {
    if (!window.confirm(`¿Estás seguro de eliminar el gasto "${expenseDescription}"? Esta acción no se puede deshacer.`)) return;
    
    try {
      await axios.delete(`${API}/expenses/${expenseId}`, { withCredentials: true });
      toast.success('Gasto eliminado exitosamente');
      loadProjectData();
    } catch (error) {
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Error al eliminar gasto');
      }
    }
  };

  const handleCreateLabor = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/labor`, {
        project_id: projectId,
        ...laborForm
      }, { withCredentials: true });
      
      toast.success('Registro de labor creado exitosamente');
      setLaborDialogOpen(false);
      setLaborForm({
        labor_category: '',
        hours_per_week: 0,
        hourly_rate: 0,
        estimated_total_hours: 0,
        consumed_hours: 0,
        overtime_hours: 0,
        overtime_rate: 0,
        expenses: 0,
        comments: ''
      });
      loadProjectData();
    } catch (error) {
      toast.error('Error al crear registro de labor');
    }
  };

  const handleEditLabor = (labor) => {
    setEditingLaborId(labor.labor_id);
    setLaborForm({
      labor_category: labor.labor_category,
      hours_per_week: labor.hours_per_week,
      hourly_rate: labor.hourly_rate,
      estimated_total_hours: labor.estimated_total_hours,
      consumed_hours: labor.consumed_hours || 0,
      overtime_hours: labor.overtime_hours,
      overtime_rate: labor.overtime_rate,
      expenses: labor.expenses,
      comments: labor.comments || ''
    });
    setEditLaborDialogOpen(true);
  };

  const handleUpdateLabor = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/labor/${editingLaborId}`, {
        project_id: projectId,
        ...laborForm
      }, { withCredentials: true });
      
      toast.success('Registro de labor actualizado exitosamente');
      setEditLaborDialogOpen(false);
      setLaborForm({
        labor_category: '',
        hours_per_week: 0,
        hourly_rate: 0,
        estimated_total_hours: 0,
        consumed_hours: 0,
        overtime_hours: 0,
        overtime_rate: 0,
        expenses: 0,
        comments: ''
      });
      setEditingLaborId(null);
      loadProjectData();
    } catch (error) {
      toast.error('Error al actualizar registro de labor');
    }
  };

  const handleDeleteLabor = async (laborId, laborCategory) => {
    if (!window.confirm(`¿Estás seguro de eliminar el registro de "${laborCategory}"? Esta acción no se puede deshacer.`)) return;
    
    try {
      await axios.delete(`${API}/labor/${laborId}`, { withCredentials: true });
      toast.success('Registro de labor eliminado exitosamente');
      loadProjectData();
    } catch (error) {
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Error al eliminar registro de labor');
      }
    }
  };

  const handleCreateTimesheet = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/timesheet`, {
        project_id: projectId,
        ...timesheetForm
      }, { withCredentials: true });
      
      toast.success('Registro de tiempo creado exitosamente');
      setTimesheetDialogOpen(false);
      setTimesheetForm({
        user_id: '',
        user_name: '',
        date: new Date().toISOString().split('T')[0],
        hours_worked: 0,
        description: '',
        task_id: ''
      });
      loadProjectData();
    } catch (error) {
      toast.error('Error al crear registro de tiempo');
    }
  };

  const handleEditTimesheet = (timesheet) => {
    setEditingTimesheetId(timesheet.timesheet_id);
    setTimesheetForm({
      user_id: timesheet.user_id,
      user_name: timesheet.user_name,
      date: timesheet.date,
      hours_worked: timesheet.hours_worked,
      description: timesheet.description,
      task_id: timesheet.task_id || ''
    });
    setEditTimesheetDialogOpen(true);
  };

  const handleUpdateTimesheet = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/timesheet/${editingTimesheetId}`, {
        project_id: projectId,
        ...timesheetForm
      }, { withCredentials: true });
      
      toast.success('Registro de tiempo actualizado exitosamente');
      setEditTimesheetDialogOpen(false);
      setTimesheetForm({
        user_id: '',
        user_name: '',
        date: new Date().toISOString().split('T')[0],
        hours_worked: 0,
        description: '',
        task_id: ''
      });
      setEditingTimesheetId(null);
      loadProjectData();
    } catch (error) {
      toast.error('Error al actualizar registro de tiempo');
    }
  };

  const handleDeleteTimesheet = async (timesheetId, date) => {
    if (!window.confirm(`¿Estás seguro de eliminar el registro del ${date}? Esta acción no se puede deshacer.`)) return;
    
    try {
      await axios.delete(`${API}/timesheet/${timesheetId}`, { withCredentials: true });
      toast.success('Registro de tiempo eliminado exitosamente');
      loadProjectData();
    } catch (error) {
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Error al eliminar registro de tiempo');
      }
    }
  };

  const handleTimerStop = async (hours) => {
    const roundedHours = Math.round(hours * 100) / 100; // Round to 2 decimals
    
    if (roundedHours === 0) {
      toast.error('El tiempo registrado es demasiado corto');
      return;
    }

    try {
      await axios.post(`${API}/timesheet`, {
        project_id: projectId,
        user_id: users[0]?.user_id || '', // Use first user or let backend handle
        user_name: users[0]?.name || 'Usuario',
        task_id: null,
        date: new Date().toISOString().split('T')[0],
        hours_worked: roundedHours,
        description: `Registro automático del timer (${roundedHours} horas)`
      }, { withCredentials: true });
      
      toast.success(`Tiempo guardado: ${roundedHours} horas`);
      loadProjectData();
    } catch (error) {
      toast.error('Error al guardar el tiempo');
      console.error(error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      await axios.post(`${API}/comments`, {
        project_id: projectId,
        content: commentText
      }, { withCredentials: true });
      
      setCommentText('');
      loadProjectData();
      toast.success('Comentario agregado');
    } catch (error) {
      toast.error('Error al agregar comentario');
    }
  };

  // Project Logs functions
  const resetLogForm = () => {
    setLogForm({ log_type: 'work', title: '', description: '', hours_worked: '' });
    setEditingLogId(null);
  };

  const handleSubmitLog = async (e) => {
    e.preventDefault();
    if (!logForm.title || !logForm.description || !logForm.log_type) {
      toast.error('Complete los campos requeridos');
      return;
    }

    try {
      const payload = {
        project_id: projectId,
        log_type: logForm.log_type,
        title: logForm.title,
        description: logForm.description,
        hours_worked: logForm.hours_worked ? parseFloat(logForm.hours_worked) : null,
        attachments: []
      };

      if (editingLogId) {
        await axios.put(`${API}/project-logs/${editingLogId}`, payload, { withCredentials: true });
        toast.success('Registro actualizado');
      } else {
        await axios.post(`${API}/project-logs`, payload, { withCredentials: true });
        toast.success('Registro creado');
      }

      setLogDialogOpen(false);
      resetLogForm();
      loadProjectData();
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
      hours_worked: log.hours_worked || ''
    });
    setLogDialogOpen(true);
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('¿Eliminar este registro de la bitácora?')) return;

    try {
      await axios.delete(`${API}/project-logs/${logId}`, { withCredentials: true });
      toast.success('Registro eliminado');
      loadProjectData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar registro');
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await axios.get(
        `${API}/reports/project/${projectId}/export?format=${format}`,
        { 
          withCredentials: true,
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `proyecto_${projectId}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Reporte ${format.toUpperCase()} descargado exitosamente`);
    } catch (error) {
      toast.error('Error al exportar reporte');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta tarea?')) return;
    
    try {
      await axios.delete(`${API}/tasks/${taskId}`, { withCredentials: true });
      toast.success('Tarea eliminada');
      loadProjectData();
    } catch (error) {
      toast.error('Error al eliminar tarea');
    }
  };

  const handleTaskUpdate = async (taskId, updatedTask) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, {
        project_id: updatedTask.project_id,
        title: updatedTask.title,
        description: updatedTask.description,
        assigned_to: updatedTask.assigned_to,
        status: updatedTask.status,
        priority: updatedTask.priority,
        due_date: updatedTask.due_date,
        progress: updatedTask.progress
      }, { withCredentials: true });
      loadProjectData();
    } catch (error) {
      toast.error('Error al actualizar tarea');
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/projects/${projectId}`, editForm, { withCredentials: true });
      toast.success('Proyecto actualizado exitosamente');
      setEditDialogOpen(false);
      loadProjectData();
    } catch (error) {
      toast.error('Error al actualizar proyecto');
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('¿Estás seguro de eliminar este proyecto? Esta acción eliminará también todas las tareas, presupuestos, gastos, comentarios y documentos asociados.')) return;
    
    try {
      await axios.delete(`${API}/projects/${projectId}`, { withCredentials: true });
      toast.success('Proyecto eliminado exitosamente');
      navigate('/projects');
    } catch (error) {
      toast.error('Error al eliminar proyecto');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máximo 10MB)');
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API}/documents/upload?project_id=${projectId}`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      toast.success('Documento subido exitosamente');
      loadProjectData();
    } catch (error) {
      toast.error('Error al subir documento');
      console.error(error);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDownloadDocument = async (documentId, filename) => {
    try {
      const response = await axios.get(`${API}/documents/${documentId}/download`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Error al descargar documento');
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('¿Estás seguro de eliminar este documento?')) return;
    
    try {
      await axios.delete(`${API}/documents/${documentId}`, { withCredentials: true });
      toast.success('Documento eliminado exitosamente');
      loadProjectData();
    } catch (error) {
      toast.error('Error al eliminar documento');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Cargando proyecto...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Proyecto no encontrado</p>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Volver a Proyectos
          </Button>
        </div>
      </Layout>
    );
  }

  const budgetData = categories.map(cat => ({
    name: cat.name,
    value: cat.spent_amount,
    allocated: cat.allocated_amount
  }));

  const COLORS = ['#2563EB', '#10B981', '#F97316', '#8B5CF6', '#EF4444'];

  return (
    <Layout>
      <div className="space-y-8 fade-in">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate('/projects')}
            className="mb-4 -ml-2"
            data-testid="back-to-projects-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Proyectos
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">{project.name}</h1>
              <p className="text-muted-foreground mt-2">{project.description}</p>
              <div className="flex items-center gap-3 mt-4">
                <Badge className={
                  project.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                  project.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  'bg-purple-100 text-purple-700 border-purple-200'
                }>
                  {project.status}
                </Badge>
                <span className="text-sm text-slate-600">
                  {project.start_date} - {project.end_date}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(true)}
                data-testid="edit-project-button"
                className="rounded-full"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                data-testid="export-pdf-button"
                className="rounded-full"
              >
                <FileDown className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('excel')}
                data-testid="export-excel-button"
                className="rounded-full"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteProject}
                data-testid="delete-project-button"
                className="rounded-full bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Project Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight">Editar Proyecto</DialogTitle>
              <DialogDescription>Actualiza la información del proyecto</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateProject}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nombre del Proyecto *</Label>
                  <Input
                    id="edit-name"
                    data-testid="edit-project-name-input"
                    placeholder="Ej: Desarrollo Web para Cliente XYZ"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descripción *</Label>
                  <Textarea
                    id="edit-description"
                    data-testid="edit-project-description-input"
                    placeholder="Describe el alcance, objetivos y entregables del proyecto..."
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    required
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-start-date">Fecha de Inicio *</Label>
                    <Input
                      id="edit-start-date"
                      data-testid="edit-project-start-date-input"
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-end-date">Fecha de Fin *</Label>
                    <Input
                      id="edit-end-date"
                      data-testid="edit-project-end-date-input"
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Estado</Label>
                    <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                      <SelectTrigger data-testid="edit-project-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planificación</SelectItem>
                        <SelectItem value="in_progress">En Progreso</SelectItem>
                        <SelectItem value="on_hold">En Espera</SelectItem>
                        <SelectItem value="completed">Completado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-priority">Prioridad</Label>
                    <Select value={editForm.priority} onValueChange={(value) => setEditForm({ ...editForm, priority: value })}>
                      <SelectTrigger data-testid="edit-project-priority-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-budget">Presupuesto (Costos) *</Label>
                  <Input
                    id="edit-budget"
                    data-testid="edit-project-budget-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editForm.budget_total}
                    onChange={(e) => setEditForm({ ...editForm, budget_total: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  <p className="text-xs text-slate-500">Total de gastos estimados del proyecto</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-value">Valor del Proyecto (Ingreso) *</Label>
                  <Input
                    id="edit-value"
                    data-testid="edit-project-value-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editForm.project_value}
                    onChange={(e) => setEditForm({ ...editForm, project_value: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  <p className="text-xs text-slate-500">Valor total que se cobrará al cliente</p>
                </div>

                <div className="col-span-2 text-xs text-muted-foreground bg-slate-50 p-3 rounded-md border border-slate-200">
                  💡 Ganancia estimada: ${((editForm.project_value || 0) - (stats?.budget_spent || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-payment-status">Estado de Pago</Label>
                  <Select value={editForm.payment_status} onValueChange={(value) => setEditForm({ ...editForm, payment_status: value })}>
                    <SelectTrigger data-testid="edit-project-payment-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente de Pago</SelectItem>
                      <SelectItem value="partial">Pago Parcial</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sección de información adicional */}
                <div className="col-span-2 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Información Adicional de Orden de Compra</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-client">Cliente</Label>
                      <Input
                        id="edit-client"
                        placeholder="Nombre del cliente"
                        value={editForm.client}
                        onChange={(e) => setEditForm({ ...editForm, client: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-sponsor">Patrocinador</Label>
                      <Input
                        id="edit-sponsor"
                        placeholder="Nombre del patrocinador"
                        value={editForm.sponsor}
                        onChange={(e) => setEditForm({ ...editForm, sponsor: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-project-number">Número de Proyecto</Label>
                      <Input
                        id="edit-project-number"
                        placeholder="Ej: PROJ-2025-001"
                        value={editForm.project_number}
                        onChange={(e) => setEditForm({ ...editForm, project_number: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-po-number">No. de PO</Label>
                      <Input
                        id="edit-po-number"
                        placeholder="Ej: PO-12345"
                        value={editForm.po_number}
                        onChange={(e) => setEditForm({ ...editForm, po_number: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-proposal-number">No. Propuesta</Label>
                      <Input
                        id="edit-proposal-number"
                        placeholder="Ej: PROP-2025-001"
                        value={editForm.proposal_number}
                        onChange={(e) => setEditForm({ ...editForm, proposal_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-resource">Recurso</Label>
                      <Input
                        id="edit-resource"
                        placeholder="Nombre del recurso asignado"
                        value={editForm.resource}
                        onChange={(e) => setEditForm({ ...editForm, resource: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-initials">Iniciales</Label>
                      <Input
                        id="edit-initials"
                        placeholder="Ej: JD"
                        value={editForm.initials}
                        onChange={(e) => setEditForm({ ...editForm, initials: e.target.value })}
                        maxLength={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-po-quantity">Cantidad del PO</Label>
                      <Input
                        id="edit-po-quantity"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={editForm.po_quantity}
                        onChange={(e) => setEditForm({ ...editForm, po_quantity: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="edit-po-summary">Resumen de PO</Label>
                    <Textarea
                      id="edit-po-summary"
                      placeholder="Descripción breve de la orden de compra..."
                      value={editForm.po_summary}
                      onChange={(e) => setEditForm({ ...editForm, po_summary: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* Geofencing */}
                  <div className="p-4 border rounded-lg bg-green-50 space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Restricción de Ubicación (Geofencing)</Label>
                        <p className="text-xs text-slate-500">Solo permitir ponches dentro del área del proyecto</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editForm.geofence_enabled || false}
                        onChange={(e) => setEditForm({ ...editForm, geofence_enabled: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </div>
                    {editForm.geofence_enabled && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Latitud</Label>
                          <Input
                            type="number"
                            step="0.000001"
                            placeholder="18.4655"
                            value={editForm.location_latitude || ''}
                            onChange={(e) => setEditForm({ ...editForm, location_latitude: parseFloat(e.target.value) || null })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Longitud</Label>
                          <Input
                            type="number"
                            step="0.000001"
                            placeholder="-66.1057"
                            value={editForm.location_longitude || ''}
                            onChange={(e) => setEditForm({ ...editForm, location_longitude: parseFloat(e.target.value) || null })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Radio (m)</Label>
                          <Input
                            type="number"
                            min="10"
                            value={editForm.geofence_radius || 100}
                            onChange={(e) => setEditForm({ ...editForm, geofence_radius: parseInt(e.target.value) || 100 })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button data-testid="submit-edit-project-button" type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Tareas</p>
                  <p className="text-3xl font-bold">{stats?.total_tasks || 0}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Completadas</p>
                  <p className="text-3xl font-bold">{stats?.completed_tasks || 0}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Valor Proyecto</p>
                  <p className="text-xl font-bold font-mono">
                    ${(stats?.project_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Gastado</p>
                  <p className="text-xl font-bold font-mono">
                    ${(stats?.budget_spent || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className={`border-slate-200 shadow-sm ${(stats?.profit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Ganancia</p>
                  <p className={`text-xl font-bold font-mono ${(stats?.profit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${(stats?.profit || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {(stats?.profit || 0) >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-600" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={`border-slate-200 shadow-sm ${
            project?.payment_status === 'paid' ? 'bg-green-50' : 
            project?.payment_status === 'partial' ? 'bg-yellow-50' : 
            'bg-red-50'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Estado de Pago</p>
                  <p className={`text-lg font-semibold ${
                    project?.payment_status === 'paid' ? 'text-green-700' : 
                    project?.payment_status === 'partial' ? 'text-yellow-700' : 
                    'text-red-700'
                  }`}>
                    {project?.payment_status === 'paid' && '✓ Pagado'}
                    {project?.payment_status === 'partial' && '◐ Pago Parcial'}
                    {project?.payment_status === 'pending' && '⊗ Pendiente'}
                    {!project?.payment_status && '⊗ Pendiente'}
                  </p>
                </div>
                <DollarSign className={`w-8 h-8 ${
                  project?.payment_status === 'paid' ? 'text-green-600' : 
                  project?.payment_status === 'partial' ? 'text-yellow-600' : 
                  'text-red-600'
                }`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="tasks" data-testid="tasks-tab">Tareas</TabsTrigger>
            <TabsTrigger value="budget" data-testid="budget-tab">Presupuesto</TabsTrigger>
            <TabsTrigger value="labor" data-testid="labor-tab">Salarios</TabsTrigger>
            <TabsTrigger value="timesheet" data-testid="timesheet-tab">Timesheet</TabsTrigger>
            <TabsTrigger value="documents" data-testid="documents-tab">Documentos</TabsTrigger>
            <TabsTrigger value="required-docs" data-testid="required-docs-tab">Doc. Requeridos</TabsTrigger>
            <TabsTrigger value="logs" data-testid="logs-tab">Bitácora</TabsTrigger>
            <TabsTrigger value="comments" data-testid="comments-tab">Comentarios</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-semibold tracking-tight">Tareas</h2>
                <div className="flex items-center gap-2 bg-slate-100 rounded-full p-1">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    data-testid="view-list-button"
                    className={`rounded-full ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                  >
                    <List className="w-4 h-4 mr-1" />
                    Lista
                  </Button>
                  <Button
                    variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('kanban')}
                    data-testid="view-kanban-button"
                    className={`rounded-full ${viewMode === 'kanban' ? 'bg-white shadow-sm' : ''}`}
                  >
                    <LayoutGrid className="w-4 h-4 mr-1" />
                    Kanban
                  </Button>
                </div>
              </div>
              <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-task-button" className="rounded-full bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Tarea
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Tarea</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTask}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="task-title">Título *</Label>
                        <Input
                          id="task-title"
                          data-testid="task-title-input"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task-description">Descripción</Label>
                        <Textarea
                          id="task-description"
                          data-testid="task-description-input"
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Estado</Label>
                          <Select value={taskForm.status} onValueChange={(value) => setTaskForm({ ...taskForm, status: value })}>
                            <SelectTrigger data-testid="task-status-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">Por Hacer</SelectItem>
                              <SelectItem value="in_progress">En Progreso</SelectItem>
                              <SelectItem value="review">En Revisión</SelectItem>
                              <SelectItem value="done">Completado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Prioridad</Label>
                          <Select value={taskForm.priority} onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}>
                            <SelectTrigger data-testid="task-priority-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Baja</SelectItem>
                              <SelectItem value="medium">Media</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                              <SelectItem value="urgent">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task-due-date">Fecha de Vencimiento</Label>
                        <Input
                          id="task-due-date"
                          data-testid="task-due-date-input"
                          type="date"
                          value={taskForm.due_date}
                          onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Asignar a</Label>
                      <Select value={taskForm.assigned_to || 'unassigned'} onValueChange={(value) => setTaskForm({ ...taskForm, assigned_to: value === 'unassigned' ? null : value })}>
                        <SelectTrigger data-testid="task-assigned-select">
                          <SelectValue placeholder="Seleccionar usuario" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Sin asignar</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.name} ({user.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button data-testid="submit-task-button" type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Crear Tarea
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {viewMode === 'kanban' ? (
              <KanbanBoard 
                tasks={tasks} 
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleDeleteTask}
                users={users}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {tasks.length > 0 ? tasks.map((task) => (
                <Card key={task.task_id} data-testid={`task-card-${task.task_id}`} className="border-slate-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#0F172A] mb-1">{task.title}</h3>
                        <p className="text-sm text-slate-600">{task.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.task_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <Badge className={
                          task.status === 'done' ? 'bg-green-100 text-green-700' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          task.status === 'review' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {task.status}
                        </Badge>
                        <span className={`text-xs font-medium uppercase ${
                          task.priority === 'urgent' ? 'text-red-600' :
                          task.priority === 'high' ? 'text-orange-600' :
                          task.priority === 'medium' ? 'text-blue-600' :
                          'text-slate-600'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      {task.assigned_to && (
                        <div className="flex items-center text-xs text-slate-600">
                          <User className="w-3 h-3 mr-1" />
                          {users.find(u => u.user_id === task.assigned_to)?.name || 'Usuario'}
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center text-xs text-slate-600">
                          <Calendar className="w-3 h-3 mr-1" />
                          {task.due_date}
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <Label htmlFor={`progress-${task.task_id}`} className="text-slate-600">Progreso</Label>
                          <span className="font-medium">{task.progress}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`progress-${task.task_id}`}
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={task.progress}
                            onChange={(e) => {
                              const newProgress = parseInt(e.target.value);
                              handleTaskUpdate(task.task_id, { ...task, progress: newProgress });
                            }}
                            className="flex-1 h-2"
                          />
                        </div>
                        <Progress value={task.progress} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-2 text-center py-12 text-muted-foreground">
                  <Circle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay tareas creadas aún</p>
                </div>
              )}
              </div>
            )}
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-6">
            {/* Budget Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Presupuesto Total</p>
                      <p className="text-lg font-bold font-mono">
                        ${(project?.budget_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Asignado en Categorías</p>
                      <p className="text-lg font-bold font-mono text-orange-700">
                        ${categories.reduce((sum, cat) => sum + cat.allocated_amount, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <Tag className="w-6 h-6 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className={`border-slate-200 shadow-sm ${
                (project?.budget_total || 0) - categories.reduce((sum, cat) => sum + cat.allocated_amount, 0) >= 0 
                  ? 'bg-green-50' 
                  : 'bg-red-50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Disponible</p>
                      <p className={`text-lg font-bold font-mono ${
                        (project?.budget_total || 0) - categories.reduce((sum, cat) => sum + cat.allocated_amount, 0) >= 0
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}>
                        ${((project?.budget_total || 0) - categories.reduce((sum, cat) => sum + cat.allocated_amount, 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    {(project?.budget_total || 0) - categories.reduce((sum, cat) => sum + cat.allocated_amount, 0) >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Categories */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold tracking-tight">Categorías</h2>
                  <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="add-category-button" size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crear Categoría de Presupuesto</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateCategory}>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="category-name">Nombre *</Label>
                            <Input
                              id="category-name"
                              data-testid="category-name-input"
                              value={categoryForm.name}
                              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="category-amount">Monto Asignado *</Label>
                            <Input
                              id="category-amount"
                              data-testid="category-amount-input"
                              type="number"
                              step="0.01"
                              min="0"
                              value={categoryForm.allocated_amount}
                              onChange={(e) => setCategoryForm({ ...categoryForm, allocated_amount: parseFloat(e.target.value) || 0 })}
                              required
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button data-testid="submit-category-button" type="submit" className="bg-blue-600 hover:bg-blue-700">
                            Crear
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Category Dialog */}
                  <Dialog open={editCategoryDialogOpen} onOpenChange={setEditCategoryDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Categoría de Presupuesto</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleUpdateCategory}>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-category-name">Nombre *</Label>
                            <Input
                              id="edit-category-name"
                              value={categoryForm.name}
                              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-category-amount">Monto Asignado *</Label>
                            <Input
                              id="edit-category-amount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={categoryForm.allocated_amount}
                              onChange={(e) => setCategoryForm({ ...categoryForm, allocated_amount: parseFloat(e.target.value) || 0 })}
                              required
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setEditCategoryDialogOpen(false);
                              setCategoryForm({ name: '', allocated_amount: 0 });
                              setEditingCategoryId(null);
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                            Actualizar
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  {categories.map((category) => {
                    const disponible = category.allocated_amount - category.spent_amount;
                    return (
                      <Card key={category.category_id} data-testid={`category-card-${category.category_id}`} className="border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-[#0F172A]">{category.name}</h3>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleEditCategory(category)}
                                title="Editar categoría"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteCategory(category.category_id, category.name)}
                                title="Eliminar categoría"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Gastado</span>
                              <span className="font-mono font-semibold text-red-600">
                                ${category.spent_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Asignado</span>
                              <span className="font-mono font-semibold">
                                ${category.allocated_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600 font-medium">Disponible</span>
                              <span className={`font-mono font-bold ${disponible >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${disponible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <Progress 
                              value={(category.spent_amount / category.allocated_amount) * 100} 
                              className="h-2"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Expenses */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold tracking-tight">Gastos</h2>
                  <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="add-expense-button" size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700" disabled={categories.length === 0}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Registrar Gasto</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateExpense}>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Categoría *</Label>
                            <Select value={expenseForm.category_id} onValueChange={(value) => setExpenseForm({ ...expenseForm, category_id: value })}>
                              <SelectTrigger data-testid="expense-category-select">
                                <SelectValue placeholder="Selecciona categoría" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.category_id} value={cat.category_id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="expense-description">Descripción *</Label>
                            <Input
                              id="expense-description"
                              data-testid="expense-description-input"
                              value={expenseForm.description}
                              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="expense-amount">Monto *</Label>
                            <Input
                              id="expense-amount"
                              data-testid="expense-amount-input"
                              type="number"
                              step="0.01"
                              min="0"
                              value={expenseForm.amount}
                              onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="expense-date">Fecha *</Label>
                            <Input
                              id="expense-date"
                              data-testid="expense-date-input"
                              type="date"
                              value={expenseForm.date}
                              onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setExpenseDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button data-testid="submit-expense-button" type="submit" className="bg-blue-600 hover:bg-blue-700">
                            Registrar
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Expense Dialog */}
                  <Dialog open={editExpenseDialogOpen} onOpenChange={setEditExpenseDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Gasto</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleUpdateExpense}>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Categoría *</Label>
                            <Select value={expenseForm.category_id} onValueChange={(value) => setExpenseForm({ ...expenseForm, category_id: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona categoría" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.category_id} value={cat.category_id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-expense-description">Descripción *</Label>
                            <Input
                              id="edit-expense-description"
                              value={expenseForm.description}
                              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-expense-amount">Monto *</Label>
                            <Input
                              id="edit-expense-amount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={expenseForm.amount}
                              onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-expense-date">Fecha *</Label>
                            <Input
                              id="edit-expense-date"
                              type="date"
                              value={expenseForm.date}
                              onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setEditExpenseDialogOpen(false);
                              setExpenseForm({ category_id: '', description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
                              setEditingExpenseId(null);
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                            Actualizar
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {expenses.length > 0 ? expenses.map((expense) => (
                    <Card key={expense.expense_id} data-testid={`expense-card-${expense.expense_id}`} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-[#0F172A]">{expense.description}</h3>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-slate-600">{expense.date}</span>
                              <Badge variant="outline" className="text-xs">
                                {categories.find(c => c.category_id === expense.category_id)?.name}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right mr-2">
                              <p className="text-lg font-bold font-mono text-[#0F172A]">
                                ${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleEditExpense(expense)}
                                title="Editar gasto"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteExpense(expense.expense_id, expense.description)}
                                title="Eliminar gasto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hay gastos registrados aún</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Budget Chart */}
            {budgetData.length > 0 && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold tracking-tight">Distribución de Gastos por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={budgetData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {budgetData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Labor/Salarios Tab */}
          <TabsContent value="labor" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Salarios del Proyecto</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => exportLaborToExcel(labor, project?.name || 'Proyecto')}
                  disabled={labor.length === 0}
                  title="Exportar a Excel"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => exportLaborToPDF(labor, project?.name || 'Proyecto')}
                  disabled={labor.length === 0}
                  title="Exportar a PDF"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Dialog open={laborDialogOpen} onOpenChange={setLaborDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Registro
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Crear Registro de Salario</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateLabor}>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="labor_category">Persona / Categoría *</Label>
                          <Select 
                            value={laborForm.labor_category} 
                            onValueChange={(value) => {
                              if (value === 'custom') {
                                setLaborForm({ ...laborForm, labor_category: '' });
                              } else {
                                setLaborForm({ ...laborForm, labor_category: value });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una persona o añade personalizado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">✏️ Escribir categoría personalizada</SelectItem>
                              {users.map((user) => (
                                <SelectItem key={user.user_id} value={user.name}>
                                  {user.name} ({user.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(!laborForm.labor_category || laborForm.labor_category === '') && (
                            <Input
                              placeholder="Ej: Consultor Externo, Developer Senior..."
                              value={laborForm.labor_category}
                              onChange={(e) => setLaborForm({ ...laborForm, labor_category: e.target.value })}
                              required
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hours_per_week">Horas por Semana *</Label>
                          <Input
                            id="hours_per_week"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="40"
                            value={laborForm.hours_per_week}
                            onChange={(e) => setLaborForm({ ...laborForm, hours_per_week: parseFloat(e.target.value) || 0 })}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="hourly_rate">Tarifa por Hora *</Label>
                          <Input
                            id="hourly_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="25.00"
                            value={laborForm.hourly_rate}
                            onChange={(e) => setLaborForm({ ...laborForm, hourly_rate: parseFloat(e.target.value) || 0 })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="estimated_total_hours">Total Horas Estimadas *</Label>
                          <Input
                            id="estimated_total_hours"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="160"
                            value={laborForm.estimated_total_hours}
                            onChange={(e) => setLaborForm({ ...laborForm, estimated_total_hours: parseFloat(e.target.value) || 0 })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="consumed_hours">Horas Consumidas</Label>
                          <Input
                            id="consumed_hours"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={laborForm.consumed_hours}
                            onChange={(e) => setLaborForm({ ...laborForm, consumed_hours: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-slate-500">Horas reales trabajadas</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="overtime_hours">Horas Extras</Label>
                          <Input
                            id="overtime_hours"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={laborForm.overtime_hours}
                            onChange={(e) => setLaborForm({ ...laborForm, overtime_hours: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="overtime_rate">Tarifa Horas Extras</Label>
                          <Input
                            id="overtime_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="37.50"
                            value={laborForm.overtime_rate}
                            onChange={(e) => setLaborForm({ ...laborForm, overtime_rate: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expenses">Gastos Adicionales</Label>
                        <Input
                          id="expenses"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={laborForm.expenses}
                          onChange={(e) => setLaborForm({ ...laborForm, expenses: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="comments">Comentarios</Label>
                        <Textarea
                          id="comments"
                          placeholder="Notas adicionales..."
                          value={laborForm.comments}
                          onChange={(e) => setLaborForm({ ...laborForm, comments: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setLaborDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Crear
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Edit Labor Dialog */}
            <Dialog open={editLaborDialogOpen} onOpenChange={setEditLaborDialogOpen}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Editar Registro de Salario</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpdateLabor}>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit_labor_category">Persona / Categoría *</Label>
                          <Select 
                            value={laborForm.labor_category} 
                            onValueChange={(value) => {
                              if (value === 'custom') {
                                setLaborForm({ ...laborForm, labor_category: '' });
                              } else {
                                setLaborForm({ ...laborForm, labor_category: value });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una persona o añade personalizado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">✏️ Escribir categoría personalizada</SelectItem>
                              {users.map((user) => (
                                <SelectItem key={user.user_id} value={user.name}>
                                  {user.name} ({user.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(!laborForm.labor_category || laborForm.labor_category === '') && (
                            <Input
                              placeholder="Ej: Consultor Externo, Developer Senior..."
                              value={laborForm.labor_category}
                              onChange={(e) => setLaborForm({ ...laborForm, labor_category: e.target.value })}
                              required
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit_hours_per_week">Horas por Semana *</Label>
                          <Input
                            id="edit_hours_per_week"
                            type="number"
                            step="0.01"
                            min="0"
                            value={laborForm.hours_per_week}
                            onChange={(e) => setLaborForm({ ...laborForm, hours_per_week: parseFloat(e.target.value) || 0 })}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit_hourly_rate">Tarifa por Hora *</Label>
                          <Input
                            id="edit_hourly_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            value={laborForm.hourly_rate}
                            onChange={(e) => setLaborForm({ ...laborForm, hourly_rate: parseFloat(e.target.value) || 0 })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit_estimated_total_hours">Total Horas Estimadas *</Label>
                          <Input
                            id="edit_estimated_total_hours"
                            type="number"
                            step="0.01"
                            min="0"
                            value={laborForm.estimated_total_hours}
                            onChange={(e) => setLaborForm({ ...laborForm, estimated_total_hours: parseFloat(e.target.value) || 0 })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit_consumed_hours">Horas Consumidas</Label>
                          <Input
                            id="edit_consumed_hours"
                            type="number"
                            step="0.01"
                            min="0"
                            value={laborForm.consumed_hours}
                            onChange={(e) => setLaborForm({ ...laborForm, consumed_hours: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-slate-500">Horas reales trabajadas</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit_overtime_hours">Horas Extras</Label>
                          <Input
                            id="edit_overtime_hours"
                            type="number"
                            step="0.01"
                            min="0"
                            value={laborForm.overtime_hours}
                            onChange={(e) => setLaborForm({ ...laborForm, overtime_hours: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit_overtime_rate">Tarifa Horas Extras</Label>
                          <Input
                            id="edit_overtime_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            value={laborForm.overtime_rate}
                            onChange={(e) => setLaborForm({ ...laborForm, overtime_rate: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_expenses">Gastos Adicionales</Label>
                        <Input
                          id="edit_expenses"
                          type="number"
                          step="0.01"
                          min="0"
                          value={laborForm.expenses}
                          onChange={(e) => setLaborForm({ ...laborForm, expenses: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_comments">Comentarios</Label>
                        <Textarea
                          id="edit_comments"
                          placeholder="Notas adicionales..."
                          value={laborForm.comments}
                          onChange={(e) => setLaborForm({ ...laborForm, comments: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setEditLaborDialogOpen(false);
                          setLaborForm({
                            labor_category: '',
                            hours_per_week: 0,
                            hourly_rate: 0,
                            estimated_total_hours: 0,
                            consumed_hours: 0,
                            overtime_hours: 0,
                            overtime_rate: 0,
                            expenses: 0,
                            comments: ''
                          });
                          setEditingLaborId(null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Actualizar
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Labor Table */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Categoría</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Hrs/Semana</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Tarifa/Hr</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Hrs Estimadas</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase bg-blue-50">Hrs Consumidas</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Hrs Extra</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Tarifa Extra</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Gastos</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Costo Estimado</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase bg-blue-50">Salario Consumido</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {labor.length > 0 ? labor.map((item) => (
                        <tr key={item.labor_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{item.labor_category}</div>
                            {item.comments && (
                              <div className="text-xs text-slate-500 mt-1">{item.comments}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{item.hours_per_week}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">${item.hourly_rate.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{item.estimated_total_hours}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-semibold bg-blue-50 text-blue-700">
                            {item.consumed_hours || 0}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{item.overtime_hours}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">${item.overtime_rate.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">${item.expenses.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-slate-700">
                            ${item.total_cost.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-bold bg-blue-50 text-green-700">
                            ${(item.consumed_cost || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleEditLabor(item)}
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteLabor(item.labor_id, item.labor_category)}
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="11" className="px-4 py-8 text-center text-slate-500">
                            No hay registros de salarios. Añade el primero haciendo clic en "Nuevo Registro".
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {labor.length > 0 && (
                      <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                        <tr>
                          <td colSpan="8" className="px-4 py-3 text-right font-semibold text-slate-700">
                            Totales:
                          </td>
                          <td className="px-4 py-3 text-right font-bold font-mono text-lg text-slate-700">
                            ${labor.reduce((sum, item) => sum + item.total_cost, 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold font-mono text-lg bg-blue-100 text-green-700">
                            ${labor.reduce((sum, item) => sum + (item.consumed_cost || 0), 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timesheet Tab */}
          <TabsContent value="timesheet" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Timesheet - Registro de Horas</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => exportTimesheetToExcel(filteredTimesheet, project?.name || 'Proyecto')}
                  disabled={filteredTimesheet.length === 0}
                  title="Exportar a Excel"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => exportTimesheetToPDF(filteredTimesheet, project?.name || 'Proyecto')}
                  disabled={filteredTimesheet.length === 0}
                  title="Exportar a PDF"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Dialog open={timesheetDialogOpen} onOpenChange={setTimesheetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Registro
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Horas de Trabajo</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTimesheet}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="timesheet_user">Persona *</Label>
                        <Select 
                          value={timesheetForm.user_id} 
                          onValueChange={(value) => {
                            const selectedUser = users.find(u => u.user_id === value);
                            setTimesheetForm({ 
                              ...timesheetForm, 
                              user_id: value,
                              user_name: selectedUser?.name || ''
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una persona" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.user_id} value={user.user_id}>
                                {user.name} ({user.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="timesheet_date">Fecha *</Label>
                          <Input
                            id="timesheet_date"
                            type="date"
                            value={timesheetForm.date}
                            onChange={(e) => setTimesheetForm({ ...timesheetForm, date: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="timesheet_hours">Horas Trabajadas *</Label>
                          <Input
                            id="timesheet_hours"
                            type="number"
                            step="0.25"
                            min="0"
                            max="24"
                            placeholder="8"
                            value={timesheetForm.hours_worked}
                            onChange={(e) => setTimesheetForm({ ...timesheetForm, hours_worked: parseFloat(e.target.value) || 0 })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timesheet_task">Tarea (Opcional)</Label>
                        <Select value={timesheetForm.task_id || "none"} onValueChange={(value) => setTimesheetForm({ ...timesheetForm, task_id: value === "none" ? "" : value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una tarea" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin tarea específica</SelectItem>
                            {tasks.map((task) => (
                              <SelectItem key={task.task_id} value={task.task_id}>
                                {task.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timesheet_description">Descripción del Trabajo *</Label>
                        <Textarea
                          id="timesheet_description"
                          placeholder="Describe qué se trabajó en este periodo..."
                          value={timesheetForm.description}
                          onChange={(e) => setTimesheetForm({ ...timesheetForm, description: e.target.value })}
                          required
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setTimesheetDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Guardar
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Dialog open={editTimesheetDialogOpen} onOpenChange={setEditTimesheetDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Registro de Tiempo</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpdateTimesheet}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_timesheet_user">Persona *</Label>
                        <Select 
                          value={timesheetForm.user_id} 
                          onValueChange={(value) => {
                            const selectedUser = users.find(u => u.user_id === value);
                            setTimesheetForm({ 
                              ...timesheetForm, 
                              user_id: value,
                              user_name: selectedUser?.name || ''
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una persona" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.user_id} value={user.user_id}>
                                {user.name} ({user.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit_timesheet_date">Fecha *</Label>
                          <Input
                            id="edit_timesheet_date"
                            type="date"
                            value={timesheetForm.date}
                            onChange={(e) => setTimesheetForm({ ...timesheetForm, date: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit_timesheet_hours">Horas Trabajadas *</Label>
                          <Input
                            id="edit_timesheet_hours"
                            type="number"
                            step="0.25"
                            min="0"
                            max="24"
                            value={timesheetForm.hours_worked}
                            onChange={(e) => setTimesheetForm({ ...timesheetForm, hours_worked: parseFloat(e.target.value) || 0 })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_timesheet_task">Tarea (Opcional)</Label>
                        <Select value={timesheetForm.task_id || "none"} onValueChange={(value) => setTimesheetForm({ ...timesheetForm, task_id: value === "none" ? "" : value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una tarea" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin tarea específica</SelectItem>
                            {tasks.map((task) => (
                              <SelectItem key={task.task_id} value={task.task_id}>
                                {task.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_timesheet_description">Descripción del Trabajo *</Label>
                        <Textarea
                          id="edit_timesheet_description"
                          placeholder="Describe qué se trabajó en este periodo..."
                          value={timesheetForm.description}
                          onChange={(e) => setTimesheetForm({ ...timesheetForm, description: e.target.value })}
                          required
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setEditTimesheetDialogOpen(false);
                          setTimesheetForm({
                            user_id: '',
                            user_name: '',
                            date: new Date().toISOString().split('T')[0],
                            hours_worked: 0,
                            description: '',
                            task_id: ''
                          });
                          setEditingTimesheetId(null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Actualizar
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Timer Component */}
            <Timer onStop={handleTimerStop} />

            {/* Filter by Employee */}
            <Card className="border-slate-200 shadow-sm mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="filter-user" className="whitespace-nowrap font-semibold">Filtrar por empleado:</Label>
                  <Select value={selectedTimesheetUser} onValueChange={setSelectedTimesheetUser}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los empleados</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto text-sm text-slate-600">
                    <span className="font-semibold">{filteredTimesheet.length}</span> registros
                    {filteredTimesheet.length > 0 && (
                      <span className="ml-4">
                        Total: <span className="font-semibold text-blue-600">
                          {filteredTimesheet.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0).toFixed(2)}h
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Persona</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Horas</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Tarea</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Descripción</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredTimesheet.length > 0 ? filteredTimesheet.map((entry) => (
                        <tr key={entry.timesheet_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{entry.date}</td>
                          <td className="px-4 py-3 text-slate-700">{entry.user_name}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-blue-700">{entry.hours_worked}h</td>
                          <td className="px-4 py-3 text-slate-600 text-sm">
                            {entry.task_id ? tasks.find(t => t.task_id === entry.task_id)?.title || 'N/A' : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-sm">{entry.description}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleEditTimesheet(entry)}
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteTimesheet(entry.timesheet_id, entry.date)}
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                            {selectedTimesheetUser === 'all' 
                              ? 'No hay registros de tiempo. Añade el primero haciendo clic en "Nuevo Registro".' 
                              : 'No hay registros para el empleado seleccionado'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {filteredTimesheet.length > 0 && (
                      <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                        <tr>
                          <td colSpan="2" className="px-4 py-3 text-right font-semibold text-slate-700">
                            Total Horas {selectedTimesheetUser !== 'all' && '(Filtrado)'}:
                          </td>
                          <td className="px-4 py-3 text-right font-bold font-mono text-lg text-blue-700">
                            {filteredTimesheet.reduce((sum, entry) => sum + entry.hours_worked, 0).toFixed(2)}h
                          </td>
                          <td colSpan="3"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold tracking-tight">Documentos del Proyecto</CardTitle>
                  <div>
                    <input
                      type="file"
                      id="file-upload"
                      data-testid="file-upload-input"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                    <Button
                      data-testid="upload-document-button"
                      onClick={() => document.getElementById('file-upload').click()}
                      disabled={uploadingFile}
                      className="rounded-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingFile ? 'Subiendo...' : 'Subir Documento'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc) => {
                      const getFileIcon = (fileType) => {
                        if (fileType.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-blue-600" />;
                        if (fileType.includes('pdf')) return <FileText className="w-8 h-8 text-red-600" />;
                        if (fileType.includes('word') || fileType.includes('document')) return <FileText className="w-8 h-8 text-blue-600" />;
                        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileText className="w-8 h-8 text-green-600" />;
                        return <File className="w-8 h-8 text-slate-600" />;
                      };

                      const formatFileSize = (bytes) => {
                        if (bytes < 1024) return bytes + ' B';
                        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
                        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
                      };

                      return (
                        <Card
                          key={doc.document_id}
                          data-testid={`document-card-${doc.document_id}`}
                          className="border-slate-200 hover:border-blue-300 transition-colors"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                {getFileIcon(doc.file_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-[#0F172A] truncate mb-1" title={doc.original_filename}>
                                  {doc.original_filename}
                                </h3>
                                <p className="text-xs text-slate-500 mb-2">{formatFileSize(doc.file_size)}</p>
                                <p className="text-xs text-slate-600 mb-3">
                                  Subido por <span className="font-medium">{doc.uploaded_by_name}</span>
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDownloadDocument(doc.document_id, doc.original_filename)}
                                    data-testid={`download-document-${doc.document_id}`}
                                    className="text-xs"
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Descargar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteDocument(doc.document_id)}
                                    data-testid={`delete-document-${doc.document_id}`}
                                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Eliminar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">No hay documentos subidos aún</p>
                    <p className="text-sm">Sube contratos, diseños, especificaciones y otros archivos del proyecto</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Project Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-semibold tracking-tight">Bitácora del Proyecto</CardTitle>
                <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
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
                              <SelectItem value="work">Trabajo Realizado</SelectItem>
                              <SelectItem value="update">Actualización</SelectItem>
                              <SelectItem value="problem">Problema</SelectItem>
                              <SelectItem value="milestone">Hito/Milestone</SelectItem>
                              <SelectItem value="note">Nota General</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Horas Trabajadas</Label>
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
                          placeholder="Resumen breve del registro"
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
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => { setLogDialogOpen(false); resetLogForm(); }}>
                          Cancelar
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                          {editingLogId ? 'Actualizar' : 'Guardar'} Registro
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {/* Filter by type */}
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm text-slate-600">Filtrar por tipo:</span>
                  <div className="flex gap-2">
                    {['all', 'work', 'update', 'problem', 'milestone', 'note'].map(type => (
                      <Button
                        key={type}
                        variant={logTypeFilter === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLogTypeFilter(type)}
                        className={logTypeFilter === type ? 'bg-blue-600' : ''}
                      >
                        {type === 'all' ? 'Todos' : 
                         type === 'work' ? 'Trabajo' :
                         type === 'update' ? 'Actualización' :
                         type === 'problem' ? 'Problema' :
                         type === 'milestone' ? 'Hito' : 'Nota'}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Logs list */}
                <div className="space-y-4">
                  {projectLogs.filter(l => logTypeFilter === 'all' || l.log_type === logTypeFilter).length > 0 ? (
                    projectLogs
                      .filter(l => logTypeFilter === 'all' || l.log_type === logTypeFilter)
                      .map(log => (
                        <div key={log.log_id} className={`p-4 rounded-lg border ${
                          log.log_type === 'problem' ? 'bg-red-50 border-red-200' :
                          log.log_type === 'milestone' ? 'bg-green-50 border-green-200' :
                          log.log_type === 'work' ? 'bg-blue-50 border-blue-200' :
                          'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={
                                  log.log_type === 'work' ? 'bg-blue-100 text-blue-700' :
                                  log.log_type === 'update' ? 'bg-purple-100 text-purple-700' :
                                  log.log_type === 'problem' ? 'bg-red-100 text-red-700' :
                                  log.log_type === 'milestone' ? 'bg-green-100 text-green-700' :
                                  'bg-slate-100 text-slate-700'
                                }>
                                  {log.log_type === 'work' ? 'Trabajo' :
                                   log.log_type === 'update' ? 'Actualización' :
                                   log.log_type === 'problem' ? 'Problema' :
                                   log.log_type === 'milestone' ? 'Hito' : 'Nota'}
                                </Badge>
                                <h4 className="font-semibold">{log.title}</h4>
                                {log.hours_worked > 0 && (
                                  <Badge variant="outline" className="ml-2">
                                    {log.hours_worked}h
                                  </Badge>
                                )}
                              </div>
                              <p className="text-slate-700 whitespace-pre-wrap">{log.description}</p>
                              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                  <User className="w-4 h-4" /> {log.user_name}
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
                                className="text-slate-600 hover:text-blue-600"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLog(log.log_id)}
                                className="text-slate-600 hover:text-red-600"
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
                      <p className="text-sm mt-2">Crea el primer registro para documentar el progreso del proyecto</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Required Documents Tab */}
          <TabsContent value="required-docs" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documentos que el Cliente Debe Enviar</CardTitle>
                </CardHeader>
                <CardContent>
                  {requiredDocsFromClient.length === 0 ? (
                    <p className="text-slate-500 text-sm">No hay documentos configurados. Ve a Configuración para agregar.</p>
                  ) : (
                    <div className="space-y-2">
                      {requiredDocsFromClient.map(doc => (
                        <div key={doc.document_id} className="flex items-center gap-3 p-3 border rounded hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={projectDocStatus[doc.document_id] || false}
                            onChange={() => toggleDocumentStatus(doc.document_id, 'from_client')}
                            className="w-5 h-5 cursor-pointer"
                          />
                          <span className={projectDocStatus[doc.document_id] ? 'line-through text-slate-500' : ''}>
                            {doc.document_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documentos que Debo Enviar al Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  {requiredDocsToClient.length === 0 ? (
                    <p className="text-slate-500 text-sm">No hay documentos configurados. Ve a Configuración para agregar.</p>
                  ) : (
                    <div className="space-y-2">
                      {requiredDocsToClient.map(doc => (
                        <div key={doc.document_id} className="flex items-center gap-3 p-3 border rounded hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={projectDocStatus[doc.document_id] || false}
                            onChange={() => toggleDocumentStatus(doc.document_id, 'to_client')}
                            className="w-5 h-5 cursor-pointer"
                          />
                          <span className={projectDocStatus[doc.document_id] ? 'line-through text-slate-500' : ''}>
                            {doc.document_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">Comentarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleAddComment} className="space-y-4">
                  <Textarea
                    data-testid="comment-input"
                    placeholder="Escribe un comentario..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                  />
                  <Button data-testid="submit-comment-button" type="submit" className="rounded-full bg-blue-600 hover:bg-blue-700">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Agregar Comentario
                  </Button>
                </form>

                <div className="space-y-4">
                  {comments.length > 0 ? comments.map((comment) => (
                    <Card key={comment.comment_id} data-testid={`comment-${comment.comment_id}`} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="font-semibold text-blue-600 text-sm">
                              {comment.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-[#0F172A]">{comment.user_name}</span>
                              <span className="text-xs text-slate-500">
                                {new Date(comment.timestamp).toLocaleDateString('es-MX', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-slate-700">{comment.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hay comentarios aún</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ProjectDetail;
