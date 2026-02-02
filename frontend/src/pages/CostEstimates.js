import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import useFinancialPermissions from '../hooks/useFinancialPermissions';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, FileText, DollarSign, Trash2, Pencil, Calendar, RefreshCw, Clock, CheckCircle, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');


const CostEstimates = () => {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  // Start with 'all' and update to current year if data exists
  const [yearFilter, setYearFilter] = useState('all');
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

  // Filter estimates by year
  const filteredEstimates = useMemo(() => {
    if (yearFilter === 'all') return estimates;
    return estimates.filter(e => {
      const year = e.created_at ? new Date(e.created_at).getFullYear() : new Date().getFullYear();
      return year === parseInt(yearFilter);
    });
  }, [estimates, yearFilter]);

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
              {yearFilter !== 'all' && <span className="text-blue-600 font-medium"> - Año {yearFilter}</span>}
            </p>
          </div>
          <div className="flex gap-2 items-center">
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
          <div className="grid gap-4">
            {filteredEstimates.map((estimate) => (
              <Card key={estimate.estimate_id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-slate-900">
                          {estimate.estimate_name}
                        </h3>
                        {estimate.project_id && (
                          <Badge variant="outline" className="text-xs">
                            {getProjectName(estimate.project_id)}
                          </Badge>
                        )}
                        <Badge className={estimate.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                          {estimate.status === 'final' ? 'Final' : 'En Proceso'}
                        </Badge>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-xs text-slate-500">Creada</p>
                        <p className="text-sm text-slate-700">
                          {moment(estimate.created_at).format('DD MMM YYYY')}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/cost-estimates/${estimate.estimate_id}`)}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(estimate.estimate_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
