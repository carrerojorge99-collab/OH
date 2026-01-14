import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { 
  Building2, Plus, Edit, Trash2, Users, Phone, Mail, MapPin, 
  Globe, FileText, DollarSign, ChevronRight, Search, X
} from 'lucide-react';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sponsorDialogOpen, setSponsorDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  
  // Company form
  const [companyForm, setCompanyForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    website: '',
    ein: '',
    payment_terms: '',
    notes: ''
  });
  
  // Sponsor form
  const [sponsorForm, setSponsorForm] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await api.get('/companies', { withCredentials: true });
      setCompanies(response.data);
    } catch (error) {
      toast.error('Error al cargar compañías');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    try {
      if (selectedCompany) {
        await api.put(`/companies/${selectedCompany.company_id}`, companyForm, { withCredentials: true });
        toast.success('Compañía actualizada');
      } else {
        await api.post('/companies', companyForm, { withCredentials: true });
        toast.success('Compañía creada');
      }
      setDialogOpen(false);
      resetCompanyForm();
      loadCompanies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar compañía');
    }
  };

  const handleDeleteCompany = async (companyId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta compañía?')) return;
    try {
      await api.delete(`/companies/${companyId}`, { withCredentials: true });
      toast.success('Compañía eliminada');
      setSelectedCompany(null);
      loadCompanies();
    } catch (error) {
      toast.error('Error al eliminar compañía');
    }
  };

  const handleSaveSponsor = async (e) => {
    e.preventDefault();
    try {
      if (editingSponsor) {
        await api.put(`/companies/${selectedCompany.company_id}/sponsors/${editingSponsor.sponsor_id}`, sponsorForm, { withCredentials: true });
        toast.success('Sponsor actualizado');
      } else {
        await api.post(`/companies/${selectedCompany.company_id}/sponsors`, sponsorForm, { withCredentials: true });
        toast.success('Sponsor agregado');
      }
      setSponsorDialogOpen(false);
      resetSponsorForm();
      loadCompanies();
      // Refresh selected company
      const updated = await api.get(`/companies/${selectedCompany.company_id}`, { withCredentials: true });
      setSelectedCompany(updated.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar sponsor');
    }
  };

  const handleDeleteSponsor = async (sponsorId) => {
    if (!window.confirm('¿Estás seguro de eliminar este sponsor?')) return;
    try {
      await api.delete(`/companies/${selectedCompany.company_id}/sponsors/${sponsorId}`, { withCredentials: true });
      toast.success('Sponsor eliminado');
      loadCompanies();
      // Refresh selected company
      const updated = await api.get(`/companies/${selectedCompany.company_id}`, { withCredentials: true });
      setSelectedCompany(updated.data);
    } catch (error) {
      toast.error('Error al eliminar sponsor');
    }
  };

  const resetCompanyForm = () => {
    setCompanyForm({
      name: '', address: '', city: '', state: '', zip_code: '',
      phone: '', email: '', website: '', ein: '', payment_terms: '', notes: ''
    });
    setSelectedCompany(null);
  };

  const resetSponsorForm = () => {
    setSponsorForm({ name: '', title: '', email: '', phone: '', address: '' });
    setEditingSponsor(null);
  };

  const openEditCompany = (company) => {
    setCompanyForm({
      name: company.name || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      zip_code: company.zip_code || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      ein: company.ein || '',
      payment_terms: company.payment_terms || '',
      notes: company.notes || ''
    });
    setSelectedCompany(company);
    setDialogOpen(true);
  };

  const openEditSponsor = (sponsor) => {
    setSponsorForm({
      name: sponsor.name || '',
      title: sponsor.title || '',
      email: sponsor.email || '',
      phone: sponsor.phone || '',
      address: sponsor.address || ''
    });
    setEditingSponsor(sponsor);
    setSponsorDialogOpen(true);
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-7 h-7 text-orange-500" />
              Compañías
            </h1>
            <p className="text-slate-500">Gestiona las compañías y sus sponsors</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetCompanyForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" /> Nueva Compañía
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedCompany ? 'Editar Compañía' : 'Nueva Compañía'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nombre de la Compañía *</Label>
                    <Input
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      required
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Dirección</Label>
                    <Input
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      placeholder="Calle y número"
                    />
                  </div>
                  <div>
                    <Label>Ciudad</Label>
                    <Input
                      value={companyForm.city}
                      onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                      placeholder="Ciudad"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Estado</Label>
                      <Input
                        value={companyForm.state}
                        onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                        placeholder="PR"
                      />
                    </div>
                    <div>
                      <Label>ZIP</Label>
                      <Input
                        value={companyForm.zip_code}
                        onChange={(e) => setCompanyForm({ ...companyForm, zip_code: e.target.value })}
                        placeholder="00000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      placeholder="(787) 000-0000"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                      placeholder="www.empresa.com"
                    />
                  </div>
                  <div>
                    <Label>EIN (ID Fiscal)</Label>
                    <Input
                      value={companyForm.ein}
                      onChange={(e) => setCompanyForm({ ...companyForm, ein: e.target.value })}
                      placeholder="00-0000000"
                    />
                  </div>
                  <div>
                    <Label>Términos de Pago</Label>
                    <Select
                      value={companyForm.payment_terms}
                      onValueChange={(value) => setCompanyForm({ ...companyForm, payment_terms: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Inmediato</SelectItem>
                        <SelectItem value="net_15">Net 15</SelectItem>
                        <SelectItem value="net_30">Net 30</SelectItem>
                        <SelectItem value="net_45">Net 45</SelectItem>
                        <SelectItem value="net_60">Net 60</SelectItem>
                        <SelectItem value="net_90">Net 90</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Notas</Label>
                    <Textarea
                      value={companyForm.notes}
                      onChange={(e) => setCompanyForm({ ...companyForm, notes: e.target.value })}
                      placeholder="Notas adicionales sobre la compañía..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetCompanyForm(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                    {selectedCompany ? 'Guardar Cambios' : 'Crear Compañía'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Companies List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar compañía..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-slate-500">Cargando...</div>
                ) : filteredCompanies.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    {searchTerm ? 'No se encontraron compañías' : 'No hay compañías registradas'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredCompanies.map((company) => (
                      <div
                        key={company.company_id}
                        onClick={() => setSelectedCompany(company)}
                        className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                          selectedCompany?.company_id === company.company_id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-slate-800">{company.name}</h3>
                            <p className="text-sm text-slate-500">
                              {company.sponsors?.length || 0} sponsor(s)
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Company Detail */}
          <div className="lg:col-span-2">
            {selectedCompany ? (
              <Card>
                <CardHeader className="border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-orange-500" />
                        {selectedCompany.name}
                      </CardTitle>
                      {selectedCompany.payment_terms && (
                        <Badge variant="outline" className="mt-2">
                          {selectedCompany.payment_terms.replace('_', ' ').toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditCompany(selectedCompany)}>
                        <Edit className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteCompany(selectedCompany.company_id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Company Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {selectedCompany.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Dirección</p>
                          <p className="text-slate-800">
                            {selectedCompany.address}
                            {selectedCompany.city && `, ${selectedCompany.city}`}
                            {selectedCompany.state && `, ${selectedCompany.state}`}
                            {selectedCompany.zip_code && ` ${selectedCompany.zip_code}`}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedCompany.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Teléfono</p>
                          <p className="text-slate-800">{selectedCompany.phone}</p>
                        </div>
                      </div>
                    )}
                    {selectedCompany.email && (
                      <div className="flex items-start gap-2">
                        <Mail className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Email</p>
                          <p className="text-slate-800">{selectedCompany.email}</p>
                        </div>
                      </div>
                    )}
                    {selectedCompany.website && (
                      <div className="flex items-start gap-2">
                        <Globe className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Website</p>
                          <p className="text-slate-800">{selectedCompany.website}</p>
                        </div>
                      </div>
                    )}
                    {selectedCompany.ein && (
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">EIN</p>
                          <p className="text-slate-800">{selectedCompany.ein}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedCompany.notes && (
                    <div className="mb-6 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500 mb-1">Notas</p>
                      <p className="text-slate-700">{selectedCompany.notes}</p>
                    </div>
                  )}

                  {/* Sponsors Section */}
                  <div className="border-t pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-500" />
                        Sponsors ({selectedCompany.sponsors?.length || 0})
                      </h3>
                      <Dialog open={sponsorDialogOpen} onOpenChange={(open) => { setSponsorDialogOpen(open); if (!open) resetSponsorForm(); }}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                            <Plus className="w-4 h-4 mr-1" /> Agregar Sponsor
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{editingSponsor ? 'Editar Sponsor' : 'Nuevo Sponsor'}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSaveSponsor} className="space-y-4">
                            <div>
                              <Label>Nombre *</Label>
                              <Input
                                value={sponsorForm.name}
                                onChange={(e) => setSponsorForm({ ...sponsorForm, name: e.target.value })}
                                required
                                placeholder="Nombre completo"
                              />
                            </div>
                            <div>
                              <Label>Cargo / Posición</Label>
                              <Input
                                value={sponsorForm.title}
                                onChange={(e) => setSponsorForm({ ...sponsorForm, title: e.target.value })}
                                placeholder="Director, Gerente, etc."
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Email</Label>
                                <Input
                                  type="email"
                                  value={sponsorForm.email}
                                  onChange={(e) => setSponsorForm({ ...sponsorForm, email: e.target.value })}
                                  placeholder="email@empresa.com"
                                />
                              </div>
                              <div>
                                <Label>Teléfono</Label>
                                <Input
                                  value={sponsorForm.phone}
                                  onChange={(e) => setSponsorForm({ ...sponsorForm, phone: e.target.value })}
                                  placeholder="(787) 000-0000"
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Dirección (si es diferente)</Label>
                              <Input
                                value={sponsorForm.address}
                                onChange={(e) => setSponsorForm({ ...sponsorForm, address: e.target.value })}
                                placeholder="Dirección del sponsor"
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button type="button" variant="outline" onClick={() => { setSponsorDialogOpen(false); resetSponsorForm(); }}>
                                Cancelar
                              </Button>
                              <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                                {editingSponsor ? 'Guardar' : 'Agregar'}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {selectedCompany.sponsors?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCompany.sponsors.map((sponsor) => (
                          <div key={sponsor.sponsor_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                              <p className="font-medium text-slate-800">{sponsor.name}</p>
                              {sponsor.title && <p className="text-sm text-slate-500">{sponsor.title}</p>}
                              <div className="flex gap-4 mt-1 text-sm text-slate-600">
                                {sponsor.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> {sponsor.email}
                                  </span>
                                )}
                                {sponsor.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> {sponsor.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditSponsor(sponsor)}>
                                <Edit className="w-4 h-4 text-slate-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteSponsor(sponsor.sponsor_id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No hay sponsors registrados</p>
                        <p className="text-sm">Agrega sponsors para esta compañía</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center py-16 text-slate-500">
                  <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Selecciona una compañía</p>
                  <p className="text-sm">O crea una nueva para comenzar</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Companies;
