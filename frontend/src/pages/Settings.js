import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Save, Mail, AlertCircle, Building2, Upload, Image } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [settings, setSettings] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',
    email_notifications_enabled: false
  });
  const [company, setCompany] = useState({
    company_name: '',
    company_logo: null,
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    tax_id: '',
    currency: 'USD',
    footer_text: ''
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchSettings();
    fetchCompany();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings?_t=${Date.now()}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSettings({
          smtp_host: data.smtp_host || 'smtp.gmail.com',
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || '',
          smtp_password: '',
          smtp_from_email: data.smtp_from_email || 'noreply@proyecthub.com',
          smtp_from_name: data.smtp_from_name || 'ProyectHub',
          email_notifications_enabled: data.email_notifications_enabled || false
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompany = async () => {
    try {
      const response = await fetch(`${API_URL}/api/company?_t=${Date.now()}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCompany(data);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSavingCompany(true);

    try {
      const response = await fetch(`${API_URL}/api/company`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(company)
      });

      if (response.ok) {
        toast.success('Información de empresa guardada');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error al guardar la información');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/company/logo`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setCompany(prev => ({ ...prev, company_logo: data.logo_url }));
        toast.success('Logo subido exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al subir el logo');
      }
    } catch (error) {
      toast.error('Error al subir el logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        smtp_user: settings.smtp_user,
        email_notifications_enabled: settings.email_notifications_enabled
      };

      if (settings.smtp_password) {
        payload.smtp_password = settings.smtp_password;
      }

      const response = await fetch(`${API_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Configuración guardada exitosamente');
        toast.info('Se requiere reinicio del backend para aplicar cambios');
        setSettings(prev => ({ ...prev, smtp_password: '' }));
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No tienes permisos para acceder a esta página. Solo los administradores pueden configurar el sistema.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-slate-500">Cargando configuración...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0F172A]">Configuración del Sistema</h1>
          <p className="text-slate-500 mt-2">Gestiona la información de tu empresa y configuraciones del sistema</p>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Empresa
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email SMTP
            </TabsTrigger>
          </TabsList>

          {/* Company Tab */}
          <TabsContent value="company">
            <form onSubmit={handleSaveCompany}>
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <CardTitle>Información de la Empresa</CardTitle>
                  </div>
                  <CardDescription>
                    Esta información aparecerá en facturas, estimados y documentos generados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo Section */}
                  <div className="flex items-start gap-6 p-4 border rounded-lg bg-slate-50">
                    <div className="flex-shrink-0">
                      {company.company_logo ? (
                        <img 
                          src={`${API_URL}${company.company_logo}`} 
                          alt="Logo de empresa" 
                          className="w-32 h-32 object-contain border rounded-lg bg-white p-2"
                        />
                      ) : (
                        <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-white">
                          <Image className="h-12 w-12 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-base font-medium">Logo de la Empresa</Label>
                      <p className="text-sm text-slate-500">
                        Sube el logo de tu empresa. Formatos: JPG, PNG, GIF, WebP, SVG. Tamaño recomendado: 200x200px
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploadingLogo}
                          onClick={() => document.getElementById('logo-upload').click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                        </Button>
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nombre de la Empresa *</Label>
                    <Input
                      id="company_name"
                      placeholder="Mi Empresa S.A."
                      value={company.company_name}
                      onChange={(e) => setCompany(prev => ({ ...prev, company_name: e.target.value }))}
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      placeholder="Calle Principal #123"
                      value={company.address}
                      onChange={(e) => setCompany(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  {/* City, State, Zip */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Ciudad</Label>
                      <Input
                        id="city"
                        placeholder="San Juan"
                        value={company.city}
                        onChange={(e) => setCompany(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado/Provincia</Label>
                      <Input
                        id="state"
                        placeholder="PR"
                        value={company.state}
                        onChange={(e) => setCompany(prev => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">Código Postal</Label>
                      <Input
                        id="zip_code"
                        placeholder="00901"
                        value={company.zip_code}
                        onChange={(e) => setCompany(prev => ({ ...prev, zip_code: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <Input
                      id="country"
                      placeholder="Puerto Rico"
                      value={company.country}
                      onChange={(e) => setCompany(prev => ({ ...prev, country: e.target.value }))}
                    />
                  </div>

                  {/* Phone & Email */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        placeholder="(787) 555-1234"
                        value={company.phone}
                        onChange={(e) => setCompany(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="info@miempresa.com"
                        value={company.email}
                        onChange={(e) => setCompany(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Website & Tax ID */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">Sitio Web</Label>
                      <Input
                        id="website"
                        placeholder="https://www.miempresa.com"
                        value={company.website}
                        onChange={(e) => setCompany(prev => ({ ...prev, website: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax_id">ID Fiscal / RUC / EIN</Label>
                      <Input
                        id="tax_id"
                        placeholder="XX-XXXXXXX"
                        value={company.tax_id}
                        onChange={(e) => setCompany(prev => ({ ...prev, tax_id: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Footer Text */}
                  <div className="space-y-2">
                    <Label htmlFor="footer_text">Texto de Pie de Página</Label>
                    <Textarea
                      id="footer_text"
                      placeholder="Texto que aparecerá al final de facturas y documentos..."
                      value={company.footer_text}
                      onChange={(e) => setCompany(prev => ({ ...prev, footer_text: e.target.value }))}
                      rows={3}
                    />
                    <p className="text-xs text-slate-500">Este texto aparecerá en el pie de página de facturas, estimados y órdenes de compra</p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={savingCompany} className="flex items-center space-x-2">
                      <Save className="h-4 w-4" />
                      <span>{savingCompany ? 'Guardando...' : 'Guardar Información'}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email">
            <form onSubmit={handleSave}>
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <CardTitle>Configuración SMTP</CardTitle>
                  </div>
                  <CardDescription>
                    Configura el servidor SMTP para enviar notificaciones por correo electrónico
                  </CardDescription>
                </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Notifications */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Notificaciones por Email</Label>
                  <p className="text-sm text-slate-500">
                    Habilita o deshabilita el envío de notificaciones por correo electrónico
                  </p>
                </div>
                <Switch
                  checked={settings.email_notifications_enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, email_notifications_enabled: checked }))}
                />
              </div>

              {/* Info Alert */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Servidor SMTP configurado:</strong> {settings.smtp_host}:{settings.smtp_port}
                  <br />
                  Para Gmail, necesitas generar una "Contraseña de aplicación" desde tu cuenta de Google.
                </AlertDescription>
              </Alert>

              {/* SMTP User */}
              <div className="space-y-2">
                <Label htmlFor="smtp_user">Usuario SMTP (Email)</Label>
                <Input
                  id="smtp_user"
                  type="email"
                  placeholder="tu-email@gmail.com"
                  value={settings.smtp_user}
                  onChange={(e) => setSettings(prev => ({ ...prev, smtp_user: e.target.value }))}
                  required
                />
                <p className="text-xs text-slate-500">El email que se usará para autenticar con el servidor SMTP</p>
              </div>

              {/* SMTP Password */}
              <div className="space-y-2">
                <Label htmlFor="smtp_password">Contraseña SMTP</Label>
                <Input
                  id="smtp_password"
                  type="password"
                  placeholder="Deja vacío para mantener la actual"
                  value={settings.smtp_password}
                  onChange={(e) => setSettings(prev => ({ ...prev, smtp_password: e.target.value }))}
                />
                <p className="text-xs text-slate-500">
                  Para Gmail, usa una contraseña de aplicación. Deja vacío para no cambiar la contraseña actual.
                </p>
              </div>

              {/* From Email */}
              <div className="space-y-2">
                <Label htmlFor="smtp_from_email">Email remitente</Label>
                <Input
                  id="smtp_from_email"
                  type="email"
                  value={settings.smtp_from_email}
                  onChange={(e) => setSettings(prev => ({ ...prev, smtp_from_email: e.target.value }))}
                  disabled
                />
                <p className="text-xs text-slate-500">El email que aparecerá como remitente (configurado en servidor)</p>
              </div>

              {/* From Name */}
              <div className="space-y-2">
                <Label htmlFor="smtp_from_name">Nombre remitente</Label>
                <Input
                  id="smtp_from_name"
                  type="text"
                  value={settings.smtp_from_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, smtp_from_name: e.target.value }))}
                  disabled
                />
                <p className="text-xs text-slate-500">El nombre que aparecerá como remitente (configurado en servidor)</p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving} className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Cómo configurar Gmail</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                <li>Ve a tu <strong>Cuenta de Google</strong></li>
                <li>Navega a <strong>Seguridad → Verificación en dos pasos</strong> (debe estar activada)</li>
                <li>Ve a <strong>Contraseñas de aplicación</strong></li>
                <li>Selecciona "Correo" y "Otro (nombre personalizado)"</li>
                <li>Genera la contraseña y cópiala</li>
                <li>Pega esa contraseña en el campo "Contraseña SMTP" arriba</li>
              </ol>
            </CardContent>
          </Card>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;