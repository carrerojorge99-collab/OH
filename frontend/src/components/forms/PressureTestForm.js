import React, { useState, useRef } from 'react';
import api from '../../utils/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
import { generatePressureTestPDF, fetchCompanyInfo } from '../../utils/pdfGenerator';

const PressureTestForm = ({ projectId, project, existingForm, viewMode, onSave, onCancel }) => {
  const [form, setForm] = useState(existingForm || {
    project_id: projectId,
    project_no: project?.project_number || '',
    project_name: project?.name || '',
    contractor: project?.client || '',
    building: '',
    area: '',
    system_no: '',
    system_description: '',
    test_package_no: '',
    test_type: [],
    pid_entries: [{ pid_no: '', rev: '', na: false }],
    lines_included_in_test: '',
    test_media: '',
    actual_test_media_temp: '',
    test_media_min_temp_limit: '',
    ambient_temp_min_req: '',
    contractor_release_name: '',
    contractor_release_signature: null,
    cst_release_name: '',
    cst_release_signature: null,
    gauge_number: '',
    gauge_calibration_due_date: '',
    gauge_range_low: '',
    gauge_range_high: '',
    test_pressure_requirements: '',
    initial_pressure: '',
    final_pressure: '',
    min_req_holding_time: '',
    actual_holding_time: '',
    test_start_date: '',
    test_start_time: '',
    test_finish_date: '',
    test_finish_time: '',
    test_performer_name: '',
    test_performer_signature: null,
    verifier_contractor_name: '',
    verifier_contractor_signature: null,
    verifier_cst_name: '',
    verifier_cst_signature: null,
    remarks: '',
    restoration_contractor_name: '',
    restoration_contractor_signature: null,
    restoration_cst_name: '',
    restoration_cst_signature: null
  });

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [activeSignatureField, setActiveSignatureField] = useState(null);
  const [signerName, setSignerName] = useState('');
  const sigCanvasRef = useRef(null);

  const testTypes = [
    { id: 'hydrostatic', label: 'Hydrostatic' },
    { id: 'pneumatic', label: 'Pneumatic' },
    { id: 'static', label: 'Static' },
    { id: 'head', label: 'Head' },
    { id: 'in_service', label: 'In Service' }
  ];

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTestTypeChange = (typeId, checked) => {
    setForm(prev => ({
      ...prev,
      test_type: checked 
        ? [...prev.test_type, typeId]
        : prev.test_type.filter(t => t !== typeId)
    }));
  };

  const handlePIDChange = (index, field, value) => {
    setForm(prev => {
      const newEntries = [...prev.pid_entries];
      newEntries[index] = { ...newEntries[index], [field]: value };
      return { ...prev, pid_entries: newEntries };
    });
  };

  const addPIDEntry = () => {
    setForm(prev => ({
      ...prev,
      pid_entries: [...prev.pid_entries, { pid_no: '', rev: '', na: false }]
    }));
  };

  const removePIDEntry = (index) => {
    if (form.pid_entries.length > 1) {
      setForm(prev => ({
        ...prev,
        pid_entries: prev.pid_entries.filter((_, i) => i !== index)
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
      await generatePressureTestPDF(existingForm || form, company);
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
        await api.put(`/pressure-test-forms/${existingForm.form_id}`, form, { withCredentials: true });
        toast.success('Formulario actualizado');
      } else {
        await api.post('/pressure-test-forms', form, { withCredentials: true });
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
            <Label>Test Package No.</Label>
            <Input value={form.test_package_no} onChange={e => handleChange('test_package_no', e.target.value)} disabled={viewMode} />
          </div>
          <div className="col-span-2 md:col-span-4">
            <Label>System Description</Label>
            <Input value={form.system_description} onChange={e => handleChange('system_description', e.target.value)} disabled={viewMode} />
          </div>
        </CardContent>
      </Card>

      {/* Test Type */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Test Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {testTypes.map(type => (
              <div key={type.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={type.id}
                  checked={form.test_type.includes(type.id)}
                  onCheckedChange={(checked) => handleTestTypeChange(type.id, checked)}
                  disabled={viewMode}
                />
                <Label htmlFor={type.id} className="font-normal cursor-pointer">{type.label}</Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Note: For In-Service Test Type, Initial and Final Test Recordings are not required.
          </p>
        </CardContent>
      </Card>

      {/* Test Boundaries */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Test Boundaries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">
            P&ID's numbers shown below to be filled only when using aboveground pipe inspection checklist.
          </p>
          
          {form.pid_entries.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs">P&ID No.</Label>
                <Input 
                  value={entry.pid_no} 
                  onChange={e => handlePIDChange(index, 'pid_no', e.target.value)} 
                  disabled={viewMode || entry.na}
                  placeholder="P&ID Number"
                />
              </div>
              <div className="w-20">
                <Label className="text-xs">Rev.</Label>
                <Input 
                  value={entry.rev} 
                  onChange={e => handlePIDChange(index, 'rev', e.target.value)} 
                  disabled={viewMode || entry.na}
                />
              </div>
              <div className="flex items-center space-x-2 pt-5">
                <Checkbox 
                  checked={entry.na}
                  onCheckedChange={(checked) => handlePIDChange(index, 'na', checked)}
                  disabled={viewMode}
                />
                <Label className="text-xs">N/A</Label>
              </div>
              {!viewMode && form.pid_entries.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removePIDEntry(index)} className="pt-5">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          
          {!viewMode && (
            <Button type="button" variant="outline" size="sm" onClick={addPIDEntry}>
              <Plus className="w-4 h-4 mr-1" /> Add P&ID
            </Button>
          )}
          
          <div>
            <Label>Lines Included in Test</Label>
            <Textarea 
              value={form.lines_included_in_test} 
              onChange={e => handleChange('lines_included_in_test', e.target.value)} 
              disabled={viewMode}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Conditions */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Test Conditions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Test Media</Label>
            <Input value={form.test_media} onChange={e => handleChange('test_media', e.target.value)} disabled={viewMode} />
          </div>
          <div>
            <Label>Actual Test Media Temp</Label>
            <Input value={form.actual_test_media_temp} onChange={e => handleChange('actual_test_media_temp', e.target.value)} disabled={viewMode} />
          </div>
          <div>
            <Label>Test Media Min/Max Temp</Label>
            <Input value={form.test_media_min_temp_limit} onChange={e => handleChange('test_media_min_temp_limit', e.target.value)} disabled={viewMode} />
          </div>
          <div>
            <Label>Ambient Temp Min Req</Label>
            <Input value={form.ambient_temp_min_req} onChange={e => handleChange('ambient_temp_min_req', e.target.value)} disabled={viewMode} />
          </div>
        </CardContent>
      </Card>

      {/* Test Inspection Release */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Test Inspection Release</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contractor Release */}
            <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
              <h4 className="font-medium">Contractor Release</h4>
              <p className="text-xs text-slate-500">
                Test Package is completed as boundary is defined, Weld and Mechanical Connections were verified.
              </p>
              <div>
                <Label>Name</Label>
                <Input value={form.contractor_release_name} onChange={e => handleChange('contractor_release_name', e.target.value)} disabled={viewMode} />
              </div>
              <SignatureField label="Signature" fieldName="contractor_release_signature" signature={form.contractor_release_signature} />
            </div>
            
            {/* CST Release */}
            <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
              <h4 className="font-medium">Construction Support Team Release</h4>
              <p className="text-xs text-slate-500">
                Package has been verified for completion, walkdown has been performed and system is ready for test.
              </p>
              <div>
                <Label>Name</Label>
                <Input value={form.cst_release_name} onChange={e => handleChange('cst_release_name', e.target.value)} disabled={viewMode} />
              </div>
              <SignatureField label="Signature" fieldName="cst_release_signature" signature={form.cst_release_signature} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gauge Information */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Gauge Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Test Gauge Number</Label>
            <Input value={form.gauge_number} onChange={e => handleChange('gauge_number', e.target.value)} disabled={viewMode} />
          </div>
          <div>
            <Label>Calibration Due Date</Label>
            <Input type="date" value={form.gauge_calibration_due_date} onChange={e => handleChange('gauge_calibration_due_date', e.target.value)} disabled={viewMode} />
          </div>
          <div>
            <Label>Range Low</Label>
            <Input value={form.gauge_range_low} onChange={e => handleChange('gauge_range_low', e.target.value)} disabled={viewMode} />
          </div>
          <div>
            <Label>Range High</Label>
            <Input value={form.gauge_range_high} onChange={e => handleChange('gauge_range_high', e.target.value)} disabled={viewMode} />
          </div>
        </CardContent>
      </Card>

      {/* Test Execution */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Test Execution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <Label>Test Pressure Requirements</Label>
              <Input value={form.test_pressure_requirements} onChange={e => handleChange('test_pressure_requirements', e.target.value)} disabled={viewMode} />
            </div>
            <div>
              <Label>Initial Pressure</Label>
              <Input value={form.initial_pressure} onChange={e => handleChange('initial_pressure', e.target.value)} disabled={viewMode} />
            </div>
            <div>
              <Label>Final Pressure</Label>
              <Input value={form.final_pressure} onChange={e => handleChange('final_pressure', e.target.value)} disabled={viewMode} />
            </div>
            <div>
              <Label>Min Req Holding Time</Label>
              <Input value={form.min_req_holding_time} onChange={e => handleChange('min_req_holding_time', e.target.value)} disabled={viewMode} />
            </div>
            <div>
              <Label>Actual Holding Time</Label>
              <Input value={form.actual_holding_time} onChange={e => handleChange('actual_holding_time', e.target.value)} disabled={viewMode} />
            </div>
            <div>
              <Label>Test Start Date</Label>
              <Input type="date" value={form.test_start_date} onChange={e => handleChange('test_start_date', e.target.value)} disabled={viewMode} />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={form.test_start_time} onChange={e => handleChange('test_start_time', e.target.value)} disabled={viewMode} />
            </div>
            <div>
              <Label>Test Finish Date</Label>
              <Input type="date" value={form.test_finish_date} onChange={e => handleChange('test_finish_date', e.target.value)} disabled={viewMode} />
            </div>
            <div>
              <Label>Finish Time</Label>
              <Input type="time" value={form.test_finish_time} onChange={e => handleChange('test_finish_time', e.target.value)} disabled={viewMode} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Test Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Test Performer */}
            <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
              <h4 className="font-medium">Test Performer</h4>
              <div>
                <Label>Name</Label>
                <Input value={form.test_performer_name} onChange={e => handleChange('test_performer_name', e.target.value)} disabled={viewMode} />
              </div>
              <SignatureField label="Signature" fieldName="test_performer_signature" signature={form.test_performer_signature} />
            </div>
            
            {/* Verifier Contractor */}
            <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
              <h4 className="font-medium">Verifier (Contractor)</h4>
              <div>
                <Label>Name</Label>
                <Input value={form.verifier_contractor_name} onChange={e => handleChange('verifier_contractor_name', e.target.value)} disabled={viewMode} />
              </div>
              <SignatureField label="Signature" fieldName="verifier_contractor_signature" signature={form.verifier_contractor_signature} />
            </div>
            
            {/* Verifier CST */}
            <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
              <h4 className="font-medium">Construction Support Team</h4>
              <div>
                <Label>Name</Label>
                <Input value={form.verifier_cst_name} onChange={e => handleChange('verifier_cst_name', e.target.value)} disabled={viewMode} />
              </div>
              <SignatureField label="Signature" fieldName="verifier_cst_signature" signature={form.verifier_cst_signature} />
            </div>
          </div>
          
          <div>
            <Label>Remarks</Label>
            <Textarea value={form.remarks} onChange={e => handleChange('remarks', e.target.value)} disabled={viewMode} rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Line Restoration */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Line Restoration Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 mb-4">
            Gaskets, bolts, caps, instruments, traps, valves (among others) are in place, correctly oriented and tight.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contractor */}
            <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
              <h4 className="font-medium">Contractor</h4>
              <div>
                <Label>Name</Label>
                <Input value={form.restoration_contractor_name} onChange={e => handleChange('restoration_contractor_name', e.target.value)} disabled={viewMode} />
              </div>
              <SignatureField label="Signature" fieldName="restoration_contractor_signature" signature={form.restoration_contractor_signature} />
            </div>
            
            {/* CST */}
            <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
              <h4 className="font-medium">Construction Support Team</h4>
              <div>
                <Label>Name</Label>
                <Input value={form.restoration_cst_name} onChange={e => handleChange('restoration_cst_name', e.target.value)} disabled={viewMode} />
              </div>
              <SignatureField label="Signature" fieldName="restoration_cst_signature" signature={form.restoration_cst_signature} />
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
          <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Formulario'}
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
            data-testid="export-pressure-test-pdf"
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
              <Pen className="w-5 h-5 text-orange-500" />
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
              className="bg-orange-500 hover:bg-orange-600"
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

export default PressureTestForm;
