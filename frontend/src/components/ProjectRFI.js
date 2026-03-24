import React, { useState, useEffect, useRef } from 'react';
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
  Calendar, Building2, User, Mail, Paperclip, Upload, ExternalLink
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import { LOGO_BASE64 } from '../utils/logoData';

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
    due_date: '',
    attachments: [] // [{name, url, type}]
  });
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  
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
      due_date: '',
      attachments: []
    });
  };

  // Handle file upload for RFI attachments
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar 10MB');
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/cloudinary/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });

      const newAttachment = {
        name: file.name,
        url: response.data.secure_url,
        type: file.type,
        public_id: response.data.public_id
      };

      setRfiForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, newAttachment]
      }));

      toast.success('Documento adjuntado exitosamente');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir el documento');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove attachment from form
  const removeAttachment = (index) => {
    setRfiForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
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
      due_date: rfi.due_date || '',
      attachments: rfi.attachments || []
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

  // Generate PDF for RFI - Professional OHSMS format with merged attachments
  const generateRfiPdf = async (rfi) => {
    const { default: jsPDF } = await import('jspdf');
    const { PDFDocument } = await import('pdf-lib');
    
    toast.info('Generando PDF...');
    
    const doc = await createPDFDocument();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let y = 12;

    // Colors - matching Estimate style
    const orangeColor = [234, 88, 12]; // Orange accent
    const grayText = [100, 100, 100];
    const blackText = [0, 0, 0];

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

    // ========== HEADER - Clean minimal style ==========
    // Add company logo (same size as Estimate: 35x18)
    try {
      doc.addImage(LOGO_BASE64, 'PNG', margin, y, 35, 18);
    } catch (logoErr) {
      console.warn('Could not load logo:', logoErr);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...orangeColor);
      doc.text('OHSMS', margin, y + 10);
    }
    
    // Document title on the right
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...blackText);
    doc.text(rfi.rfi_type === 'rfi' ? 'RFI' : 'RFC', pageWidth - margin, y + 5, { align: 'right' });
    
    // Document number below title
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...grayText);
    doc.text(rfi.rfi_number || '', pageWidth - margin, y + 11, { align: 'right' });
    doc.text(moment(rfi.created_at).format('MMM DD, YYYY'), pageWidth - margin, y + 16, { align: 'right' });

    // Separator line
    y = 32;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    // ========== COMPANY & PROJECT INFO - Two columns ==========
    y = 40;
    doc.setFontSize(8);
    
    // Left column - Company info
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...blackText);
    doc.text('OHSMS', margin, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...grayText);
    doc.text('Occupational Health & Safety Management Services', margin, y + 4);
    doc.text('HC 4 Box 4898 Las Piedras, PR 00771', margin, y + 8);
    doc.text('(939) 610-3425 / (787) 966-9044', margin, y + 12);
    
    // Right column - Project info
    const rightCol = pageWidth - margin - 60;
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...grayText);
    doc.text('Project:', rightCol, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...blackText);
    const projName = (rfi.project_name || projectName || '').substring(0, 30);
    doc.text(projName, rightCol + 18, y);
    
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...grayText);
    doc.text('Project No.:', rightCol, y + 5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...blackText);
    doc.text(rfi.project_number || projectNumber || '', rightCol + 24, y + 5);

    // ========== TO/FROM SECTION ==========
    y = 60;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 24);
    
    const midX = margin + contentWidth / 2;
    doc.line(midX, y, midX, y + 24);
    
    // Left - TO
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...grayText);
    doc.text('TO:', margin + 4, y + 6);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...blackText);
    doc.text(rfi.to_name || '', margin + 4, y + 12);
    doc.setTextColor(...grayText);
    doc.text(rfi.to_company || '', margin + 4, y + 17);
    if (rfi.to_email) {
      doc.text(rfi.to_email, margin + 4, y + 22);
    }
    
    // Right - FROM
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...grayText);
    doc.text('FROM:', midX + 4, y + 6);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...blackText);
    doc.text(rfi.submitted_by || '', midX + 4, y + 12);
    doc.setTextColor(...grayText);
    doc.text(rfi.submitted_by_company || 'OHSMS', midX + 4, y + 17);

    // ========== QUESTION SECTION ==========
    y = 90;
    doc.setFillColor(...orangeColor);
    doc.rect(margin, y, 3, 7, 'F'); // Orange accent bar
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...blackText);
    doc.text('Information / Clarification Required', margin + 6, y + 5);
    
    y += 12;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...blackText);
    
    const questionText = rfi.question || '';
    const questionLines = doc.splitTextToSize(questionText, contentWidth - 10);
    doc.text(questionLines, margin + 4, y);
    y += questionLines.length * 4.5 + 10;

    // ========== IMPACT SECTION - Clean style ==========
    doc.setDrawColor(230, 230, 230);
    doc.rect(margin, y, contentWidth, 22);
    
    const impactY = y + 7;
    const colWidth = contentWidth / 3;
    
    // Priority
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...grayText);
    doc.text('Priority:', margin + 4, impactY);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...blackText);
    const priorityText = rfi.priority === 'high' ? 'High' : rfi.priority === 'normal' ? 'Normal' : 'Unknown';
    doc.text(priorityText, margin + 22, impactY);
    
    // Cost Impact
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...grayText);
    doc.text('Cost Impact:', margin + colWidth + 4, impactY);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...blackText);
    const costText = rfi.cost_impact === 'yes' ? 'Yes' : rfi.cost_impact === 'no' ? 'No' : 'Unknown';
    doc.text(costText, margin + colWidth + 30, impactY);
    
    // Schedule Impact
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...grayText);
    doc.text('Schedule Impact:', margin + colWidth * 2 + 4, impactY);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...blackText);
    const schedText = rfi.schedule_impact === 'yes' ? 'Yes' : rfi.schedule_impact === 'no' ? 'No' : 'Unknown';
    doc.text(schedText, margin + colWidth * 2 + 38, impactY);
    
    // Due date row
    const dueDateY = impactY + 8;
    if (rfi.due_date) {
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...grayText);
      doc.text('Response Due:', margin + 4, dueDateY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...orangeColor);
      doc.text(moment(rfi.due_date).format('MMM DD, YYYY'), margin + 35, dueDateY);
    }

    y += 28;

    // ========== RESPONSE SECTION ==========
    doc.setFillColor(...orangeColor);
    doc.rect(margin, y, 3, 7, 'F'); // Orange accent bar
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...blackText);
    doc.text('Response', margin + 6, y + 5);
    
    y += 12;
    
    if (rfi.response) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      const responseLines = doc.splitTextToSize(rfi.response.response_text || '', contentWidth - 10);
      doc.text(responseLines, margin + 4, y);
      y += responseLines.length * 4.5 + 8;
      
      // Response details
      doc.setDrawColor(230, 230, 230);
      doc.rect(margin, y, contentWidth, 16);
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...grayText);
      doc.text('Responded by:', margin + 4, y + 6);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...blackText);
      doc.text(rfi.response.responded_by || '', margin + 35, y + 6);
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...grayText);
      doc.text('Date:', midX + 4, y + 6);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...blackText);
      doc.text(rfi.response.responded_at ? moment(rfi.response.responded_at).format('MMM DD, YYYY') : '', midX + 18, y + 6);
      
      if (rfi.response.responded_by_company) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...grayText);
        doc.text('Company:', margin + 4, y + 12);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...blackText);
        doc.text(rfi.response.responded_by_company, margin + 28, y + 12);
      }
      
      y += 20;
    } else {
      // Pending response message
      doc.setFont(undefined, 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...grayText);
      doc.text('Pending response', margin + 4, y);
      
      y += 15;
      doc.setDrawColor(230, 230, 230);
      doc.rect(margin, y, contentWidth, 25);
      
      // Empty fields
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...grayText);
      
      doc.text('Response By: _______________________', margin + 4, y + 8);
      doc.text('Company: _______________________', midX + 4, y + 8);
      doc.text('Title: _______________________', margin + 4, y + 18);
      doc.text('Date: _______________________', midX + 4, y + 18);
      
      y += 30;
    }

    // ========== ATTACHMENTS SECTION ==========
    if (rfi.attachments && rfi.attachments.length > 0) {
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 20;
      }
      
      y += 5;
      doc.setFillColor(...orangeColor);
      doc.rect(margin, y, 3, 7, 'F');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...blackText);
      doc.text('Attached Documents', margin + 6, y + 5);
      
      y += 12;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...grayText);
      
      rfi.attachments.forEach((attachment, index) => {
        doc.text(`${index + 1}. ${attachment.name} (see next page)`, margin + 4, y);
        y += 5;
      });
    }

    // ========== FOOTER ==========
    doc.setFontSize(7);
    doc.setTextColor(...grayText);
    doc.text('Form-OHSMS-E-0003', margin, pageHeight - 10);
    doc.setFont(undefined, 'bold');
    doc.text('Generated by OHSMS', pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.text('Rev. 01', pageWidth - margin, pageHeight - 10, { align: 'right' });

      // Convert jsPDF to ArrayBuffer for merging
      const rfiPdfBytes = doc.output('arraybuffer');
      
      // If there are attachments, merge them
      if (rfi.attachments && rfi.attachments.length > 0) {
        try {
          // Create the merged PDF document
          const mergedPdf = await PDFDocument.load(rfiPdfBytes);
          
          for (const attachment of rfi.attachments) {
            const fileType = attachment.type || '';
            const fileName = attachment.name || '';
            const isImage = fileType.startsWith('image/') || 
                           fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            const isPdf = fileType === 'application/pdf' || 
                         fileName.match(/\.pdf$/i);
            
            try {
              // Fetch the attachment
              const response = await fetch(attachment.url);
              const arrayBuffer = await response.arrayBuffer();
              
              if (isPdf) {
                // Merge PDF
                const attachmentPdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(attachmentPdf, attachmentPdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
              } else if (isImage) {
                // Add image as new page
                const newPage = mergedPdf.addPage([595.28, 841.89]); // A4 size
                const { width: pageW, height: pageH } = newPage.getSize();
                
                let image;
                if (fileType.includes('png') || fileName.match(/\.png$/i)) {
                  image = await mergedPdf.embedPng(arrayBuffer);
                } else {
                  image = await mergedPdf.embedJpg(arrayBuffer);
                }
                
                // Scale image to fit page with margins
                const maxWidth = pageW - 60;
                const maxHeight = pageH - 100;
                const imgDims = image.scale(1);
                
                let scale = 1;
                if (imgDims.width > maxWidth) {
                  scale = maxWidth / imgDims.width;
                }
                if (imgDims.height * scale > maxHeight) {
                  scale = maxHeight / imgDims.height;
                }
                
                const finalWidth = imgDims.width * scale;
                const finalHeight = imgDims.height * scale;
                
                // Center the image
                const x = (pageW - finalWidth) / 2;
                const y = pageH - 50 - finalHeight;
                
                // Add attachment header
                const { rgb } = await import('pdf-lib');
                newPage.drawText(`Adjunto: ${attachment.name}`, {
                  x: 30,
                  y: pageH - 40,
                  size: 12,
                  color: rgb(0, 0, 0),
                });
                
                newPage.drawImage(image, {
                  x,
                  y,
                  width: finalWidth,
                  height: finalHeight,
                });
              }
            } catch (attachErr) {
              console.warn(`Could not process attachment ${attachment.name}:`, attachErr);
            }
          }
          
          // Save merged PDF
          const mergedPdfBytes = await mergedPdf.save();
          const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${rfi.rfi_number}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          
          toast.success('PDF generado con adjuntos');
        } catch (mergeErr) {
          console.error('Error merging attachments:', mergeErr);
          // Fallback: save just the RFI PDF
          doc.save(`${rfi.rfi_number}.pdf`);
          toast.warning('PDF generado (algunos adjuntos no se pudieron incluir)');
        }
      } else {
        // No attachments, save directly
        doc.save(`${rfi.rfi_number}.pdf`);
        toast.success('PDF generado exitosamente');
      }
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

              {/* Attachments Section */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Documentos Adjuntos
                </Label>
                
                <div className="border rounded-lg p-4 space-y-3">
                  {/* File upload button */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      data-testid="rfi-file-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                    >
                      {uploadingFile ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Adjuntar Documento
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-slate-500">PDF, Word, Excel, Imágenes (máx. 10MB)</span>
                  </div>
                  
                  {/* List of attached files */}
                  {rfiForm.attachments.length > 0 && (
                    <div className="space-y-2">
                      {rfiForm.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-50 rounded p-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {file.name}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {rfiForm.attachments.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-2">
                      No hay documentos adjuntos
                    </p>
                  )}
                </div>
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

              {/* Attachments Section */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Documentos Adjuntos
                </Label>
                
                <div className="border rounded-lg p-4 space-y-3">
                  {/* File upload button */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                    >
                      {uploadingFile ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Adjuntar Documento
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-slate-500">PDF, Word, Excel, Imágenes (máx. 10MB)</span>
                  </div>
                  
                  {/* List of attached files */}
                  {rfiForm.attachments.length > 0 && (
                    <div className="space-y-2">
                      {rfiForm.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-50 rounded p-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {file.name}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {rfiForm.attachments.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-2">
                      No hay documentos adjuntos
                    </p>
                  )}
                </div>
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

              {/* Attachments */}
              {selectedRfi.attachments && selectedRfi.attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Documentos Adjuntos:
                  </h4>
                  <div className="p-4 bg-white border rounded-lg space-y-2">
                    {selectedRfi.attachments.map((file, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {file.name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
