import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getBackendUrl } from '../utils/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import NomenclatureSelector from '../components/NomenclatureSelector';
import RichTextEditor from '../components/ui/RichTextEditor';
import { toast } from 'sonner';
import moment from 'moment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchCompanyInfo, addDocumentHeader, addPartySection, addTasksTable, addTotalsSection, addNotesSection, addFooter } from '../utils/pdfGenerator';
import { 
  Building2, Upload, Download, Trash2, FileText, ArrowLeft, Save, 
  Plus, Mail, Phone, MapPin, DollarSign, Calendar, Eye, Edit, X, Users
} from 'lucide-react';

const documentCategories = [
  { value: 'contract', label: 'Contrato' },
  { value: 'proposal', label: 'Propuesta' },
  { value: 'quote', label: 'Cotización' },
  { value: 'purchase_order', label: 'Orden de Compra' },
  { value: 'insurance', label: 'Seguro' },
  { value: 'tax', label: 'Documento Fiscal' },
  { value: 'other', label: 'Otro' }
];

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

const formatCurrency = (value) => {
  return (parseFloat(value) || 0).toLocaleString('es-PR', { minimumFractionDigits: 2 });
};

const ClientProfileDetail = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [estimates, setEstimates] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ document_type: '', file: null });
  const [activeTab, setActiveTab] = useState('info');
  
  // Estimate form state
  const [estimateDialogOpen, setEstimateDialogOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [taxTypes, setTaxTypes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [nomenclatures, setNomenclatures] = useState([]);
  const [selectedNomenclature, setSelectedNomenclature] = useState(null);
  const [generatedNumber, setGeneratedNumber] = useState('');
  const [previewEstimate, setPreviewEstimate] = useState(null);
  
  const [estimateForm, setEstimateForm] = useState({
    project_id: '',
    client_company: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    title: '',
    description: '',
    items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
    selected_taxes: [],
    discount_percent: 0,
    notes: '',
    terms: 'Este estimado es válido por 30 días.',
    valid_until: moment().add(30, 'days').format('YYYY-MM-DD'),
    custom_number: '',
    price_breakdown: null  // {material_equipment, labor, total}
  });

  useEffect(() => {
    loadData();
  }, [profileId]);

  const loadData = async () => {
    try {
      const [clientRes, estimatesRes, docsRes, taxRes, projectsRes, nomenclaturesRes] = await Promise.all([
        api.get(`/client-profiles/${profileId}`),
        api.get(`/client-profiles/${profileId}/estimates`),
        api.get(`/client-profiles/${profileId}/documents`),
        api.get('/tax-types').catch(() => ({ data: [] })),
        api.get('/projects').catch(() => ({ data: [] })),
        api.get('/nomenclatures').catch(() => ({ data: [] }))
      ]);
      setClient(clientRes.data);
      setEstimates(estimatesRes.data || []);
      setDocuments(docsRes.data || []);
      setTaxTypes(taxRes.data || []);
      setProjects(projectsRes.data || []);
      setNomenclatures(nomenclaturesRes.data || []);
    } catch (error) {
      toast.error('Error al cargar datos del cliente');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/client-profiles/${profileId}`, client);
      toast.success('Cliente actualizado');
    } catch (error) {
      toast.error('Error al guardar');
    }
    setSaving(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.document_type) {
      toast.error('Selecciona tipo y archivo');
      return;
    }
    const formData = new FormData();
    formData.append('file', uploadForm.file);
    try {
      await api.post(`/client-profiles/${profileId}/documents?document_type=${uploadForm.document_type}`, formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      toast.success('Documento subido');
      setUploadOpen(false);
      setUploadForm({ document_type: '', file: null });
      loadData();
    } catch (error) {
      toast.error('Error al subir documento');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    try {
      await api.delete(`/client-profiles/${profileId}/documents/${docId}`);
      toast.success('Documento eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  // Nomenclature handling
  const handleSelectNomenclature = async (nom) => {
    setSelectedNomenclature(nom);
    if (nom) {
      try {
        const res = await api.get(`/nomenclatures/${nom.id}/next-number`);
        setGeneratedNumber(res.data.next_number);
      } catch (error) {
        toast.error('Error al generar número');
      }
    } else {
      setGeneratedNumber('');
    }
  };

  // Estimate functions
  const resetEstimateForm = () => {
    setEstimateForm({
      project_id: '',
      client_company: client?.company_name || '',
      client_name: client?.contact_name || '',
      client_email: client?.email || '',
      client_phone: client?.phone || '',
      client_address: client?.address || '',
      title: '',
      description: '',
      items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
      selected_taxes: [],
      discount_percent: 0,
      notes: '',
      terms: 'Este estimado es válido por 30 días.',
      valid_until: moment().add(30, 'days').format('YYYY-MM-DD'),
      custom_number: '',
      price_breakdown: null
    });
    setEditingEstimate(null);
    setSelectedNomenclature(null);
    setGeneratedNumber('');
  };

  const openNewEstimate = () => {
    resetEstimateForm();
    setEstimateDialogOpen(true);
  };

  const openEditEstimate = (estimate) => {
    setEstimateForm({
      project_id: estimate.project_id || '',
      client_company: estimate.client_company || client?.company_name || '',
      client_name: estimate.client_name || client?.contact_name || '',
      client_email: estimate.client_email || client?.email || '',
      client_phone: estimate.client_phone || client?.phone || '',
      client_address: estimate.client_address || client?.address || '',
      title: estimate.title || '',
      description: estimate.description || '',
      items: estimate.items || [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
      selected_taxes: estimate.selected_taxes || [],
      discount_percent: estimate.discount_percent || 0,
      notes: estimate.notes || '',
      terms: estimate.terms || '',
      valid_until: estimate.valid_until || '',
      custom_number: estimate.estimate_number || '',
      price_breakdown: estimate.price_breakdown || null
    });
    setEditingEstimate(estimate.estimate_id);
    setEstimateDialogOpen(true);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...estimateForm.items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = (parseFloat(newItems[index].quantity) || 0) * (parseFloat(newItems[index].unit_price) || 0);
    }
    setEstimateForm({ ...estimateForm, items: newItems });
  };

  const addItem = () => {
    setEstimateForm({
      ...estimateForm,
      items: [...estimateForm.items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]
    });
  };

  const removeItem = (index) => {
    if (estimateForm.items.length > 1) {
      const newItems = estimateForm.items.filter((_, i) => i !== index);
      setEstimateForm({ ...estimateForm, items: newItems });
    }
  };

  const calculateEstimateTotals = () => {
    const subtotal = estimateForm.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const discountAmount = subtotal * (parseFloat(estimateForm.discount_percent) || 0) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxDetails = estimateForm.selected_taxes.map(t => ({
      name: t.name,
      percentage: t.percentage,
      amount: taxableAmount * t.percentage / 100
    }));
    const taxAmount = taxDetails.reduce((sum, t) => sum + t.amount, 0);
    const total = taxableAmount + taxAmount;
    return { subtotal, discountAmount, taxAmount, taxDetails, total };
  };

  const handleEstimateSubmit = async (e) => {
    e.preventDefault();
    
    if (!estimateForm.client_name || !estimateForm.title || estimateForm.items.length === 0) {
      toast.error('Complete los campos requeridos');
      return;
    }

    const totalTaxRate = estimateForm.selected_taxes.reduce((sum, t) => sum + (t.percentage || 0), 0);

    try {
      const payload = {
        client_profile_id: profileId,
        project_id: estimateForm.project_id || null,
        client_company: estimateForm.client_company || '',
        client_name: estimateForm.client_name || '',
        client_email: estimateForm.client_email || '',
        client_phone: estimateForm.client_phone || '',
        client_address: estimateForm.client_address || '',
        title: estimateForm.title,
        description: estimateForm.description,
        items: estimateForm.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.amount) || 0
        })),
        tax_rate: totalTaxRate,
        selected_taxes: estimateForm.selected_taxes,
        discount_percent: parseFloat(estimateForm.discount_percent) || 0,
        notes: estimateForm.notes,
        terms: estimateForm.terms,
        valid_until: estimateForm.valid_until,
        custom_number: generatedNumber || estimateForm.custom_number,
        price_breakdown: estimateForm.price_breakdown
      };

      if (editingEstimate) {
        await api.put(`/estimates/${editingEstimate}`, payload, { withCredentials: true });
        toast.success('Estimado actualizado');
      } else {
        await api.post(`/estimates`, payload, { withCredentials: true });
        toast.success('Estimado creado');
      }
      
      setEstimateDialogOpen(false);
      resetEstimateForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar estimado');
    }
  };

  const exportPDF = async (estimate) => {
    try {
      const doc = new jsPDF();
      const company = await fetchCompanyInfo();
      
      let y = await addDocumentHeader(doc, company, 'ESTIMATE', estimate.estimate_number, estimate.created_at, estimate.total);
      
      const clientDisplayName = estimate.client_company 
        ? `${estimate.client_company}\nAttn: ${estimate.client_name}`
        : estimate.client_name;
      y = addPartySection(doc, 'Bill To:', clientDisplayName, estimate.client_address || '', estimate.client_email, estimate.client_phone, y);
      
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Valid Until: ${estimate.valid_until ? moment(estimate.valid_until).format('MMM DD, YYYY') : 'N/A'}`, 120, y - 10);
      
      if (estimate.title) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(estimate.title, 15, y);
        y += 8;
      }
      
      if (estimate.description) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const descLines = doc.splitTextToSize(estimate.description, 170);
        doc.text(descLines, 15, y);
        y += descLines.length * 5 + 6;
      }
      
      // Items/Tasks table FIRST (if any)
      if (estimate.items && estimate.items.length > 0 && estimate.items.some(item => item.description)) {
        y = addTasksTable(doc, estimate.items, y + 4, 12); // font size 12
      }
      
      // Price Breakdown Section (Orange Area) - AFTER Tasks, BEFORE Totals
      if (estimate.price_breakdown) {
        y += 4;
        // Header row
        doc.setFillColor(249, 115, 22); // Orange-500
        doc.rect(15, y, 60, 10, 'F');
        doc.setFillColor(251, 146, 60); // Orange-400
        doc.rect(75, y, 60, 10, 'F');
        doc.setFillColor(234, 88, 12); // Orange-600
        doc.rect(135, y, 60, 10, 'F');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Material/Equipment', 45, y + 7, { align: 'center' });
        doc.text('Labor', 105, y + 7, { align: 'center' });
        doc.text('Total', 165, y + 7, { align: 'center' });
        y += 10;
        
        // Values row
        doc.setFillColor(254, 243, 199); // Orange-100
        doc.rect(15, y, 180, 12, 'F');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`$${formatCurrency(estimate.price_breakdown.material_equipment || 0)}`, 45, y + 8, { align: 'center' });
        doc.text(`$${formatCurrency(estimate.price_breakdown.labor || 0)}`, 105, y + 8, { align: 'center' });
        doc.text(`$${formatCurrency(estimate.price_breakdown.total || 0)}`, 165, y + 8, { align: 'center' });
        y += 18;
      }
      
      let taxDetails = null;
      if (estimate.selected_taxes && estimate.selected_taxes.length > 0) {
        const taxableAmount = (estimate.price_breakdown?.total || estimate.subtotal) - (estimate.discount_amount || 0);
        taxDetails = estimate.selected_taxes.map(t => ({
          name: t.name,
          percentage: t.percentage,
          amount: taxableAmount * t.percentage / 100
        }));
      }
      
      const totalToUse = estimate.price_breakdown?.total || estimate.total;
      y = addTotalsSection(doc, estimate.price_breakdown?.total || estimate.subtotal, estimate.discount_amount || 0, estimate.tax_amount || 0, totalToUse, y, taxDetails);
      
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
      
      addFooter(doc, company);
      
      doc.save(`Estimate_${estimate.estimate_number}.pdf`);
      toast.success('PDF descargado');
    } catch (error) {
      console.error('PDF Error:', error);
      toast.error('Error al generar PDF');
    }
  };

  const handleDeleteEstimate = async (estimateId) => {
    if (!window.confirm('¿Eliminar este estimado?')) return;
    try {
      await api.delete(`/estimates/${estimateId}`);
      toast.success('Estimado eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleConvertToInvoice = async (estimateId) => {
    if (!window.confirm('¿Convertir este estimado a factura?')) return;
    try {
      const response = await api.post(`/estimates/${estimateId}/convert`, {}, { withCredentials: true });
      toast.success('Estimado convertido a factura exitosamente');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al convertir a factura');
    }
  };

  // Calculate stats
  const totalEstimates = estimates.length;
  const totalValue = estimates.reduce((sum, e) => sum + (e.total || 0), 0);
  const approvedEstimates = estimates.filter(e => e.status === 'approved').length;
  const estimateTotals = calculateEstimateTotals();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Cliente no encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/estimados')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Estimados
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/estimados')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{client.company_name || 'Sin nombre'}</h1>
              <p className="text-slate-500">{client.contact_name || 'Sin contacto asignado'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={openNewEstimate} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Estimado
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalEstimates}</p>
                  <p className="text-xs text-slate-500">Estimados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${formatCurrency(totalValue)}</p>
                  <p className="text-xs text-slate-500">Valor Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedEstimates}</p>
                  <p className="text-xs text-slate-500">Aprobados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{documents.length}</p>
                  <p className="text-xs text-slate-500">Documentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="estimates">Estimados</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" /> Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre de Empresa</Label>
                    <Input 
                      value={client.company_name || ''} 
                      onChange={(e) => setClient({...client, company_name: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Persona de Contacto</Label>
                    <Input 
                      value={client.contact_name || ''} 
                      onChange={(e) => setClient({...client, contact_name: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={client.email || ''} 
                      onChange={(e) => setClient({...client, email: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input 
                      value={client.phone || ''} 
                      onChange={(e) => setClient({...client, phone: e.target.value})} 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Dirección</Label>
                    <Input 
                      value={client.address || ''} 
                      onChange={(e) => setClient({...client, address: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Tax ID / EIN</Label>
                    <Input 
                      value={client.tax_id || ''} 
                      onChange={(e) => setClient({...client, tax_id: e.target.value})} 
                    />
                  </div>
                </div>
                <div>
                  <Label>Notas</Label>
                  <Textarea 
                    value={client.notes || ''} 
                    onChange={(e) => setClient({...client, notes: e.target.value})} 
                    className="min-h-[100px]"
                    placeholder="Notas adicionales sobre el cliente..."
                  />
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estimates Tab */}
          <TabsContent value="estimates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Estimados del Cliente
                  </CardTitle>
                  <Button onClick={openNewEstimate} size="sm" className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Estimado
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {estimates.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">No hay estimados para este cliente</p>
                    <Button onClick={openNewEstimate} variant="outline" className="mt-4">
                      <Plus className="w-4 h-4 mr-2" /> Crear Primer Estimado
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {estimates.map(estimate => (
                      <div 
                        key={estimate.estimate_id} 
                        className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border">
                              <FileText className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                              <p className="font-medium">{estimate.estimate_number}</p>
                              <p className="text-sm text-slate-500">{estimate.title || 'Sin título'}</p>
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {moment(estimate.created_at).format('DD/MM/YYYY')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-lg">${formatCurrency(estimate.total || 0)}</p>
                              <Badge className={statusColors[estimate.status]}>
                                {statusLabels[estimate.status] || estimate.status}
                              </Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setPreviewEstimate(estimate)} title="Vista Previa">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => exportPDF(estimate)} title="Descargar PDF">
                                <Download className="w-4 h-4" />
                              </Button>
                              {estimate.status !== 'converted' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleConvertToInvoice(estimate.estimate_id)} 
                                  title="Convertir a Factura"
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => openEditEstimate(estimate)} title="Editar">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteEstimate(estimate.estimate_id)} title="Eliminar">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        {/* Price Breakdown Display */}
                        {estimate.price_breakdown && (
                          <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                              <div className="bg-orange-500 text-white p-2 rounded">
                                <p className="text-xs">Material/Equipment</p>
                                <p className="font-bold">${formatCurrency(estimate.price_breakdown.material_equipment || 0)}</p>
                              </div>
                              <div className="bg-orange-400 text-white p-2 rounded">
                                <p className="text-xs">Labor</p>
                                <p className="font-bold">${formatCurrency(estimate.price_breakdown.labor || 0)}</p>
                              </div>
                              <div className="bg-orange-600 text-white p-2 rounded">
                                <p className="text-xs">Total</p>
                                <p className="font-bold">${formatCurrency(estimate.price_breakdown.total || 0)}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" /> Documentos del Cliente
                  </CardTitle>
                  <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                        <Upload className="w-4 h-4 mr-2" /> Subir Documento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Subir Documento</DialogTitle></DialogHeader>
                      <form onSubmit={handleUpload} className="space-y-4">
                        <div>
                          <Label>Categoría</Label>
                          <Select value={uploadForm.document_type} onValueChange={(v) => setUploadForm({...uploadForm, document_type: v})}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                            <SelectContent>
                              {documentCategories.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Archivo</Label>
                          <Input type="file" onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})} />
                        </div>
                        <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">Subir</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">No hay documentos</p>
                    <p className="text-sm text-slate-400">Sube contratos, propuestas y otros documentos del cliente</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div key={doc.document_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-orange-500" />
                          <div>
                            <p className="font-medium text-sm">{doc.filename}</p>
                            <p className="text-xs text-slate-500">
                              {documentCategories.find(t => t.value === doc.document_type)?.label || doc.document_type} 
                              {' • '}
                              {moment(doc.uploaded_at).format('DD/MM/YY')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.open(`${getBackendUrl()}/api/client-profiles/${profileId}/documents/${doc.document_id}/download`, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteDocument(doc.document_id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Estimate Creation/Edit Dialog - Same as old version */}
        <Dialog open={estimateDialogOpen} onOpenChange={(open) => { setEstimateDialogOpen(open); if (!open) resetEstimateForm(); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEstimate ? 'Editar Estimado' : 'Nuevo Estimado'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEstimateSubmit} className="space-y-6">
              {/* Nomenclatura */}
              <NomenclatureSelector
                nomenclatures={nomenclatures}
                selectedNomenclature={selectedNomenclature}
                generatedNumber={generatedNumber}
                onSelect={handleSelectNomenclature}
                label="Nomenclatura de Estimado"
              />
              <div className="space-y-2">
                <Label>Número de Estimado {selectedNomenclature ? '(Generado)' : '(Manual)'}</Label>
                <Input 
                  value={estimateForm.custom_number} 
                  onChange={(e) => setEstimateForm({...estimateForm, custom_number: e.target.value})} 
                  placeholder="Ej: EST-2025-0150"
                />
                {selectedNomenclature && (
                  <p className="text-xs text-slate-500">Puedes modificar el número generado si lo deseas</p>
                )}
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Proyecto (opcional)</Label>
                  <Select value={estimateForm.project_id || 'none'} onValueChange={(v) => setEstimateForm({...estimateForm, project_id: v === 'none' ? '' : v})}>
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
                    value={estimateForm.client_company} 
                    onChange={(e) => setEstimateForm({...estimateForm, client_company: e.target.value})} 
                    placeholder="Ej: ABC Corporation"
                  />
                </div>
                <div>
                  <Label>Nombre del Cliente *</Label>
                  <Input value={estimateForm.client_name} onChange={(e) => setEstimateForm({...estimateForm, client_name: e.target.value})} required />
                </div>
                <div>
                  <Label>Email del Cliente</Label>
                  <Input type="email" value={estimateForm.client_email} onChange={(e) => setEstimateForm({...estimateForm, client_email: e.target.value})} />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={estimateForm.client_phone} onChange={(e) => setEstimateForm({...estimateForm, client_phone: e.target.value})} />
                </div>
                <div>
                  <Label>Dirección</Label>
                  <Input value={estimateForm.client_address} onChange={(e) => setEstimateForm({...estimateForm, client_address: e.target.value})} />
                </div>
              </div>

              {/* Estimate Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Título del Estimado *</Label>
                  <Input value={estimateForm.title} onChange={(e) => setEstimateForm({...estimateForm, title: e.target.value})} required />
                </div>
                <div>
                  <Label>Válido Hasta</Label>
                  <Input type="date" value={estimateForm.valid_until} onChange={(e) => setEstimateForm({...estimateForm, valid_until: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <Label>Descripción</Label>
                  <Textarea value={estimateForm.description} onChange={(e) => setEstimateForm({...estimateForm, description: e.target.value})} rows={2} />
                </div>
              </div>

              {/* Items - Task Format */}
              <div>
                <Label className="mb-2 block">Líneas del Estimado (opcional)</Label>
                <div className="space-y-2">
                  {estimateForm.items.map((item, idx) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600">Task #{idx + 1}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <RichTextEditor 
                        placeholder="Descripción del task / Scope of Work..." 
                        value={item.description}
                        onChange={(value) => handleItemChange(idx, 'description', value)}
                        minHeight="100px"
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

              {/* Price Breakdown Section - Below Tasks */}
              <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <p className="font-semibold text-orange-800 mb-3">Price Breakdown</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-orange-700">Material/Equipment</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      className="bg-white"
                      value={estimateForm.price_breakdown?.material_equipment || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const labor = estimateForm.price_breakdown?.labor || 0;
                        setEstimateForm({
                          ...estimateForm, 
                          price_breakdown: {
                            ...estimateForm.price_breakdown,
                            material_equipment: val,
                            total: val + labor
                          }
                        });
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-orange-700">Labor</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      className="bg-white"
                      value={estimateForm.price_breakdown?.labor || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const matEquip = estimateForm.price_breakdown?.material_equipment || 0;
                        setEstimateForm({
                          ...estimateForm, 
                          price_breakdown: {
                            ...estimateForm.price_breakdown,
                            labor: val,
                            total: matEquip + val
                          }
                        });
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-orange-700">Total</Label>
                    <div className="h-9 flex items-center px-3 bg-orange-100 rounded-md font-bold text-orange-800">
                      ${formatCurrency(estimateForm.price_breakdown?.total || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Descuento (%)</Label>
                  <Input type="number" value={estimateForm.discount_percent} onChange={(e) => setEstimateForm({...estimateForm, discount_percent: e.target.value})} />
                </div>
                <div>
                  <Label>Impuestos (seleccione múltiples)</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2 bg-white">
                    {taxTypes.filter(t => t.is_active).map(tax => (
                      <label key={tax.id || tax.name} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={estimateForm.selected_taxes.some(t => t.name === tax.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEstimateForm({...estimateForm, selected_taxes: [...estimateForm.selected_taxes, { name: tax.name, percentage: tax.percentage }]});
                            } else {
                              setEstimateForm({...estimateForm, selected_taxes: estimateForm.selected_taxes.filter(t => t.name !== tax.name)});
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
                  {estimateForm.selected_taxes.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Total: {estimateForm.selected_taxes.reduce((sum, t) => sum + t.percentage, 0)}%
                    </p>
                  )}
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex justify-between text-sm"><span>Subtotal:</span><span>${formatCurrency(estimateTotals.subtotal)}</span></div>
                  {estimateTotals.discountAmount > 0 && <div className="flex justify-between text-sm text-red-600"><span>Descuento:</span><span>-${formatCurrency(estimateTotals.discountAmount)}</span></div>}
                  {estimateTotals.taxDetails && estimateTotals.taxDetails.map((tax, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-slate-600">
                      <span>{tax.name} ({tax.percentage}%):</span>
                      <span>${formatCurrency(tax.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-lg border-t mt-2 pt-2"><span>Total:</span><span>${formatCurrency(estimateTotals.total)}</span></div>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Notas</Label>
                  <Textarea value={estimateForm.notes} onChange={(e) => setEstimateForm({...estimateForm, notes: e.target.value})} rows={3} />
                </div>
                <div>
                  <Label>Términos y Condiciones</Label>
                  <Textarea value={estimateForm.terms} onChange={(e) => setEstimateForm({...estimateForm, terms: e.target.value})} rows={3} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEstimateDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingEstimate ? 'Actualizar' : 'Crear'} Estimado
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewEstimate} onOpenChange={(open) => !open && setPreviewEstimate(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Vista Previa - {previewEstimate?.estimate_number}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { exportPDF(previewEstimate); }}>
                    <Download className="w-4 h-4 mr-1" /> PDF
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            {previewEstimate && (
              <div className="space-y-6 p-4 bg-white border rounded-lg">
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-orange-600">ESTIMATE</h2>
                    <p className="text-lg font-semibold">{previewEstimate.estimate_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Fecha: {moment(previewEstimate.created_at).format('DD/MM/YYYY')}</p>
                    <p className="text-sm text-slate-500">Válido hasta: {previewEstimate.valid_until ? moment(previewEstimate.valid_until).format('DD/MM/YYYY') : 'N/A'}</p>
                    <Badge className={statusColors[previewEstimate.status]}>{statusLabels[previewEstimate.status]}</Badge>
                  </div>
                </div>

                {/* Client Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2">Cliente</h3>
                    <p className="font-medium">{previewEstimate.client_company || previewEstimate.client_name}</p>
                    {previewEstimate.client_company && <p className="text-sm text-slate-600">Attn: {previewEstimate.client_name}</p>}
                    {previewEstimate.client_email && <p className="text-sm text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{previewEstimate.client_email}</p>}
                    {previewEstimate.client_phone && <p className="text-sm text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{previewEstimate.client_phone}</p>}
                    {previewEstimate.client_address && <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{previewEstimate.client_address}</p>}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2">Detalles</h3>
                    <p className="font-medium">{previewEstimate.title}</p>
                    {previewEstimate.description && <p className="text-sm text-slate-600 mt-1">{previewEstimate.description}</p>}
                  </div>
                </div>

                {/* Items Table - FIRST */}
                {previewEstimate.items && previewEstimate.items.length > 0 && previewEstimate.items.some(i => i.description) && (
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2">Líneas</h3>
                    <table className="w-full border">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 text-left text-sm">Descripción</th>
                          <th className="p-2 text-right text-sm">Cant.</th>
                          <th className="p-2 text-right text-sm">Precio</th>
                          <th className="p-2 text-right text-sm">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewEstimate.items.filter(i => i.description).map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 text-sm">{item.description}</td>
                            <td className="p-2 text-right text-sm">{item.quantity}</td>
                            <td className="p-2 text-right text-sm">${formatCurrency(item.unit_price)}</td>
                            <td className="p-2 text-right text-sm font-medium">${formatCurrency(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Price Breakdown - AFTER Items, BEFORE Totals */}
                {previewEstimate.price_breakdown && (
                  <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <h3 className="font-semibold text-orange-800 mb-3">Price Breakdown</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-orange-500 text-white p-3 rounded">
                        <p className="text-sm">Material/Equipment</p>
                        <p className="text-xl font-bold">${formatCurrency(previewEstimate.price_breakdown.material_equipment || 0)}</p>
                      </div>
                      <div className="bg-orange-400 text-white p-3 rounded">
                        <p className="text-sm">Labor</p>
                        <p className="text-xl font-bold">${formatCurrency(previewEstimate.price_breakdown.labor || 0)}</p>
                      </div>
                      <div className="bg-orange-600 text-white p-3 rounded">
                        <p className="text-sm">Total</p>
                        <p className="text-xl font-bold">${formatCurrency(previewEstimate.price_breakdown.total || 0)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between"><span>Subtotal:</span><span>${formatCurrency(previewEstimate.price_breakdown?.total || previewEstimate.subtotal)}</span></div>
                    {previewEstimate.discount_amount > 0 && <div className="flex justify-between text-red-600"><span>Descuento:</span><span>-${formatCurrency(previewEstimate.discount_amount)}</span></div>}
                    {previewEstimate.tax_amount > 0 && <div className="flex justify-between"><span>Impuestos:</span><span>${formatCurrency(previewEstimate.tax_amount)}</span></div>}
                    <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span>${formatCurrency(previewEstimate.total)}</span></div>
                  </div>
                </div>

                {/* Notes */}
                {previewEstimate.notes && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-slate-700 mb-2">Notas</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{previewEstimate.notes}</p>
                  </div>
                )}

                {/* Terms */}
                {previewEstimate.terms && (
                  <div className="border-t pt-4 bg-slate-50 p-4 rounded">
                    <h3 className="font-semibold text-slate-700 mb-2">Términos y Condiciones</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{previewEstimate.terms}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ClientProfileDetail;
