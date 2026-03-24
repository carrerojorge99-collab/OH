import React, { useState, useRef } from 'react';
import api from '../../utils/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Save, X, Plus, Trash2, Pen, Download } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { generateAbovegroundInspectionPDF, fetchCompanyInfo } from '../../utils/pdfGenerator';

const AbovegroundInspectionForm = ({ projectId, project, existingForm, viewMode, onSave, onCancel }) => {
  const [form, setForm] = useState(existingForm || {
    project_id: projectId,
    project_no: project?.project_number || '',
    project_name: project?.name || '',
    contractor: project?.client || '',
    building: '',
    area: '',
    system_no: '',
    system_description: '',
    pid_isometric_rev: '',
    inspection_lines: [{
      line_number: '',
      material: '',
      size: '',
      joints_gaskets_washers: '',
      clearance: '',
      supports_guides_anchors: '',
      valves_accessible: '',
      slope: '',
      dead_legs: '',
      alignment_orientation: '',
      vents_drains: '',
      initials: '',
      date: '',
      remarks: ''
    }],
    contractor_name: '',
    contractor_signature: null,
    cst_representative_name: '',
    cst_representative_signature: null
  });

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [activeSignatureField, setActiveSignatureField] = useState(null);
  const [signerName, setSignerName] = useState('');
  const sigCanvasRef = useRef(null);

  const inspectionValues = [
    { value: 'A', label: 'A (Acceptable)' },
    { value: 'N/AC', label: 'N/AC (Not Acceptable)' },
    { value: 'N/A', label: 'N/A (Not Applicable)' }
  ];

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLineChange = (index, field, value) => {
    setForm(prev => {
      const newLines = [...prev.inspection_lines];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, inspection_lines: newLines };
    });
  };

  const addLine = () => {
    setForm(prev => ({
      ...prev,
      inspection_lines: [...prev.inspection_lines, {
        line_number: '',
        material: '',
        size: '',
        joints_gaskets_washers: '',
        clearance: '',
        supports_guides_anchors: '',
        valves_accessible: '',
        slope: '',
        dead_legs: '',
        alignment_orientation: '',
        vents_drains: '',
        initials: '',
        date: '',
        remarks: ''
      }]
    }));
  };

  const removeLine = (index) => {
    if (form.inspection_lines.length > 1) {
      setForm(prev => ({
        ...prev,
        inspection_lines: prev.inspection_lines.filter((_, i) => i !== index)
      }));
    }
  };

  const openSignatureDialog = (fieldName) => {
    setActiveSignatureField(fieldName);
    const existingSig = form[fieldName];
    setSignerName(existingSig?.name || '');
    setSignatureDialogOpen(true);
  };

  const clearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
  };

  const saveSignature = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      // Use toDataURL directly instead of getTrimmedCanvas due to compatibility issues
      const signatureData = sigCanvasRef.current.toDataURL('image/png');
      setForm(prev => ({
        ...prev,
        [activeSignatureField]: {
          name: signerName,
          signature_data: signatureData,
          date: new Date().toISOString().split('T')[0]
        }
      }));
      setSignatureDialogOpen(false);
    } else {
      toast.error('Por favor dibuje una firma');
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const company = await fetchCompanyInfo();
      await generateAbovegroundInspectionPDF(existingForm || form, company);
      toast.success('PDF generado exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (existingForm?.form_id) {
        await api.put(`/aboveground-inspections/${existingForm.form_id}`, form, { withCredentials: true });
        toast.success('Formulario actualizado');
      } else {
        await api.post('/aboveground-inspections', form, { withCredentials: true });
        toast.success('Formulario creado');
      }
      onSave();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar formulario');
    } finally {
      setSaving(false);
    }
  };

  const SignatureField = ({ label, fieldName, signature }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      {signature?.signature_data ? (
        <div className="border rounded-lg p-2 bg-white">
          <img src={signature.signature_data} alt="Firma" className="h-16 mx-auto" />
          <p className="text-xs text-center text-slate-500 mt-1">
            {signature.name} - {signature.date}
          </p>
          {!viewMode && (
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={() => openSignatureDialog(fieldName)}
            >
              Cambiar Firma
            </Button>
          )}
        </div>
      ) : (
        <Button 
          type="button"
          variant="outline" 
          className="w-full h-20 border-dashed"
          onClick={() => openSignatureDialog(fieldName)}
          disabled={viewMode}
        >
          <Pen className="w-4 h-4 mr-2" />
          Agregar Firma
        </Button>
      )}
    </div>
  );

  const InspectionSelect = ({ value, onChange, disabled }) => (
    <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="-" />
      </SelectTrigger>
      <SelectContent>
        {inspectionValues.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.value}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Information */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Project Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Project No.</Label>
            <Input value={form.project_no} onChange={e => handleChange('project_no', e.target.value)} disabled={viewMode} />
          </div>
          <div className="col-span-2">
            <Label>Project Name</Label>
            <Input value={form.project_name} onChange={e => handleChange('project_name', e.target.value)} disabled={viewMode} />
          </div>
          <div>
            <Label>Contractor</Label>
            <Input value={form.contractor} onChange={e => handleChange('contractor', e.target.value)} disabled={viewMode} />
          </div>
          <div>
            <Label>Building</Label>
            <Input value={form.building} onChange={e => handleChange('building', e.target.value)} disabled={viewMode} />
          </div>
          <div>
            <Label>Area</Label>
            <Input value={form.area} onChange={e => handleChange('area', e.target.value)} disabled={viewMode} />
          </div>
          <div>
            <Label>System No.</Label>
            <Input value={form.system_no} onChange={e => handleChange('system_no', e.target.value)} disabled={viewMode} />
          </div>
          <div>
            <Label>P&ID/Isometric Rev.</Label>
            <Input value={form.pid_isometric_rev} onChange={e => handleChange('pid_isometric_rev', e.target.value)} disabled={viewMode} />
          </div>
          <div className="col-span-2 md:col-span-4">
            <Label>System Description</Label>
            <Input value={form.system_description} onChange={e => handleChange('system_description', e.target.value)} disabled={viewMode} />
          </div>
        </CardContent>
      </Card>

      {/* Inspection Checklist */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Aboveground Pipe Inspection Checklist</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            A = Acceptable | N/AC = Not Acceptable | N/A = Not Applicable
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-2 text-left font-medium">Line #</th>
                  <th className="p-2 text-left font-medium">Material</th>
                  <th className="p-2 text-left font-medium">Size</th>
                  <th className="p-2 text-center font-medium">Joints</th>
                  <th className="p-2 text-center font-medium">Clear.</th>
                  <th className="p-2 text-center font-medium">Supports</th>
                  <th className="p-2 text-center font-medium">Valves</th>
                  <th className="p-2 text-center font-medium">Slope</th>
                  <th className="p-2 text-center font-medium">Dead Legs</th>
                  <th className="p-2 text-center font-medium">Align.</th>
                  <th className="p-2 text-center font-medium">Vents</th>
                  <th className="p-2 text-left font-medium">Init.</th>
                  <th className="p-2 text-left font-medium">Date</th>
                  <th className="p-2 text-left font-medium">Remarks</th>
                  {!viewMode && <th className="p-2"></th>}
                </tr>
              </thead>
              <tbody>
                {form.inspection_lines.map((line, index) => (
                  <tr key={index} className="border-b hover:bg-slate-50">
                    <td className="p-1">
                      <Input 
                        value={line.line_number} 
                        onChange={e => handleLineChange(index, 'line_number', e.target.value)} 
                        disabled={viewMode}
                        className="h-8 text-xs w-16"
                        placeholder="#"
                      />
                    </td>
                    <td className="p-1">
                      <Input 
                        value={line.material} 
                        onChange={e => handleLineChange(index, 'material', e.target.value)} 
                        disabled={viewMode}
                        className="h-8 text-xs w-20"
                      />
                    </td>
                    <td className="p-1">
                      <Input 
                        value={line.size} 
                        onChange={e => handleLineChange(index, 'size', e.target.value)} 
                        disabled={viewMode}
                        className="h-8 text-xs w-16"
                      />
                    </td>
                    <td className="p-1 w-16">
                      <InspectionSelect 
                        value={line.joints_gaskets_washers} 
                        onChange={val => handleLineChange(index, 'joints_gaskets_washers', val)} 
                        disabled={viewMode}
                      />
                    </td>
                    <td className="p-1 w-16">
                      <InspectionSelect 
                        value={line.clearance} 
                        onChange={val => handleLineChange(index, 'clearance', val)} 
                        disabled={viewMode}
                      />
                    </td>
                    <td className="p-1 w-16">
                      <InspectionSelect 
                        value={line.supports_guides_anchors} 
                        onChange={val => handleLineChange(index, 'supports_guides_anchors', val)} 
                        disabled={viewMode}
                      />
                    </td>
                    <td className="p-1 w-16">
                      <InspectionSelect 
                        value={line.valves_accessible} 
                        onChange={val => handleLineChange(index, 'valves_accessible', val)} 
                        disabled={viewMode}
                      />
                    </td>
                    <td className="p-1 w-16">
                      <InspectionSelect 
                        value={line.slope} 
                        onChange={val => handleLineChange(index, 'slope', val)} 
                        disabled={viewMode}
                      />
                    </td>
                    <td className="p-1 w-16">
                      <InspectionSelect 
                        value={line.dead_legs} 
                        onChange={val => handleLineChange(index, 'dead_legs', val)} 
                        disabled={viewMode}
                      />
                    </td>
                    <td className="p-1 w-16">
                      <InspectionSelect 
                        value={line.alignment_orientation} 
                        onChange={val => handleLineChange(index, 'alignment_orientation', val)} 
                        disabled={viewMode}
                      />
                    </td>
                    <td className="p-1 w-16">
                      <InspectionSelect 
                        value={line.vents_drains} 
                        onChange={val => handleLineChange(index, 'vents_drains', val)} 
                        disabled={viewMode}
                      />
                    </td>
                    <td className="p-1">
                      <Input 
                        value={line.initials} 
                        onChange={e => handleLineChange(index, 'initials', e.target.value)} 
                        disabled={viewMode}
                        className="h-8 text-xs w-12"
                      />
                    </td>
                    <td className="p-1">
                      <Input 
                        type="date"
                        value={line.date} 
                        onChange={e => handleLineChange(index, 'date', e.target.value)} 
                        disabled={viewMode}
                        className="h-8 text-xs w-28"
                      />
                    </td>
                    <td className="p-1">
                      <Input 
                        value={line.remarks} 
                        onChange={e => handleLineChange(index, 'remarks', e.target.value)} 
                        disabled={viewMode}
                        className="h-8 text-xs w-24"
                      />
                    </td>
                    {!viewMode && (
                      <td className="p-1">
                        {form.inspection_lines.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeLine(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {!viewMode && (
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="mt-4">
              <Plus className="w-4 h-4 mr-1" /> Agregar Línea
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Inspections/Test Statement */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Inspections/Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
            These inspections testify that the materials, sizes, supports location and types, joints, 
            drainability and air purging requirements, slopes and overall installation meet the design 
            intent as per drawings and specifications and that the system is ready to be released for 
            pressure test.
          </p>
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Signatures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contractor */}
            <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
              <h4 className="font-medium">Contractor</h4>
              <div>
                <Label>Name</Label>
                <Input 
                  value={form.contractor_name} 
                  onChange={e => handleChange('contractor_name', e.target.value)} 
                  disabled={viewMode} 
                />
              </div>
              <SignatureField 
                label="Signature" 
                fieldName="contractor_signature" 
                signature={form.contractor_signature} 
              />
            </div>
            
            {/* CST Representative */}
            <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
              <h4 className="font-medium">CST Representative</h4>
              <div>
                <Label>Name</Label>
                <Input 
                  value={form.cst_representative_name} 
                  onChange={e => handleChange('cst_representative_name', e.target.value)} 
                  disabled={viewMode} 
                />
              </div>
              <SignatureField 
                label="Signature" 
                fieldName="cst_representative_signature" 
                signature={form.cst_representative_signature} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {!viewMode && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-600">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Checklist'}
          </Button>
        </div>
      )}

      {viewMode && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            type="button" 
            onClick={handleExportPDF}
            disabled={exporting}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="export-aboveground-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Generando...' : 'Exportar PDF'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cerrar
          </Button>
        </div>
      )}

      {/* Signature Dialog */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pen className="w-5 h-5 text-blue-500" />
              Agregar Firma
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="signer-name">Nombre del firmante</Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Ingrese su nombre completo"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Dibuje su firma</Label>
              <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg bg-white relative">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  penColor="black"
                  canvasProps={{
                    width: 450,
                    height: 200,
                    className: 'signature-canvas rounded-lg',
                    style: { width: '100%', height: '200px' }
                  }}
                />
              </div>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={clearSignature} className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar firma
            </Button>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setSignatureDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={saveSignature} 
              disabled={!signerName.trim()}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Firma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
};

export default AbovegroundInspectionForm;
