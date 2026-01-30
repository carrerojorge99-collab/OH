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
import { Save, Mail, AlertCircle, Building2, Upload, Image, DollarSign, FileText, Hash, Plus, Trash2, Download, Database, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import api, { getBackendUrl } from '../utils/api';

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [laborRates, setLaborRates] = useState([]);
  const [editingRate, setEditingRate] = useState(null);
  const [rateForm, setRateForm] = useState({
    role_name: '',
    quoted_rate: 0,
    assumed_rate: 0,
    overtime_rate: 0
  });
  
  // Documents state
  const [documentsFromClient, setDocumentsFromClient] = useState([]);
  const [documentsToClient, setDocumentsToClient] = useState([]);
  const [newDocFromClient, setNewDocFromClient] = useState('');
  const [newDocToClient, setNewDocToClient] = useState('');
  
  // Nomenclatures state
  const [nomenclatures, setNomenclatures] = useState([]);
  const [nomenclatureForm, setNomenclatureForm] = useState({
    name: '',
    prefix: '',
    department_number: ''
  });
  const [editingNomenclature, setEditingNomenclature] = useState(null);
  
  // Payroll deductions state
  const [payrollSettings, setPayrollSettings] = useState({
    hacienda_percent: 0,
    social_security_percent: 6.2,
    medicare_percent: 1.45,
    contractor_percent: 10
  });
  
  // Tax types state
  const [taxTypes, setTaxTypes] = useState([]);
  const [taxTypeForm, setTaxTypeForm] = useState({
    name: '',
    percentage: 0,
    description: '',
    is_active: true
  });
  const [editingTaxType, setEditingTaxType] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  
  const [settings, setSettings] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',
    email_notifications_enabled: false,
    app_url: ''
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
    footer_text: '',
    next_invoice_number: 1,
    next_estimate_number: 1,
    next_po_number: 1,
    location_latitude: null,
    location_longitude: null,
    geofence_radius: 100,
    geofence_enabled: false,
    minimum_margin_percent: 15,
    max_punch_hours: 8,
    // Cost Estimate default percentages
    default_b2b_percentage: 4,
    default_cfse_percentage: 7,
    default_liability_percentage: 7,
    default_municipal_patent_percentage: 1
  });

  const API_URL = getBackendUrl();

  useEffect(() => {
    fetchSettings();
    fetchCompany();
    fetchLaborRates();
    fetchDocuments();
    fetchNomenclatures();
    fetchPayrollSettings();
    fetchTaxTypes();
  }, []);
  
  const fetchPayrollSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payroll-settings`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setPayrollSettings(data);
      }
    } catch (error) {
      console.error('Error fetching payroll settings');
    }
  };
  
  const handleSavePayrollSettings = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/payroll-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payrollSettings)
      });
      toast.success('Configuración de nómina guardada');
    } catch (error) {
      toast.error('Error al guardar');
    }
    setSaving(false);
  };

  // Tax Types functions
  const fetchTaxTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tax-types`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setTaxTypes(data);
      }
    } catch (error) {
      console.error('Error fetching tax types');
    }
  };

  const handleSaveTaxType = async (e) => {
    e.preventDefault();
    if (!taxTypeForm.name || taxTypeForm.percentage < 0) {
      toast.error('Complete los campos requeridos');
      return;
    }
    
    try {
      if (editingTaxType) {
        await fetch(`${API_URL}/api/tax-types/${editingTaxType.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(taxTypeForm)
        });
        toast.success('Tipo de impuesto actualizado');
      } else {
        await fetch(`${API_URL}/api/tax-types`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(taxTypeForm)
        });
        toast.success('Tipo de impuesto creado');
      }
      setTaxTypeForm({ name: '', percentage: 0, description: '', is_active: true });
      setEditingTaxType(null);
      fetchTaxTypes();
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  const handleDeleteTaxType = async (taxId) => {
    if (!window.confirm('¿Eliminar este tipo de impuesto?')) return;
    try {
      await fetch(`${API_URL}/api/tax-types/${taxId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      toast.success('Tipo de impuesto eliminado');
      fetchTaxTypes();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

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
          smtp_from_email: data.smtp_from_email || 'noreply@promanage.com',
          smtp_from_name: data.smtp_from_name || 'OHSMS ProManage',
          email_notifications_enabled: data.email_notifications_enabled || false,
          app_url: data.app_url || 'https://promanage.ohsmspr.com'
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

  const fetchLaborRates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/labor-rates?_t=${Date.now()}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setLaborRates(data);
      }
    } catch (error) {
      console.error('Error fetching labor rates:', error);
      toast.error('Error al cargar tarifas laborales');
    }
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingRate) {
        // Update existing rate
        const response = await fetch(`${API_URL}/api/labor-rates/${editingRate.rate_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(rateForm)
        });

        if (response.ok) {
          toast.success('Tarifa actualizada exitosamente');
          setEditingRate(null);
          setRateForm({ role_name: '', quoted_rate: 0, assumed_rate: 0, overtime_rate: 0 });
          fetchLaborRates();
        }
      } else {
        // Create new rate
        const response = await fetch(`${API_URL}/api/labor-rates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(rateForm)
        });

        if (response.ok) {
          toast.success('Tarifa creada exitosamente');
          setRateForm({ role_name: '', quoted_rate: 0, assumed_rate: 0, overtime_rate: 0 });
          fetchLaborRates();
        }
      }
    } catch (error) {
      toast.error('Error al guardar tarifa');
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditRate = (rate) => {
    setEditingRate(rate);
    setRateForm({
      role_name: rate.role_name,
      quoted_rate: rate.quoted_rate,
      assumed_rate: rate.assumed_rate,
      overtime_rate: rate.overtime_rate
    });
  };

  const handleDeleteRate = async (rateId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta tarifa?')) return;

    try {
      const response = await fetch(`${API_URL}/api/labor-rates/${rateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Tarifa eliminada');
        fetchLaborRates();
      }
    } catch (error) {
      toast.error('Error al eliminar tarifa');
    }
  };

  const handleCancelEdit = () => {
    setEditingRate(null);
    setRateForm({ role_name: '', quoted_rate: 0, assumed_rate: 0, overtime_rate: 0 });
  };

  // Documents functions
  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/required-documents`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setDocumentsFromClient(data.from_client || []);
        setDocumentsToClient(data.to_client || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleAddDocFromClient = async () => {
    if (!newDocFromClient.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/required-documents/from-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ document_name: newDocFromClient })
      });
      if (response.ok) {
        toast.success('Documento agregado');
        setNewDocFromClient('');
        fetchDocuments();
      }
    } catch (error) {
      toast.error('Error al agregar documento');
    }
  };

  const handleAddDocToClient = async () => {
    if (!newDocToClient.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/required-documents/to-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ document_name: newDocToClient })
      });
      if (response.ok) {
        toast.success('Documento agregado');
        setNewDocToClient('');
        fetchDocuments();
      }
    } catch (error) {
      toast.error('Error al agregar documento');
    }
  };

  const handleDeleteDoc = async (docId, type) => {
    try {
      await fetch(`${API_URL}/api/required-documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      toast.success('Documento eliminado');
      fetchDocuments();
    } catch (error) {
      toast.error('Error al eliminar documento');
    }
  };

  // Nomenclatures functions
  const fetchNomenclatures = async () => {
    try {
      const response = await fetch(`${API_URL}/api/nomenclatures`, { credentials: 'include' });
      if (response.ok) {
        setNomenclatures(await response.json());
      }
    } catch (error) {
      console.error('Error fetching nomenclatures:', error);
    }
  };

  const handleSaveNomenclature = async (e) => {
    e.preventDefault();
    try {
      if (editingNomenclature) {
        await fetch(`${API_URL}/api/nomenclatures/${editingNomenclature.nomenclature_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(nomenclatureForm)
        });
        toast.success('Nomenclatura actualizada');
        setEditingNomenclature(null);
      } else {
        await fetch(`${API_URL}/api/nomenclatures`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(nomenclatureForm)
        });
        toast.success('Nomenclatura creada');
      }
      setNomenclatureForm({ name: '', prefix: '', department_number: '' });
      fetchNomenclatures();
    } catch (error) {
      toast.error('Error al guardar nomenclatura');
    }
  };

  const handleDeleteNomenclature = async (id) => {
    if (!window.confirm('¿Eliminar esta nomenclatura?')) return;
    try {
      await fetch(`${API_URL}/api/nomenclatures/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      toast.success('Nomenclatura eliminada');
      fetchNomenclatures();
    } catch (error) {
      toast.error('Error al eliminar');
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
        smtp_from_email: settings.smtp_from_email,
        smtp_from_name: settings.smtp_from_name,
        email_notifications_enabled: settings.email_notifications_enabled,
        app_url: settings.app_url
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
        toast.success('Configuración SMTP guardada exitosamente');
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

  // Export all data
  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API_URL}/api/data/export`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al exportar');
      }
      
      const data = await response.json();
      
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_ohsms_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Datos exportados correctamente');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.message || 'Error al exportar datos');
    } finally {
      setExporting(false);
    }
  };

  // Import data from file
  const handleImportData = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!window.confirm('⚠️ ADVERTENCIA: Esto sobrescribirá datos existentes. ¿Deseas continuar?')) {
      event.target.value = '';
      return;
    }
    
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const response = await fetch(`${API_URL}/api/data/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al importar');
      }
      
      const result = await response.json();
      toast.success(result.message || 'Datos importados correctamente');
      
      // Reload page to show new data
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.message || 'Error al importar datos');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  // Clear all data function
  const [clearing, setClearing] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const handleClearAllData = async () => {
    if (!clearPassword) {
      toast.error('Ingresa tu contraseña para confirmar');
      return;
    }
    
    setClearing(true);
    try {
      const response = await fetch(`${API_URL}/api/data/clear-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: clearPassword })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al limpiar datos');
      }
      
      const result = await response.json();
      
      // Show detailed results
      const totalDeleted = result.total_deleted || 0;
      const details = Object.entries(result.results || {})
        .filter(([_, v]) => v.deleted > 0)
        .map(([k, v]) => `${k}: ${v.deleted}`)
        .join(', ');
      
      if (totalDeleted > 0) {
        toast.success(`✅ ${result.message}`);
        if (details) {
          console.log('Datos eliminados:', details);
        }
      } else {
        toast.info('No había datos para eliminar');
      }
      
      setShowClearConfirm(false);
      setClearPassword('');
      
      // Show details
      console.log('Clear results:', result.results);
      
      // Reload page
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Clear error:', error);
      toast.error(error.message || 'Error al limpiar datos');
    } finally {
      setClearing(false);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">Configuración del Sistema</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-2">Gestiona la información de tu empresa y configuraciones del sistema</p>
        </div>

        <Tabs defaultValue="company" className="space-y-4 sm:space-y-6">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-slate-100 rounded-lg w-full">
            <TabsTrigger value="company" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Empresa</span><span className="sm:hidden">Emp.</span>
            </TabsTrigger>
            <TabsTrigger value="labor-rates" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Tarifas</span><span className="sm:hidden">Tar.</span>
            </TabsTrigger>
            <TabsTrigger value="payroll" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Nómina</span><span className="sm:hidden">Nóm.</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Documentos</span><span className="sm:hidden">Doc.</span>
            </TabsTrigger>
            <TabsTrigger value="nomenclature" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
              <Hash className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Nomenclaturas</span><span className="sm:hidden">Nom.</span>
            </TabsTrigger>
            <TabsTrigger value="taxes" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Impuestos</span><span className="sm:hidden">Imp.</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
              <Mail className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Email</span><span className="sm:hidden">Email</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
              <Database className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Datos</span><span className="sm:hidden">Dat.</span>
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
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-4 border rounded-lg bg-slate-50">
                    <div className="flex-shrink-0">
                      {company.company_logo ? (
                        <img 
                          src={`${API_URL}${company.company_logo}`} 
                          alt="Logo de empresa" 
                          className="object-contain border rounded-lg bg-white p-2 w-32 h-32 sm:w-40 sm:h-40 md:w-[200px] md:h-[200px]"
                        />
                      ) : (
                        <div className="border-2 border-dashed rounded-lg flex items-center justify-center bg-white w-32 h-32 sm:w-40 sm:h-40 md:w-[200px] md:h-[200px]">
                          <Image className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <Label className="text-base font-medium">Logo de la Empresa</Label>
                      <p className="text-xs sm:text-sm text-slate-500">
                        Sube el logo de tu empresa. Formatos: JPG, PNG, GIF, WebP, SVG. Tamaño recomendado: 250x250px
                      </p>
                      <div className="flex justify-center sm:justify-start gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploadingLogo}
                          onClick={() => document.getElementById('logo-upload').click()}
                          className="text-sm"
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
                  <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  {/* Numeración de Documentos */}
                  <div className="p-4 border rounded-lg bg-blue-50 space-y-4">
                    <div>
                      <Label className="text-base font-medium">Numeración de Documentos</Label>
                      <p className="text-sm text-slate-500">Configure el próximo número a utilizar para cada tipo de documento</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="next_invoice_number">Próxima Factura (INV)</Label>
                        <Input
                          id="next_invoice_number"
                          type="number"
                          min="1"
                          value={company.next_invoice_number || 1}
                          onChange={(e) => setCompany(prev => ({ ...prev, next_invoice_number: parseInt(e.target.value) || 1 }))}
                        />
                        <p className="text-xs text-slate-500">INV-2025-{String(company.next_invoice_number || 1).padStart(4, '0')}</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="next_estimate_number">Próximo Estimado (EST)</Label>
                        <Input
                          id="next_estimate_number"
                          type="number"
                          min="1"
                          value={company.next_estimate_number || 1}
                          onChange={(e) => setCompany(prev => ({ ...prev, next_estimate_number: parseInt(e.target.value) || 1 }))}
                        />
                        <p className="text-xs text-slate-500">EST-2025-{String(company.next_estimate_number || 1).padStart(4, '0')}</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="next_po_number">Próxima Orden (PO)</Label>
                        <Input
                          id="next_po_number"
                          type="number"
                          min="1"
                          value={company.next_po_number || 1}
                          onChange={(e) => setCompany(prev => ({ ...prev, next_po_number: parseInt(e.target.value) || 1 }))}
                        />
                        <p className="text-xs text-slate-500">PO-2025-{String(company.next_po_number || 1).padStart(4, '0')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Geofencing - Ubicación General */}
                  <div className="p-4 border rounded-lg bg-green-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Restricción de Ubicación (Geofencing)</Label>
                        <p className="text-sm text-slate-500">Los empleados solo podrán ponchar dentro del área permitida</p>
                      </div>
                      <Switch
                        checked={company.geofence_enabled || false}
                        onCheckedChange={(checked) => setCompany(prev => ({ ...prev, geofence_enabled: checked }))}
                      />
                    </div>
                    
                    {company.geofence_enabled && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="location_latitude">Latitud</Label>
                            <Input
                              id="location_latitude"
                              type="number"
                              step="0.000001"
                              placeholder="18.4655"
                              value={company.location_latitude || ''}
                              onChange={(e) => setCompany(prev => ({ ...prev, location_latitude: parseFloat(e.target.value) || null }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="location_longitude">Longitud</Label>
                            <Input
                              id="location_longitude"
                              type="number"
                              step="0.000001"
                              placeholder="-66.1057"
                              value={company.location_longitude || ''}
                              onChange={(e) => setCompany(prev => ({ ...prev, location_longitude: parseFloat(e.target.value) || null }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="geofence_radius">Radio (metros)</Label>
                            <Input
                              id="geofence_radius"
                              type="number"
                              min="10"
                              max="1000"
                              value={company.geofence_radius || 100}
                              onChange={(e) => setCompany(prev => ({ ...prev, geofence_radius: parseInt(e.target.value) || 100 }))}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">
                          💡 Tip: Puedes obtener las coordenadas desde Google Maps (clic derecho → "¿Qué hay aquí?")
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Margen Mínimo */}
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <Label className="text-base font-medium">Margen Mínimo de Ganancia</Label>
                      <p className="text-sm text-slate-500">Alerta cuando un proyecto tenga margen menor al configurado</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="w-24"
                        value={company.minimum_margin_percent || 15}
                        onChange={(e) => setCompany(prev => ({ ...prev, minimum_margin_percent: parseInt(e.target.value) || 15 }))}
                      />
                      <span className="text-sm text-slate-600">%</span>
                    </div>
                  </div>

                  {/* Porcentajes Predeterminados para Estimaciones de Costos */}
                  <div className="p-4 border rounded-lg bg-amber-50 space-y-4">
                    <div>
                      <Label className="text-base font-medium">Porcentajes para Estimaciones de Costos</Label>
                      <p className="text-sm text-slate-500">Valores predeterminados que se usarán en las estimaciones de costos de contratistas</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="default_b2b_percentage">B2B (%)</Label>
                        <Input
                          id="default_b2b_percentage"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={company.default_b2b_percentage || 4}
                          onChange={(e) => setCompany(prev => ({ ...prev, default_b2b_percentage: parseFloat(e.target.value) || 0 }))}
                        />
                        <p className="text-xs text-slate-500">Aplica solo a Subcontratistas</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="default_cfse_percentage">CFSE (%)</Label>
                        <Input
                          id="default_cfse_percentage"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={company.default_cfse_percentage || 7}
                          onChange={(e) => setCompany(prev => ({ ...prev, default_cfse_percentage: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="default_liability_percentage">Liability (%)</Label>
                        <Input
                          id="default_liability_percentage"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={company.default_liability_percentage || 7}
                          onChange={(e) => setCompany(prev => ({ ...prev, default_liability_percentage: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="default_municipal_patent_percentage">Patente Municipal (%)</Label>
                        <Input
                          id="default_municipal_patent_percentage"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={company.default_municipal_patent_percentage || 1}
                          onChange={(e) => setCompany(prev => ({ ...prev, default_municipal_patent_percentage: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
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

          {/* Labor Rates Tab */}
          <TabsContent value="labor-rates">
            <Card>
              <CardHeader>
                <CardTitle>Tarifas Laborales</CardTitle>
                <CardDescription>
                  Configura las tarifas por hora para cada rol laboral. Estas tarifas se usarán en las estimaciones de costos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveRate} className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role_name">Nombre del Rol *</Label>
                      <Input
                        id="role_name"
                        placeholder="Ej: Project Manager"
                        value={rateForm.role_name}
                        onChange={(e) => setRateForm({ ...rateForm, role_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quoted_rate">Tarifa Cotizada ($) *</Label>
                      <Input
                        id="quoted_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={rateForm.quoted_rate}
                        onChange={(e) => setRateForm({ ...rateForm, quoted_rate: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assumed_rate">Tarifa Asumida ($) *</Label>
                      <Input
                        id="assumed_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={rateForm.assumed_rate}
                        onChange={(e) => setRateForm({ ...rateForm, assumed_rate: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overtime_rate">Tarifa Overtime ($) *</Label>
                      <Input
                        id="overtime_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={rateForm.overtime_rate}
                        onChange={(e) => setRateForm({ ...rateForm, overtime_rate: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Guardando...' : editingRate ? 'Actualizar' : 'Agregar Tarifa'}
                    </Button>
                    {editingRate && (
                      <Button type="button" variant="outline" onClick={handleCancelEdit}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>

                {/* Labor Rates Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Tarifas Configuradas</h3>
                  {laborRates.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>No hay tarifas configuradas. Agrega la primera tarifa arriba.</p>
                      <p className="text-sm mt-2">Sugerencia: Agrega los roles del Excel (Project Manager, Soldador, etc.)</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border rounded-lg">
                        <thead>
                          <tr className="bg-slate-50 border-b">
                            <th className="text-left p-3 font-semibold">Rol</th>
                            <th className="text-right p-3 font-semibold">Cotizada</th>
                            <th className="text-right p-3 font-semibold">Asumida</th>
                            <th className="text-right p-3 font-semibold">Overtime</th>
                            <th className="text-right p-3 font-semibold">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {laborRates.map((rate) => (
                            <tr key={rate.rate_id} className="border-b hover:bg-slate-50">
                              <td className="p-3 font-medium">{rate.role_name}</td>
                              <td className="p-3 text-right text-blue-600 font-semibold">
                                ${rate.quoted_rate.toFixed(2)}
                              </td>
                              <td className="p-3 text-right text-green-600 font-semibold">
                                ${rate.assumed_rate.toFixed(2)}
                              </td>
                              <td className="p-3 text-right text-amber-600 font-semibold">
                                ${rate.overtime_rate.toFixed(2)}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditRate(rate)}
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => handleDeleteRate(rate.rate_id)}
                                  >
                                    Eliminar
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Descuentos de Nómina</CardTitle>
                <CardDescription>Porcentajes de descuento para empleados y contratistas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Empleados de la Empresa</h4>
                  <p className="text-sm text-blue-600 mb-4">Estos descuentos aplican a empleados en nómina regular</p>
                  <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Hacienda (%)</Label>
                      <Input type="number" step="0.01" value={payrollSettings.hacienda_percent} onChange={(e) => setPayrollSettings({...payrollSettings, hacienda_percent: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div>
                      <Label>Seguro Social (%)</Label>
                      <Input type="number" step="0.01" value={payrollSettings.social_security_percent} onChange={(e) => setPayrollSettings({...payrollSettings, social_security_percent: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div>
                      <Label>Medicare (%)</Label>
                      <Input type="number" step="0.01" value={payrollSettings.medicare_percent} onChange={(e) => setPayrollSettings({...payrollSettings, medicare_percent: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <h4 className="font-medium text-amber-800 mb-2">Servicios Profesionales / Contratistas</h4>
                  <p className="text-sm text-amber-600 mb-4">Este descuento aplica a trabajadores por cuenta propia</p>
                  <div className="w-1/3">
                    <Label>Retención (%)</Label>
                    <Input type="number" step="0.01" value={payrollSettings.contractor_percent} onChange={(e) => setPayrollSettings({...payrollSettings, contractor_percent: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <Button onClick={handleSavePayrollSettings} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" /> {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Documentos que el Cliente Debe Enviar</CardTitle>
                  <CardDescription>Lista de documentos requeridos del cliente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Ej: Permiso de Construcción"
                      value={newDocFromClient}
                      onChange={(e) => setNewDocFromClient(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddDocFromClient()}
                    />
                    <Button onClick={handleAddDocFromClient}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <ul className="space-y-2">
                    {documentsFromClient.map((doc) => (
                      <li key={doc.document_id} className="flex justify-between p-2 border rounded">
                        <span>{doc.document_name}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteDoc(doc.document_id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Documentos que Debo Enviar al Cliente</CardTitle>
                  <CardDescription>Lista de documentos que debes entregar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Ej: Propuesta de Proyecto"
                      value={newDocToClient}
                      onChange={(e) => setNewDocToClient(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddDocToClient()}
                    />
                    <Button onClick={handleAddDocToClient}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <ul className="space-y-2">
                    {documentsToClient.map((doc) => (
                      <li key={doc.document_id} className="flex justify-between p-2 border rounded">
                        <span>{doc.document_name}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteDoc(doc.document_id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Nomenclature Tab */}
          <TabsContent value="nomenclature">
            <Card>
              <CardHeader>
                <CardTitle>Nomenclaturas para Documentos</CardTitle>
                <CardDescription>
                  Configura nomenclaturas personalizadas (Ej: A-2025-100-#, C-2025-101-#)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveNomenclature} className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        placeholder="Ej: Administrativa"
                        value={nomenclatureForm.name}
                        onChange={(e) => setNomenclatureForm({...nomenclatureForm, name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label>Prefijo (letra única)</Label>
                      <Input
                        placeholder="Ej: A"
                        maxLength={1}
                        value={nomenclatureForm.prefix}
                        onChange={(e) => setNomenclatureForm({...nomenclatureForm, prefix: e.target.value.toUpperCase()})}
                        required
                      />
                    </div>
                    <div>
                      <Label>Número Departamento</Label>
                      <Input
                        type="text"
                        value={nomenclatureForm.department_number}
                        onChange={(e) => setNomenclatureForm({...nomenclatureForm, department_number: e.target.value})}
                        placeholder="Ej: 101"
                      />
                    </div>
                  </div>
                  <Button type="submit">
                    {editingNomenclature ? 'Actualizar' : 'Agregar Nomenclatura'}
                  </Button>
                </form>

                <div className="space-y-2">
                  <h4 className="font-semibold">Nomenclaturas Configuradas</h4>
                  {nomenclatures.length === 0 ? (
                    <p className="text-slate-500 text-sm">No hay nomenclaturas configuradas</p>
                  ) : (
                    <div className="space-y-2">
                      {nomenclatures.map((nom) => (
                        <div key={nom.nomenclature_id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{nom.name} ({nom.prefix})</p>
                            <p className="text-sm text-slate-600">
                              Formato: {nom.prefix}-{new Date().getFullYear()}-{nom.department_number || '###'}-#
                            </p>
                            <p className="text-xs text-slate-500">
                              Próximo: {nom.prefix}-{new Date().getFullYear()}-{nom.department_number || '###'}-{nom.current_number || 1}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteNomenclature(nom.nomenclature_id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Taxes Tab */}
          <TabsContent value="taxes">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <CardTitle>Tipos de Impuesto</CardTitle>
                </div>
                <CardDescription>
                  Configure los tipos de impuesto para aplicar en facturas y estimados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add/Edit Tax Type Form */}
                <form onSubmit={handleSaveTaxType} className="p-4 border rounded-lg bg-slate-50">
                  <h3 className="font-medium mb-4">{editingTaxType ? 'Editar Tipo de Impuesto' : 'Nuevo Tipo de Impuesto'}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre *</Label>
                      <Input
                        placeholder="Ej: IVU 11.5%"
                        value={taxTypeForm.name}
                        onChange={(e) => setTaxTypeForm({ ...taxTypeForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Porcentaje (%) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="11.5"
                        value={taxTypeForm.percentage}
                        onChange={(e) => setTaxTypeForm({ ...taxTypeForm, percentage: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Descripción</Label>
                      <Input
                        placeholder="Descripción opcional"
                        value={taxTypeForm.description}
                        onChange={(e) => setTaxTypeForm({ ...taxTypeForm, description: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={taxTypeForm.is_active}
                        onCheckedChange={(checked) => setTaxTypeForm({ ...taxTypeForm, is_active: checked })}
                      />
                      <Label>Activo</Label>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      <Plus className="h-4 w-4 mr-2" />
                      {editingTaxType ? 'Actualizar' : 'Agregar'}
                    </Button>
                    {editingTaxType && (
                      <Button type="button" variant="outline" onClick={() => {
                        setEditingTaxType(null);
                        setTaxTypeForm({ name: '', percentage: 0, description: '', is_active: true });
                      }}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>

                {/* Tax Types List */}
                <div className="space-y-2">
                  <h3 className="font-medium">Tipos de Impuesto Configurados</h3>
                  {taxTypes.length === 0 ? (
                    <p className="text-slate-500 text-sm">No hay tipos de impuesto configurados</p>
                  ) : (
                    <div className="border rounded-lg divide-y">
                      {taxTypes.map((tax) => (
                        <div key={tax.id} className="flex items-center justify-between p-3 hover:bg-slate-50">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-medium">{tax.name}</p>
                              {tax.description && <p className="text-sm text-slate-500">{tax.description}</p>}
                            </div>
                            <span className="text-lg font-bold text-green-600">{tax.percentage}%</span>
                            {!tax.is_active && (
                              <span className="text-xs bg-slate-200 px-2 py-1 rounded">Inactivo</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingTaxType(tax);
                                setTaxTypeForm({
                                  name: tax.name,
                                  percentage: tax.percentage,
                                  description: tax.description || '',
                                  is_active: tax.is_active
                                });
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteTaxType(tax.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
                  placeholder="noreply@tuempresa.com"
                  value={settings.smtp_from_email}
                  onChange={(e) => setSettings(prev => ({ ...prev, smtp_from_email: e.target.value }))}
                />
                <p className="text-xs text-slate-500">El email que aparecerá como remitente en los correos enviados</p>
              </div>

              {/* From Name */}
              <div className="space-y-2">
                <Label htmlFor="smtp_from_name">Nombre remitente</Label>
                <Input
                  id="smtp_from_name"
                  type="text"
                  placeholder="Mi Empresa"
                  value={settings.smtp_from_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, smtp_from_name: e.target.value }))}
                />
                <p className="text-xs text-slate-500">El nombre que aparecerá como remitente en los correos enviados</p>
              </div>

              {/* App URL */}
              <div className="space-y-2">
                <Label htmlFor="app_url">URL de la Aplicación</Label>
                <Input
                  id="app_url"
                  type="url"
                  placeholder="https://promanage.ohsmspr.com"
                  value={settings.app_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, app_url: e.target.value }))}
                />
                <p className="text-xs text-slate-500">La URL que aparecerá en los botones de los emails (ej: "Ir a ProManage")</p>
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

          {/* Data Export/Import Tab */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Exportar / Importar Datos
                </CardTitle>
                <CardDescription>
                  Migra tus datos entre entornos (Preview → Producción)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Export Section */}
                <div className="p-6 border rounded-lg bg-blue-50 border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">📤 Exportar Datos</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Descarga un archivo JSON con todos los datos de la aplicación: usuarios, proyectos, clientes, facturas, empleados, configuración, etc.
                  </p>
                  <Button 
                    onClick={handleExportData} 
                    disabled={exporting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exporting ? 'Exportando...' : 'Exportar Todo'}
                  </Button>
                </div>

                {/* Import Section */}
                <div className="p-6 border rounded-lg bg-green-50 border-green-200">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">📥 Importar Datos</h3>
                  <p className="text-sm text-green-700 mb-4">
                    Carga un archivo de backup previamente exportado. Los datos existentes con el mismo ID serán actualizados.
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      disabled={importing}
                      className="hidden"
                      id="import-file"
                    />
                    <label htmlFor="import-file">
                      <Button 
                        asChild
                        disabled={importing}
                        className="bg-green-600 hover:bg-green-700 cursor-pointer"
                      >
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {importing ? 'Importando...' : 'Seleccionar Archivo'}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>

                {/* Clear All Data Section */}
                <div className="p-6 border rounded-lg bg-red-50 border-red-300">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">🗑️ Limpiar Todos los Datos</h3>
                  <p className="text-sm text-red-700 mb-4">
                    <strong>PELIGRO:</strong> Esta acción eliminará TODOS los datos de prueba: proyectos, clientes, facturas, empleados, registros de tiempo, etc. 
                    Solo se conservarán los usuarios y la configuración del sistema.
                  </p>
                  
                  {!showClearConfirm ? (
                    <Button 
                      onClick={() => setShowClearConfirm(true)}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpiar Todos los Datos
                    </Button>
                  ) : (
                    <div className="space-y-3 p-4 bg-red-100 rounded-lg">
                      <p className="text-sm font-medium text-red-900">
                        ⚠️ Confirma tu identidad ingresando tu contraseña:
                      </p>
                      <Input 
                        type="password"
                        placeholder="Tu contraseña de Super Admin"
                        value={clearPassword}
                        onChange={(e) => setClearPassword(e.target.value)}
                        className="max-w-xs"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleClearAllData}
                          disabled={clearing || !clearPassword}
                          variant="destructive"
                        >
                          {clearing ? 'Limpiando...' : 'Confirmar Limpieza'}
                        </Button>
                        <Button 
                          onClick={() => {
                            setShowClearConfirm(false);
                            setClearPassword('');
                          }}
                          variant="outline"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                  <h4 className="font-semibold text-amber-900 mb-2">⚠️ Instrucciones para Migración</h4>
                  <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                    <li><strong>En Preview:</strong> Haz clic en "Exportar Todo" y guarda el archivo</li>
                    <li><strong>En Producción:</strong> Ve a Configuración → Datos</li>
                    <li>Haz clic en "Seleccionar Archivo" y sube el archivo exportado</li>
                    <li>Espera a que se complete la importación</li>
                  </ol>
                </div>

                {/* Migrate Estimates to Client Profiles */}
                <div className="p-6 border rounded-lg bg-blue-50 border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">📋 Migrar Estimados a Clientes</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Esta función vincula los estimados existentes con perfiles de clientes. 
                    Si un cliente no existe, se creará automáticamente con la información del estimado.
                    <strong> Ejecutar después de actualizar la aplicación.</strong>
                  </p>
                  <Button 
                    onClick={async () => {
                      try {
                        toast.info('Ejecutando migración...');
                        const response = await api.post('/migrate/estimates-to-client-profiles', {}, { withCredentials: true });
                        const data = response.data;
                        if (data.errors && data.errors.length > 0) {
                          toast.warning(`Migración con advertencias: ${data.estimates_migrated} migrados. Errores: ${data.errors.length}`);
                          console.log('Migration errors:', data.errors);
                        } else {
                          toast.success(
                            `Migración completada: ${data.estimates_migrated} estimados migrados, ${data.new_profiles_created} clientes creados`
                          );
                        }
                      } catch (error) {
                        console.error('Migration error:', error);
                        const errorMsg = error.response?.data?.detail || error.message || 'Error desconocido';
                        toast.error(`Error: ${errorMsg}`);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Migrar Estimados
                  </Button>
                </div>

                {/* Clear Browser Cache */}
                <div className="p-6 border rounded-lg bg-purple-50 border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">🔄 Limpiar Caché del Navegador</h3>
                  <p className="text-sm text-purple-700 mb-4">
                    Si la aplicación no muestra los cambios más recientes, limpia el caché del navegador.
                  </p>
                  <Button 
                    onClick={() => {
                      // Clear service worker cache
                      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
                      }
                      // Clear browser caches
                      if ('caches' in window) {
                        caches.keys().then(names => {
                          names.forEach(name => caches.delete(name));
                        });
                      }
                      // Clear storage
                      localStorage.clear();
                      sessionStorage.clear();
                      toast.success('Caché limpiado. La página se recargará...');
                      setTimeout(() => {
                        window.location.reload(true);
                      }, 1500);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Limpiar Caché y Recargar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;