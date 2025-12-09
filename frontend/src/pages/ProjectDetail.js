import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  DollarSign, Calendar, Tag, MessageSquare, Trash2, Pencil, TrendingUp, TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

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

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'planning',
    priority: 'medium',
    budget_total: 0,
    project_value: 0
  });

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

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
        project_value: project.project_value || 0
      });
    }
  }, [project]);

  const loadProjectData = async () => {
    try {
      const [projectRes, tasksRes, categoriesRes, expensesRes, commentsRes, statsRes] = await Promise.all([
        axios.get(`${API}/projects/${projectId}`, { withCredentials: true }),
        axios.get(`${API}/tasks?project_id=${projectId}`, { withCredentials: true }),
        axios.get(`${API}/budget/categories?project_id=${projectId}`, { withCredentials: true }),
        axios.get(`${API}/expenses?project_id=${projectId}`, { withCredentials: true }),
        axios.get(`${API}/comments?project_id=${projectId}`, { withCredentials: true }),
        axios.get(`${API}/projects/${projectId}/stats`, { withCredentials: true })
      ]);
      
      setProject(projectRes.data);
      setTasks(tasksRes.data);
      setCategories(categoriesRes.data);
      setExpenses(expensesRes.data);
      setComments(commentsRes.data);
      setStats(statsRes.data);
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
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="tasks" data-testid="tasks-tab">Tareas</TabsTrigger>
            <TabsTrigger value="budget" data-testid="budget-tab">Presupuesto</TabsTrigger>
            <TabsTrigger value="comments" data-testid="comments-tab">Comentarios</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold tracking-tight">Tareas</h2>
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
                    <div className="space-y-2">
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
                      {task.due_date && (
                        <div className="flex items-center text-xs text-slate-600">
                          <Calendar className="w-3 h-3 mr-1" />
                          {task.due_date}
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">Progreso</span>
                          <span className="font-medium">{task.progress}%</span>
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
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-6">
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
                </div>

                <div className="space-y-3">
                  {categories.map((category) => (
                    <Card key={category.category_id} data-testid={`category-card-${category.category_id}`} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-[#0F172A]">{category.name}</h3>
                          <Tag className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Gastado</span>
                            <span className="font-mono font-semibold">
                              ${category.spent_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Asignado</span>
                            <span className="font-mono font-semibold">
                              ${category.allocated_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <Progress 
                            value={(category.spent_amount / category.allocated_amount) * 100} 
                            className="h-2"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {expenses.length > 0 ? expenses.map((expense) => (
                    <Card key={expense.expense_id} data-testid={`expense-card-${expense.expense_id}`} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-[#0F172A]">{expense.description}</h3>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-slate-600">{expense.date}</span>
                              <Badge variant="outline" className="text-xs">
                                {categories.find(c => c.category_id === expense.category_id)?.name}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold font-mono text-[#0F172A]">
                              ${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
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
