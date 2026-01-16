import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  FileText, Plus, Trash2, Send, CheckCircle, XCircle, Copy, 
  ArrowRight, DollarSign, Calendar, User, Mail, Phone, MapPin,
  Download, Edit, MoreHorizontal, RefreshCw, Building2, Users, Clock, Calculator
} from 'lucide-react';
import { fetchCompanyInfo, addDocumentHeader, addPartySection, addTasksTable, addTotalsSection, addNotesSection, addFooter, formatCurrency } from '../utils/pdfGenerator';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import NomenclatureSelector, { useNomenclature } from '../components/NomenclatureSelector';

moment.locale('es');

// Función para limpiar HTML y convertir a texto plano
const stripHtml = (html) => {
  if (!html) return '';
  // Crear un elemento temporal para parsear HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  // Reemplazar <br>, <p>, <li> con saltos de línea
  let text = temp.innerHTML
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
  // Remover todas las demás etiquetas HTML
  temp.innerHTML = text;
  return temp.textContent || temp.innerText || '';
};

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  converted: 'bg-purple-100 text-purple-700'
};

const statusLabels = {
  draft: 'Borrador',
  sent: 'Enviado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  converted: 'Convertido'
};

const Estimates = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [estimates, setEstimates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [taxTypes, setTaxTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  // Start with 'all' and update to current year if data exists
  const [yearFilter, setYearFilter] = useState('all');
  const [yearInitialized, setYearInitialized] = useState(false);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const total = estimates.reduce((sum, e) => sum + (e.total || 0), 0);
    const approved = estimates.filter(e => e.status === 'approved');
    const approvedTotal = approved.reduce((sum, e) => sum + (e.total || 0), 0);
    const pending = estimates.filter(e => e.status === 'pending' || e.status === 'sent');
    const pendingTotal = pending.reduce((sum, e) => sum + (e.total || 0), 0);
    const draft = estimates.filter(e => e.status === 'draft');
    const draftTotal = draft.reduce((sum, e) => sum + (e.total || 0), 0);
    return { total, approved, approvedTotal, pending, pendingTotal, draft, draftTotal };
  }, [estimates]);

  // Generate available years from estimates
  const availableYears = useMemo(() => {
    const years = new Set();
    estimates.forEach(e => {
      if (e.created_at) {
        years.add(new Date(e.created_at).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [estimates]);

  // Filter estimates by year
  const filteredEstimates = useMemo(() => {
    if (yearFilter === 'all') return estimates;
    return estimates.filter(e => {
      const year = e.created_at ? new Date(e.created_at).getFullYear() : new Date().getFullYear();
      return year === parseInt(yearFilter);
    });
  }, [estimates, yearFilter]);

  // Auto-set year filter to current year if available
  useEffect(() => {
    if (!yearInitialized && estimates.length > 0) {
      const currentYear = new Date().getFullYear();
      if (availableYears.includes(currentYear)) {
        setYearFilter(currentYear.toString());
      }
      setYearInitialized(true);
    }
  }, [estimates, availableYears, yearInitialized]);
  
  const [form, setForm] = useState({
    project_id: '',
    client_profile_id: '',
    client_company: '', // Company/Business name
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    title: '',
    description: '',
    items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
    tax_rate: 0,
    selected_taxes: [], // Array of {name, percentage}
    discount_percent: 0,
    notes: '',
    terms: 'Este estimado es válido por 30 días.',
    valid_until: moment().add(30, 'days').format('YYYY-MM-DD'),
    custom_number: ''
  });

  const [savedClients, setSavedClients] = useState([]);
  const [clientProfiles, setClientProfiles] = useState([]);

  const { nomenclatures, selectedNomenclature, generatedNumber, handleSelectNomenclature } = useNomenclature(
    (number) => setForm(prev => ({ ...prev, custom_number: number }))
  );

  useEffect(() => {
    loadData();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadData, 30000);
    
    // Refresh cuando la ventana vuelve a estar visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Handle query params from client profile page
  useEffect(() => {
    const clientProfileId = searchParams.get('client_profile_id');
    const company = searchParams.get('company');
    const contact = searchParams.get('contact');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const address = searchParams.get('address');
    
    if (clientProfileId) {
      setForm(prev => ({
        ...prev,
        client_profile_id: clientProfileId,
        client_company: company || '',
        client_name: contact || '',
        client_email: email || '',
        client_phone: phone || '',
        client_address: address || ''
      }));
      setDialogOpen(true);
      // Clear the query params
      setSearchParams({});
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      const [estimatesRes, projectsRes, taxTypesRes, clientsRes, profilesRes] = await Promise.all([
        api.get(`/estimates`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        api.get(`/projects`, { withCredentials: true, headers: { 'Cache-Control': 'no-cache' } }),
        api.get(`/tax-types`, { withCredentials: true }).catch(() => ({ data: [] })),
        api.get(`/clients`, { withCredentials: true }).catch(() => ({ data: [] })),
        api.get(`/client-profiles`, { withCredentials: true }).catch(() => ({ data: [] }))
      ]);
      setEstimates(estimatesRes.data || []);
      setProjects(projectsRes.data || []);
      setTaxTypes(taxTypesRes.data || []);
      setSavedClients(clientsRes.data || []);
      setClientProfiles(profilesRes.data || []);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      project_id: '',
      client_profile_id: '',
      client_company: '',
      client_name: '',
      client_email: '',
      client_phone: '',
      client_address: '',
      title: '',
      description: '',
      items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
      tax_rate: 0,
      selected_taxes: [],
      discount_percent: 0,
      notes: '',
      terms: 'Este estimado es válido por 30 días.',
      valid_until: moment().add(30, 'days').format('YYYY-MM-DD'),
      custom_number: ''
    });
    setEditingEstimate(null);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = parseFloat(newItems[index].quantity || 0) * parseFloat(newItems[index].unit_price || 0);
    }
    
    setForm({ ...form, items: newItems });
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]
    });
  };

  const removeItem = (index) => {
    if (form.items.length === 1) return;
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  };

  const calculateTotals = () => {
    const subtotal = form.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const discountAmount = subtotal * (parseFloat(form.discount_percent) || 0) / 100;
    const taxableAmount = subtotal - discountAmount;
    // Calculate tax from selected taxes
    const totalTaxRate = form.selected_taxes.reduce((sum, t) => sum + (t.percentage || 0), 0);
    const taxAmount = taxableAmount * totalTaxRate / 100;
    const total = taxableAmount + taxAmount;
    // Calculate individual tax amounts for display
    const taxDetails = form.selected_taxes.map(t => ({
      name: t.name,
      percentage: t.percentage,
      amount: taxableAmount * t.percentage / 100
    }));
    return { subtotal, discountAmount, taxAmount, total, taxDetails };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.client_name || !form.title || form.items.length === 0) {
      toast.error('Complete los campos requeridos');
      return;
    }

    // Calculate total tax rate from selected taxes
    const totalTaxRate = form.selected_taxes.reduce((sum, t) => sum + (t.percentage || 0), 0);

    try {
      // First, find or create client profile to get profile_id
      let clientProfileId = form.client_profile_id || null;
      
      if (!editingEstimate && (form.client_email || form.client_company)) {
        try {
          const profileData = {
            company_name: form.client_company || '',
            contact_name: form.client_name,
            email: form.client_email || '',
            phone: form.client_phone || '',
            address: form.client_address || ''
          };
          const profileRes = await api.post('/client-profiles/find-or-create', profileData, { withCredentials: true });
          clientProfileId = profileRes.data.profile?.profile_id || null;
          if (!profileRes.data.found) {
            toast.info('Perfil de cliente creado automáticamente');
          }
        } catch (profileErr) {
          console.log('Could not save client profile:', profileErr);
        }
      }

      const payload = {
        ...form,
        project_id: form.project_id || null,
        client_profile_id: clientProfileId,
        items: form.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.amount) || 0
        })),
        tax_rate: totalTaxRate,
        selected_taxes: form.selected_taxes,
        discount_percent: parseFloat(form.discount_percent) || 0
      };

      if (editingEstimate) {
        await api.put(`/estimates/${editingEstimate}`, payload, { withCredentials: true });
        toast.success('Estimado actualizado');
      } else {
        await api.post(`/estimates`, payload, { withCredentials: true });
        toast.success('Estimado creado');
      }
      
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar estimado');
    }
  };

  // Function to fill form with saved client profile
  const handleSelectClientProfile = (profile) => {
    if (!profile) return;
    setForm(prev => ({
      ...prev,
      client_profile_id: profile.profile_id || '',
      client_company: profile.company_name || '',
      client_name: profile.contact_name || '',
      client_email: profile.email || '',
      client_phone: profile.phone || '',
      client_address: profile.address || ''
    }));
    toast.success('Datos del cliente cargados');
  };

  const handleEdit = (estimate) => {
    setEditingEstimate(estimate.estimate_id);
    // Parse selected_taxes from stored data
    let selectedTaxes = estimate.selected_taxes || [];
    // Backward compatibility: if old format with single tax
    if (selectedTaxes.length === 0 && estimate.tax_type_name) {
      selectedTaxes = [{ name: estimate.tax_type_name, percentage: estimate.tax_percentage || estimate.tax_rate }];
    }
    setForm({
      project_id: estimate.project_id || '',
      client_company: estimate.client_company || '',
      client_name: estimate.client_name,
      client_email: estimate.client_email || '',
      client_phone: estimate.client_phone || '',
      client_address: estimate.client_address || '',
      title: estimate.title,
      description: estimate.description || '',
      items: estimate.items,
      tax_rate: estimate.tax_rate,
      selected_taxes: selectedTaxes,
      discount_percent: estimate.discount_percent,
      notes: estimate.notes || '',
      terms: estimate.terms || '',
      valid_until: estimate.valid_until || '',
      custom_number: estimate.estimate_number || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (estimateId) => {
    if (!window.confirm('¿Eliminar este estimado?')) return;
    
    try {
      await api.delete(`/estimates/${estimateId}`, { withCredentials: true });
      toast.success('Estimado eliminado');
      // Actualizar estado local inmediatamente para reflejar el cambio
      setEstimates(prev => prev.filter(e => e.estimate_id !== estimateId));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const handleStatusChange = async (estimateId, newStatus) => {
    try {
      await api.put(`/estimates/${estimateId}/status?status=${newStatus}`, {}, { withCredentials: true });
      toast.success(`Estado cambiado a ${statusLabels[newStatus]}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar estado');
    }
  };

  const handleSend = async (estimateId) => {
    try {
      await api.post(`/estimates/${estimateId}/send`, {}, { withCredentials: true });
      toast.success('Estimado enviado');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar');
    }
  };

  const handleDuplicate = async (estimateId) => {
    try {
      await api.post(`/estimates/${estimateId}/duplicate`, {}, { withCredentials: true });
      toast.success('Estimado duplicado');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al duplicar');
    }
  };

  const handleConvert = async (estimateId) => {
    if (!window.confirm('¿Convertir este estimado a factura?')) return;
    
    try {
      const res = await api.post(`/estimates/${estimateId}/convert`, {}, { withCredentials: true });
      toast.success(`Factura ${res.data.invoice_number} creada`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al convertir');
    }
  };

  const exportPDF = async (estimate) => {
    const doc = new jsPDF();
    const company = await fetchCompanyInfo();
    
    // Header: Empresa izquierda, Doc derecha
    let y = await addDocumentHeader(doc, company, 'ESTIMATE', estimate.estimate_number, estimate.created_at, estimate.total);
    
    // Client section - include company name if available
    const clientDisplayName = estimate.client_company 
      ? `${estimate.client_company}\nAttn: ${estimate.client_name}`
      : estimate.client_name;
    y = addPartySection(doc, 'Bill To:', clientDisplayName, estimate.client_address || '', estimate.client_email, estimate.client_phone, y);
    
    // Valid until derecha
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Valid Until: ${estimate.valid_until ? moment(estimate.valid_until).format('MMM DD, YYYY') : 'N/A'}`, 120, y - 10);
    
    // Title
    if (estimate.title) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(estimate.title, 15, y);
      y += 6;
    }
    
    if (estimate.description) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const cleanDescription = stripHtml(estimate.description);
      const descLines = doc.splitTextToSize(cleanDescription, 170);
      doc.text(descLines, 15, y);
      y += descLines.length * 4 + 4;
    }
    
    // Tasks table
    y = addTasksTable(doc, estimate.items, y + 4);
    
    // Build tax details from selected_taxes or fallback to single tax
    let taxDetails = null;
    if (estimate.selected_taxes && estimate.selected_taxes.length > 0) {
      const taxableAmount = estimate.subtotal - (estimate.discount_amount || 0);
      taxDetails = estimate.selected_taxes.map(t => ({
        name: t.name,
        percentage: t.percentage,
        amount: taxableAmount * t.percentage / 100
      }));
    } else if (estimate.tax_type_name && estimate.tax_percentage) {
      taxDetails = [{ name: estimate.tax_type_name, percentage: estimate.tax_percentage, amount: estimate.tax_amount || 0 }];
    }
    y = addTotalsSection(doc, estimate.subtotal, estimate.discount_amount || 0, estimate.tax_amount || 0, estimate.total, y, taxDetails);
    
    // Notes and Terms - BOTH on second page in two columns
    if (estimate.notes || estimate.terms) {
      doc.addPage();
      
      const pageWidth = 210; // A4 width in mm
      const margin = 15;
      const columnWidth = (pageWidth - (margin * 2) - 10) / 2; // 10mm gap between columns
      const columnGap = 10;
      const pageHeight = 297; // A4 height in mm
      const maxY = pageHeight - 20; // Leave margin at bottom
      const lineHeight = 3.5; // Height per line of text
      let leftY = 20;
      let rightY = 20;
      
      // LEFT COLUMN - Notes
      if (estimate.notes) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Notas:', margin, leftY);
        leftY += 8;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const notesLines = doc.splitTextToSize(estimate.notes, columnWidth);
        
        // Render notes lines with page overflow handling
        for (let i = 0; i < notesLines.length; i++) {
          if (leftY > maxY) {
            doc.addPage();
            leftY = 20;
            rightY = 20;
          }
          doc.text(notesLines[i], margin, leftY);
          leftY += lineHeight;
        }
        leftY += 5;
      }
      
      // RIGHT COLUMN - Terms and Conditions
      if (estimate.terms) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Términos y Condiciones:', margin + columnWidth + columnGap, rightY);
        rightY += 8;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const termsLines = doc.splitTextToSize(estimate.terms, columnWidth);
        
        // Render terms lines with page overflow handling
        for (let i = 0; i < termsLines.length; i++) {
          if (rightY > maxY) {
            // If terms overflow, continue on same page below notes or add new page
            if (leftY < maxY) {
              rightY = leftY + 10;
              doc.text('Términos y Condiciones (cont.):', margin + columnWidth + columnGap, rightY);
              rightY += 8;
            } else {
              doc.addPage();
              rightY = 20;
              leftY = 20;
            }
          }
          doc.text(termsLines[i], margin + columnWidth + columnGap, rightY);
          rightY += lineHeight;
        }
      }
    }
    
    // Footer
    addFooter(doc, company);
    
    doc.save(`Estimate_${estimate.estimate_number}.pdf`);
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <FileText className="w-12 h-12 animate-pulse text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Estimados</h1>
            <p className="text-slate-600">
              Crea y gestiona cotizaciones para tus clientes
              {yearFilter !== 'all' && <span className="text-blue-600 font-medium"> - Año {yearFilter}</span>}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los años</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => { setLoading(true); loadData(); }}
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Nuevo Estimado
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEstimate ? 'Editar Estimado' : 'Nuevo Estimado'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nomenclatura */}
                <NomenclatureSelector
                  nomenclatures={nomenclatures}
                  selectedNomenclature={selectedNomenclature}
                  generatedNumber={generatedNumber}
                  onSelect={handleSelectNomenclature}
                  label="Nomenclatura de Estimado"
                />
                {!selectedNomenclature && (
                  <div className="space-y-2">
                    <Label>Número Manual (opcional)</Label>
                    <Input 
                      value={form.custom_number} 
                      onChange={(e) => setForm({...form, custom_number: e.target.value})} 
                      placeholder="Ej: EST-2025-0150"
                    />
                  </div>
                )}

                {/* Client Info */}
                {/* Saved Client Profiles Selector */}
                {clientProfiles.length > 0 && !editingEstimate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Label className="flex items-center gap-2 text-blue-700 mb-2">
                      <Users className="w-4 h-4" />
                      Cargar Cliente Guardado
                    </Label>
                    <Select onValueChange={(profileId) => {
                      const profile = clientProfiles.find(p => p.profile_id === profileId);
                      if (profile) handleSelectClientProfile(profile);
                    }}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Seleccionar cliente guardado..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientProfiles.map(profile => (
                          <SelectItem key={profile.profile_id} value={profile.profile_id}>
                            {profile.company_name || profile.contact_name} {profile.email && `(${profile.email})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-blue-600 mt-1">Los datos del cliente se cargarán automáticamente</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Proyecto (opcional)</Label>
                    <Select value={form.project_id || 'none'} onValueChange={(v) => setForm({...form, project_id: v === 'none' ? '' : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin proyecto</SelectItem>
                        {projects.map(p => (
                          <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Nombre de Empresa
                    </Label>
                    <Input 
                      value={form.client_company} 
                      onChange={(e) => setForm({...form, client_company: e.target.value})} 
                      placeholder="Ej: ABC Corporation"
                    />
                  </div>
                  <div>
                    <Label>Nombre del Cliente *</Label>
                    <Input value={form.client_name} onChange={(e) => setForm({...form, client_name: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Email del Cliente</Label>
                    <Input type="email" value={form.client_email} onChange={(e) => setForm({...form, client_email: e.target.value})} />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input value={form.client_phone} onChange={(e) => setForm({...form, client_phone: e.target.value})} />
                  </div>
                  <div>
                    <Label>Dirección</Label>
                    <Input value={form.client_address} onChange={(e) => setForm({...form, client_address: e.target.value})} />
                  </div>
                </div>

                {/* Estimate Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Título del Estimado *</Label>
                    <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Válido Hasta</Label>
                    <Input type="date" value={form.valid_until} onChange={(e) => setForm({...form, valid_until: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Descripción</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} />
                  </div>
                </div>

                {/* Items - Task Format */}
                <div>
                  <Label className="mb-2 block">Líneas del Estimado</Label>
                  <div className="space-y-2">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600">Task #{idx + 1}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <Textarea 
                          placeholder="Descripción del task / Scope of Work..." 
                          className="min-h-[80px]"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Cantidad</Label>
                            <Input 
                              type="number" 
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Precio Unit.</Label>
                            <Input 
                              type="number" 
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Total</Label>
                            <div className="h-9 flex items-center font-mono font-bold text-blue-600">
                              ${formatCurrency(parseFloat(item.amount) || 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" onClick={addItem} className="mt-2 w-full">
                    <Plus className="w-4 h-4 mr-1" /> Agregar Task
                  </Button>
                </div>

                {/* Totals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Descuento (%)</Label>
                    <Input type="number" value={form.discount_percent} onChange={(e) => setForm({...form, discount_percent: e.target.value})} />
                  </div>
                  <div>
                    <Label>Impuestos (seleccione múltiples)</Label>
                    <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2 bg-white">
                      {taxTypes.filter(t => t.is_active).map(tax => (
                        <label key={tax.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={form.selected_taxes.some(t => t.name === tax.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm({...form, selected_taxes: [...form.selected_taxes, { name: tax.name, percentage: tax.percentage }]});
                              } else {
                                setForm({...form, selected_taxes: form.selected_taxes.filter(t => t.name !== tax.name)});
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300"
                          />
                          <span className="text-sm">{tax.name} ({tax.percentage}%)</span>
                        </label>
                      ))}
                      {taxTypes.filter(t => t.is_active).length === 0 && (
                        <p className="text-sm text-slate-500">No hay tipos de impuesto configurados</p>
                      )}
                    </div>
                    {form.selected_taxes.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Total: {form.selected_taxes.reduce((sum, t) => sum + t.percentage, 0)}%
                      </p>
                    )}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm"><span>Subtotal:</span><span>${formatCurrency(totals.subtotal)}</span></div>
                    {totals.discountAmount > 0 && <div className="flex justify-between text-sm text-red-600"><span>Descuento:</span><span>-${formatCurrency(totals.discountAmount)}</span></div>}
                    {totals.taxDetails && totals.taxDetails.map((tax, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-slate-600">
                        <span>{tax.name} ({tax.percentage}%):</span>
                        <span>${formatCurrency(tax.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-lg border-t mt-2 pt-2"><span>Total:</span><span>${formatCurrency(totals.total)}</span></div>
                  </div>
                </div>

                {/* Notes & Terms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Notas</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} />
                  </div>
                  <div>
                    <Label>Términos y Condiciones</Label>
                    <Textarea value={form.terms} onChange={(e) => setForm({...form, terms: e.target.value})} rows={3} />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingEstimate ? 'Actualizar' : 'Crear'} Estimado
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        {estimates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Cotizado */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Total Cotizado</p>
                    <p className="text-xl font-bold text-blue-800">
                      ${summaryStats.total.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Estimados */}
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-500 rounded-lg">
                    <Calculator className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Total Estimados</p>
                    <p className="text-xl font-bold text-slate-800">
                      {estimates.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Aprobados */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-medium">Aprobados</p>
                    <p className="text-xl font-bold text-green-800">
                      {summaryStats.approved.length}
                      <span className="text-sm font-normal ml-2">
                        (${summaryStats.approvedTotal.toLocaleString('es-PR', { minimumFractionDigits: 0 })})
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pendientes */}
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Pendientes/Enviados</p>
                    <p className="text-xl font-bold text-amber-800">
                      {summaryStats.pending.length}
                      <span className="text-sm font-normal ml-2">
                        (${summaryStats.pendingTotal.toLocaleString('es-PR', { minimumFractionDigits: 0 })})
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estimates List */}
        <div className="space-y-4">
          {estimates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-700">No hay estimados</h3>
                <p className="text-slate-500 mt-2">Crea tu primer estimado para comenzar</p>
              </CardContent>
            </Card>
          ) : (
            filteredEstimates.map(estimate => (
              <Card key={estimate.estimate_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{estimate.estimate_number}</h3>
                        <Badge className={statusColors[estimate.status]}>{statusLabels[estimate.status]}</Badge>
                      </div>
                      <p className="font-medium text-slate-900">{estimate.title}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
                        {estimate.client_company && (
                          <span className="flex items-center gap-1 font-medium text-slate-800">
                            <Building2 className="w-4 h-4" />{estimate.client_company}
                          </span>
                        )}
                        <span className="flex items-center gap-1"><User className="w-4 h-4" />{estimate.client_name}</span>
                        {estimate.client_email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{estimate.client_email}</span>}
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{moment(estimate.created_at).format('DD/MM/YYYY')}</span>
                        {estimate.project_name && <span className="text-blue-600">{estimate.project_name}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">${formatCurrency(estimate.total)}</div>
                      <div className="flex gap-1 mt-2">
                        <Button variant="ghost" size="sm" onClick={() => exportPDF(estimate)} title="Descargar PDF">
                          <Download className="w-4 h-4" />
                        </Button>
                        {estimate.status === 'draft' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(estimate)} title="Editar">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleSend(estimate.estimate_id)} title="Enviar" disabled={!estimate.client_email}>
                              <Send className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {estimate.status === 'sent' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(estimate.estimate_id, 'approved')} title="Aprobar" className="text-green-600">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(estimate.estimate_id, 'rejected')} title="Rechazar" className="text-red-600">
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {estimate.status === 'approved' && (
                          <Button variant="ghost" size="sm" onClick={() => handleConvert(estimate.estimate_id)} title="Convertir a Factura" className="text-purple-600">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(estimate.estimate_id)} title="Duplicar">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(estimate.estimate_id)} title="Eliminar" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Items preview on click */}
                  {selectedEstimate === estimate.estimate_id && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2">Detalles:</h4>
                      <div className="space-y-1">
                        {estimate.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.description}</span>
                            <span className="font-mono">{item.quantity} x ${formatCurrency(item.unit_price)} = ${formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-blue-600"
                    onClick={() => setSelectedEstimate(selectedEstimate === estimate.estimate_id ? null : estimate.estimate_id)}
                  >
                    {selectedEstimate === estimate.estimate_id ? 'Ocultar detalles' : 'Ver detalles'}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Estimates;
