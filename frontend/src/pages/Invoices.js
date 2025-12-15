import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, FileText, Download, Eye, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [payments, setPayments] = useState([]);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    project_id: '',
    client_name: '',
    client_email: '',
    tax_rate: 16,
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'transfer',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoicesRes, projectsRes] = await Promise.all([
        axios.get(`${API}/invoices`, { withCredentials: true }),
        axios.get(`${API}/projects`, { withCredentials: true })
      ]);
      setInvoices(invoicesRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();

    if (!formData.project_id) {
      toast.error('Selecciona un proyecto');
      return;
    }

    try {
      await axios.post(`${API}/invoices/generate`, formData, { withCredentials: true });
      toast.success('Factura generada exitosamente');
      setDialogOpen(false);
      setFormData({
        project_id: '',
        client_name: '',
        client_email: '',
        tax_rate: 16,
        notes: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al generar factura');
      console.error(error);
    }
  };

  const handleUpdateStatus = async (invoiceId, newStatus) => {
    try {
      await axios.put(
        `${API}/invoices/${invoiceId}/status`,
        null,
        {
          params: { status: newStatus },
          withCredentials: true
        }
      );
      toast.success('Estado actualizado');
      loadData();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleDeleteInvoice = async (invoiceId, invoiceNumber) => {
    if (!window.confirm(`¿Eliminar factura ${invoiceNumber}?`)) return;

    try {
      await axios.delete(`${API}/invoices/${invoiceId}`, { withCredentials: true });
      toast.success('Factura eliminada');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar factura');
    }
  };

  const handleSendInvoice = async (invoiceId, clientEmail) => {
    if (!clientEmail) {
      toast.error('La factura no tiene email del cliente');
      return;
    }

    try {
      await axios.post(`${API}/invoices/${invoiceId}/send`, {}, { withCredentials: true });
      toast.success(`Factura enviada a ${clientEmail}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar factura');
    }
  };

  const handleOpenPaymentDialog = async (invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentForm({
      amount: invoice.balance_due || invoice.total,
      payment_method: 'transfer',
      reference: '',
      notes: ''
    });
    
    // Load existing payments
    try {
      const response = await axios.get(`${API}/invoices/${invoice.invoice_id}/payments`, { withCredentials: true });
      setPayments(response.data);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
    
    setPaymentDialogOpen(true);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        `${API}/invoices/${selectedInvoiceForPayment.invoice_id}/payments`,
        paymentForm,
        { withCredentials: true }
      );
      toast.success('Pago registrado exitosamente');
      setPaymentDialogOpen(false);
      setPaymentForm({
        amount: 0,
        payment_method: 'transfer',
        reference: '',
        notes: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar pago');
    }
  };

  const exportToPDF = (invoice) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text('FACTURA', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Factura #: ${invoice.invoice_number}`, 14, 32);
    doc.text(`Fecha: ${moment(invoice.created_at).format('DD/MM/YYYY')}`, 14, 38);
    doc.text(`Vencimiento: ${moment(invoice.due_date).format('DD/MM/YYYY')}`, 14, 44);

    // Client info
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Cliente:', 14, 56);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(invoice.client_name, 14, 62);
    if (invoice.client_email) {
      doc.text(invoice.client_email, 14, 68);
    }

    // Project info
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Proyecto:', 120, 56);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(invoice.project_name, 120, 62);

    // Items table
    const tableData = invoice.items.map(item => [
      item.description,
      item.hours.toFixed(2),
      `$${item.rate.toFixed(2)}`,
      `$${item.amount.toFixed(2)}`
    ]);

    doc.autoTable({
      head: [['Descripción', 'Horas', 'Tarifa', 'Total']],
      body: tableData,
      startY: 80,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // Totals
    doc.setFontSize(10);
    doc.text(`Subtotal:`, 140, finalY);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, 180, finalY, { align: 'right' });

    doc.text(`Impuestos (${invoice.tax_rate}%):`, 140, finalY + 6);
    doc.text(`$${invoice.tax_amount.toFixed(2)}`, 180, finalY + 6, { align: 'right' });

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL:`, 140, finalY + 14);
    doc.text(`$${invoice.total.toFixed(2)}`, 180, finalY + 14, { align: 'right' });

    // Notes
    if (invoice.notes) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text('Notas:', 14, finalY + 30);
      doc.text(invoice.notes, 14, finalY + 36, { maxWidth: 180 });
    }

    doc.save(`Factura_${invoice.invoice_number}.pdf`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-slate-100 text-slate-700">Borrador</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-700">Enviada</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-700">Pagada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Cargando facturas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">Facturas</h1>
            <p className="text-muted-foreground mt-2">Genera facturas automáticamente desde el timesheet</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Generar Factura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Generar Nueva Factura</DialogTitle>
                <DialogDescription>
                  La factura se generará automáticamente desde el timesheet del proyecto
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleGenerateInvoice}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="project">Proyecto *</Label>
                    <Select
                      value={formData.project_id}
                      onValueChange={(value) => {
                        const project = projects.find(p => p.project_id === value);
                        setFormData({
                          ...formData,
                          project_id: value,
                          client_name: project?.client || ''
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.project_id} value={project.project_id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client_name">Nombre del Cliente *</Label>
                    <Input
                      id="client_name"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      required
                      placeholder="Empresa o Persona"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client_email">Email del Cliente</Label>
                    <Input
                      id="client_email"
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      placeholder="cliente@ejemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">Tasa de Impuesto (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas (Opcional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Términos y condiciones, información adicional..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Generar Factura
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Payment Dialog */}
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Pago</DialogTitle>
                <DialogDescription>
                  {selectedInvoiceForPayment && (
                    <div className="mt-2">
                      <p>Factura: {selectedInvoiceForPayment.invoice_number}</p>
                      <p className="text-lg font-bold mt-1">
                        Saldo Pendiente: ${selectedInvoiceForPayment.balance_due?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddPayment}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto del Pago *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                      required
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_method">Método de Pago *</Label>
                    <Select
                      value={paymentForm.payment_method}
                      onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                        <SelectItem value="card">Tarjeta</SelectItem>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="check">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference">Referencia/Confirmación</Label>
                    <Input
                      id="reference"
                      value={paymentForm.reference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                      placeholder="Número de referencia o confirmación"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_notes">Notas</Label>
                    <Textarea
                      id="payment_notes"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      placeholder="Información adicional del pago..."
                      rows={2}
                    />
                  </div>

                  {/* Existing Payments */}
                  {payments.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-2 text-sm">Pagos Anteriores:</h4>
                      <div className="space-y-2">
                        {payments.map((payment) => (
                          <div key={payment.payment_id} className="text-xs bg-slate-50 p-2 rounded">
                            <div className="flex justify-between">
                              <span>{moment(payment.created_at).format('DD/MM/YYYY')}</span>
                              <span className="font-bold">${payment.amount.toFixed(2)}</span>
                            </div>
                            <div className="text-slate-600">{payment.payment_method}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Registrar Pago
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Invoices List */}
        {invoices.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {invoices.map((invoice) => (
              <Card key={invoice.invoice_id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[#0F172A]">{invoice.invoice_number}</h3>
                          <p className="text-sm text-slate-600">{invoice.project_name}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-slate-600">Cliente</p>
                          <p className="text-sm font-medium">{invoice.client_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Fecha</p>
                          <p className="text-sm font-medium">{moment(invoice.created_at).format('DD/MM/YYYY')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Total</p>
                          <p className="text-lg font-bold font-mono text-blue-600">
                            ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 mb-1">Estado</p>
                          {getStatusBadge(invoice.status)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToPDF(invoice)}
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>

                      {invoice.status === 'draft' && invoice.client_email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendInvoice(invoice.invoice_id, invoice.client_email)}
                          className="text-blue-600"
                        >
                          📧 Enviar por Email
                        </Button>
                      )}

                      {(invoice.status === 'sent' || invoice.status === 'partial') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPaymentDialog(invoice)}
                          className="text-green-600"
                        >
                          💵 Registrar Pago
                        </Button>
                      )}

                      {invoice.balance_due > 0 && invoice.status !== 'draft' && (
                        <div className="text-xs text-center py-1">
                          <p className="text-slate-600">Pendiente:</p>
                          <p className="font-bold text-red-600">
                            ${invoice.balance_due.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInvoice(invoice.invoice_id, invoice.invoice_number)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Items preview */}
                  {selectedInvoice === invoice.invoice_id && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <h4 className="font-semibold mb-2">Detalles:</h4>
                      <div className="space-y-2">
                        {invoice.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.description}</span>
                            <span className="font-mono">{item.hours}h × ${item.rate} = ${item.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSelectedInvoice(selectedInvoice === invoice.invoice_id ? null : invoice.invoice_id)}
                    className="mt-2"
                  >
                    {selectedInvoice === invoice.invoice_id ? 'Ocultar detalles' : 'Ver detalles'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <DollarSign className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600 mb-2">No hay facturas generadas</p>
              <p className="text-sm text-muted-foreground mb-6">Crea tu primera factura desde el timesheet de un proyecto</p>
              <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Generar Factura
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Invoices;
