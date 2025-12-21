import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Building2, Plus, Mail, Phone, User, Search, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: '', company_name: '', company_phone: '', contact_person: ''
  });

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/clients', form);
      toast.success('Cliente creado');
      setDialogOpen(false);
      setForm({ name: '', email: '', password: '', company_name: '', company_phone: '', contact_person: '' });
      loadClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear cliente');
    }
  };

  const filtered = clients.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Layout><div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-slate-500 text-sm">Gestiona los perfiles de tus clientes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" /> Nuevo Cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear Cliente</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Nombre Contacto *</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required /></div>
                  <div><Label>Contraseña *</Label><Input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required /></div>
                  <div><Label>Empresa</Label><Input value={form.company_name} onChange={(e) => setForm({...form, company_name: e.target.value})} /></div>
                  <div><Label>Teléfono</Label><Input value={form.company_phone} onChange={(e) => setForm({...form, company_phone: e.target.value})} /></div>
                  <div><Label>Persona Contacto</Label><Input value={form.contact_person} onChange={(e) => setForm({...form, contact_person: e.target.value})} /></div>
                </div>
                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">Crear Cliente</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input placeholder="Buscar cliente..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <Card key={client.user_id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/clients/${client.user_id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{client.company_name || client.name}</h3>
                      <p className="text-sm text-slate-500">{client.contact_person || client.name}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
                <div className="mt-4 space-y-1 text-sm text-slate-600">
                  {client.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> {client.email}</div>}
                  {client.company_phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {client.company_phone}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No hay clientes</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Clients;
