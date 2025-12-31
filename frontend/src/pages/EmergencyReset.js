import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { KeyRound, AlertTriangle } from 'lucide-react';
import { getBackendUrl } from '../utils/api';

const EmergencyReset = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    new_password: '',
    confirm_password: '',
    secret_key: ''
  });

  const API_URL = getBackendUrl();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.new_password !== form.confirm_password) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (form.new_password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/emergency-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          new_password: form.new_password,
          secret_key: form.secret_key
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Error en el reset');
      }
      
      toast.success('¡Contraseña actualizada! Redirigiendo al login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      console.error('Reset error:', error);
      toast.error(error.message || 'Error al resetear contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Reset de Emergencia</CardTitle>
          <CardDescription>
            Recupera el acceso a tu cuenta con la clave de emergencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email de la cuenta</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                placeholder="tu@email.com"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="secret_key">Clave de Emergencia</Label>
              <Input
                id="secret_key"
                type="text"
                value={form.secret_key}
                onChange={(e) => setForm({...form, secret_key: e.target.value})}
                placeholder="Clave proporcionada"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="new_password">Nueva Contraseña</Label>
              <Input
                id="new_password"
                type="password"
                value={form.new_password}
                onChange={(e) => setForm({...form, new_password: e.target.value})}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="confirm_password">Confirmar Contraseña</Label>
              <Input
                id="confirm_password"
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm({...form, confirm_password: e.target.value})}
                placeholder="Repite la contraseña"
                required
              />
            </div>
            
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
              {loading ? 'Procesando...' : 'Resetear Contraseña'}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Importante:</strong> Esta función es solo para emergencias. 
                Después de recuperar el acceso, cambia la clave de emergencia en el código.
              </p>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <Button variant="link" onClick={() => navigate('/login')}>
              Volver al Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyReset;
