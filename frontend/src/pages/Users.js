import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Plus, Mail, Shield, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'colaborador'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, { withCredentials: true });
      setUsers(response.data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/auth/register`, formData, { withCredentials: true });
      toast.success('Usuario creado exitosamente');
      setDialogOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'colaborador'
      });
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear usuario');
      console.error(error);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'gestor':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'colaborador':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'gestor':
        return 'Gestor';
      case 'colaborador':
        return 'Colaborador';
      default:
        return role;
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`¿Estás seguro de eliminar al usuario "${userName}"?\n\nEsta acción:\n- Eliminará todas sus sesiones\n- Desasignará sus tareas\n- Lo removerá de todos los proyectos\n- Es irreversible`)) {
      return;
    }
    
    try {
      await axios.delete(`${API}/users/${userId}`, { withCredentials: true });
      toast.success(`Usuario ${userName} eliminado exitosamente`);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Cargando usuarios...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">Usuarios</h1>
            <p className="text-muted-foreground mt-2">Gestiona los usuarios del sistema</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-user-button" className="rounded-full bg-blue-600 hover:bg-blue-700 font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-semibold tracking-tight">Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>Completa los datos del usuario</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        data-testid="user-name-input"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="pl-10"
                        placeholder="Juan Pérez"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico (Opcional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        data-testid="user-email-input"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10"
                        placeholder="usuario@ejemplo.com (se puede asignar después)"
                      />
                    </div>
                    <p className="text-xs text-slate-500">Puedes crear el empleado sin credenciales y asignarlas después</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña (Opcional)</Label>
                    <Input
                      id="password"
                      data-testid="user-password-input"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      minLength={6}
                      placeholder="Mínimo 6 caracteres (se puede asignar después)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rol *</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger data-testid="user-role-select" className="pl-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="colaborador">Colaborador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button data-testid="submit-user-button" type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Crear Usuario
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Grid */}
        {users.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <Card
                key={user.user_id}
                data-testid={`user-card-${user.user_id}`}
                className="border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16 border-2 border-slate-200">
                      <AvatarImage src={user.picture} alt={user.name} />
                      <AvatarFallback className="bg-blue-600 text-white font-semibold text-lg">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-lg font-semibold text-[#0F172A] truncate flex-1">
                          {user.name}
                        </h3>
                        {currentUser?.role === 'admin' && currentUser?.user_id !== user.user_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.user_id, user.name)}
                            data-testid={`delete-user-${user.user_id}`}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-slate-600 mb-2">
                        <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      <Badge className={`${getRoleBadgeColor(user.role)} border`}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                  </div>
                  
                  {user.created_at && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500">
                        Creado: {new Date(user.created_at).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <User className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600 mb-2">No hay usuarios registrados</p>
              <p className="text-sm text-muted-foreground mb-6">Comienza creando el primer usuario</p>
              <Button onClick={() => setDialogOpen(true)} className="rounded-full bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Crear Usuario
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Users;
