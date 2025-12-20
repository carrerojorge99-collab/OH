import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Activity } from 'lucide-react';
import { toast } from 'sonner';


const Reports = () => {
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('budget');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        api.get(`/projects`, { withCredentials: true }),
        api.get(`/tasks`, { withCredentials: true })
      ]);
      
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
      
      // Load expenses for all projects
      const allExpenses = [];
      for (const project of projectsRes.data) {
        try {
          const expensesRes = await api.get(`/expenses?project_id=${project.project_id}`, { withCredentials: true });
          allExpenses.push(...expensesRes.data.map(e => ({ ...e, project_name: project.name })));
        } catch (err) {
          console.error('Error loading expenses:', err);
        }
      }
      setExpenses(allExpenses);
      
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Comparativa entre proyectos
  const projectComparison = projects.map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    presupuesto: p.budget_total,
    gastado: p.budget_spent,
    valor: p.project_value || 0,
    ganancia: (p.project_value || 0) - p.budget_spent,
    progreso: tasks.filter(t => t.project_id === p.project_id && t.status === 'done').length / Math.max(tasks.filter(t => t.project_id === p.project_id).length, 1) * 100
  }));

  // Análisis de tendencias de gastos (por mes)
  const expensesByMonth = expenses.reduce((acc, expense) => {
    const month = expense.date.substring(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = 0;
    }
    acc[month] += expense.amount;
    return acc;
  }, {});

  const expenseTrend = Object.entries(expensesByMonth)
    .sort()
    .map(([month, amount]) => ({
      mes: new Date(month + '-01').toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }),
      gastos: amount
    }));

  // Proyección de finalización basada en progreso
  const projectProjections = projects.map(p => {
    const projectTasks = tasks.filter(t => t.project_id === p.project_id);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(t => t.status === 'done').length;
    const avgProgress = projectTasks.reduce((sum, t) => sum + t.progress, 0) / Math.max(totalTasks, 1);
    
    const startDate = new Date(p.start_date);
    const endDate = new Date(p.end_date);
    const today = new Date();
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const daysElapsed = Math.max(0, (today - startDate) / (1000 * 60 * 60 * 24));
    const expectedProgress = (daysElapsed / totalDays) * 100;
    
    const projectedEndDate = new Date(startDate.getTime() + (totalDays * (100 / Math.max(avgProgress, 1))) * 24 * 60 * 60 * 1000);
    const daysDelay = Math.round((projectedEndDate - endDate) / (1000 * 60 * 60 * 24));
    
    return {
      name: p.name,
      progreso_real: avgProgress,
      progreso_esperado: expectedProgress,
      dias_retraso: daysDelay,
      fecha_fin_original: p.end_date,
      fecha_fin_proyectada: projectedEndDate.toISOString().split('T')[0]
    };
  });

  // Velocidad del equipo (tareas completadas por semana)
  const tasksByWeek = tasks.reduce((acc, task) => {
    if (task.status === 'done') {
      const week = new Date(task.updated_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
      acc[week] = (acc[week] || 0) + 1;
    }
    return acc;
  }, {});

  const teamVelocity = Object.entries(tasksByWeek)
    .slice(-8)
    .map(([week, count]) => ({
      semana: week,
      tareas: count
    }));

  // ROI por proyecto
  const projectROI = projects.map(p => ({
    name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
    roi: p.project_value > 0 ? ((p.project_value - p.budget_spent) / p.project_value * 100).toFixed(1) : 0
  })).sort((a, b) => b.roi - a.roi);

  const COLORS = ['#2563EB', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#06B6D4', '#F59E0B'];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Generando reportes...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 fade-in">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">Reportes Avanzados</h1>
          <p className="text-muted-foreground mt-2">Análisis detallado de proyectos, gastos y desempeño</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">ROI Promedio</p>
                  <p className="text-3xl font-bold">
                    {(projectROI.reduce((sum, p) => sum + parseFloat(p.roi), 0) / Math.max(projectROI.length, 1)).toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Proyectos a Tiempo</p>
                  <p className="text-3xl font-bold">
                    {projectProjections.filter(p => p.dias_retraso <= 0).length}/{projects.length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Gasto Total</p>
                  <p className="text-2xl font-bold font-mono">
                    ${expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Velocidad del Equipo</p>
                  <p className="text-3xl font-bold">
                    {(teamVelocity.reduce((sum, v) => sum + v.tareas, 0) / Math.max(teamVelocity.length, 1)).toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-500">tareas/semana</p>
                </div>
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparativa entre Proyectos */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold tracking-tight">Comparativa entre Proyectos</CardTitle>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">Presupuesto vs Gastado</SelectItem>
                  <SelectItem value="profit">Valor vs Ganancia</SelectItem>
                  <SelectItem value="progress">Progreso de Tareas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {selectedMetric === 'budget' && (
                  <>
                    <Bar dataKey="presupuesto" fill="#2563EB" name="Presupuesto" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="gastado" fill="#EF4444" name="Gastado" radius={[8, 8, 0, 0]} />
                  </>
                )}
                {selectedMetric === 'profit' && (
                  <>
                    <Bar dataKey="valor" fill="#10B981" name="Valor" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="ganancia" fill="#8B5CF6" name="Ganancia" radius={[8, 8, 0, 0]} />
                  </>
                )}
                {selectedMetric === 'progress' && (
                  <Bar dataKey="progreso" fill="#F97316" name="Progreso %" radius={[8, 8, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tendencias y Proyecciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tendencia de Gastos */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight">Tendencia de Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={expenseTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} />
                  <Line type="monotone" dataKey="gastos" stroke="#EF4444" strokeWidth={3} dot={{ fill: '#EF4444', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ROI por Proyecto */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight">ROI por Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectROI} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="roi" fill="#10B981" radius={[0, 8, 8, 0]}>
                    {projectROI.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.roi > 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Proyección de Finalización */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tight">Proyección de Finalización de Proyectos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectProjections.map((proj, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#0F172A] mb-2">{proj.name}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Progreso Real:</span>
                        <span className="ml-2 font-semibold">{proj.progreso_real.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Esperado:</span>
                        <span className="ml-2 font-semibold">{proj.progreso_esperado.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Fin Original:</span>
                        <span className="ml-2 font-semibold">{proj.fecha_fin_original}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Proyectado:</span>
                        <span className={`ml-2 font-semibold ${proj.dias_retraso > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {proj.fecha_fin_proyectada}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    {proj.dias_retraso > 0 ? (
                      <div className="flex items-center text-red-600">
                        <TrendingDown className="w-5 h-5 mr-1" />
                        <span className="font-semibold">+{proj.dias_retraso}d</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-green-600">
                        <TrendingUp className="w-5 h-5 mr-1" />
                        <span className="font-semibold">A tiempo</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Velocidad del Equipo */}
        {teamVelocity.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight">Velocidad del Equipo (Burn-down)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={teamVelocity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="tareas" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6', r: 5 }} name="Tareas Completadas" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
