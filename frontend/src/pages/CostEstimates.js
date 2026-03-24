import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import useFinancialPermissions from '../hooks/useFinancialPermissions';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, FileText, DollarSign, Trash2, Pencil, Calendar, RefreshCw, Clock, CheckCircle, Calculator, Copy, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');


const CostEstimates = () => {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  // Filters
  const [yearFilter, setYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [yearInitialized, setYearInitialized] = useState(false);
  
  // Get user role for permission checks
  const { user } = useAuth();
  const { showMoney } = useFinancialPermissions();

  // Generate available years from estimates
  const availableYears = useMemo(() => {
    const years = new Set();
    estimates.forEach(e => {
      if (e.created_at) {
        years.add(new Date(e.created_at).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [estimates]);

  // Filter estimates by year, status and search
  const filteredEstimates = useMemo(() => {
    return estimates.filter(e => {
      // Year filter
      if (yearFilter !== 'all') {
        const year = e.created_at ? new Date(e.created_at).getFullYear() : new Date().getFullYear();
        if (year !== parseInt(yearFilter)) return false;
      }
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'final' && e.status !== 'final') return false;
        if (statusFilter === 'en_proceso' && e.status === 'final') return false;
      }
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const name = (e.estimate_name || '').toLowerCase();
        const number = (e.estimate_number || '').toLowerCase();
        const project = (e.project_name || '').toLowerCase();
        if (!name.includes(search) && !number.includes(search) && !project.includes(search)) {
          return false;
        }
      }
      return true;
    });
  }, [estimates, yearFilter, statusFilter, searchTerm]);

  // Auto-set year filter to current year if available
  useEffect(() => {
    if (!yearInitialized && estimates.length > 0) {
      const currentYear = new Date().getFullYear();
      if (availableYears.includes(currentYear)) {
        setYearFilter(currentYear.toString());
      }
      setYearInitialized(true);
    }
  }, [estimates, availableYears, yearInitialized]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [estimatesRes, projectsRes] = await Promise.all([
        api.get(`/cost-estimates?_t=${Date.now()}`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        api.get(`/projects`, { withCredentials: true })
      ]);
      
      setEstimates(estimatesRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar estimaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (estimateId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta estimación?')) return;

    try {
      await api.delete(`/cost-estimates/${estimateId}`, {
        withCredentials: true
      });
      toast.success('Estimación eliminada');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar estimación');
    }
  };

  const handleClone = async (estimateId, estimateName) => {
    try {
      const res = await api.post(`/cost-estimates/${estimateId}/clone`, {}, {
        withCredentials: true
      });
      toast.success(`Estimación "${estimateName}" clonada como "${res.data.estimate_name}"`);
      loadData();
      // Navigate to the new estimate
      navigate(`/cost-estimates/${res.data.estimate_id}`);
    } catch (error) {
      console.error('Error cloning estimate:', error);
      toast.error(error.response?.data?.detail || 'Error al clonar estimación');
    }
  };

  const clearFilters = () => {
    setYearFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
  };

  const hasActiveFilters = yearFilter !== 'all' || statusFilter !== 'all' || searchTerm !== '';

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.project_id === projectId);
    return project ? project.name : 'Proyecto no encontrado';
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-center text-slate-500">Cargando estimaciones...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Estimaciones de Costos</h1>
            <p className="text-slate-600 mt-1">
              Gestiona las estimaciones de costos de tus proyectos
              {hasActiveFilters && <span className="text-blue-600 font-medium"> - {filteredEstimates.length} resultados</span>}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Button 
              variant="outline" 
              onClick={() => { setLoading(true); loadData(); }}
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => navigate('/cost-estimates/new')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Estimación
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, número o proyecto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Year Filter */}
              <Select value={yearFilter} onValueChange={setYearFilter}>
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

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="en_proceso">En Proceso</SelectItem>
                  <SelectItem value="final">Finalizadas</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="text-slate-500">
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {estimates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Total Cotizado */}
            {showMoney && (
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Total Cotizado</p>
                      <p className="text-xl font-bold text-blue-800">
                        ${filteredEstimates.reduce((sum, e) => sum + (e.grand_total || 0), 0).toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Total Estimaciones */}
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-500 rounded-lg">
                    <Calculator className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Total Estimaciones</p>
                    <p className="text-xl font-bold text-slate-800">
                      {filteredEstimates.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* En Proceso */}
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 font-medium">En Proceso</p>
                    <p className="text-xl font-bold text-amber-800">
                      {filteredEstimates.filter(e => e.status !== 'final').length}
                      {showMoney && (
                        <span className="text-sm font-normal ml-2">
                          (${filteredEstimates.filter(e => e.status !== 'final').reduce((sum, e) => sum + (e.grand_total || 0), 0).toLocaleString('es-PR', { minimumFractionDigits: 0 })})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Finalizadas */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-medium">Finalizadas</p>
                    <p className="text-xl font-bold text-green-800">
                      {filteredEstimates.filter(e => e.status === 'final').length}
                      {showMoney && (
                        <span className="text-sm font-normal ml-2">
                          (${filteredEstimates.filter(e => e.status === 'final').reduce((sum, e) => sum + (e.grand_total || 0), 0).toLocaleString('es-PR', { minimumFractionDigits: 0 })})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {filteredEstimates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No hay estimaciones creadas
              </h3>
              <p className="text-slate-500 mb-6">
                Crea tu primera estimación de costos para un proyecto
              </p>
              <Button
                onClick={() => navigate('/cost-estimates/new')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Crear Estimación
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEstimates.map((estimate) => (
              <Card key={estimate.estimate_id} className="hover:shadow-lg transition-shadow group">
                <CardContent className="p-4">
                  {/* Header with status badge */}
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={`text-xs ${estimate.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {estimate.status === 'final' ? 'Final' : 'En Proceso'}
                    </Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => navigate(`/cost-estimates/${estimate.estimate_id || estimate.cost_estimate_id}`)}
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                        onClick={() => handleClone(estimate.estimate_id, estimate.estimate_name)}
                        title="Clonar estimación"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(estimate.estimate_id)}
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-sm font-semibold text-slate-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                    {estimate.estimate_name}
                  </h3>
                  
                  {/* Project badge */}
                  {estimate.project_id && (
                    <Badge variant="outline" className="text-xs mb-3 truncate max-w-full">
                      {getProjectName(estimate.project_id)}
                    </Badge>
                  )}
                  
                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-auto pt-2 border-t border-slate-100">
                    <Calendar className="w-3 h-3" />
                    {moment(estimate.created_at).format('DD MMM YYYY')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CostEstimates;
