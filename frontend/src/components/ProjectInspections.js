import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Plus, FileText, Clipboard, Trash2, Edit, Eye, 
  CheckCircle, Clock, PenTool, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import PressureTestForm from './forms/PressureTestForm';
import AbovegroundInspectionForm from './forms/AbovegroundInspectionForm';

const ProjectInspections = ({ projectId, project }) => {
  const [pressureTestForms, setPressureTestForms] = useState([]);
  const [abovegroundInspections, setAbovegroundInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState(null);
  const [formType, setFormType] = useState(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);

  useEffect(() => {
    loadForms();
  }, [projectId]);

  const loadForms = async () => {
    try {
      const response = await api.get(`/inspection-forms?project_id=${projectId}`, { withCredentials: true });
      setPressureTestForms(response.data.pressure_test_forms || []);
      setAbovegroundInspections(response.data.aboveground_inspections || []);
    } catch (error) {
      console.error('Error loading inspection forms:', error);
      toast.error('Error al cargar formularios de inspección');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = (type) => {
    setFormType(type);
    setActiveForm(null);
    setViewMode(false);
    setFormDialogOpen(true);
  };

  const handleEditForm = (form, type) => {
    setFormType(type);
    setActiveForm(form);
    setViewMode(false);
    setFormDialogOpen(true);
  };

  const handleViewForm = (form, type) => {
    setFormType(type);
    setActiveForm(form);
    setViewMode(true);
    setFormDialogOpen(true);
  };

  const handleDeleteForm = async (formId, type) => {
    if (!window.confirm('¿Estás seguro de eliminar este formulario?')) return;
    
    try {
      const endpoint = type === 'pressure_test' 
        ? `/pressure-test-forms/${formId}` 
        : `/aboveground-inspections/${formId}`;
      await api.delete(endpoint, { withCredentials: true });
      toast.success('Formulario eliminado');
      loadForms();
    } catch (error) {
      toast.error('Error al eliminar formulario');
    }
  };

  const handleFormSaved = () => {
    setFormDialogOpen(false);
    loadForms();
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: { label: 'Borrador', className: 'bg-gray-100 text-gray-700' },
      completed: { label: 'Completado', className: 'bg-blue-100 text-blue-700' },
      signed: { label: 'Firmado', className: 'bg-green-100 text-green-700' }
    };
    const { label, className } = config[status] || config.draft;
    return <Badge className={className}>{label}</Badge>;
  };

  const getStatusIcon = (status) => {
    if (status === 'signed') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'completed') return <PenTool className="w-4 h-4 text-blue-500" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Formularios de Inspección</h2>
          <p className="text-sm text-slate-500">Gestiona los formularios de pruebas e inspecciones del proyecto</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => handleCreateForm('pressure_test')}
            className="bg-orange-500 hover:bg-orange-600"
            data-testid="create-pressure-test-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Pressure Test
          </Button>
          <Button 
            onClick={() => handleCreateForm('aboveground_inspection')}
            variant="outline"
            data-testid="create-aboveground-inspection-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Pipe Inspection
          </Button>
        </div>
      </div>

      {/* Form Types Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pressure Test Forms */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-orange-500" />
              Pressure Test Forms
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pressureTestForms.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No hay formularios de presión</p>
                <Button 
                  variant="link" 
                  onClick={() => handleCreateForm('pressure_test')}
                  className="mt-2"
                >
                  Crear primer formulario
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {pressureTestForms.map((form) => (
                  <div 
                    key={form.form_id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(form.status)}
                      <div>
                        <p className="font-medium text-slate-900">{form.form_number}</p>
                        <p className="text-xs text-slate-500">
                          {form.system_description || 'Sin descripción'} • {new Date(form.created_at).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(form.status)}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewForm(form, 'pressure_test')}
                        data-testid={`view-pressure-test-${form.form_id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditForm(form, 'pressure_test')}
                        data-testid={`edit-pressure-test-${form.form_id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteForm(form.form_id, 'pressure_test')}
                        className="text-red-500 hover:text-red-700"
                        data-testid={`delete-pressure-test-${form.form_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aboveground Pipe Inspection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clipboard className="w-5 h-5 text-blue-500" />
              Aboveground Pipe Inspection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {abovegroundInspections.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Clipboard className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No hay checklists de inspección</p>
                <Button 
                  variant="link" 
                  onClick={() => handleCreateForm('aboveground_inspection')}
                  className="mt-2"
                >
                  Crear primer checklist
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {abovegroundInspections.map((form) => (
                  <div 
                    key={form.form_id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(form.status)}
                      <div>
                        <p className="font-medium text-slate-900">{form.form_number}</p>
                        <p className="text-xs text-slate-500">
                          {form.system_description || 'Sin descripción'} • {new Date(form.created_at).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(form.status)}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewForm(form, 'aboveground_inspection')}
                        data-testid={`view-aboveground-${form.form_id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditForm(form, 'aboveground_inspection')}
                        data-testid={`edit-aboveground-${form.form_id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteForm(form.form_id, 'aboveground_inspection')}
                        className="text-red-500 hover:text-red-700"
                        data-testid={`delete-aboveground-${form.form_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewMode ? 'Ver ' : (activeForm ? 'Editar ' : 'Nuevo ')}
              {formType === 'pressure_test' ? 'Pressure Test Form' : 'Aboveground Pipe Inspection'}
            </DialogTitle>
          </DialogHeader>
          
          {formType === 'pressure_test' && (
            <PressureTestForm 
              projectId={projectId}
              project={project}
              existingForm={activeForm}
              viewMode={viewMode}
              onSave={handleFormSaved}
              onCancel={() => setFormDialogOpen(false)}
            />
          )}
          
          {formType === 'aboveground_inspection' && (
            <AbovegroundInspectionForm 
              projectId={projectId}
              project={project}
              existingForm={activeForm}
              viewMode={viewMode}
              onSave={handleFormSaved}
              onCancel={() => setFormDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectInspections;
