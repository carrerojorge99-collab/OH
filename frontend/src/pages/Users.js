import React, { useState, useEffect } from 'react';
import api from '../utils/api';
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
import { Plus, Mail, Shield, User, Trash2, Pencil, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import CloudinaryUpload from '../components/CloudinaryUpload';


const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'empleado',
    picture: ''
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'empleado',
    picture: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get(`/users`, { withCredentials: true });
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
      await api.post(`/auth/register`, formData, { withCredentials: true });
      toast.success('Usuario creado exitosamente');
      setDialogOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'empleado',
        picture: ''
      });
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear usuario');
      console.error(error);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'project_manager':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'rrhh':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'accountant':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'empleado':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'client':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'project_manager':
        return 'Project Manager';
      case 'rrhh':
        return 'RRHH';
      case 'accountant':
        return 'Contador';
      case 'empleado':
        return 'Empleado';
      case 'client':
        return 'Cliente';
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

  const handleEditUser = (user) => {
    setEditingUserId(user.user_id);
    setEditFormData({
      name: user.name,
      email: user.email || '',
      password: '',
      role: user.role,
      picture: user.picture || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    try {
      const updateData = {
        name: editFormData.name,
        role: editFormData.role,
        picture: editFormData.picture || null
      };
      
      // Solo incluir email si no está vacío
      if (editFormData.email && editFormData.email.trim() !== '') {
        updateData.email = editFormData.email;
      }
      
      // Solo incluir password si no está vacío
      if (editFormData.password && editFormData.password.trim() !== '') {
        updateData.password = editFormData.password;
      }
      
      await api.put(`/users/${editingUserId}`, updateData, { withCredentials: true });
      toast.success('Usuario actualizado exitosamente');
      setEditDialogOpen(false);
      setEditFormData({
        name: '',
        email: '',
        password: '',
        role: 'empleado',
        picture: ''
      });
      setEditingUserId(null);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar usuario');
      console.error(error);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`¿Estás seguro de eliminar al usuario "${userName}"?\n\nEsta acción:\n- Eliminará todas sus sesiones\n- Desasignará sus tareas\n- Lo removerá de todos los proyectos\n- Es irreversible`)) {
      return;
    }
    
    try {
      await api.delete(`/users/${userId}`, { withCredentials: true });
      toast.success(`Usuario ${userName} eliminado exitosamente`);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
      console.error(error);
    }
  };

  const handleBlockUser = async (userId, userName, isCurrentlyBlocked) => {
    const action = isCurrentlyBlocked ? 'desbloquear' : 'bloquear';
    if (!window.confirm(`¿Estás seguro de ${action} al usuario "${userName}"?${!isCurrentlyBlocked ? '\n\nEl usuario no podrá iniciar sesión mientras esté bloqueado.' : ''}`)) {
      return;
    }
    
    try {
      const response = await api.put(`/users/${userId}/block`, {}, { withCredentials: true });
      toast.success(response.data.message);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Error al ${action} usuario`);
      console.error(error);
    }
  };

  // Check if current user can block users
  const canBlockUsers = currentUser?.role === 'super_admin' || currentUser?.role === 'rrhh';

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
                  {/* Foto de Perfil */}
                  <div className="flex justify-center">
                    <CloudinaryUpload
                      folder="users"
                      currentImage={formData.picture}
                      label="Subir foto"
                      previewSize="md"
                      onUploadComplete={(result) => {
                        setFormData({ ...formData, picture: result?.url || '' });
                      }}
                    />
                  </div>

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
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="project_manager">Project Manager</SelectItem>
                          <SelectItem value="rrhh">RRHH</SelectItem>
                          <SelectItem value="accountant">Contador</SelectItem>
                          <SelectItem value="empleado">Empleado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-slate-500">
                      PM: proyectos y aprobaciones | RRHH: empleados y nómina | Contador: contabilidad | Empleado: ponchar
                    </p>
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

          {/* Edit User Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-semibold tracking-tight">Editar Usuario</DialogTitle>
                <DialogDescription>Actualiza los datos del usuario</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateUser}>
                <div className="space-y-4 py-4">
                  {/* Foto de Perfil */}
                  <div className="flex justify-center">
                    <CloudinaryUpload
                      folder="users"
                      currentImage={editFormData.picture}
                      label="Cambiar foto"
                      previewSize="md"
                      onUploadComplete={(result) => {
                        setEditFormData({ ...editFormData, picture: result?.url || '' });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nombre Completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-name"
                        data-testid="edit-user-name-input"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        required
                        className="pl-10"
                        placeholder="Juan Pérez"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-email"
                        data-testid="edit-user-email-input"
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="pl-10"
                        placeholder="usuario@ejemplo.com"
                      />
                    </div>
                    <p className="text-xs text-slate-500">Deja vacío para no cambiar el email actual</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-password">Nueva Contraseña</Label>
                    <Input
                      id="edit-password"
                      data-testid="edit-user-password-input"
                      type="password"
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      minLength={6}
                      placeholder="Deja vacío para mantener la contraseña actual"
                    />
                    <p className="text-xs text-slate-500">Solo cambia si necesitas actualizar las credenciales</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Rol *</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <Select value={editFormData.role} onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}>
                        <SelectTrigger data-testid="edit-user-role-select" className="pl-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {/* RRHH cannot assign super_admin role */}
                          {currentUser?.role !== 'rrhh' && (
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          )}
                          <SelectItem value="project_manager">Project Manager</SelectItem>
                          <SelectItem value="rrhh">RRHH</SelectItem>
                          <SelectItem value="accountant">Contador</SelectItem>
                          <SelectItem value="empleado">Empleado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button data-testid="update-user-button" type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Actualizar Usuario
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Grid */}
        {users.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {users.map((user) => (
              <Card
                key={user.user_id}
                data-testid={`user-card-${user.user_id}`}
                className={`border-slate-200 shadow-sm hover:shadow-md transition-shadow ${user.is_blocked ? 'opacity-60 bg-red-50' : ''}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10 border border-slate-200 flex-shrink-0">
                        <AvatarImage src={user.picture} alt={user.name} />
                        <AvatarFallback className="bg-blue-600 text-white font-semibold text-sm">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      {user.is_blocked && (
                        <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5">
                          <Ban className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-[#0F172A] truncate">{user.name}</h3>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Badge className={`${getRoleBadgeColor(user.role)} border text-xs px-2 py-0`}>
                        {getRoleLabel(user.role)}
                      </Badge>
                      {user.is_blocked && (
                        <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs px-2 py-0">
                          Bloqueado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Block/Unblock button - visible to super_admin and rrhh */}
                      {canBlockUsers && currentUser?.user_id !== user.user_id && (
                        // RRHH cannot block super_admin
                        !(currentUser?.role === 'rrhh' && user.role === 'super_admin') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleBlockUser(user.user_id, user.name, user.is_blocked)}
                            className={`h-6 w-6 ${user.is_blocked ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'}`}
                            title={user.is_blocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                          >
                            {user.is_blocked ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          </Button>
                        )
                      )}
                      {/* Edit button - visible to super_admin and rrhh */}
                      {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'rrhh') && (
                        // RRHH cannot edit super_admin
                        !(currentUser?.role === 'rrhh' && user.role === 'super_admin') && (
                          <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)} className="h-6 w-6 text-blue-600 hover:bg-blue-50">
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )
                      )}
                      {/* Delete - only for super_admin */}
                      {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && currentUser?.user_id !== user.user_id && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.user_id, user.name)} className="h-6 w-6 text-red-600 hover:bg-red-50">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
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
