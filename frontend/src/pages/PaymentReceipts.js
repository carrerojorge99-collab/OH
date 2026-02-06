import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { 
  Receipt, Plus, Edit, Trash2, Search, Filter, Download, Mail,
  Calendar, DollarSign, FileText, Eye, Upload, X, Truck, FolderKanban,
  CreditCard, Building, Banknote
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchCompanyInfo } from '../utils/pdfGenerator';
import { LOGO_BASE64 } from '../utils/logoData';
import CloudinaryUpload from '../components/CloudinaryUpload';

const paymentMethods = [
  { value: 'transferencia', label: 'Transferencia Bancaria', icon: Building },
  { value: 'cheque', label: 'Cheque', icon: FileText },
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta', label: 'Tarjeta de Crédito/Débito', icon: CreditCard },
  { value: 'ath_movil', label: 'ATH Móvil', icon: CreditCard },
];

const PaymentReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const [receiptForm, setReceiptForm] = useState({
    vendor_id: '',
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    discount_percentage: '',
    payment_method: '',
    reference_number: '',
    concept: '',
    notes: ''
  });

  // Calculate discount preview
  const calculateDiscount = (amount, discountPct) => {
    const amt = parseFloat(amount) || 0;
    const pct = parseFloat(discountPct) || 0;
    const discountAmount = amt * (pct / 100);
    const total = amt - discountAmount;
    return { discountAmount, total };
  };

  const formCalculations = calculateDiscount(receiptForm.amount, receiptForm.discount_percentage);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [receiptsRes, vendorsRes, projectsRes] = await Promise.all([
        api.get('/receipts', { withCredentials: true }),
        api.get('/vendors', { withCredentials: true }),
        api.get('/projects', { withCredentials: true })
      ]);
      setReceipts(receiptsRes.data);
      setVendors(vendorsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReceipt = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...receiptForm,
        amount: parseFloat(receiptForm.amount),
        discount_percentage: parseFloat(receiptForm.discount_percentage) || 0,
        project_id: receiptForm.project_id || null
      };

      if (selectedReceipt && dialogOpen) {
        await api.put(`/receipts/${selectedReceipt.receipt_id}`, payload, { withCredentials: true });
        toast.success('Recibo actualizado');
      } else {
        await api.post('/receipts', payload, { withCredentials: true });
        toast.success('Recibo creado');
      }
      setDialogOpen(false);
      resetReceiptForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar recibo');
    }
  };

  const handleDeleteReceipt = async (receiptId) => {
    if (!window.confirm('¿Estás seguro de eliminar este recibo?')) return;
    try {
      await api.delete(`/receipts/${receiptId}`, { withCredentials: true });
      toast.success('Recibo eliminado');
      setSelectedReceipt(null);
      setViewDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error('Error al eliminar recibo');
    }
  };

  const handleAddAttachment = async (fileData) => {
    if (!selectedReceipt) return;
    try {
      await api.post(`/receipts/${selectedReceipt.receipt_id}/attachments`, {
        filename: fileData.original_filename || fileData.public_id,
        url: fileData.secure_url,
        file_type: fileData.resource_type === 'image' ? 'image' : 'pdf'
      }, { withCredentials: true });
      toast.success('Comprobante agregado');
      
      // Reload receipt
      const res = await api.get(`/receipts/${selectedReceipt.receipt_id}`, { withCredentials: true });
      setSelectedReceipt(res.data);
      loadData();
    } catch (error) {
      toast.error('Error al agregar comprobante');
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!selectedReceipt || !window.confirm('¿Eliminar este comprobante?')) return;
    try {
      await api.delete(`/receipts/${selectedReceipt.receipt_id}/attachments/${attachmentId}`, { withCredentials: true });
      toast.success('Comprobante eliminado');
      
      const res = await api.get(`/receipts/${selectedReceipt.receipt_id}`, { withCredentials: true });
      setSelectedReceipt(res.data);
      loadData();
    } catch (error) {
      toast.error('Error al eliminar comprobante');
    }
  };

  const resetReceiptForm = () => {
    setReceiptForm({
      vendor_id: '',
      project_id: '',
      date: new Date().toISOString().split('T')[0],
      amount: '',
      discount_percentage: '',
      payment_method: '',
      reference_number: '',
      concept: '',
      notes: ''
    });
    setSelectedReceipt(null);
  };

  const openEditReceipt = (receipt) => {
    setReceiptForm({
      vendor_id: receipt.vendor_id || '',
      project_id: receipt.project_id || '',
      date: receipt.date || '',
      amount: receipt.amount?.toString() || '',
      discount_percentage: receipt.discount_percentage?.toString() || '',
      payment_method: receipt.payment_method || '',
      reference_number: receipt.reference_number || '',
      concept: receipt.concept || '',
      notes: receipt.notes || ''
    });
    setSelectedReceipt(receipt);
    setDialogOpen(true);
  };

  const openNewReceipt = () => {
    resetReceiptForm();
    setDialogOpen(true);
  };

  const openViewReceipt = async (receipt) => {
    const res = await api.get(`/receipts/${receipt.receipt_id}`, { withCredentials: true });
    setSelectedReceipt(res.data);
    setViewDialogOpen(true);
  };

  const getPaymentMethodLabel = (value) => {
    const method = paymentMethods.find(m => m.value === value);
    return method ? method.label : value || 'Sin especificar';
  };

  const getPaymentMethodColor = (method) => {
    const colors = {
      transferencia: 'bg-blue-100 text-blue-700',
      cheque: 'bg-purple-100 text-purple-700',
      efectivo: 'bg-green-100 text-green-700',
      tarjeta: 'bg-orange-100 text-orange-700',
      ath_movil: 'bg-cyan-100 text-cyan-700'
    };
    return colors[method] || 'bg-gray-100 text-gray-700';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-PR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate PDF
  const generateReceiptPdf = async (receipt) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Colors
    const primaryColor = [37, 99, 235]; // Blue
    const textColor = [30, 41, 59];
    const grayColor = [100, 116, 139];
    
    // Fetch company info
    let company = {};
    try {
      company = await fetchCompanyInfo();
    } catch (e) {
      console.error('Error loading company info:', e);
    }

    // Header with logo
    let yPos = 15;
    const logoToUse = company?.logoBase64 || LOGO_BASE64;
    try {
      const imageFormat = logoToUse.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(logoToUse, imageFormat, 15, 10, 35, 18);
      yPos = 35;
    } catch (e) {
      yPos = 20;
    }

    // Company name
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(company.company_name || 'ProManage', 15, yPos);
    yPos += 5;

    // Company details
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    if (company.address) { doc.text(company.address, 15, yPos); yPos += 4; }
    if (company.city || company.state) { 
      doc.text(`${company.city || ''}, ${company.state || ''} ${company.zip_code || ''}`, 15, yPos); 
      yPos += 4; 
    }
    if (company.phone) { doc.text(`Tel: ${company.phone}`, 15, yPos); yPos += 4; }
    if (company.email) { doc.text(company.email, 15, yPos); }

    // Title on right side
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('RECIBO DE PAGO', pageWidth - 15, 20, { align: 'right' });

    // Receipt number and date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(`#: ${receipt.receipt_number}`, pageWidth - 15, 28, { align: 'right' });
    doc.text(`Fecha: ${formatDate(receipt.date)}`, pageWidth - 15, 34, { align: 'right' });

    // Amount box
    doc.setFillColor(...primaryColor);
    doc.roundedRect(pageWidth - 55, 40, 40, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(receipt.amount), pageWidth - 35, 48, { align: 'center' });

    // Separator line
    const lineY = Math.max(yPos + 8, 58);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, lineY, pageWidth - 15, lineY);

    // Vendor section
    let contentY = lineY + 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('PROVEEDOR', 15, contentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    contentY += 6;
    doc.text(receipt.vendor_name || '', 15, contentY);

    // Project if exists
    if (receipt.project_name) {
      contentY += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('PROYECTO', 15, contentY);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      doc.setFontSize(11);
      contentY += 6;
      doc.text(receipt.project_name, 15, contentY);
    }

    // Payment details table
    contentY += 15;
    autoTable(doc, {
      startY: contentY,
      head: [['Detalle', 'Información']],
      body: [
        ['Método de Pago', getPaymentMethodLabel(receipt.payment_method)],
        ['Número de Referencia', receipt.reference_number || 'N/A'],
        ['Concepto', receipt.concept || ''],
        ['Notas', receipt.notes || 'N/A']
      ],
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 5
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' }
      }
    });

    // Footer
    const footerY = doc.internal.pageSize.height - 20;
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text('Este documento es un comprobante de pago.', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Generado el ${new Date().toLocaleDateString('es-PR')}`, pageWidth / 2, footerY + 5, { align: 'center' });

    return doc;
  };

  const handleDownloadPdf = async (receipt) => {
    try {
      const doc = await generateReceiptPdf(receipt);
      doc.save(`Recibo_${receipt.receipt_number}.pdf`);
      toast.success('PDF descargado');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar PDF');
    }
  };

  const handleSendEmail = async () => {
    if (!selectedReceipt || !emailTo) {
      toast.error('Ingrese un email válido');
      return;
    }

    setSendingEmail(true);
    try {
      const doc = await generateReceiptPdf(selectedReceipt);
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      await api.post(`/receipts/${selectedReceipt.receipt_id}/send-email`, {
        to_email: emailTo,
        pdf_base64: pdfBase64
      }, { withCredentials: true });

      toast.success(`Recibo enviado a ${emailTo}`);
      setEmailDialogOpen(false);
      setEmailTo('');
    } catch (error) {
      toast.error('Error al enviar email');
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = 
      r.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.concept?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVendor = vendorFilter === 'all' || r.vendor_id === vendorFilter;
    const matchesProject = projectFilter === 'all' || r.project_id === projectFilter;
    return matchesSearch && matchesVendor && matchesProject;
  });

  // Calculate totals - use 'total' field (after discount) if available, otherwise 'amount'
  const totalAmount = filteredReceipts.reduce((sum, r) => sum + (r.total || r.amount || 0), 0);

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-7 h-7 text-blue-500" />
              Recibos de Pago
            </h1>
            <p className="text-slate-500">Gestiona los pagos realizados a proveedores</p>
          </div>
          <Button onClick={openNewReceipt} className="bg-blue-500 hover:bg-blue-600" data-testid="new-receipt-btn">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Recibo
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Recibos</p>
                  <p className="text-2xl font-bold">{filteredReceipts.length}</p>
                </div>
                <Receipt className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Pagado</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Proveedores</p>
                  <p className="text-2xl font-bold">{new Set(filteredReceipts.map(r => r.vendor_id)).size}</p>
                </div>
                <Truck className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por número, proveedor o concepto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
              </div>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-full md:w-48" data-testid="vendor-filter">
                  <Truck className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Proveedores</SelectItem>
                  {vendors.map(v => (
                    <SelectItem key={v.vendor_id} value={v.vendor_id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full md:w-48" data-testid="project-filter">
                  <FolderKanban className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Proyectos</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Receipts Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-slate-600">Recibo #</th>
                    <th className="text-left p-4 font-medium text-slate-600">Fecha</th>
                    <th className="text-left p-4 font-medium text-slate-600">Proveedor</th>
                    <th className="text-left p-4 font-medium text-slate-600">Proyecto</th>
                    <th className="text-left p-4 font-medium text-slate-600">Método</th>
                    <th className="text-left p-4 font-medium text-slate-600">Concepto</th>
                    <th className="text-right p-4 font-medium text-slate-600">Total</th>
                    <th className="text-center p-4 font-medium text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        No hay recibos registrados
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map(receipt => (
                      <tr key={receipt.receipt_id} className="border-b hover:bg-slate-50 transition-colors" data-testid={`receipt-row-${receipt.receipt_id}`}>
                        <td className="p-4">
                          <span className="font-mono font-medium text-blue-600">{receipt.receipt_number}</span>
                        </td>
                        <td className="p-4 text-slate-600">{formatDate(receipt.date)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">{receipt.vendor_name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">
                          {receipt.project_name || <span className="text-slate-400">-</span>}
                        </td>
                        <td className="p-4">
                          <Badge className={getPaymentMethodColor(receipt.payment_method)}>
                            {getPaymentMethodLabel(receipt.payment_method)}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-600 max-w-xs truncate">{receipt.concept}</td>
                        <td className="p-4 text-right">
                          {receipt.discount_percentage > 0 && (
                            <span className="text-xs text-orange-500 block">-{receipt.discount_percentage}%</span>
                          )}
                          <span className="font-medium text-green-600">{formatCurrency(receipt.total || receipt.amount)}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewReceipt(receipt)}
                              className="text-slate-500 hover:text-blue-600"
                              data-testid={`view-receipt-${receipt.receipt_id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPdf(receipt)}
                              className="text-slate-500 hover:text-green-600"
                              data-testid={`download-receipt-${receipt.receipt_id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditReceipt(receipt)}
                              className="text-slate-500 hover:text-orange-600"
                              data-testid={`edit-receipt-${receipt.receipt_id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReceipt(receipt.receipt_id)}
                              className="text-slate-500 hover:text-red-600"
                              data-testid={`delete-receipt-${receipt.receipt_id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetReceiptForm(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedReceipt && dialogOpen ? 'Editar Recibo' : 'Nuevo Recibo de Pago'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveReceipt} className="space-y-4" data-testid="receipt-form">
              <div>
                <Label>Proveedor *</Label>
                <Select
                  value={receiptForm.vendor_id}
                  onValueChange={(value) => setReceiptForm({ ...receiptForm, vendor_id: value })}
                  required
                >
                  <SelectTrigger data-testid="vendor-select">
                    <SelectValue placeholder="Seleccionar proveedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.vendor_id} value={v.vendor_id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Proyecto (Opcional)</Label>
                <Select
                  value={receiptForm.project_id}
                  onValueChange={(value) => setReceiptForm({ ...receiptForm, project_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger data-testid="project-select">
                    <SelectValue placeholder="Seleccionar proyecto..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin proyecto</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={receiptForm.date}
                    onChange={(e) => setReceiptForm({ ...receiptForm, date: e.target.value })}
                    required
                    data-testid="date-input"
                  />
                </div>
                <div>
                  <Label>Monto *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={receiptForm.amount}
                    onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                    required
                    placeholder="0.00"
                    data-testid="amount-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Método de Pago *</Label>
                  <Select
                    value={receiptForm.payment_method}
                    onValueChange={(value) => setReceiptForm({ ...receiptForm, payment_method: value })}
                    required
                  >
                    <SelectTrigger data-testid="payment-method-select">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Número de Referencia</Label>
                  <Input
                    value={receiptForm.reference_number}
                    onChange={(e) => setReceiptForm({ ...receiptForm, reference_number: e.target.value })}
                    placeholder="Ref. bancaria o # cheque"
                    data-testid="reference-input"
                  />
                </div>
              </div>

              <div>
                <Label>Concepto *</Label>
                <Input
                  value={receiptForm.concept}
                  onChange={(e) => setReceiptForm({ ...receiptForm, concept: e.target.value })}
                  required
                  placeholder="Descripción del pago"
                  data-testid="concept-input"
                />
              </div>

              <div>
                <Label>Notas</Label>
                <Textarea
                  value={receiptForm.notes}
                  onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                  data-testid="notes-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-500 hover:bg-blue-600" data-testid="save-receipt-btn">
                  {selectedReceipt && dialogOpen ? 'Actualizar' : 'Crear Recibo'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Receipt Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-500" />
                Recibo {selectedReceipt?.receipt_number}
              </DialogTitle>
            </DialogHeader>
            
            {selectedReceipt && (
              <div className="space-y-6">
                {/* Receipt Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Fecha</Label>
                    <p className="font-medium">{formatDate(selectedReceipt.date)}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Monto</Label>
                    <p className="font-medium text-xl text-green-600">{formatCurrency(selectedReceipt.amount)}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Proveedor</Label>
                    <p className="font-medium flex items-center gap-2">
                      <Truck className="w-4 h-4 text-slate-400" />
                      {selectedReceipt.vendor_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Proyecto</Label>
                    <p className="font-medium">{selectedReceipt.project_name || 'Sin proyecto'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Método de Pago</Label>
                    <Badge className={getPaymentMethodColor(selectedReceipt.payment_method)}>
                      {getPaymentMethodLabel(selectedReceipt.payment_method)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-slate-500">Referencia</Label>
                    <p className="font-medium">{selectedReceipt.reference_number || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-500">Concepto</Label>
                    <p className="font-medium">{selectedReceipt.concept}</p>
                  </div>
                  {selectedReceipt.notes && (
                    <div className="col-span-2">
                      <Label className="text-slate-500">Notas</Label>
                      <p className="text-slate-600">{selectedReceipt.notes}</p>
                    </div>
                  )}
                </div>

                {/* Attachments */}
                <div>
                  <Label className="text-slate-500 mb-2 block">Comprobantes Adjuntos</Label>
                  <div className="space-y-2">
                    {selectedReceipt.attachments?.length > 0 ? (
                      selectedReceipt.attachments.map(att => (
                        <div key={att.attachment_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <a 
                              href={att.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {att.filename}
                            </a>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(att.attachment_id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-sm">No hay comprobantes adjuntos</p>
                    )}
                  </div>
                  <div className="mt-3">
                    <CloudinaryUpload
                      onUploadSuccess={handleAddAttachment}
                      uploadPreset="unsigned_preset"
                      folder="receipts"
                      resourceType="auto"
                      buttonText="Adjuntar Comprobante"
                      buttonClassName="w-full"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button
                    onClick={() => handleDownloadPdf(selectedReceipt)}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Download className="w-4 h-4 mr-2" /> Descargar PDF
                  </Button>
                  <Button
                    onClick={() => {
                      setEmailDialogOpen(true);
                    }}
                    variant="outline"
                  >
                    <Mail className="w-4 h-4 mr-2" /> Enviar por Email
                  </Button>
                  <Button
                    onClick={() => {
                      setViewDialogOpen(false);
                      openEditReceipt(selectedReceipt);
                    }}
                    variant="outline"
                  >
                    <Edit className="w-4 h-4 mr-2" /> Editar
                  </Button>
                  <Button
                    onClick={() => handleDeleteReceipt(selectedReceipt.receipt_id)}
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Email Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enviar Recibo por Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email del destinatario</Label>
                <Input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  data-testid="email-input"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSendEmail} 
                  disabled={sendingEmail}
                  className="bg-blue-500 hover:bg-blue-600"
                  data-testid="send-email-btn"
                >
                  {sendingEmail ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default PaymentReceipts;
