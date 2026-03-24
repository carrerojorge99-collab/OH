import React, { useState, useEffect, useMemo } from 'react';
import api, { getBackendUrl } from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import useFinancialPermissions from '../hooks/useFinancialPermissions';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Plus, Building2, User, Search, FileText, ChevronRight, 
  Mail, Phone, DollarSign, Eye, Download, Pencil, Trash2,
  ArrowLeft, Calculator, Users
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const CostEstimatesByCompany = () => {
  const navigate = useNavigate();
  const { companyId, sponsorId } = useParams();
  const { user } = useAuth();
  const { showMoney } = useFinancialPermissions();
  
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('companies');
  
  // Dialog states
  const [newCompanyOpen, setNewCompanyOpen] = useState(false);
  const [newSponsorOpen, setNewSponsorOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [estimateToAssign, setEstimateToAssign] = useState(null);
  const [assignForm, setAssignForm] = useState({ company_id: '', sponsor_id: '' });
  const [companyForm, setCompanyForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [sponsorForm, setSponsorForm] = useState({ name: '', title: '', email: '', phone: '' });
  const [showUnassigned, setShowUnassigned] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadCompanyDetails(companyId);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId && sponsorId) {
      loadSponsorEstimates(companyId, sponsorId);
    }
  }, [companyId, sponsorId]);

  const loadCompanies = async () => {
    try {
      const [companiesRes, estimatesRes] = await Promise.all([
        api.get('/companies', { withCredentials: true }),
        api.get('/cost-estimates', { withCredentials: true })
      ]);
      setCompanies(companiesRes.data || []);
      setEstimates(estimatesRes.data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Error al cargar compañías');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyDetails = async (id) => {
    try {
      const company = companies.find(c => c.company_id === id);
      if (company) {
        setSelectedCompany(company);
        setActiveTab('sponsors');
      } else {
        const res = await api.get(`/companies/${id}`, { withCredentials: true });
        setSelectedCompany(res.data);
        setActiveTab('sponsors');
      }
    } catch (error) {
      console.error('Error loading company:', error);
    }
  };

  const loadSponsorEstimates = async (compId, sponsId) => {
    try {
      const company = companies.find(c => c.company_id === compId) || selectedCompany;
      if (company) {
        const sponsor = company.sponsors?.find(s => s.sponsor_id === sponsId);
        setSelectedSponsor(sponsor);
        setActiveTab('estimates');
      }
    } catch (error) {
      console.error('Error loading sponsor:', error);
    }
  };

  // Get estimates count per company
  const getCompanyEstimatesCount = (companyId) => {
    return estimates.filter(e => e.company_id === companyId).length;
  };

  // Get estimates count per sponsor
  const getSponsorEstimatesCount = (companyId, sponsorId) => {
    return estimates.filter(e => e.company_id === companyId && e.sponsor_id === sponsorId).length;
  };

  // Get estimates for current sponsor
  const sponsorEstimates = useMemo(() => {
    if (!companyId || !sponsorId) return [];
    return estimates.filter(e => e.company_id === companyId && e.sponsor_id === sponsorId);
  }, [estimates, companyId, sponsorId]);

  // Get unassigned estimates (no company_id)
  const unassignedEstimates = useMemo(() => {
    return estimates.filter(e => !e.company_id);
  }, [estimates]);

  // Get total value per company
  const getCompanyTotalValue = (companyId) => {
    return estimates
      .filter(e => e.company_id === companyId)
      .reduce((sum, e) => sum + (e.grand_total || 0), 0);
  };

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies;
    const search = searchTerm.toLowerCase();
    return companies.filter(c => 
      c.name?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search)
    );
  }, [companies, searchTerm]);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    try {
      await api.post('/companies', companyForm, { withCredentials: true });
      toast.success('Compañía creada');
      setNewCompanyOpen(false);
      setCompanyForm({ name: '', email: '', phone: '', address: '' });
      loadCompanies();
    } catch (error) {
      toast.error('Error al crear compañía');
    }
  };

  const handleCreateSponsor = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      await api.post(`/companies/${selectedCompany.company_id}/sponsors`, sponsorForm, { withCredentials: true });
      toast.success('Sponsor creado');
      setNewSponsorOpen(false);
      setSponsorForm({ name: '', title: '', email: '', phone: '' });
      // Reload company to get updated sponsors
      const res = await api.get(`/companies/${selectedCompany.company_id}`, { withCredentials: true });
      setSelectedCompany(res.data);
      loadCompanies();
    } catch (error) {
      toast.error('Error al crear sponsor');
    }
  };

  const handleNewEstimate = () => {
    // Navigate to new estimate with company and sponsor pre-selected
    navigate(`/cost-estimates/new?company_id=${companyId}&sponsor_id=${sponsorId}`);
  };

  const handleDeleteEstimate = async (estimateId) => {
    if (!window.confirm('¿Eliminar esta estimación?')) return;
    try {
      await api.delete(`/cost-estimates/${estimateId}`, { withCredentials: true });
      toast.success('Estimación eliminada');
      loadCompanies();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  // Open assign dialog
  const openAssignDialog = (estimate) => {
    setEstimateToAssign(estimate);
    setAssignForm({ company_id: '', sponsor_id: '' });
    setAssignDialogOpen(true);
  };

  // Get sponsors for selected company in assign form
  const getSponsorsForAssign = () => {
    if (!assignForm.company_id) return [];
    const company = companies.find(c => c.company_id === assignForm.company_id);
    return company?.sponsors || [];
  };

  // Handle assign estimate to company/sponsor
  const handleAssignEstimate = async () => {
    if (!estimateToAssign || !assignForm.company_id) {
      toast.error('Seleccione una compañía');
      return;
    }
    try {
      await api.put(`/cost-estimates/${estimateToAssign.cost_estimate_id || estimateToAssign.estimate_id}/assign`, {
        company_id: assignForm.company_id,
        sponsor_id: assignForm.sponsor_id || null
      }, { withCredentials: true });
      toast.success('Estimación asignada correctamente');
      setAssignDialogOpen(false);
      setEstimateToAssign(null);
      loadCompanies();
    } catch (error) {
      console.error('Error assigning estimate:', error);
      toast.error('Error al asignar estimación');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </Layout>
    );
  }

  // View: Sponsor's Estimates
  if (companyId && sponsorId && selectedSponsor) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/cost-estimates-company/${companyId}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </Button>
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Building2 className="w-4 h-4" />
                  {selectedCompany?.name}
                </div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-6 h-6 text-orange-500" />
                  {selectedSponsor.name}
                </h1>
                {selectedSponsor.title && (
                  <p className="text-slate-500">{selectedSponsor.title}</p>
                )}
              </div>
            </div>
            <Button onClick={handleNewEstimate} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" /> Nueva Estimación
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{sponsorEstimates.length}</p>
                  <p className="text-sm text-slate-500">Estimaciones</p>
                </div>
              </CardContent>
            </Card>
            {showMoney && (
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      ${sponsorEstimates.reduce((sum, e) => sum + (e.grand_total || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">Valor Total</p>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium truncate">{selectedSponsor.email || 'Sin email'}</p>
                  <p className="text-sm text-slate-500">{selectedSponsor.phone || 'Sin teléfono'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estimates List */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-orange-500" />
                Estimaciones de Costos
              </h3>
              {sponsorEstimates.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay estimaciones para este sponsor</p>
                  <Button onClick={handleNewEstimate} className="mt-4 bg-orange-500 hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" /> Crear Primera Estimación
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sponsorEstimates.map(estimate => (
                    <div 
                      key={estimate.cost_estimate_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <FileText className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">{estimate.estimate_name || estimate.estimate_number}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span>{estimate.estimate_number}</span>
                            <span>•</span>
                            <span>{moment(estimate.created_at).format('DD/MM/YYYY')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {showMoney && (
                          <span className="font-semibold text-green-600">
                            ${(estimate.grand_total || 0).toLocaleString()}
                          </span>
                        )}
                        <Badge variant={estimate.status === 'final' ? 'default' : 'secondary'}>
                          {estimate.status === 'final' ? 'Final' : 'En Proceso'}
                        </Badge>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/cost-estimates/${estimate.cost_estimate_id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.open(`${getBackendUrl()}/api/cost-estimates/${estimate.cost_estimate_id}/pdf`, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteEstimate(estimate.cost_estimate_id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // View: Company's Sponsors
  if (companyId && selectedCompany) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/cost-estimates-company')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-orange-500" />
                  {selectedCompany.name}
                </h1>
                <p className="text-slate-500">{selectedCompany.email}</p>
              </div>
            </div>
            <Dialog open={newSponsorOpen} onOpenChange={setNewSponsorOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 mr-2" /> Nuevo Sponsor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Sponsor</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSponsor} className="space-y-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input 
                      value={sponsorForm.name} 
                      onChange={(e) => setSponsorForm({...sponsorForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Título / Posición</Label>
                    <Input 
                      value={sponsorForm.title} 
                      onChange={(e) => setSponsorForm({...sponsorForm, title: e.target.value})}
                      placeholder="Ej: Project Manager"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={sponsorForm.email} 
                      onChange={(e) => setSponsorForm({...sponsorForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input 
                      value={sponsorForm.phone} 
                      onChange={(e) => setSponsorForm({...sponsorForm, phone: e.target.value})}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">
                    Crear Sponsor
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{selectedCompany.sponsors?.length || 0}</p>
                  <p className="text-sm text-slate-500">Sponsors</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{getCompanyEstimatesCount(selectedCompany.company_id)}</p>
                  <p className="text-sm text-slate-500">Estimaciones</p>
                </div>
              </CardContent>
            </Card>
            {showMoney && (
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      ${getCompanyTotalValue(selectedCompany.company_id).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">Valor Total</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sponsors List */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Sponsors
              </h3>
              {(!selectedCompany.sponsors || selectedCompany.sponsors.length === 0) ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay sponsors registrados</p>
                  <Button onClick={() => setNewSponsorOpen(true)} className="mt-4 bg-orange-500 hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" /> Agregar Primer Sponsor
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedCompany.sponsors.map(sponsor => (
                    <Card 
                      key={sponsor.sponsor_id}
                      className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-orange-300"
                      onClick={() => navigate(`/cost-estimates-company/${selectedCompany.company_id}/sponsor/${sponsor.sponsor_id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-full">
                              <User className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-semibold">{sponsor.name}</p>
                              {sponsor.title && (
                                <p className="text-sm text-slate-500">{sponsor.title}</p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4 text-slate-500">
                            {sponsor.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {sponsor.email.split('@')[0]}...
                              </span>
                            )}
                          </div>
                          <Badge variant="outline">
                            {getSponsorEstimatesCount(selectedCompany.company_id, sponsor.sponsor_id)} est.
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // View: Companies List (Main View)
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Estimaciones de Costos</h1>
            <p className="text-slate-500">Gestiona las estimaciones por compañía</p>
          </div>
          <Dialog open={newCompanyOpen} onOpenChange={setNewCompanyOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" /> Nueva Compañía
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Compañía</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input 
                    value={companyForm.name} 
                    onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={companyForm.email} 
                    onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input 
                    value={companyForm.phone} 
                    onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Dirección</Label>
                  <Input 
                    value={companyForm.address} 
                    onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">
                  Crear Compañía
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Building2 className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{companies.length}</p>
                <p className="text-sm text-slate-500">Total Compañías</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{estimates.length}</p>
                <p className="text-sm text-slate-500">Total Estimaciones</p>
              </div>
            </CardContent>
          </Card>
          {/* Unassigned Estimates Card */}
          <Card 
            className={`cursor-pointer transition-all ${showUnassigned ? 'ring-2 ring-amber-500' : 'hover:shadow-md'}`}
            onClick={() => setShowUnassigned(!showUnassigned)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unassignedEstimates.length}</p>
                <p className="text-sm text-slate-500">Sin Asignar</p>
              </div>
            </CardContent>
          </Card>
          {showMoney && (
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${estimates.reduce((sum, e) => sum + (e.grand_total || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500">Valor Total</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar por empresa, contacto o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Unassigned Estimates Section */}
        {showUnassigned && unassignedEstimates.length > 0 && (
          <Card className="border-2 border-amber-300 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-amber-800">
                  <FileText className="w-5 h-5" />
                  Estimaciones Sin Asignar ({unassignedEstimates.length})
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowUnassigned(false)}>
                  Ocultar
                </Button>
              </div>
              <div className="space-y-3">
                {unassignedEstimates.map(estimate => (
                  <div 
                    key={estimate.cost_estimate_id || estimate.estimate_id}
                    className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Calculator className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">{estimate.estimate_name || estimate.estimate_number || 'Sin nombre'}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{estimate.estimate_number}</span>
                          <span>•</span>
                          <span>{moment(estimate.created_at).format('DD/MM/YYYY')}</span>
                          {estimate.project_name && (
                            <>
                              <span>•</span>
                              <span>{estimate.project_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {showMoney && (
                        <span className="font-semibold text-green-600">
                          ${(estimate.grand_total || 0).toLocaleString()}
                        </span>
                      )}
                      <Badge variant="secondary">
                        {estimate.status === 'final' ? 'Final' : 'En Proceso'}
                      </Badge>
                      <Button 
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600"
                        onClick={() => openAssignDialog(estimate)}
                      >
                        Asignar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/cost-estimates/${estimate.cost_estimate_id || estimate.estimate_id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Estimación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Estimación:</p>
                <p className="font-medium">{estimateToAssign?.estimate_name || estimateToAssign?.estimate_number}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Compañía *</Label>
                <Select 
                  value={assignForm.company_id} 
                  onValueChange={(value) => setAssignForm({...assignForm, company_id: value, sponsor_id: ''})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar compañía" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.company_id} value={company.company_id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {assignForm.company_id && getSponsorsForAssign().length > 0 && (
                <div className="space-y-2">
                  <Label>Sponsor (opcional)</Label>
                  <Select 
                    value={assignForm.sponsor_id} 
                    onValueChange={(value) => setAssignForm({...assignForm, sponsor_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sponsor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin sponsor</SelectItem>
                      {getSponsorsForAssign().map(sponsor => (
                        <SelectItem key={sponsor.sponsor_id} value={sponsor.sponsor_id}>
                          {sponsor.name} {sponsor.title && `(${sponsor.title})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setAssignDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={handleAssignEstimate}
                  disabled={!assignForm.company_id}
                >
                  Asignar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Companies Grid */}
        {filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No hay compañías registradas</p>
              <Button onClick={() => setNewCompanyOpen(true)} className="mt-4 bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" /> Crear Primera Compañía
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.map(company => (
              <Card 
                key={company.company_id}
                className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-orange-300"
                onClick={() => navigate(`/cost-estimates-company/${company.company_id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <Building2 className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{company.name}</h3>
                        {company.sponsors?.length > 0 && (
                          <p className="text-sm text-slate-500">
                            {company.sponsors[0].name}
                            {company.sponsors.length > 1 && ` +${company.sponsors.length - 1} más`}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                  
                  <div className="space-y-2 text-sm text-slate-600">
                    {company.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{company.email}</span>
                      </div>
                    )}
                    {company.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{company.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {company.sponsors?.length || 0} sponsors
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {getCompanyEstimatesCount(company.company_id)} est.
                      </Badge>
                    </div>
                    {showMoney && (
                      <span className="font-semibold text-green-600">
                        ${getCompanyTotalValue(company.company_id).toLocaleString()}
                      </span>
                    )}
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

export default CostEstimatesByCompany;
