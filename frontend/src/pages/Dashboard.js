import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FolderKanban, CheckCircle2, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, projectsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { withCredentials: true }),
        axios.get(`${API}/projects`, { withCredentials: true })
      ]);
      
      setStats(statsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos del dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Cargando dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    {
      title: 'Total Proyectos',
      value: stats?.total_projects || 0,
      icon: FolderKanban,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      testId: 'stat-total-projects'
    },
    {
      title: 'Proyectos Activos',
      value: stats?.active_projects || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      testId: 'stat-active-projects'
    },
    {
      title: 'Proyectos Completados',
      value: stats?.completed_projects || 0,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      testId: 'stat-completed-projects'
    },
    {
      title: 'Ganancia Total',
      value: `$${(stats?.total_profit || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: stats?.total_profit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: stats?.total_profit >= 0 ? 'bg-green-50' : 'bg-red-50',
      testId: 'stat-total-profit',
      isCurrency: true
    }
  ];

  const budgetData = [
    { name: 'Gastado', value: stats?.total_spent || 0, color: '#EF4444' },
    { name: 'Disponible', value: stats?.budget_remaining || 0, color: '#10B981' }
  ];

  const projectsByStatus = projects.reduce((acc, project) => {
    const status = project.status;
    const existing = acc.find(item => item.name === status);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: status, value: 1 });
    }
    return acc;
  }, []);

  const COLORS = ['#2563EB', '#F97316', '#10B981', '#8B5CF6', '#EF4444'];

  return (
    <Layout>
      <div className="space-y-8 fade-in">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Resumen general de tus proyectos y presupuestos</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card key={index} data-testid={stat.testId} className="stat-card border-slate-200 shadow-sm hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                    <p className={`text-3xl font-bold tracking-tight ${stat.isCurrency ? 'font-mono' : ''}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget Chart */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight">Distribución de Presupuesto</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.total_budget > 0 ? (
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
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>No hay datos de presupuesto disponibles</p>
                </div>
              )}
              <div className="flex items-center justify-around mt-6 pt-6 border-t border-slate-200">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-medium text-slate-600">Gastado</p>
                  </div>
                  <p className="text-2xl font-bold font-mono text-[#0F172A]">
                    ${(stats?.total_spent || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-slate-600">Disponible</p>
                  </div>
                  <p className="text-2xl font-bold font-mono text-[#0F172A]">
                    ${(stats?.budget_remaining || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects by Status */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight">Proyectos por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              {projectsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563EB" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>No hay proyectos disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tight">Proyectos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
              <div className="space-y-4">
                {projects.slice(0, 5).map((project) => (
                  <div
                    key={project.project_id}
                    data-testid={`recent-project-${project.project_id}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/projects/${project.project_id}`}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#0F172A]">{project.name}</h3>
                      <p className="text-sm text-slate-600 line-clamp-1">{project.description}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-600">Presupuesto</p>
                        <p className="text-lg font-bold font-mono text-[#0F172A]">
                          ${project.budget_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.status === 'completed' ? 'bg-green-100 text-green-700' :
                        project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        project.status === 'planning' ? 'bg-purple-100 text-purple-700' :
                        project.status === 'on_hold' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay proyectos creados aún</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
