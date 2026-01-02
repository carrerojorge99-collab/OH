import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import PWAInstallBanner from '../components/PWAInstallBanner';
import AlertsBanner from '../components/AlertsBanner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FolderKanban, CheckCircle2, Clock, DollarSign, TrendingUp, TrendingDown, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';


const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  // Start with 'all' and update to current year if data exists
  const [selectedYear, setSelectedYear] = useState('all');
  const [yearInitialized, setYearInitialized] = useState(false);

  // Generate list of available years from projects
  const availableYears = useMemo(() => {
    const years = new Set();
    projects.forEach(p => {
      if (p.start_date) {
        years.add(new Date(p.start_date).getFullYear());
      }
      if (p.created_at) {
        years.add(new Date(p.created_at).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [projects]);

  // Auto-set year filter to current year if available
  useEffect(() => {
    if (!yearInitialized && projects.length > 0) {
      const currentYear = new Date().getFullYear();
      if (availableYears.includes(currentYear)) {
        setSelectedYear(currentYear.toString());
      }
      setYearInitialized(true);
    }
  }, [projects, availableYears, yearInitialized]);

  // Filter projects by selected year
  const filteredProjects = useMemo(() => {
    if (selectedYear === 'all') return projects;
    return projects.filter(p => {
      const projectYear = p.start_date 
        ? new Date(p.start_date).getFullYear() 
        : new Date(p.created_at).getFullYear();
      return projectYear === parseInt(selectedYear);
    });
  }, [projects, selectedYear]);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadDashboardData();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, projectsRes] = await Promise.all([
        api.get(`/dashboard/stats`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        api.get(`/projects`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } })
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

  // Calculate filtered stats based on selected year
  const filteredStats = useMemo(() => {
    if (selectedYear === 'all') return stats;
    
    const totalProjects = filteredProjects.length;
    const activeProjects = filteredProjects.filter(p => p.status === 'in_progress').length;
    const completedProjects = filteredProjects.filter(p => p.status === 'completed').length;
    const totalSpent = filteredProjects.reduce((sum, p) => sum + (p.budget_spent || 0), 0);
    const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.budget_total || 0), 0);
    const totalValue = filteredProjects.reduce((sum, p) => sum + (p.project_value || 0), 0);
    const totalProfit = totalValue - totalSpent;
    
    return {
      total_projects: totalProjects,
      active_projects: activeProjects,
      completed_projects: completedProjects,
      total_spent: totalSpent,
      budget_remaining: totalBudget - totalSpent,
      total_profit: totalProfit
    };
  }, [stats, filteredProjects, selectedYear]);

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
      value: filteredStats?.total_projects || 0,
      icon: FolderKanban,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      testId: 'stat-total-projects'
    },
    {
      title: 'Proyectos Activos',
      value: filteredStats?.active_projects || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      testId: 'stat-active-projects'
    },
    {
      title: 'Proyectos Completados',
      value: filteredStats?.completed_projects || 0,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      testId: 'stat-completed-projects'
    },
    {
      title: 'Ganancia Total',
      value: `$${(filteredStats?.total_profit || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: filteredStats?.total_profit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: filteredStats?.total_profit >= 0 ? 'bg-green-50' : 'bg-red-50',
      testId: 'stat-total-profit',
      isCurrency: true
    }
  ];

  const budgetData = [
    { name: 'Gastado', value: filteredStats?.total_spent || 0, color: '#EF4444' },
    { name: 'Disponible', value: filteredStats?.budget_remaining || 0, color: '#10B981' }
  ];

  const projectsByStatus = filteredProjects.reduce((acc, project) => {
    const status = project.status;
    const existing = acc.find(item => item.name === status);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: status, value: 1 });
    }
    return acc;
  }, []);

  // Payment Status Data
  const projectsByPaymentStatus = filteredProjects.reduce((acc, project) => {
    const status = project.payment_status || 'pending';
    const statusLabels = {
      'pending': 'Pendiente',
      'partial': 'Parcial',
      'paid': 'Pagado'
    };
    const statusName = statusLabels[status] || status;
    const existing = acc.find(item => item.name === statusName);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: statusName, value: 1 });
    }
    return acc;
  }, []);

  // ROI Data (Top 5 projects by profit margin)
  const projectsWithROI = filteredProjects
    .map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
      roi: p.project_value > 0 ? ((p.profit / p.project_value) * 100) : 0,
      profit: p.profit
    }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);

  // Budget Progress Data (Top 5 projects by budget usage)
  const projectsBudgetProgress = filteredProjects
    .filter(p => p.budget_total > 0)
    .map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      gastado: p.budget_spent || 0,
      asignado: p.budget_total
    }))
    .slice(0, 5);

  // On-Time Projects Analysis
  const today = new Date();
  const onTimeAnalysis = filteredProjects.reduce((acc, project) => {
    if (project.status === 'completed') {
      acc.completed += 1;
    } else if (project.end_date) {
      const endDate = new Date(project.end_date);
      if (endDate < today) {
        acc.overdue += 1;
      } else {
        acc.onTrack += 1;
      }
    } else {
      acc.noDate += 1;
    }
    return acc;
  }, { onTrack: 0, overdue: 0, completed: 0, noDate: 0 });

  const onTimeData = [
    { name: 'En Progreso', value: onTimeAnalysis.onTrack, color: '#10B981' },
    { name: 'Retrasados', value: onTimeAnalysis.overdue, color: '#EF4444' },
    { name: 'Completados', value: onTimeAnalysis.completed, color: '#2563EB' }
  ].filter(item => item.value > 0);

  const COLORS = ['#2563EB', '#F97316', '#10B981', '#8B5CF6', '#EF4444'];

  return (
    <Layout>
      <PWAInstallBanner />
      
      <div className="space-y-6 md:space-y-8 fade-in">
        {/* Alertas */}
        <AlertsBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#0F172A]">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Resumen general de tus proyectos y presupuestos
              {selectedYear !== 'all' && <span className="text-blue-600 font-medium"> - Año {selectedYear}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los años</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => { setLoading(true); loadDashboardData(); }}
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Quick Timesheet for Mobile */}
        <div className="lg:hidden">
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {statCards.map((stat, index) => (
            <Card key={index} data-testid={stat.testId} className="stat-card border-slate-200 shadow-sm hover:shadow-md">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1 truncate">{stat.title}</p>
                    <p className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight ${stat.isCurrency ? 'font-mono text-sm sm:text-base md:text-xl lg:text-2xl' : ''}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-full ${stat.bgColor} flex-shrink-0`}>
                    <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Budget Chart */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold tracking-tight">Distribución de Presupuesto</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              {stats?.total_budget > 0 ? (
                <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                  <PieChart>
                    <Pie
                      data={budgetData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
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
                <div className="flex items-center justify-center h-[200px] sm:h-[300px] text-muted-foreground">
                  <p className="text-sm sm:text-base">No hay datos de presupuesto disponibles</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-around mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-200 gap-4 sm:gap-0">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <p className="text-xs sm:text-sm font-medium text-slate-600">Gastado</p>
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-[#0F172A]">
                    ${(stats?.total_spent || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <p className="text-xs sm:text-sm font-medium text-slate-600">Disponible</p>
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-[#0F172A]">
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

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Status */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight">Estados de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              {projectsByPaymentStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projectsByPaymentStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectsByPaymentStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>No hay datos de pago disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* On-Time Projects */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight">Proyectos a Tiempo</CardTitle>
            </CardHeader>
            <CardContent>
              {onTimeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={onTimeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {onTimeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>No hay proyectos activos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ROI Chart */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight">Top 5 ROI por Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              {projectsWithROI.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectsWithROI} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'roi') return [`${value.toFixed(2)}%`, 'ROI'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="roi" fill="#10B981" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>No hay datos de ROI disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Progress */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight">Progreso de Presupuesto</CardTitle>
            </CardHeader>
            <CardContent>
              {projectsBudgetProgress.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectsBudgetProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} />
                    <Legend />
                    <Bar dataKey="gastado" fill="#EF4444" name="Gastado" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="asignado" fill="#10B981" name="Asignado" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>No hay datos de presupuesto disponibles</p>
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
