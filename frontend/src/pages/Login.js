import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Briefcase, Mail, Lock, KeyRound, AlertTriangle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const { login, isAuthenticated, changePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if user is authenticated and we're not already on dashboard
    if (isAuthenticated && window.location.pathname === '/login' && !showPasswordChange) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, showPasswordChange]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      if (result.requiresPasswordChange) {
        // Store temp password and show password change form
        setTempPassword(password);
        setShowPasswordChange(true);
        toast.warning('Debes cambiar tu contraseña temporal');
      } else {
        toast.success('¡Bienvenido!');
        // Redirect clients to their profile page, others to dashboard
        if (result.user?.role === 'client') {
          navigate(`/clients/${result.user.user_id}`);
        } else {
          navigate('/dashboard');
        }
      }
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setLoading(true);
    const result = await changePassword(tempPassword, newPassword);
    
    if (result.success) {
      toast.success('Contraseña actualizada exitosamente');
      setShowPasswordChange(false);
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  // Password change form
  if (showPasswordChange) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <div className="w-full max-w-md fade-in">
          <div className="text-center mb-8">
            <img src="/logo.webp" alt="ProManage" className="w-20 h-20 mx-auto mb-4 object-contain" />
            <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">ProManage</h1>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Cambio de contraseña requerido</span>
              </div>
              <CardTitle className="text-2xl font-semibold tracking-tight">Nueva Contraseña</CardTitle>
              <CardDescription>Por seguridad, debes cambiar tu contraseña temporal</CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordChange}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">La contraseña debe tener al menos 6 caracteres</p>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full rounded-full bg-orange-500 hover:bg-orange-600 font-medium"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <img src="/logo.webp" alt="ProManage" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">ProManage</h1>
          <p className="text-muted-foreground mt-2">Sistema de Gestión de Proyectos</p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight">Iniciar Sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    data-testid="login-email-input"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    data-testid="login-password-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                data-testid="login-submit-button"
                type="submit"
                className="w-full rounded-full bg-orange-500 hover:bg-orange-600 font-medium"
                disabled={loading}
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;