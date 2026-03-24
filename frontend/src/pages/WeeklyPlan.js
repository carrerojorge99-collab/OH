import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Upload, FileSpreadsheet, Download, Calendar, Users, Briefcase, 
  Plus, Trash2, Eye, RefreshCw, ChevronLeft, ChevronRight, Edit, FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { fetchCompanyInfo } from '../utils/pdfGenerator';

moment.locale('es');

const WeeklyPlan = () => {
  const { user } = useAuth();
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [selectedPlans, setSelectedPlans] = useState([]);
  
  // Form state for manual creation
  const [planTitle, setPlanTitle] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [weekStartDate, setWeekStartDate] = useState(moment().startOf('week').format('YYYY-MM-DD'));
  const [planRows, setPlanRows] = useState([{
    employee_name: '',
    position: '',
    crew: '',
    start_time: '',
    project: '',
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
    look_ahead: ''
  }]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, projectsRes, usersRes] = await Promise.all([
        api.get('/weekly-plans', { withCredentials: true }),
        api.get('/projects', { withCredentials: true }),
        api.get('/users', { withCredentials: true })
      ]);
      setWeeklyPlans(plansRes.data || []);
      setProjects(projectsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setWeeklyPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Parse the data to extract plan info
      const parsed = parseExcelData(jsonData);
      setParsedData(parsed);
      setPreviewData(parsed);
      toast.success('Archivo cargado correctamente');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Error al leer el archivo Excel');
    }
  };

  const parseExcelData = (rows) => {
    // Find header row (look for "Employee Name" or similar)
    let headerRowIndex = -1;
    let headers = [];
    
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (row && row.some(cell => 
        String(cell).toLowerCase().includes('employee') || 
        String(cell).toLowerCase().includes('nombre') ||
        String(cell).toLowerCase().includes('position')
      )) {
        headerRowIndex = i;
        headers = row.map(h => String(h || '').trim());
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Default headers if not found
      headers = ['#', 'Employee Name', 'Position', 'Crew #', 'Project', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Look Ahead'];
      headerRowIndex = 0;
    }

    // Extract title and date range from first rows
    let title = 'Weekly Plan';
    let dateRange = '';
    
    for (let i = 0; i < headerRowIndex; i++) {
      const row = rows[i];
      if (row) {
        const text = row.join(' ');
        if (text.toLowerCase().includes('plan') || text.toLowerCase().includes('resource')) {
          title = row.filter(Boolean).join(' ');
        }
        if (text.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
          dateRange = text;
        }
      }
    }

    // Parse data rows
    const dataRows = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
        const rowData = {};
        headers.forEach((header, idx) => {
          rowData[header.toLowerCase().replace(/[^a-z0-9]/g, '_')] = row[idx] || '';
        });
        // Only add if has employee name
        if (rowData.employee_name || rowData.nombre || rowData.employee) {
          dataRows.push(rowData);
        }
      }
    }

    return {
      title,
      dateRange,
      headers,
      rows: dataRows
    };
  };

  const saveParsedPlan = async () => {
    if (!parsedData) return;

    try {
      const planData = {
        title: parsedData.title,
        date_range: parsedData.dateRange,
        week_start: weekStartDate,
        project_id: selectedProject || null,
        rows: parsedData.rows
      };

      await api.post('/weekly-plans', planData, { withCredentials: true });
      toast.success('Plan guardado correctamente');
      setShowUploadDialog(false);
      setParsedData(null);
      setSelectedFile(null);
      loadData();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Error al guardar el plan');
    }
  };

  const addPlanRow = () => {
    setPlanRows([...planRows, {
      employee_name: '',
      position: '',
      crew: '',
      start_time: '',
      project: '',
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
      look_ahead: ''
    }]);
  };

  const updatePlanRow = (index, field, value) => {
    const newRows = [...planRows];
    newRows[index][field] = value;
    setPlanRows(newRows);
  };

  const removePlanRow = (index) => {
    setPlanRows(planRows.filter((_, i) => i !== index));
  };

  const saveManualPlan = async () => {
    if (!planTitle) {
      toast.error('Ingrese un título para el plan');
      return;
    }

    try {
      const weekEnd = moment(weekStartDate).add(6, 'days').format('MM/DD/YYYY');
      const weekStart = moment(weekStartDate).format('MM/DD/YYYY');
      
      const planData = {
        title: planTitle,
        date_range: `${weekStart} to ${weekEnd}`,
        week_start: weekStartDate,
        project_id: selectedProject || null,
        rows: planRows.filter(row => row.employee_name)
      };

      await api.post('/weekly-plans', planData, { withCredentials: true });
      toast.success('Plan creado correctamente');
      setShowCreateDialog(false);
      setPlanTitle('');
      setPlanRows([{
        employee_name: '',
        position: '',
        crew: '',
        project: '',
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
        saturday: '',
        sunday: '',
        look_ahead: ''
      }]);
      loadData();
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Error al crear el plan');
    }
  };

  const generatePDF = async (plan) => {
    try {
      // Fetch company info with logo as base64
      const company = await fetchCompanyInfo();
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
      });

      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 10;

      // Colors - Use company colors or defaults
      const primaryColor = [41, 128, 185]; // Blue
      const headerText = [255, 255, 255];
      const altRowBg = [245, 245, 245];
      const textColor = [51, 51, 51];

      // ============ HEADER WITH COMPANY BRANDING ============
      let headerY = margin;
      let logoWidth = 0;
      
      // Company Logo (left side) - using base64 from fetchCompanyInfo
      if (company?.logoBase64) {
        try {
          const imageFormat = company.logoBase64.includes('image/jpeg') ? 'JPEG' : 'PNG';
          doc.addImage(company.logoBase64, imageFormat, margin, headerY, 35, 20);
          logoWidth = 40;
        } catch (e) {
          console.error('Error adding logo to PDF:', e);
        }
      }

      // Company Name and Info (next to logo)
      const companyX = logoWidth > 0 ? margin + logoWidth : margin;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text(company?.company_name || 'Company Name', companyX, headerY + 6);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      if (company?.address) {
        doc.text(company.address, companyX, headerY + 11);
      }
      if (company?.phone || company?.email) {
        const contactInfo = [company.phone, company.email].filter(Boolean).join(' | ');
        doc.text(contactInfo, companyX, headerY + 15);
      }

      // Plan Title (right side)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('WEEKLY PLAN', pageWidth - margin, headerY + 6, { align: 'right' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      doc.text(plan.title || 'Resource Plan', pageWidth - margin, headerY + 12, { align: 'right' });
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(plan.date_range || moment(plan.week_start).format('MM/DD/YYYY'), pageWidth - margin, headerY + 17, { align: 'right' });

      // Separator line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, headerY + 22, pageWidth - margin, headerY + 22);

      // ============ TABLE ============
      const tableStartY = headerY + 28;
      
      // Table headers
      const headers = ['#', 'Employee', 'Position', 'Crew', 'Entry', 'Project', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Look Ahead'];
      
      // Table data
      const tableData = (plan.rows || []).map((row, idx) => [
        idx + 1,
        row.employee_name || row.nombre || row.employee || '',
        row.position || row.posicion || '',
        row.crew__ || row.crew || '',
        row.start_time || row.entrada || '',
        row.project || row.proyecto || '',
        row.monday || row.lunes || '',
        row.tuesday || row.martes || '',
        row.wednesday || row.miercoles || '',
        row.thursday || row.jueves || '',
        row.friday || row.viernes || '',
        row.saturday || row.sabado || '',
        row.sunday || row.domingo || '',
        row.look_ahead || row.look_ahead_ || ''
      ]);

      autoTable(doc, {
        startY: tableStartY,
        head: [headers],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: headerText,
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 2,
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: {
          fontSize: 6,
          cellPadding: 2,
          textColor: [0, 0, 0],
          valign: 'top',
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 6, halign: 'center' },
          1: { cellWidth: 22 },
          2: { cellWidth: 18 },
          3: { cellWidth: 10 },
          4: { cellWidth: 12 },
          5: { cellWidth: 20 },
          6: { cellWidth: 18 },
          7: { cellWidth: 18 },
          8: { cellWidth: 18 },
          9: { cellWidth: 18 },
          10: { cellWidth: 18 },
          11: { cellWidth: 12 },
          12: { cellWidth: 12 },
          13: { cellWidth: 24 }
        },
        alternateRowStyles: {
          fillColor: altRowBg
        },
        margin: { left: margin, right: margin },
        didDrawPage: function(data) {
          // Footer on each page
          const footerY = pageHeight - 8;
          
          // Page number
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Página ${data.pageNumber}`,
            pageWidth / 2,
            footerY,
            { align: 'center' }
          );
          
          // Generated date
          doc.text(
            `Generado: ${moment().format('DD/MM/YYYY HH:mm')}`,
            pageWidth - margin,
            footerY,
            { align: 'right' }
          );
          
          // Company name in footer
          doc.text(
            company?.company_name || '',
            margin,
            footerY,
            { align: 'left' }
          );
        }
      });

      // Save the PDF
      const filename = `${plan.title || 'Weekly_Plan'}_${moment(plan.week_start).format('YYYY-MM-DD')}.pdf`;
      doc.save(filename.replace(/\s+/g, '_'));
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  const generateExcel = async (plan) => {
    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Header rows with company info and plan details
      const headerRows = [
        [plan.title || 'Weekly Plan'],
        [plan.date_range || moment(plan.week_start).format('MM/DD/YYYY')],
        [], // Empty row for spacing
        ['#', 'Employee Name', 'Position', 'Crew #', 'Entry Time', 'Project', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Look Ahead']
      ];
      
      // Data rows
      const dataRows = (plan.rows || []).map((row, idx) => [
        idx + 1,
        row.employee_name || row.nombre || row.employee || '',
        row.position || row.posicion || '',
        row.crew__ || row.crew || '',
        row.start_time || row.entrada || '',
        row.project || row.proyecto || '',
        row.monday || row.lunes || '',
        row.tuesday || row.martes || '',
        row.wednesday || row.miercoles || '',
        row.thursday || row.jueves || '',
        row.friday || row.viernes || '',
        row.saturday || row.sabado || '',
        row.sunday || row.domingo || '',
        row.look_ahead || row.look_ahead_ || ''
      ]);
      
      // Combine all rows
      const allRows = [...headerRows, ...dataRows];
      
      // Create worksheet from array
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 5 },   // #
        { wch: 25 },  // Employee Name
        { wch: 20 },  // Position
        { wch: 10 },  // Crew
        { wch: 10 },  // Entry Time
        { wch: 25 },  // Project
        { wch: 20 },  // Monday
        { wch: 20 },  // Tuesday
        { wch: 20 },  // Wednesday
        { wch: 20 },  // Thursday
        { wch: 20 },  // Friday
        { wch: 15 },  // Saturday
        { wch: 15 },  // Sunday
        { wch: 30 }   // Look Ahead
      ];
      
      // Merge title cell across all columns
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }, // Title row
        { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }  // Date range row
      ];
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Weekly Plan');
      
      // Generate filename and save
      const filename = `${plan.title || 'Weekly_Plan'}_${moment(plan.week_start).format('YYYY-MM-DD')}.xlsx`;
      XLSX.writeFile(wb, filename.replace(/\s+/g, '_'));
      
      toast.success('Excel generado correctamente');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Error al generar el Excel');
    }
  };

  const togglePlanSelection = (planId) => {
    setSelectedPlans(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const selectAllPlans = () => {
    if (selectedPlans.length === weeklyPlans.length) {
      setSelectedPlans([]);
    } else {
      setSelectedPlans(weeklyPlans.map(p => p.plan_id));
    }
  };

  const generateCombinedPDF = async () => {
    if (selectedPlans.length === 0) {
      toast.error('Seleccione al menos un plan');
      return;
    }

    try {
      const company = await fetchCompanyInfo();
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
      });

      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 10;

      const primaryColor = [41, 128, 185];
      const headerText = [255, 255, 255];
      const altRowBg = [245, 245, 245];
      const textColor = [51, 51, 51];

      const plansToExport = weeklyPlans.filter(p => selectedPlans.includes(p.plan_id));

      for (let planIndex = 0; planIndex < plansToExport.length; planIndex++) {
        const plan = plansToExport[planIndex];
        
        if (planIndex > 0) {
          doc.addPage();
        }

        let headerY = margin;
        let logoWidth = 0;
        
        if (company?.logoBase64) {
          try {
            const imageFormat = company.logoBase64.includes('image/jpeg') ? 'JPEG' : 'PNG';
            doc.addImage(company.logoBase64, imageFormat, margin, headerY, 35, 20);
            logoWidth = 40;
          } catch (e) {
            console.error('Error adding logo:', e);
          }
        }

        const companyX = logoWidth > 0 ? margin + logoWidth : margin;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...textColor);
        doc.text(company?.company_name || 'Company Name', companyX, headerY + 6);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        if (company?.address) {
          doc.text(company.address, companyX, headerY + 11);
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('WEEKLY PLAN', pageWidth - margin, headerY + 6, { align: 'right' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textColor);
        doc.text(plan.title || 'Resource Plan', pageWidth - margin, headerY + 12, { align: 'right' });
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(plan.date_range || moment(plan.week_start).format('MM/DD/YYYY'), pageWidth - margin, headerY + 17, { align: 'right' });

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, headerY + 22, pageWidth - margin, headerY + 22);

        const tableStartY = headerY + 28;
        const headers = ['#', 'Employee', 'Position', 'Crew', 'Entry', 'Project', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Look Ahead'];
        
        const tableData = (plan.rows || []).map((row, idx) => [
          idx + 1,
          row.employee_name || row.nombre || row.employee || '',
          row.position || row.posicion || '',
          row.crew__ || row.crew || '',
          row.start_time || row.entrada || '',
          row.project || row.proyecto || '',
          row.monday || row.lunes || '',
          row.tuesday || row.martes || '',
          row.wednesday || row.miercoles || '',
          row.thursday || row.jueves || '',
          row.friday || row.viernes || '',
          row.saturday || row.sabado || '',
          row.sunday || row.domingo || '',
          row.look_ahead || row.look_ahead_ || ''
        ]);

        autoTable(doc, {
          startY: tableStartY,
          head: [headers],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: primaryColor,
            textColor: headerText,
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: 2,
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 6,
            cellPadding: 2,
            textColor: [0, 0, 0],
            overflow: 'linebreak'
          },
          columnStyles: {
            0: { cellWidth: 6, halign: 'center' },
            1: { cellWidth: 22 },
            2: { cellWidth: 18 },
            3: { cellWidth: 10 },
            4: { cellWidth: 12 },
            5: { cellWidth: 20 },
            6: { cellWidth: 18 },
            7: { cellWidth: 18 },
            8: { cellWidth: 18 },
            9: { cellWidth: 18 },
            10: { cellWidth: 18 },
            11: { cellWidth: 12 },
            12: { cellWidth: 12 },
            13: { cellWidth: 24 }
          },
          alternateRowStyles: { fillColor: altRowBg },
          margin: { left: margin, right: margin },
          didDrawPage: function(data) {
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
            doc.text(`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
          }
        });
      }

      doc.save(`Weekly_Plans_Combined_${moment().format('YYYY-MM-DD')}.pdf`);
      toast.success(`PDF generado con ${plansToExport.length} plan(es)`);
      setSelectedPlans([]);
    } catch (error) {
      console.error('Error generating combined PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  const generateCombinedExcel = async () => {
    if (selectedPlans.length === 0) {
      toast.error('Seleccione al menos un plan');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const plansToExport = weeklyPlans.filter(p => selectedPlans.includes(p.plan_id));
      
      // All plans in a single sheet
      const allRows = [];
      const merges = [];
      let currentRow = 0;

      plansToExport.forEach((plan, planIndex) => {
        // Add separator between plans (except for first)
        if (planIndex > 0) {
          allRows.push([]); // Empty row separator
          allRows.push([]); // Extra spacing
          currentRow += 2;
        }
        
        // Track starting row for this plan's merges
        const planStartRow = currentRow;
        
        // Header rows with plan details
        allRows.push([plan.title || 'Weekly Plan']);
        merges.push({ s: { r: planStartRow, c: 0 }, e: { r: planStartRow, c: 13 } });
        currentRow++;
        
        allRows.push([plan.date_range || moment(plan.week_start).format('MM/DD/YYYY')]);
        merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 13 } });
        currentRow++;
        
        allRows.push([]); // Empty row for spacing
        currentRow++;
        
        // Column headers
        allRows.push(['#', 'Employee Name', 'Position', 'Crew #', 'Entry Time', 'Project', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Look Ahead']);
        currentRow++;
        
        // Data rows
        (plan.rows || []).forEach((row, idx) => {
          allRows.push([
            idx + 1,
            row.employee_name || row.nombre || row.employee || '',
            row.position || row.posicion || '',
            row.crew__ || row.crew || '',
            row.start_time || row.entrada || '',
            row.project || row.proyecto || '',
            row.monday || row.lunes || '',
            row.tuesday || row.martes || '',
            row.wednesday || row.miercoles || '',
            row.thursday || row.jueves || '',
            row.friday || row.viernes || '',
            row.saturday || row.sabado || '',
            row.sunday || row.domingo || '',
            row.look_ahead || row.look_ahead_ || ''
          ]);
          currentRow++;
        });
      });
      
      // Create worksheet from array
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 5 },   // #
        { wch: 25 },  // Employee Name
        { wch: 20 },  // Position
        { wch: 10 },  // Crew
        { wch: 10 },  // Entry Time
        { wch: 25 },  // Project
        { wch: 20 },  // Monday
        { wch: 20 },  // Tuesday
        { wch: 20 },  // Wednesday
        { wch: 20 },  // Thursday
        { wch: 20 },  // Friday
        { wch: 15 },  // Saturday
        { wch: 15 },  // Sunday
        { wch: 30 }   // Look Ahead
      ];
      
      // Apply all merges
      ws['!merges'] = merges;
      
      // Add single sheet with all plans
      XLSX.utils.book_append_sheet(wb, ws, 'Weekly Plans');

      // Generate filename and save
      XLSX.writeFile(wb, `Weekly_Plans_Combined_${moment().format('YYYY-MM-DD')}.xlsx`);
      
      toast.success(`Excel generado con ${plansToExport.length} plan(es)`);
      setSelectedPlans([]);
    } catch (error) {
      console.error('Error generating combined Excel:', error);
      toast.error('Error al generar el Excel');
    }
  };

  const deletePlan = async (planId) => {
    if (!window.confirm('¿Está seguro de eliminar este plan?')) return;
    
    try {
      await api.delete(`/weekly-plans/${planId}`, { withCredentials: true });
      toast.success('Plan eliminado');
      setSelectedPlans(prev => prev.filter(id => id !== planId));
      loadData();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Error al eliminar el plan');
    }
  };

  const openEditDialog = (plan) => {
    setEditingPlan(plan);
    setPlanTitle(plan.title || '');
    setWeekStartDate(plan.week_start || moment().startOf('week').format('YYYY-MM-DD'));
    setSelectedProject(plan.project_id || '');
    setPlanRows(plan.rows && plan.rows.length > 0 ? plan.rows.map(row => ({
      employee_name: row.employee_name || row.nombre || row.employee || '',
      position: row.position || row.posicion || '',
      crew: row.crew__ || row.crew || '',
      start_time: row.start_time || row.entrada || '',
      project: row.project || row.proyecto || '',
      monday: row.monday || row.lunes || '',
      tuesday: row.tuesday || row.martes || '',
      wednesday: row.wednesday || row.miercoles || '',
      thursday: row.thursday || row.jueves || '',
      friday: row.friday || row.viernes || '',
      saturday: row.saturday || row.sabado || '',
      sunday: row.sunday || row.domingo || '',
      look_ahead: row.look_ahead || row.look_ahead_ || ''
    })) : [{
      employee_name: '',
      position: '',
      crew: '',
      start_time: '',
      project: '',
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
      look_ahead: ''
    }]);
    setShowEditDialog(true);
  };

  const saveEditedPlan = async () => {
    if (!editingPlan) return;
    
    try {
      const weekEnd = moment(weekStartDate).add(6, 'days').format('MM/DD/YYYY');
      const weekStart = moment(weekStartDate).format('MM/DD/YYYY');
      
      const planData = {
        title: planTitle,
        date_range: `${weekStart} to ${weekEnd}`,
        week_start: weekStartDate,
        project_id: selectedProject || null,
        rows: planRows.filter(row => row.employee_name)
      };

      await api.put(`/weekly-plans/${editingPlan.plan_id}`, planData, { withCredentials: true });
      toast.success('Plan actualizado correctamente');
      setShowEditDialog(false);
      setEditingPlan(null);
      loadData();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Error al actualizar el plan');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Planificación Semanal</h1>
            <p className="text-slate-500">Gestiona los planes semanales de recursos</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => loadData()}
              data-testid="refresh-plans-btn"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="upload-excel-btn">
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Excel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Importar Plan desde Excel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Archivo Excel (.xlsx, .xls)</Label>
                    <Input 
                      type="file" 
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="mt-1"
                    />
                  </div>
                  
                  {parsedData && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h3 className="font-semibold">{parsedData.title}</h3>
                        <p className="text-sm text-slate-500">{parsedData.dateRange}</p>
                        <p className="text-sm text-slate-500">{parsedData.rows.length} filas encontradas</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Fecha de inicio de semana</Label>
                          <Input 
                            type="date"
                            value={weekStartDate}
                            onChange={(e) => setWeekStartDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Proyecto (opcional)</Label>
                          <Select value={selectedProject} onValueChange={setSelectedProject}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar proyecto" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map(p => (
                                <SelectItem key={p.project_id} value={p.project_id}>
                                  {p.project_number} - {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Preview table */}
                      <div className="overflow-x-auto max-h-64 border rounded">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-100 sticky top-0">
                            <tr>
                              {parsedData.headers.slice(0, 8).map((h, i) => (
                                <th key={i} className="px-2 py-1 text-left">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsedData.rows.slice(0, 10).map((row, i) => (
                              <tr key={i} className="border-t">
                                {Object.values(row).slice(0, 8).map((cell, j) => (
                                  <td key={j} className="px-2 py-1 truncate max-w-[100px]">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                          setParsedData(null);
                          setSelectedFile(null);
                        }}>
                          Cancelar
                        </Button>
                        <Button onClick={saveParsedPlan}>
                          Guardar Plan
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="create-plan-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Crear Plan Semanal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Título del Plan *</Label>
                      <Input 
                        value={planTitle}
                        onChange={(e) => setPlanTitle(e.target.value)}
                        placeholder="Ej: Janssen Field Installation Resource Plan"
                      />
                    </div>
                    <div>
                      <Label>Semana (fecha inicio)</Label>
                      <Input 
                        type="date"
                        value={weekStartDate}
                        onChange={(e) => setWeekStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Proyecto (opcional)</Label>
                      <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proyecto" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(p => (
                            <SelectItem key={p.project_id} value={p.project_id}>
                              {p.project_number} - {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Rows table */}
                  <div className="overflow-x-auto border rounded">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-2 py-2 text-left">Empleado</th>
                          <th className="px-2 py-2 text-left">Posición</th>
                          <th className="px-2 py-2 text-left">Crew</th>
                          <th className="px-2 py-2 text-left">Entrada</th>
                          <th className="px-2 py-2 text-left">Proyecto</th>
                          <th className="px-2 py-2 text-left">Lun</th>
                          <th className="px-2 py-2 text-left">Mar</th>
                          <th className="px-2 py-2 text-left">Mié</th>
                          <th className="px-2 py-2 text-left">Jue</th>
                          <th className="px-2 py-2 text-left">Vie</th>
                          <th className="px-2 py-2 text-left">Sáb</th>
                          <th className="px-2 py-2 text-left">Dom</th>
                          <th className="px-2 py-2 text-left">Look Ahead</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {planRows.map((row, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-1 py-1">
                              <Select 
                                value={row.employee_name || ""}
                                onValueChange={(value) => {
                                  const selectedUser = users.find(u => u.name === value);
                                  updatePlanRow(idx, 'employee_name', value);
                                  if (selectedUser) {
                                    const roleMap = {
                                      'super_admin': 'Super Admin',
                                      'project_manager': 'Project Manager',
                                      'designer': 'Designer',
                                      'rrhh': 'RRHH',
                                      'accountant': 'Accountant',
                                      'field_worker': 'Field Worker',
                                      'pm_estimator': 'PM Estimator',
                                      'supervisor': 'Supervisor'
                                    };
                                    updatePlanRow(idx, 'position', selectedUser.position || roleMap[selectedUser.role] || selectedUser.role);
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs w-36">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {users.map(u => (
                                    <SelectItem key={u.user_id} value={u.name}>
                                      {u.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.position}
                                onChange={(e) => updatePlanRow(idx, 'position', e.target.value)}
                                className="h-8 text-xs"
                                placeholder="Posición"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.crew}
                                onChange={(e) => updatePlanRow(idx, 'crew', e.target.value)}
                                className="h-8 text-xs w-16"
                                placeholder="Crew"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                type="time"
                                value={row.start_time || ''}
                                onChange={(e) => updatePlanRow(idx, 'start_time', e.target.value)}
                                className="h-8 text-xs w-20"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Select 
                                value={row.project || ""}
                                onValueChange={(value) => updatePlanRow(idx, 'project', value)}
                              >
                                <SelectTrigger className="h-8 text-xs w-32">
                                  <SelectValue placeholder="Proyecto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {projects.map(p => (
                                    <SelectItem key={p.project_id} value={p.name || p.project_number}>
                                      {p.project_number} - {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.monday}
                                onChange={(e) => updatePlanRow(idx, 'monday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.tuesday}
                                onChange={(e) => updatePlanRow(idx, 'tuesday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.wednesday}
                                onChange={(e) => updatePlanRow(idx, 'wednesday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.thursday}
                                onChange={(e) => updatePlanRow(idx, 'thursday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.friday}
                                onChange={(e) => updatePlanRow(idx, 'friday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.saturday}
                                onChange={(e) => updatePlanRow(idx, 'saturday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.sunday}
                                onChange={(e) => updatePlanRow(idx, 'sunday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.look_ahead}
                                onChange={(e) => updatePlanRow(idx, 'look_ahead', e.target.value)}
                                className="h-8 text-xs w-24"
                                placeholder="Próximas"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => removePlanRow(idx)}
                                className="h-8 w-8 p-0 text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <Button variant="outline" onClick={addPlanRow} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Fila
                  </Button>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={saveManualPlan}>
                      Guardar Plan
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Plan Semanal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Título del Plan *</Label>
                      <Input 
                        value={planTitle}
                        onChange={(e) => setPlanTitle(e.target.value)}
                        placeholder="Ej: Janssen Field Installation Resource Plan"
                      />
                    </div>
                    <div>
                      <Label>Semana (fecha inicio)</Label>
                      <Input 
                        type="date"
                        value={weekStartDate}
                        onChange={(e) => setWeekStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Proyecto (opcional)</Label>
                      <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proyecto" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(p => (
                            <SelectItem key={p.project_id} value={p.project_id}>
                              {p.project_number} - {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Rows table */}
                  <div className="overflow-x-auto border rounded">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-2 py-2 text-left">Empleado</th>
                          <th className="px-2 py-2 text-left">Posición</th>
                          <th className="px-2 py-2 text-left">Crew</th>
                          <th className="px-2 py-2 text-left">Entrada</th>
                          <th className="px-2 py-2 text-left">Proyecto</th>
                          <th className="px-2 py-2 text-left">Lun</th>
                          <th className="px-2 py-2 text-left">Mar</th>
                          <th className="px-2 py-2 text-left">Mié</th>
                          <th className="px-2 py-2 text-left">Jue</th>
                          <th className="px-2 py-2 text-left">Vie</th>
                          <th className="px-2 py-2 text-left">Sáb</th>
                          <th className="px-2 py-2 text-left">Dom</th>
                          <th className="px-2 py-2 text-left">Look Ahead</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {planRows.map((row, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-1 py-1">
                              <Select 
                                value={row.employee_name || ""}
                                onValueChange={(value) => {
                                  const selectedUser = users.find(u => u.name === value);
                                  updatePlanRow(idx, 'employee_name', value);
                                  if (selectedUser) {
                                    const roleMap = {
                                      'super_admin': 'Super Admin',
                                      'project_manager': 'Project Manager',
                                      'designer': 'Designer',
                                      'rrhh': 'RRHH',
                                      'accountant': 'Accountant',
                                      'field_worker': 'Field Worker',
                                      'pm_estimator': 'PM Estimator',
                                      'supervisor': 'Supervisor'
                                    };
                                    updatePlanRow(idx, 'position', selectedUser.position || roleMap[selectedUser.role] || selectedUser.role);
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs w-36">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {users.map(u => (
                                    <SelectItem key={u.user_id} value={u.name}>
                                      {u.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.position}
                                onChange={(e) => updatePlanRow(idx, 'position', e.target.value)}
                                className="h-8 text-xs"
                                placeholder="Posición"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.crew}
                                onChange={(e) => updatePlanRow(idx, 'crew', e.target.value)}
                                className="h-8 text-xs w-16"
                                placeholder="Crew"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                type="time"
                                value={row.start_time || ''}
                                onChange={(e) => updatePlanRow(idx, 'start_time', e.target.value)}
                                className="h-8 text-xs w-20"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Select 
                                value={row.project || ""}
                                onValueChange={(value) => updatePlanRow(idx, 'project', value)}
                              >
                                <SelectTrigger className="h-8 text-xs w-32">
                                  <SelectValue placeholder="Proyecto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {projects.map(p => (
                                    <SelectItem key={p.project_id} value={p.name || p.project_number}>
                                      {p.project_number} - {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.monday}
                                onChange={(e) => updatePlanRow(idx, 'monday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.tuesday}
                                onChange={(e) => updatePlanRow(idx, 'tuesday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.wednesday}
                                onChange={(e) => updatePlanRow(idx, 'wednesday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.thursday}
                                onChange={(e) => updatePlanRow(idx, 'thursday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.friday}
                                onChange={(e) => updatePlanRow(idx, 'friday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.saturday}
                                onChange={(e) => updatePlanRow(idx, 'saturday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.sunday}
                                onChange={(e) => updatePlanRow(idx, 'sunday', e.target.value)}
                                className="h-8 text-xs w-20"
                                placeholder="Tarea"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input 
                                value={row.look_ahead}
                                onChange={(e) => updatePlanRow(idx, 'look_ahead', e.target.value)}
                                className="h-8 text-xs w-24"
                                placeholder="Próximas"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => removePlanRow(idx)}
                                className="h-8 w-8 p-0 text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <Button variant="outline" onClick={addPlanRow} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Fila
                  </Button>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setShowEditDialog(false);
                      setEditingPlan(null);
                    }}>
                      Cancelar
                    </Button>
                    <Button onClick={saveEditedPlan}>
                      Actualizar Plan
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{weeklyPlans.length}</p>
                <p className="text-sm text-slate-500">Planes Guardados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{weeklyPlans.filter(p => moment(p.week_start).isSame(moment(), 'week')).length}</p>
                <p className="text-sm text-slate-500">Esta Semana</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{weeklyPlans.reduce((sum, p) => sum + (p.rows?.length || 0), 0)}</p>
                <p className="text-sm text-slate-500">Asignaciones Totales</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plans list */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Planes Semanales</CardTitle>
            {weeklyPlans.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="select-all"
                    checked={selectedPlans.length === weeklyPlans.length && weeklyPlans.length > 0}
                    onCheckedChange={selectAllPlans}
                    data-testid="select-all-plans"
                  />
                  <Label htmlFor="select-all" className="text-sm cursor-pointer">
                    Seleccionar todos
                  </Label>
                </div>
                {selectedPlans.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={generateCombinedPDF}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="download-combined-pdf"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF ({selectedPlans.length})
                    </Button>
                    <Button 
                      onClick={generateCombinedExcel}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="download-combined-excel"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Excel ({selectedPlans.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-500">Cargando...</div>
            ) : weeklyPlans.length === 0 ? (
              <div className="text-center py-8">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No hay planes guardados</p>
                <p className="text-sm text-slate-400 mt-1">Sube un archivo Excel o crea un plan manualmente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weeklyPlans.map((plan) => (
                  <div 
                    key={plan.plan_id} 
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Checkbox 
                        checked={selectedPlans.includes(plan.plan_id)}
                        onCheckedChange={() => togglePlanSelection(plan.plan_id)}
                        data-testid={`select-plan-${plan.plan_id}`}
                      />
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{plan.title}</h3>
                        <p className="text-sm text-slate-500">
                          {plan.date_range || moment(plan.week_start).format('DD/MM/YYYY')} 
                          <span className="mx-2">•</span>
                          {plan.rows?.length || 0} asignaciones
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditDialog(plan)}
                        title="Editar"
                        data-testid={`edit-plan-${plan.plan_id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => generatePDF(plan)}
                        title="Descargar PDF"
                        data-testid={`download-pdf-${plan.plan_id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => generateExcel(plan)}
                        title="Descargar Excel"
                        data-testid={`download-excel-${plan.plan_id}`}
                        className="text-green-600 hover:text-green-700"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deletePlan(plan.plan_id)}
                        className="text-red-500 hover:text-red-700"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default WeeklyPlan;
