import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Building2, Plus, Mail, Phone, Search, ChevronRight, FileText, DollarSign, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ClientEstimates = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [unassignedEstimates, setUnassignedEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => { 
    loadClients(); 
    loadUnassignedEstimates();
  }, []);

  const loadClients = async () => {
    try {
      const response = await api.get('/client-profiles');
      setClients(response.data || []);
    } catch (error) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const loadUnassignedEstimates = async () => {
    try {
      const response = await api.get('/estimates?unassigned=true');
      setUnassignedEstimates(response.data || []);
    } catch (error) {
      console.error('Error loading unassigned estimates:', error);
    }
  };

  const handleAssignEstimate = async (clientId) => {
    if (!selectedEstimate || !clientId) return;
    try {
      await api.put(`/estimates/${selectedEstimate.estimate_id}/assign`, { 
        client_profile_id: clientId 
      });
      toast.success('Estimado asignado exitosamente');
      setAssignDialogOpen(false);
      setSelectedEstimate(null);
      loadUnassignedEstimates();
    } catch (error) {
      toast.error('Error al asignar estimado');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) {
      toast.error('El nombre de empresa es requerido');
      return;
    }
    try {
      const response = await api.post('/client-profiles', form);
      toast.success('Cliente creado');
      setDialogOpen(false);
      setForm({ company_name: '', contact_name: '', email: '', phone: '', address: '' });
      loadClients();
      // Navigate to the new client profile
      if (response.data?.profile_id) {
        navigate(`/estimados/${response.data.profile_id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear cliente');
    }
  };

  const filtered = clients.filter(c => 
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totalClients = clients.length;

  if (loading) return <Layout><div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Estimados</h1>
            <p className="text-slate-500 text-sm">Gestiona los estimados de tus clientes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" /> Nuevo Cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear Cliente</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nombre de Empresa *</Label>
                  <Input value={form.company_name} onChange={(e) => setForm({...form, company_name: e.target.value})} required placeholder="Ej: ABC Construction Inc." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Persona de Contacto</Label>
                    <Input value={form.contact_name} onChange={(e) => setForm({...form, contact_name: e.target.value})} placeholder="Nombre del contacto" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="email@ejemplo.com" />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="(787) 000-0000" />
                  </div>
                  <div>
                    <Label>Dirección</Label>
                    <Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} placeholder="Dirección" />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">Crear Cliente</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClients}</p>
                <p className="text-xs text-slate-500">Total Clientes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unassignedEstimates.length}</p>
                <p className="text-xs text-slate-500">Sin Asignar</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unassigned Estimates Section */}
        {unassignedEstimates.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold text-amber-800">Estimados Sin Asignar</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {unassignedEstimates.map(est => (
                <Card key={est.estimate_id} className="bg-white">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{est.title || est.estimate_number}</p>
                        <p className="text-xs text-slate-500">{est.estimate_number}</p>
                        <p className="text-sm font-semibold text-green-600 mt-1">
                          ${(est.total || 0).toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-amber-600 border-amber-300 hover:bg-amber-100"
                        onClick={() => {
                          setSelectedEstimate(est);
                          setAssignDialogOpen(true);
                        }}
                      >
                        Asignar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Estimado a Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Selecciona el cliente al que deseas asignar: <strong>{selectedEstimate?.title || selectedEstimate?.estimate_number}</strong>
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {clients.map(client => (
                  <div 
                    key={client.profile_id}
                    className="p-3 border rounded-lg hover:bg-orange-50 cursor-pointer flex items-center justify-between"
                    onClick={() => handleAssignEstimate(client.profile_id)}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="font-medium">{client.company_name}</p>
                        <p className="text-xs text-slate-500">{client.contact_name}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
              {clients.length === 0 && (
                <p className="text-center text-slate-500 py-4">No hay clientes. Crea uno primero.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input placeholder="Buscar por empresa, contacto o email..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <Card 
              key={client.profile_id} 
              className="hover:shadow-md transition-shadow cursor-pointer group" 
              onClick={() => navigate(`/estimados/${client.profile_id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                      <Building2 className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{client.company_name || 'Sin nombre'}</h3>
                      <p className="text-sm text-slate-500">{client.contact_name || 'Sin contacto'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 transition-colors" />
                </div>
                <div className="mt-4 space-y-1 text-sm text-slate-600">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3" /> 
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3" /> 
                      {client.phone}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">{searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}</p>
            <p className="text-sm text-slate-400 mt-1">Crea un cliente para comenzar a generar estimados</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientEstimates;
