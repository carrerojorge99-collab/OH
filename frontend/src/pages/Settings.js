import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { Settings as SettingsIcon, Mail, Server, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',
    email_notifications_enabled: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`, { withCredentials: true });
      setSettings(response.data);
    } catch (error) {
      toast.error('Error al cargar configuración');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, settings, { withCredentials: true });
      toast.success('Configuración guardada. Reinicia el backend para aplicar cambios.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar configuración');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Cargando configuración...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 fade-in max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] flex items-center gap-3">
            <SettingsIcon className="w-10 h-10" />
            Configuración
          </h1>
          <p className="text-muted-foreground mt-2">Administra las configuraciones del sistema</p>
        </div>

        {/* SMTP Configuration */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Notificaciones por Email (SMTP)
            </CardTitle>
            <CardDescription>
              Configura el servidor SMTP para enviar notificaciones automáticas por correo electrónico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable Switch */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                <Label htmlFor="email-enabled" className="text-base font-semibold">
                  Activar Notificaciones por Email
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  Los usuarios recibirán emails cuando se les asigne tareas, se completen o haya comentarios
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={settings.email_notifications_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, email_notifications_enabled: checked })}
                data-testid="email-notifications-switch"
              />
            </div>

            {settings.email_notifications_enabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Después de guardar la configuración, debes reiniciar el backend para aplicar los cambios.
                  Comando: <code className="bg-slate-100 px-2 py-1 rounded">sudo supervisorctl restart backend</code>
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* SMTP Server Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Server className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold">Configuración del Servidor SMTP</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">Servidor SMTP</Label>
                  <Input
                    id="smtp-host"
                    value={settings.smtp_host}
                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    disabled
                  />
                  <p className="text-xs text-slate-500">Host del servidor SMTP</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Puerto</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                    disabled
                  />
                  <p className="text-xs text-slate-500">Puerto TLS (587) o SSL (465)</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-user">Usuario / Email</Label>
                <Input
                  id="smtp-user"
                  type="email"
                  value={settings.smtp_user}
                  onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                  placeholder="tu_email@gmail.com"
                  data-testid="smtp-user-input"
                />
                <p className="text-xs text-slate-500">Email que se usará para enviar notificaciones</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-password">Contraseña</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={settings.smtp_password}
                  onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                  placeholder="••••••••••••••••"
                  data-testid="smtp-password-input"
                />
                <p className="text-xs text-slate-500">
                  Para Gmail, usa una <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">App Password</a> (no tu contraseña normal)
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-from-email">Email Remitente</Label>
                  <Input
                    id="smtp-from-email"
                    type="email"
                    value={settings.smtp_from_email}
                    onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })}
                    disabled
                  />
                  <p className="text-xs text-slate-500">Email que aparecerá como remitente</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-from-name">Nombre Remitente</Label>
                  <Input
                    id="smtp-from-name"
                    value={settings.smtp_from_name}
                    onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
                    disabled
                  />
                  <p className="text-xs text-slate-500">Nombre que aparecerá como remitente</p>
                </div>
              </div>
            </div>

            {/* Example */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Ejemplo de configuración para Gmail:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Servidor: smtp.gmail.com</li>
                  <li>Puerto: 587</li>
                  <li>Usuario: tu_email@gmail.com</li>
                  <li>Contraseña: Genera una "App Password" en tu cuenta de Google</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving || !settings.smtp_user}
                className="rounded-full bg-blue-600 hover:bg-blue-700"
                data-testid="save-settings-button"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Estado del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <span className="font-medium">Notificaciones Email:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  settings.email_notifications_enabled && settings.smtp_user
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {settings.email_notifications_enabled && settings.smtp_user ? 'Activado' : 'Desactivado'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <span className="font-medium">SMTP Configurado:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  settings.smtp_user ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {settings.smtp_user ? 'Sí' : 'Pendiente'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
