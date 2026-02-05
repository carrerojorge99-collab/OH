import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import moment from 'moment';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import { 
  Plus, Trash2, Edit, Eye, Send, CheckCircle, Clock,
  FileQuestion, MessageSquare, Download, AlertTriangle,
  Search, Filter, MoreVertical, XCircle, FileText,
  Calendar, Building2, User, Mail
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  in_review: 'bg-yellow-100 text-yellow-800',
  responded: 'bg-green-100 text-green-800',
  closed: 'bg-purple-100 text-purple-800'
};

const statusLabels = {
  draft: 'Borrador',
  sent: 'Enviado',
  in_review: 'En Revisión',
  responded: 'Respondido',
  closed: 'Cerrado'
};

const priorityColors = {
  high: 'bg-red-100 text-red-800',
  normal: 'bg-blue-100 text-blue-800',
  unknown: 'bg-gray-100 text-gray-800'
};

const priorityLabels = {
  high: 'Alta',
  normal: 'Normal',
  unknown: 'Desconocida'
};

const impactLabels = {
  yes: 'Sí',
  no: 'No',
  unknown: 'Desconocido'
};

const ProjectRFI = ({ projectId, projectName, projectNumber }) => {
  const [rfis, setRfis] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedRfi, setSelectedRfi] = useState(null);
  
  // Form state
  const [rfiForm, setRfiForm] = useState({
    rfi_type: 'rfi',
    to_name: '',
    to_company: '',
    to_email: '',
    submitted_by: '',
    submitted_by_company: 'OHSMS',
    question: '',
    priority: 'normal',
    cost_impact: 'unknown',
    schedule_impact: 'unknown',
    due_date: ''
  });
  
  const [responseForm, setResponseForm] = useState({
    response_text: '',
    responded_by: '',
    responded_by_company: '',
    responded_by_title: ''
  });

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      const [rfisRes, statsRes] = await Promise.all([
        api.get(`/rfis?project_id=${projectId}`, { withCredentials: true }),
        api.get(`/projects/${projectId}/rfi-stats`, { withCredentials: true })
      ]);
      setRfis(rfisRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading RFIs:', error);
      toast.error('Error al cargar RFIs');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRfiForm({
      rfi_type: 'rfi',
      to_name: '',
      to_company: '',
      to_email: '',
      submitted_by: '',
      submitted_by_company: 'OHSMS',
      question: '',
      priority: 'normal',
      cost_impact: 'unknown',
      schedule_impact: 'unknown',
      due_date: ''
    });
  };

  const handleCreateRfi = async (e) => {
    e.preventDefault();
    if (!rfiForm.to_name || !rfiForm.submitted_by || !rfiForm.question) {
      toast.error('Complete los campos requeridos');
      return;
    }

    try {
      await api.post('/rfis', {
        project_id: projectId,
        ...rfiForm
      }, { withCredentials: true });
      
      toast.success('RFI creado exitosamente');
      setCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear RFI');
    }
  };

  const handleUpdateRfi = async (e) => {
    e.preventDefault();
    if (!selectedRfi) return;

    try {
      await api.put(`/rfis/${selectedRfi.rfi_id}`, rfiForm, { withCredentials: true });
      toast.success('RFI actualizado exitosamente');
      setEditDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar RFI');
    }
  };

  const handleDeleteRfi = async (rfiId) => {
    if (!window.confirm('¿Está seguro de eliminar este RFI?')) return;

    try {
      await api.delete(`/rfis/${rfiId}`, { withCredentials: true });
      toast.success('RFI eliminado exitosamente');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar RFI');
    }
  };

  const handleSendRfi = async (rfiId) => {
    try {
      await api.post(`/rfis/${rfiId}/send`, {}, { withCredentials: true });
      toast.success('RFI enviado exitosamente');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar RFI');
    }
  };

  const handleRespondRfi = async (e) => {
    e.preventDefault();
    if (!selectedRfi || !responseForm.response_text || !responseForm.responded_by) {
      toast.error('Complete los campos requeridos');
      return;
    }

    try {
      await api.post(`/rfis/${selectedRfi.rfi_id}/respond`, responseForm, { withCredentials: true });
      toast.success('Respuesta registrada exitosamente');
      setResponseDialogOpen(false);
      setResponseForm({ response_text: '', responded_by: '', responded_by_company: '', responded_by_title: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar respuesta');
    }
  };

  const handleCloseRfi = async (rfiId) => {
    try {
      await api.post(`/rfis/${rfiId}/close`, {}, { withCredentials: true });
      toast.success('RFI cerrado exitosamente');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cerrar RFI');
    }
  };

  const openEditDialog = (rfi) => {
    setSelectedRfi(rfi);
    setRfiForm({
      rfi_type: rfi.rfi_type,
      to_name: rfi.to_name,
      to_company: rfi.to_company || '',
      to_email: rfi.to_email || '',
      submitted_by: rfi.submitted_by,
      submitted_by_company: rfi.submitted_by_company || '',
      question: rfi.question,
      priority: rfi.priority,
      cost_impact: rfi.cost_impact,
      schedule_impact: rfi.schedule_impact,
      due_date: rfi.due_date || ''
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = (rfi) => {
    setSelectedRfi(rfi);
    setViewDialogOpen(true);
  };

  const openResponseDialog = (rfi) => {
    setSelectedRfi(rfi);
    setResponseDialogOpen(true);
  };

  // Generate PDF for RFI - Professional OHSMS format
  const generateRfiPdf = (rfi) => {
    import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let y = 15;

      // Helper function to draw checkbox
      const drawCheckbox = (x, yPos, checked, label) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.rect(x, yPos - 3, 4, 4);
        if (checked) {
          doc.setFont(undefined, 'bold');
          doc.text('X', x + 0.8, yPos);
          doc.setFont(undefined, 'normal');
        }
        doc.text(label, x + 6, yPos);
      };

      // ========== HEADER WITH LOGO ==========
      // Logo area (left side)
      doc.setFillColor(0, 100, 0); // Dark green
      doc.rect(margin, y, 40, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('OHSMS', margin + 4, y + 8);
      doc.setFontSize(6);
      doc.setFont(undefined, 'normal');
      doc.text('SAFETY IS OUR PRIORITY', margin + 4, y + 14);
      
      // Company info (right of logo)
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.text('Occupational Health & Safety Management Services', margin + 45, y + 4);
      doc.text('HC 4 Box 4898 Las Piedras, PR 00771', margin + 45, y + 9);
      doc.text('(939) 610-3425 / (787) 966-9044', margin + 45, y + 14);

      // ========== TITLE ==========
      y = 40;
      doc.setFillColor(200, 200, 200);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('REQUEST FOR INFORMATION / CLARIFICATION', pageWidth / 2, y + 5.5, { align: 'center' });

      // ========== RFI/RFC CHECKBOXES ==========
      y = 52;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const isRfi = rfi.rfi_type === 'rfi';
      drawCheckbox(margin, y, isRfi, 'Request For Information (RFI)');
      drawCheckbox(margin + 70, y, !isRfi, 'Request For Clarification (RFC)');

      // ========== INFO SECTION - TWO COLUMNS ==========
      y = 60;
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      
      // Draw border for info section
      doc.rect(margin, y, contentWidth, 32);
      
      // Vertical divider
      const midX = margin + contentWidth / 2;
      doc.line(midX, y, midX, y + 32);
      
      // Left column - To/From info
      const leftPadding = margin + 3;
      const leftValueX = margin + 28;
      
      y += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('To:', leftPadding, y);
      doc.setFont(undefined, 'normal');
      doc.text(rfi.to_name || '', leftValueX, y);
      
      y += 6;
      doc.setFont(undefined, 'bold');
      doc.text('Company:', leftPadding, y);
      doc.setFont(undefined, 'normal');
      doc.text(rfi.to_company || '', leftValueX, y);
      
      y += 8;
      doc.setFont(undefined, 'bold');
      doc.text('Submitted by:', leftPadding, y);
      doc.setFont(undefined, 'normal');
      doc.text(rfi.submitted_by || '', leftValueX + 5, y);
      
      y += 6;
      doc.setFont(undefined, 'bold');
      doc.text('Company:', leftPadding, y);
      doc.setFont(undefined, 'normal');
      doc.text(rfi.submitted_by_company || '', leftValueX, y);

      // Right column - Document info
      const rightPadding = midX + 3;
      const rightValueX = midX + 30;
      let yRight = 66;
      
      doc.setFont(undefined, 'bold');
      doc.text('Document No.:', rightPadding, yRight);
      doc.setFont(undefined, 'normal');
      doc.text(rfi.rfi_number || '', rightValueX, yRight);
      
      yRight += 6;
      doc.setFont(undefined, 'bold');
      doc.text('Date:', rightPadding, yRight);
      doc.setFont(undefined, 'normal');
      doc.text(moment(rfi.created_at).format('MMM/DD/YYYY'), rightValueX, yRight);
      
      yRight += 8;
      doc.setFont(undefined, 'bold');
      doc.text('Project Name:', rightPadding, yRight);
      doc.setFont(undefined, 'normal');
      const projName = (rfi.project_name || projectName || '').substring(0, 25);
      doc.text(projName, rightValueX, yRight);
      
      yRight += 6;
      doc.setFont(undefined, 'bold');
      doc.text('Project No.:', rightPadding, yRight);
      doc.setFont(undefined, 'normal');
      doc.text(rfi.project_number || projectNumber || '', rightValueX, yRight);

      // ========== QUESTION SECTION ==========
      y = 96;
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('Information / Clarification Required:', margin + 3, y + 5);
      
      y += 10;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      // Question text with numbering
      const questionText = `1. ${rfi.question || ''}`;
      const questionLines = doc.splitTextToSize(questionText, contentWidth - 6);
      doc.text(questionLines, margin + 3, y);
      y += questionLines.length * 4 + 8;

      // ========== IMPACT SECTION ==========
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, y, contentWidth, 24, 'F');
      doc.rect(margin, y, contentWidth, 24); // Border
      
      const impactStartY = y + 6;
      const labelX = margin + 3;
      const optionsStartX = margin + 40;
      const optionSpacing = 30;
      
      // Priority row
      doc.setFont(undefined, 'bold');
      doc.text('Priority:', labelX, impactStartY);
      doc.setFont(undefined, 'normal');
      drawCheckbox(optionsStartX, impactStartY, rfi.priority === 'high', 'High');
      drawCheckbox(optionsStartX + optionSpacing, impactStartY, rfi.priority === 'normal', 'Normal');
      drawCheckbox(optionsStartX + optionSpacing * 2, impactStartY, rfi.priority === 'unknown', 'Unknown');
      
      // Cost Impact row
      const costY = impactStartY + 8;
      doc.setFont(undefined, 'bold');
      doc.text('Cost Impact:', labelX, costY);
      doc.setFont(undefined, 'normal');
      drawCheckbox(optionsStartX, costY, rfi.cost_impact === 'yes', 'Yes');
      drawCheckbox(optionsStartX + optionSpacing, costY, rfi.cost_impact === 'no', 'No');
      drawCheckbox(optionsStartX + optionSpacing * 2, costY, rfi.cost_impact === 'unknown', 'Unknown');
      
      // Schedule Impact row
      const schedY = costY + 8;
      doc.setFont(undefined, 'bold');
      doc.text('Schedule Impact:', labelX, schedY);
      doc.setFont(undefined, 'normal');
      drawCheckbox(optionsStartX, schedY, rfi.schedule_impact === 'yes', 'Yes');
      drawCheckbox(optionsStartX + optionSpacing, schedY, rfi.schedule_impact === 'no', 'No');
      drawCheckbox(optionsStartX + optionSpacing * 2, schedY, rfi.schedule_impact === 'unknown', 'Unknown');

      y += 28;

      // ========== RESPONSE SECTION ==========
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('Response:', margin + 3, y + 5);
      
      y += 10;
      doc.setFont(undefined, 'normal');
      
      if (rfi.response) {
        const responseLines = doc.splitTextToSize(rfi.response.response_text || '', contentWidth - 6);
        doc.text(responseLines, margin + 3, y);
        y += responseLines.length * 4 + 10;
        
        // Response details in a bordered box
        doc.rect(margin, y, contentWidth, 20);
        
        const respY = y + 6;
        doc.setFont(undefined, 'bold');
        doc.text('Response By:', margin + 3, respY);
        doc.setFont(undefined, 'normal');
        doc.text(rfi.response.responded_by || '', margin + 30, respY);
        
        doc.setFont(undefined, 'bold');
        doc.text('Company:', midX + 3, respY);
        doc.setFont(undefined, 'normal');
        doc.text(rfi.response.responded_by_company || '', midX + 25, respY);
        
        const respY2 = respY + 8;
        doc.setFont(undefined, 'bold');
        doc.text('Title:', margin + 3, respY2);
        doc.setFont(undefined, 'normal');
        doc.text(rfi.response.responded_by_title || '', margin + 18, respY2);
        
        doc.setFont(undefined, 'bold');
        doc.text('Date:', midX + 3, respY2);
        doc.setFont(undefined, 'normal');
        doc.text(rfi.response.responded_at ? moment(rfi.response.responded_at).format('MMM/DD/YYYY') : '', midX + 18, respY2);
      } else {
        // Empty response box with lines
        doc.rect(margin, y, contentWidth, 35);
        
        y += 25;
        doc.setLineWidth(0.2);
        
        // Response By line
        doc.setFont(undefined, 'bold');
        doc.text('Response By:', margin + 3, y);
        doc.line(margin + 30, y + 1, margin + 75, y + 1);
        
        doc.text('Company:', midX + 3, y);
        doc.line(midX + 25, y + 1, pageWidth - margin - 3, y + 1);
        
        y += 8;
        doc.text('Title:', margin + 3, y);
        doc.line(margin + 18, y + 1, margin + 75, y + 1);
        
        doc.text('Date:', midX + 3, y);
        doc.line(midX + 18, y + 1, pageWidth - margin - 3, y + 1);
      }

      // ========== FOOTER ==========
      y = pageHeight - 12;
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('Form-OHSMS-E-0003', margin, y);
      doc.setFont(undefined, 'bold');
      doc.text('Powered by ProManage', pageWidth / 2, y, { align: 'center' });
      doc.setFont(undefined, 'normal');
      doc.text('Rev. 01 - 08/18/2025', pageWidth - margin, y, { align: 'right' });

      // Save PDF
      doc.save(`${rfi.rfi_number}.pdf`);
      toast.success('PDF generado exitosamente');
    });
  };

  // Filter RFIs
  const filteredRfis = rfis.filter(rfi => {
    const matchesSearch = !searchTerm || 
      rfi.rfi_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfi.to_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfi.question?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || rfi.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Cargando RFIs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileQuestion className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Borrador</p>
                  <p className="text-2xl font-bold">{stats.draft}</p>
                </div>
                <Edit className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Enviados</p>
                  <p className="text-2xl font-bold">{stats.sent}</p>
                </div>
                <Send className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">En Revisión</p>
                  <p className="text-2xl font-bold">{stats.in_review}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Respondidos</p>
                  <p className="text-2xl font-bold">{stats.responded}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Cerrados</p>
                  <p className="text-2xl font-bold">{stats.closed}</p>
                </div>
                <XCircle className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className={`border-slate-200 ${stats.overdue > 0 ? 'bg-red-50' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar RFI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-64"
              data-testid="rfi-search-input"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40" data-testid="rfi-status-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="in_review">En Revisión</SelectItem>
              <SelectItem value="responded">Respondido</SelectItem>
              <SelectItem value="closed">Cerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button
          onClick={() => {
            resetForm();
            setCreateDialogOpen(true);
          }}
          className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
          data-testid="create-rfi-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo RFI
        </Button>
      </div>

      {/* RFI List */}
      <div className="space-y-4">
        {filteredRfis.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center">
              <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No hay RFIs {statusFilter !== 'all' ? `con estado "${statusLabels[statusFilter]}"` : ''}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  resetForm();
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer RFI
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredRfis.map((rfi) => (
            <Card key={rfi.rfi_id} className="border-slate-200 hover:shadow-md transition-shadow" data-testid={`rfi-card-${rfi.rfi_id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-lg">{rfi.rfi_number}</span>
                      <Badge className={statusColors[rfi.status]}>
                        {statusLabels[rfi.status]}
                      </Badge>
                      <Badge className={priorityColors[rfi.priority]}>
                        {priorityLabels[rfi.priority]}
                      </Badge>
                      {rfi.rfi_type === 'rfc' && (
                        <Badge variant="outline">RFC</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-600 line-clamp-2">{rfi.question}</p>
                    
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Para: {rfi.to_name}
                      </span>
                      {rfi.to_company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {rfi.to_company}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {moment(rfi.created_at).format('DD/MM/YYYY')}
                      </span>
                      {rfi.due_date && (
                        <span className={`flex items-center gap-1 ${moment(rfi.due_date).isBefore(moment()) && rfi.status !== 'closed' && rfi.status !== 'responded' ? 'text-red-500 font-medium' : ''}`}>
                          <Clock className="w-3 h-3" />
                          Vence: {moment(rfi.due_date).format('DD/MM/YYYY')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openViewDialog(rfi)}
                      data-testid={`view-rfi-${rfi.rfi_id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateRfiPdf(rfi)}
                      data-testid={`pdf-rfi-${rfi.rfi_id}`}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {rfi.status === 'draft' && (
                          <>
                            <DropdownMenuItem onClick={() => openEditDialog(rfi)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendRfi(rfi.rfi_id)}>
                              <Send className="w-4 h-4 mr-2" />
                              Enviar
                            </DropdownMenuItem>
                          </>
                        )}
                        {(rfi.status === 'sent' || rfi.status === 'in_review') && (
                          <DropdownMenuItem onClick={() => openResponseDialog(rfi)}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Registrar Respuesta
                          </DropdownMenuItem>
                        )}
                        {rfi.status === 'responded' && (
                          <DropdownMenuItem onClick={() => handleCloseRfi(rfi.rfi_id)}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Cerrar RFI
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDeleteRfi(rfi.rfi_id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create RFI Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Nuevo RFI</DialogTitle>
            <DialogDescription>
              Crear una nueva Solicitud de Información
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRfi}>
            <div className="space-y-4 py-4">
              {/* Type */}
              <div className="space-y-2">
                <Label>Tipo de Solicitud</Label>
                <Select value={rfiForm.rfi_type} onValueChange={(v) => setRfiForm({...rfiForm, rfi_type: v})}>
                  <SelectTrigger data-testid="rfi-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rfi">Request For Information (RFI)</SelectItem>
                    <SelectItem value="rfc">Request For Clarification (RFC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* To */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Para (Nombre) *</Label>
                  <Input
                    value={rfiForm.to_name}
                    onChange={(e) => setRfiForm({...rfiForm, to_name: e.target.value})}
                    placeholder="Ej: Eng. Hector Colon"
                    required
                    data-testid="rfi-to-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compañía</Label>
                  <Input
                    value={rfiForm.to_company}
                    onChange={(e) => setRfiForm({...rfiForm, to_company: e.target.value})}
                    placeholder="Ej: JLL - Janssen"
                    data-testid="rfi-to-company-input"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Email del Destinatario</Label>
                <Input
                  type="email"
                  value={rfiForm.to_email}
                  onChange={(e) => setRfiForm({...rfiForm, to_email: e.target.value})}
                  placeholder="email@ejemplo.com"
                  data-testid="rfi-to-email-input"
                />
              </div>

              {/* From */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Enviado Por *</Label>
                  <Input
                    value={rfiForm.submitted_by}
                    onChange={(e) => setRfiForm({...rfiForm, submitted_by: e.target.value})}
                    placeholder="Ej: Luis Rivera"
                    required
                    data-testid="rfi-submitted-by-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compañía</Label>
                  <Input
                    value={rfiForm.submitted_by_company}
                    onChange={(e) => setRfiForm({...rfiForm, submitted_by_company: e.target.value})}
                    placeholder="OHSMS"
                    data-testid="rfi-submitted-by-company-input"
                  />
                </div>
              </div>

              {/* Question */}
              <div className="space-y-2">
                <Label>Información / Clarificación Requerida *</Label>
                <Textarea
                  value={rfiForm.question}
                  onChange={(e) => setRfiForm({...rfiForm, question: e.target.value})}
                  placeholder="Describa la información o clarificación que necesita..."
                  rows={4}
                  required
                  data-testid="rfi-question-input"
                />
              </div>

              {/* Impact Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select value={rfiForm.priority} onValueChange={(v) => setRfiForm({...rfiForm, priority: v})}>
                    <SelectTrigger data-testid="rfi-priority-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="unknown">Desconocida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Impacto en Costo</Label>
                  <Select value={rfiForm.cost_impact} onValueChange={(v) => setRfiForm({...rfiForm, cost_impact: v})}>
                    <SelectTrigger data-testid="rfi-cost-impact-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="unknown">Desconocido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Impacto en Cronograma</Label>
                  <Select value={rfiForm.schedule_impact} onValueChange={(v) => setRfiForm({...rfiForm, schedule_impact: v})}>
                    <SelectTrigger data-testid="rfi-schedule-impact-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="unknown">Desconocido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label>Fecha Límite de Respuesta</Label>
                <Input
                  type="date"
                  value={rfiForm.due_date}
                  onChange={(e) => setRfiForm({...rfiForm, due_date: e.target.value})}
                  data-testid="rfi-due-date-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600" data-testid="submit-create-rfi">
                Crear RFI
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit RFI Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Editar RFI</DialogTitle>
            <DialogDescription>
              {selectedRfi?.rfi_number}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateRfi}>
            <div className="space-y-4 py-4">
              {/* Same fields as create */}
              <div className="space-y-2">
                <Label>Tipo de Solicitud</Label>
                <Select value={rfiForm.rfi_type} onValueChange={(v) => setRfiForm({...rfiForm, rfi_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rfi">Request For Information (RFI)</SelectItem>
                    <SelectItem value="rfc">Request For Clarification (RFC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Para (Nombre) *</Label>
                  <Input
                    value={rfiForm.to_name}
                    onChange={(e) => setRfiForm({...rfiForm, to_name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compañía</Label>
                  <Input
                    value={rfiForm.to_company}
                    onChange={(e) => setRfiForm({...rfiForm, to_company: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Email del Destinatario</Label>
                <Input
                  type="email"
                  value={rfiForm.to_email}
                  onChange={(e) => setRfiForm({...rfiForm, to_email: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Enviado Por *</Label>
                  <Input
                    value={rfiForm.submitted_by}
                    onChange={(e) => setRfiForm({...rfiForm, submitted_by: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compañía</Label>
                  <Input
                    value={rfiForm.submitted_by_company}
                    onChange={(e) => setRfiForm({...rfiForm, submitted_by_company: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Información / Clarificación Requerida *</Label>
                <Textarea
                  value={rfiForm.question}
                  onChange={(e) => setRfiForm({...rfiForm, question: e.target.value})}
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select value={rfiForm.priority} onValueChange={(v) => setRfiForm({...rfiForm, priority: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="unknown">Desconocida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Impacto en Costo</Label>
                  <Select value={rfiForm.cost_impact} onValueChange={(v) => setRfiForm({...rfiForm, cost_impact: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="unknown">Desconocido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Impacto en Cronograma</Label>
                  <Select value={rfiForm.schedule_impact} onValueChange={(v) => setRfiForm({...rfiForm, schedule_impact: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="unknown">Desconocido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fecha Límite de Respuesta</Label>
                <Input
                  type="date"
                  value={rfiForm.due_date}
                  onChange={(e) => setRfiForm({...rfiForm, due_date: e.target.value})}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View RFI Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-3">
              {selectedRfi?.rfi_number}
              <Badge className={statusColors[selectedRfi?.status]}>
                {statusLabels[selectedRfi?.status]}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedRfi && (
            <div className="space-y-6 py-4">
              {/* Type Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {selectedRfi.rfi_type === 'rfi' ? 'Request For Information (RFI)' : 'Request For Clarification (RFC)'}
                </Badge>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Para</p>
                  <p className="font-medium">{selectedRfi.to_name}</p>
                  {selectedRfi.to_company && <p className="text-sm text-slate-600">{selectedRfi.to_company}</p>}
                  {selectedRfi.to_email && (
                    <p className="text-sm text-blue-600 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {selectedRfi.to_email}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Enviado Por</p>
                  <p className="font-medium">{selectedRfi.submitted_by}</p>
                  {selectedRfi.submitted_by_company && <p className="text-sm text-slate-600">{selectedRfi.submitted_by_company}</p>}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Proyecto</p>
                  <p className="font-medium">{selectedRfi.project_name}</p>
                  {selectedRfi.project_number && <p className="text-sm text-slate-600">{selectedRfi.project_number}</p>}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Fecha</p>
                  <p className="font-medium">{moment(selectedRfi.created_at).format('DD/MM/YYYY')}</p>
                  {selectedRfi.due_date && (
                    <p className={`text-sm ${moment(selectedRfi.due_date).isBefore(moment()) ? 'text-red-600' : 'text-slate-600'}`}>
                      Vence: {moment(selectedRfi.due_date).format('DD/MM/YYYY')}
                    </p>
                  )}
                </div>
              </div>

              {/* Impact */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Prioridad:</span>
                  <Badge className={priorityColors[selectedRfi.priority]}>
                    {priorityLabels[selectedRfi.priority]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Impacto Costo:</span>
                  <Badge variant="outline">{impactLabels[selectedRfi.cost_impact]}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Impacto Cronograma:</span>
                  <Badge variant="outline">{impactLabels[selectedRfi.schedule_impact]}</Badge>
                </div>
              </div>

              {/* Question */}
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-700">Información / Clarificación Requerida:</h4>
                <div className="p-4 bg-white border rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedRfi.question}</p>
                </div>
              </div>

              {/* Response */}
              {selectedRfi.response ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Respuesta:
                  </h4>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                    <p className="whitespace-pre-wrap">{selectedRfi.response.response_text}</p>
                    <div className="pt-3 border-t border-green-200 text-sm text-slate-600">
                      <p><strong>Respondido por:</strong> {selectedRfi.response.responded_by}</p>
                      {selectedRfi.response.responded_by_company && (
                        <p><strong>Compañía:</strong> {selectedRfi.response.responded_by_company}</p>
                      )}
                      {selectedRfi.response.responded_by_title && (
                        <p><strong>Título:</strong> {selectedRfi.response.responded_by_title}</p>
                      )}
                      <p><strong>Fecha:</strong> {moment(selectedRfi.response.responded_at).format('DD/MM/YYYY HH:mm')}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-yellow-700">Pendiente de respuesta</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => selectedRfi && generateRfiPdf(selectedRfi)} className="bg-orange-500 hover:bg-orange-600">
              <Download className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Registrar Respuesta</DialogTitle>
            <DialogDescription>
              {selectedRfi?.rfi_number} - {selectedRfi?.to_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRespondRfi}>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500 mb-1">Pregunta:</p>
                <p className="text-sm">{selectedRfi?.question}</p>
              </div>

              <div className="space-y-2">
                <Label>Respuesta *</Label>
                <Textarea
                  value={responseForm.response_text}
                  onChange={(e) => setResponseForm({...responseForm, response_text: e.target.value})}
                  placeholder="Escriba la respuesta al RFI..."
                  rows={5}
                  required
                  data-testid="rfi-response-text"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Respondido Por *</Label>
                  <Input
                    value={responseForm.responded_by}
                    onChange={(e) => setResponseForm({...responseForm, responded_by: e.target.value})}
                    placeholder="Nombre completo"
                    required
                    data-testid="rfi-responded-by"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compañía</Label>
                  <Input
                    value={responseForm.responded_by_company}
                    onChange={(e) => setResponseForm({...responseForm, responded_by_company: e.target.value})}
                    placeholder="Nombre de la compañía"
                    data-testid="rfi-responded-company"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título / Cargo</Label>
                <Input
                  value={responseForm.responded_by_title}
                  onChange={(e) => setResponseForm({...responseForm, responded_by_title: e.target.value})}
                  placeholder="Ej: Project Manager"
                  data-testid="rfi-responded-title"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResponseDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" data-testid="submit-rfi-response">
                <CheckCircle className="w-4 h-4 mr-2" />
                Registrar Respuesta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectRFI;
