import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Zap, MessageSquare, Calendar, Github, FileSpreadsheet, TestTube, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Integrations = () => {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);

  const [slackForm, setSlackForm] = useState({
    webhook_url: ''
  });

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await axios.get(`${API}/integrations`, { withCredentials: true });
      setIntegrations(response.data);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIntegration = async (integrationType, currentEnabled, config) => {
    try {
      await axios.post(
        `${API}/integrations`,
        null,
        {
          params: {
            integration_type: integrationType,
            enabled: !currentEnabled
          },
          data: { config },
          withCredentials: true
        }
      );
      toast.success(currentEnabled ? 'Integración desactivada' : 'Integración activada');
      loadIntegrations();
    } catch (error) {
      toast.error('Error al actualizar integración');
    }
  };

  const handleConfigureSlack = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        `${API}/integrations`,
        null,
        {
          params: {
            integration_type: 'slack',
            enabled: true
          },
          data: { config: slackForm },
          withCredentials: true
        }
      );
      toast.success('Integración de Slack configurada');
      setDialogOpen(false);
      setSlackForm({ webhook_url: '' });
      loadIntegrations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al configurar Slack');
    }
  };

  const handleTestSlack = async () => {
    try {
      await axios.post(
        `${API}/integrations/test-slack`,
        null,
        {
          params: { webhook_url: slackForm.webhook_url },
          withCredentials: true
        }
      );
      toast.success('Mensaje de prueba enviado a Slack');
    } catch (error) {
      toast.error('Error al enviar prueba');
    }
  };

  const handleDeleteIntegration = async (integrationId, integrationType) => {
    if (!window.confirm(`¿Eliminar integración de ${integrationType}?`)) return;

    try {
      await axios.delete(`${API}/integrations/${integrationId}`, { withCredentials: true });
      toast.success('Integración eliminada');
      loadIntegrations();
    } catch (error) {
      toast.error('Error al eliminar integración');
    }
  };

  const getIntegrationByType = (type) => {
    return integrations.find(i => i.integration_type === type);
  };

  const integrationsConfig = [
    {
      type: 'slack',
      name: 'Slack',
      icon: MessageSquare,
      color: 'purple',
      description: 'Recibe notificaciones en tiempo real de eventos importantes',
      features: [
        'Notificación de nuevos proyectos',
        'Alertas de pagos recibidos',
        'Facturas pagadas',
        'Proyectos atrasados'
      ],
      status: getIntegrationByType('slack')?.enabled ? 'active' : 'inactive',
      available: true
    },
    {
      type: 'google_calendar',
      name: 'Google Calendar',
      icon: Calendar,
      color: 'blue',
      description: 'Sincroniza proyectos y tareas con tu calendario',
      features: [
        'Sincronización bidireccional',
        'Eventos de proyectos',
        'Recordatorios de deadlines',
        'Vista de calendario unificada'
      ],
      status: 'coming_soon',
      available: false
    },
    {
      type: 'github',
      name: 'GitHub',
      icon: Github,
      color: 'slate',
      description: 'Conecta tus repositorios y trackea commits',
      features: [
        'Vincular commits a tareas',
        'Pull requests en proyectos',
        'Estado de builds',
        'Métricas de código'
      ],
      status: 'coming_soon',
      available: false
    },
    {
      type: 'excel',
      name: 'Excel Export',
      icon: FileSpreadsheet,
      color: 'green',
      description: 'Exporta automáticamente reportes',
      features: [
        'Timesheet a Excel',
        'Salarios a Excel',
        'Reportes programados',
        'Templates personalizados'
      ],
      status: 'active',
      available: true,
      builtin: true
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Cargando integraciones...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">Integraciones</h1>
          <p className="text-muted-foreground mt-2">Conecta tus herramientas favoritas para automatizar tu flujo de trabajo</p>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrationsConfig.map((integration) => {
            const Icon = integration.icon;
            const existing = getIntegrationByType(integration.type);
            const isActive = existing?.enabled || false;

            return (
              <Card key={integration.type} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg bg-${integration.color}-100 flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 text-${integration.color}-600`} />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{integration.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {integration.status === 'active' && isActive && (
                            <Badge className="bg-green-100 text-green-700">Activa</Badge>
                          )}
                          {integration.status === 'inactive' && (
                            <Badge className="bg-slate-100 text-slate-700">Inactiva</Badge>
                          )}
                          {integration.status === 'coming_soon' && (
                            <Badge className="bg-blue-100 text-blue-700">Próximamente</Badge>
                          )}
                          {integration.builtin && (
                            <Badge className="bg-purple-100 text-purple-700">Integrada</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {integration.available && !integration.builtin && (
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => {
                          if (existing) {
                            handleToggleIntegration(integration.type, isActive, existing.config);
                          } else if (integration.type === 'slack') {
                            setSelectedIntegration(integration);
                            setDialogOpen(true);
                          }
                        }}
                        disabled={!existing && integration.type !== 'slack'}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">{integration.description}</CardDescription>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium text-slate-600">Características:</p>
                    <ul className="space-y-1">
                      {integration.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                          <span className="text-green-500">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    {integration.type === 'slack' && existing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSlackForm({ webhook_url: existing.config.webhook_url || '' });
                            setSelectedIntegration(integration);
                            setDialogOpen(true);
                          }}
                        >
                          Configurar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteIntegration(existing.integration_id, integration.name)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    {integration.type === 'slack' && !existing && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setDialogOpen(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Configurar Slack
                      </Button>
                    )}

                    {!integration.available && (
                      <Button size="sm" disabled>
                        Próximamente
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Slack Configuration Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Configurar Integración de Slack</DialogTitle>
              <DialogDescription>
                Conecta tu workspace de Slack para recibir notificaciones automáticas
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleConfigureSlack}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook_url">Webhook URL de Slack *</Label>
                  <Input
                    id="webhook_url"
                    value={slackForm.webhook_url}
                    onChange={(e) => setSlackForm({ ...slackForm, webhook_url: e.target.value })}
                    required
                    placeholder="https://hooks.slack.com/services/..."
                  />
                  <p className="text-xs text-slate-500">
                    <a
                      href="https://api.slack.com/messaging/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      ¿Cómo obtener mi Webhook URL? <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2">📬 Notificaciones que recibirás:</h4>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>• Nuevos proyectos creados</li>
                    <li>• Pagos recibidos</li>
                    <li>• Facturas completamente pagadas</li>
                    <li>• Proyectos con retrasos</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestSlack}
                  disabled={!slackForm.webhook_url}
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Probar Conexión
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Guardar Configuración
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Documentation Card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Zap className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Potencia tu flujo de trabajo</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Las integraciones te permiten conectar tu sistema de gestión con las herramientas que usas diariamente.
                  Automatiza notificaciones, sincroniza calendarios y mantén todo tu equipo informado.
                </p>
                <p className="text-xs text-slate-500">
                  ¿Necesitas una integración específica? Contáctanos para solicitar nuevas integraciones.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Integrations;
