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
  Truck, Plus, Edit, Trash2, Users, Phone, Mail, MapPin, 
  Globe, FileText, ChevronRight, Search, Tag, Receipt, DollarSign
} from 'lucide-react';

const vendorCategories = [
  { value: 'materials', label: 'Materiales' },
  { value: 'services', label: 'Servicios' },
  { value: 'equipment', label: 'Equipos' },
  { value: 'subcontractor', label: 'Subcontratista' },
  { value: 'supplies', label: 'Suministros' },
  { value: 'professional', label: 'Servicios Profesionales' },
  { value: 'other', label: 'Otro' }
];

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  const [vendorForm, setVendorForm] = useState({
    name: '',
    category: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    website: '',
    ein: '',
    payment_terms: '',
    bank_name: '',
    bank_account: '',
    routing_number: '',
    account_type: '',
    notes: ''
  });
  
  const [contactForm, setContactForm] = useState({
    name: '',
    title: '',
    email: '',
    phone: ''
  });

  const [vendorReceipts, setVendorReceipts] = useState([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);

  useEffect(() => {
    loadVendors();
  }, []);

  // Load vendor receipts when a vendor is selected
  useEffect(() => {
    if (selectedVendor?.vendor_id) {
      loadVendorReceipts(selectedVendor.vendor_id);
    } else {
      setVendorReceipts([]);
    }
  }, [selectedVendor?.vendor_id]);

  const loadVendorReceipts = async (vendorId) => {
    setLoadingReceipts(true);
    try {
      const response = await api.get(`/vendors/${vendorId}/receipts`, { withCredentials: true });
      setVendorReceipts(response.data);
    } catch (error) {
      console.error('Error loading vendor receipts:', error);
      setVendorReceipts([]);
    } finally {
      setLoadingReceipts(false);
    }
  };

  const loadVendors = async () => {
    try {
      const response = await api.get('/vendors', { withCredentials: true });
      setVendors(response.data);
    } catch (error) {
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVendor = async (e) => {
    e.preventDefault();
    try {
      if (selectedVendor && dialogOpen) {
        await api.put(`/vendors/${selectedVendor.vendor_id}`, vendorForm, { withCredentials: true });
        toast.success('Proveedor actualizado');
      } else {
        await api.post('/vendors', vendorForm, { withCredentials: true });
        toast.success('Proveedor creado');
      }
      setDialogOpen(false);
      resetVendorForm();
      loadVendors();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar proveedor');
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('¿Estás seguro de eliminar este proveedor?')) return;
    try {
      await api.delete(`/vendors/${vendorId}`, { withCredentials: true });
      toast.success('Proveedor eliminado');
      setSelectedVendor(null);
      loadVendors();
    } catch (error) {
      toast.error('Error al eliminar proveedor');
    }
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await api.put(`/vendors/${selectedVendor.vendor_id}/contacts/${editingContact.contact_id}`, contactForm, { withCredentials: true });
        toast.success('Contacto actualizado');
      } else {
        await api.post(`/vendors/${selectedVendor.vendor_id}/contacts`, contactForm, { withCredentials: true });
        toast.success('Contacto agregado');
      }
      setContactDialogOpen(false);
      resetContactForm();
      loadVendors();
      const updated = await api.get(`/vendors/${selectedVendor.vendor_id}`, { withCredentials: true });
      setSelectedVendor(updated.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar contacto');
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('¿Estás seguro de eliminar este contacto?')) return;
    try {
      await api.delete(`/vendors/${selectedVendor.vendor_id}/contacts/${contactId}`, { withCredentials: true });
      toast.success('Contacto eliminado');
      loadVendors();
      const updated = await api.get(`/vendors/${selectedVendor.vendor_id}`, { withCredentials: true });
      setSelectedVendor(updated.data);
    } catch (error) {
      toast.error('Error al eliminar contacto');
    }
  };

  const resetVendorForm = () => {
    setVendorForm({
      name: '', category: '', address: '', city: '', state: '', zip_code: '',
      phone: '', email: '', website: '', ein: '', payment_terms: '',
      bank_name: '', bank_account: '', routing_number: '', account_type: '', notes: ''
    });
  };

  const resetContactForm = () => {
    setContactForm({ name: '', title: '', email: '', phone: '' });
    setEditingContact(null);
  };

  const openEditVendor = (vendor) => {
    setVendorForm({
      name: vendor.name || '',
      category: vendor.category || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zip_code: vendor.zip_code || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      website: vendor.website || '',
      ein: vendor.ein || '',
      payment_terms: vendor.payment_terms || '',
      bank_name: vendor.bank_name || '',
      bank_account: vendor.bank_account || '',
      routing_number: vendor.routing_number || '',
      account_type: vendor.account_type || '',
      notes: vendor.notes || ''
    });
    setSelectedVendor(vendor);
    setDialogOpen(true);
  };

  const openNewVendor = () => {
    resetVendorForm();
    setSelectedVendor(null);
    setDialogOpen(true);
  };

  const openEditContact = (contact) => {
    setContactForm({
      name: contact.name || '',
      title: contact.title || '',
      email: contact.email || '',
      phone: contact.phone || ''
    });
    setEditingContact(contact);
    setContactDialogOpen(true);
  };

  const getCategoryLabel = (value) => {
    const cat = vendorCategories.find(c => c.value === value);
    return cat ? cat.label : value || 'Sin categoría';
  };

  const getCategoryColor = (category) => {
    const colors = {
      materials: 'bg-blue-100 text-blue-700',
      services: 'bg-green-100 text-green-700',
      equipment: 'bg-purple-100 text-purple-700',
      subcontractor: 'bg-orange-100 text-orange-700',
      supplies: 'bg-cyan-100 text-cyan-700',
      professional: 'bg-indigo-100 text-indigo-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-PR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalVendorReceipts = vendorReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-7 h-7 text-blue-500" />
              Proveedores
            </h1>
            <p className="text-slate-500">Gestiona los proveedores y sus contactos</p>
          </div>
          <Button onClick={openNewVendor} className="bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Proveedor
          </Button>
        </div>

        {/* Vendor Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetVendorForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedVendor && dialogOpen ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveVendor} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nombre del Proveedor *</Label>
                  <Input
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    required
                    placeholder="Nombre de la empresa"
                  />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Select
                    value={vendorForm.category}
                    onValueChange={(value) => setVendorForm({ ...vendorForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Términos de Pago</Label>
                  <Select
                    value={vendorForm.payment_terms}
                    onValueChange={(value) => setVendorForm({ ...vendorForm, payment_terms: value })}
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
                  <Label>Dirección</Label>
                  <Input
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    placeholder="Calle y número"
                  />
                </div>
                <div>
                  <Label>Ciudad</Label>
                  <Input
                    value={vendorForm.city}
                    onChange={(e) => setVendorForm({ ...vendorForm, city: e.target.value })}
                    placeholder="Ciudad"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Estado</Label>
                    <Input
                      value={vendorForm.state}
                      onChange={(e) => setVendorForm({ ...vendorForm, state: e.target.value })}
                      placeholder="PR"
                    />
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input
                      value={vendorForm.zip_code}
                      onChange={(e) => setVendorForm({ ...vendorForm, zip_code: e.target.value })}
                      placeholder="00000"
                    />
                  </div>
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    placeholder="(787) 000-0000"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    placeholder="contacto@proveedor.com"
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    value={vendorForm.website}
                    onChange={(e) => setVendorForm({ ...vendorForm, website: e.target.value })}
                    placeholder="www.proveedor.com"
                  />
                </div>
                <div>
                  <Label>EIN (ID Fiscal)</Label>
                  <Input
                    value={vendorForm.ein}
                    onChange={(e) => setVendorForm({ ...vendorForm, ein: e.target.value })}
                    placeholder="00-0000000"
                  />
                </div>
                
                {/* Bank Information Section */}
                <div className="col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-medium text-slate-700 mb-3">Información Bancaria</h4>
                </div>
                <div>
                  <Label>Nombre del Banco</Label>
                  <Input
                    value={vendorForm.bank_name}
                    onChange={(e) => setVendorForm({ ...vendorForm, bank_name: e.target.value })}
                    placeholder="Ej: Banco Popular"
                  />
                </div>
                <div>
                  <Label>Tipo de Cuenta</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    value={vendorForm.account_type}
                    onChange={(e) => setVendorForm({ ...vendorForm, account_type: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="checking">Corriente (Checking)</option>
                    <option value="savings">Ahorro (Savings)</option>
                  </select>
                </div>
                <div>
                  <Label>Número de Cuenta</Label>
                  <Input
                    value={vendorForm.bank_account}
                    onChange={(e) => setVendorForm({ ...vendorForm, bank_account: e.target.value })}
                    placeholder="Número de cuenta bancaria"
                  />
                </div>
                <div>
                  <Label>Número de Ruta (Routing)</Label>
                  <Input
                    value={vendorForm.routing_number}
                    onChange={(e) => setVendorForm({ ...vendorForm, routing_number: e.target.value })}
                    placeholder="Número de ruta"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={vendorForm.notes}
                    onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                    placeholder="Notas adicionales sobre el proveedor..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetVendorForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
                  {selectedVendor && dialogOpen ? 'Guardar Cambios' : 'Crear Proveedor'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vendors List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar proveedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <Tag className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar por categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {vendorCategories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-slate-500">Cargando...</div>
                ) : filteredVendors.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    {searchTerm || categoryFilter !== 'all' ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredVendors.map((vendor) => (
                      <div
                        key={vendor.vendor_id}
                        onClick={() => setSelectedVendor(vendor)}
                        className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                          selectedVendor?.vendor_id === vendor.vendor_id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-slate-800">{vendor.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {vendor.category && (
                                <Badge className={`text-xs ${getCategoryColor(vendor.category)}`}>
                                  {getCategoryLabel(vendor.category)}
                                </Badge>
                              )}
                              <span className="text-xs text-slate-500">
                                {vendor.contacts?.length || 0} contacto(s)
                              </span>
                            </div>
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

          {/* Vendor Detail */}
          <div className="lg:col-span-2">
            {selectedVendor ? (
              <Card>
                <CardHeader className="border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Truck className="w-5 h-5 text-blue-500" />
                        {selectedVendor.name}
                      </CardTitle>
                      <div className="flex gap-2 mt-2">
                        {selectedVendor.category && (
                          <Badge className={getCategoryColor(selectedVendor.category)}>
                            {getCategoryLabel(selectedVendor.category)}
                          </Badge>
                        )}
                        {selectedVendor.payment_terms && (
                          <Badge variant="outline">
                            {selectedVendor.payment_terms.replace('_', ' ').toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditVendor(selectedVendor)}>
                        <Edit className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteVendor(selectedVendor.vendor_id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Vendor Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {selectedVendor.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Dirección</p>
                          <p className="text-slate-800">
                            {selectedVendor.address}
                            {selectedVendor.city && `, ${selectedVendor.city}`}
                            {selectedVendor.state && `, ${selectedVendor.state}`}
                            {selectedVendor.zip_code && ` ${selectedVendor.zip_code}`}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedVendor.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Teléfono</p>
                          <p className="text-slate-800">{selectedVendor.phone}</p>
                        </div>
                      </div>
                    )}
                    {selectedVendor.email && (
                      <div className="flex items-start gap-2">
                        <Mail className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Email</p>
                          <p className="text-slate-800">{selectedVendor.email}</p>
                        </div>
                      </div>
                    )}
                    {selectedVendor.website && (
                      <div className="flex items-start gap-2">
                        <Globe className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Website</p>
                          <p className="text-slate-800">{selectedVendor.website}</p>
                        </div>
                      </div>
                    )}
                    {selectedVendor.ein && (
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">EIN</p>
                          <p className="text-slate-800">{selectedVendor.ein}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bank Information Section */}
                  {(selectedVendor.bank_name || selectedVendor.bank_account || selectedVendor.routing_number) && (
                    <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100">
                      <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Información Bancaria
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selectedVendor.bank_name && (
                          <div>
                            <p className="text-green-600">Banco</p>
                            <p className="text-slate-800 font-medium">{selectedVendor.bank_name}</p>
                          </div>
                        )}
                        {selectedVendor.account_type && (
                          <div>
                            <p className="text-green-600">Tipo de Cuenta</p>
                            <p className="text-slate-800 font-medium">
                              {selectedVendor.account_type === 'checking' ? 'Corriente' : 'Ahorro'}
                            </p>
                          </div>
                        )}
                        {selectedVendor.bank_account && (
                          <div>
                            <p className="text-green-600">Número de Cuenta</p>
                            <p className="text-slate-800 font-medium">{selectedVendor.bank_account}</p>
                          </div>
                        )}
                        {selectedVendor.routing_number && (
                          <div>
                            <p className="text-green-600">Número de Ruta</p>
                            <p className="text-slate-800 font-medium">{selectedVendor.routing_number}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedVendor.notes && (
                    <div className="mb-6 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500 mb-1">Notas</p>
                      <p className="text-slate-700">{selectedVendor.notes}</p>
                    </div>
                  )}

                  {/* Contacts Section */}
                  <div className="border-t pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        Contactos ({selectedVendor.contacts?.length || 0})
                      </h3>
                      <Dialog open={contactDialogOpen} onOpenChange={(open) => { setContactDialogOpen(open); if (!open) resetContactForm(); }}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                            <Plus className="w-4 h-4 mr-1" /> Agregar Contacto
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSaveContact} className="space-y-4">
                            <div>
                              <Label>Nombre *</Label>
                              <Input
                                value={contactForm.name}
                                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                required
                                placeholder="Nombre completo"
                              />
                            </div>
                            <div>
                              <Label>Cargo / Posición</Label>
                              <Input
                                value={contactForm.title}
                                onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                                placeholder="Gerente de Ventas, etc."
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Email</Label>
                                <Input
                                  type="email"
                                  value={contactForm.email}
                                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                  placeholder="email@proveedor.com"
                                />
                              </div>
                              <div>
                                <Label>Teléfono</Label>
                                <Input
                                  value={contactForm.phone}
                                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                  placeholder="(787) 000-0000"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button type="button" variant="outline" onClick={() => { setContactDialogOpen(false); resetContactForm(); }}>
                                Cancelar
                              </Button>
                              <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
                                {editingContact ? 'Guardar' : 'Agregar'}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {selectedVendor.contacts?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedVendor.contacts.map((contact) => (
                          <div key={contact.contact_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                              <p className="font-medium text-slate-800">{contact.name}</p>
                              {contact.title && <p className="text-sm text-slate-500">{contact.title}</p>}
                              <div className="flex gap-4 mt-1 text-sm text-slate-600">
                                {contact.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> {contact.email}
                                  </span>
                                )}
                                {contact.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> {contact.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditContact(contact)}>
                                <Edit className="w-4 h-4 text-slate-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(contact.contact_id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No hay contactos registrados</p>
                        <p className="text-sm">Agrega contactos para este proveedor</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center py-16 text-slate-500">
                  <Truck className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Selecciona un proveedor</p>
                  <p className="text-sm">O crea uno nuevo para comenzar</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Vendors;
