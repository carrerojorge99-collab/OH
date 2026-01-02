import React, { useState, useEffect } from 'react';
import api, { getBackendUrl } from '../utils/api';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Plus, Trash2, Save, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';


const CostEstimateDetail = () => {
  const { estimateId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [laborRates, setLaborRates] = useState([]);
  const [projects, setProjects] = useState([]);
  
  // Forms for each section
  const [laborCosts, setLaborCosts] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [transportation, setTransportation] = useState([]);
  const [generalConditions, setGeneralConditions] = useState([]);

  useEffect(() => {
    loadData();
  }, [estimateId]);

  const loadData = async () => {
    const ts = Date.now(); // Prevent cache
    try {
      const [estimateRes, ratesRes, projectsRes, companyRes] = await Promise.all([
        estimateId !== 'new' 
          ? api.get(`/cost-estimates/${estimateId}?_t=${ts}`, { withCredentials: true })
          : Promise.resolve({ data: null }),
        api.get(`/labor-rates?_t=${ts}`, { withCredentials: true }),
        api.get(`/projects?_t=${ts}`, { withCredentials: true }),
        api.get(`/company?_t=${ts}`, { withCredentials: true })
      ]);

      setLaborRates(ratesRes.data);
      setProjects(projectsRes.data);

      if (estimateRes.data) {
        setEstimate(estimateRes.data);
        setLaborCosts(estimateRes.data.labor_costs || []);
        setSubcontractors(estimateRes.data.subcontractors || []);
        setMaterials(estimateRes.data.materials || []);
        setEquipment(estimateRes.data.equipment || []);
        setTransportation(estimateRes.data.transportation || []);
        setGeneralConditions(estimateRes.data.general_conditions || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        project_id: estimate?.project_id || null,
        estimate_name: estimate.estimate_name || 'Nueva Estimación',
        labor_costs: laborCosts,
        subcontractors,
        materials,
        equipment,
        transportation,
        general_conditions: generalConditions
      };

      if (estimateId === 'new') {
        const res = await api.post(`/cost-estimates`, data, { withCredentials: true });
        toast.success('Estimación creada');
        navigate(`/cost-estimates/${res.data.estimate_id}`);
      } else {
        await api.put(`/cost-estimates/${estimateId}`, data, { withCredentials: true });
        toast.success('Estimación actualizada');
        loadData();
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar estimación');
    } finally {
      setSaving(false);
    }
  };

  // Labor functions
  const addLaborRow = () => {
    if (laborRates.length === 0) {
      toast.error('Configura las tarifas laborales en Settings primero');
      return;
    }

    const newRow = {
      role_name: laborRates[0]?.role_name || '',
      qty_personnel: 1,
      regular_hours: 0,
      overtime_hours: 0,
      rate: laborRates[0]?.quoted_rate || 0,
      overtime_rate: laborRates[0]?.overtime_rate || 0,
      subtotal: 0
    };
    setLaborCosts([...laborCosts, newRow]);
  };

  const updateLaborRow = (index, field, value) => {
    const updated = [...laborCosts];
    updated[index][field] = value;

    // Update rates when role changes
    if (field === 'role_name') {
      const rateData = laborRates.find(r => r.role_name === value);
      if (rateData) {
        updated[index].rate = rateData.quoted_rate;
        updated[index].overtime_rate = rateData.overtime_rate;
      }
    }

    // Calculate subtotal
    const qty = Number(updated[index].qty_personnel) || 1;
    const regular = Number(updated[index].regular_hours) || 0;
    const overtime = Number(updated[index].overtime_hours) || 0;
    const rate = Number(updated[index].rate) || 0;
    const oRate = Number(updated[index].overtime_rate) || 0;

    updated[index].subtotal = qty * ((regular * rate) + (overtime * oRate));

    setLaborCosts(updated);
  };

  const deleteLaborRow = (index) => {
    setLaborCosts(laborCosts.filter((_, i) => i !== index));
  };

  // Subcontractor functions
  const addSubcontractorRow = () => {
    setSubcontractors([...subcontractors, {
      trade: 'Civil',
      description: '',
      cost: 0
    }]);
  };

  const updateSubcontractorRow = (index, field, value) => {
    const updated = [...subcontractors];
    updated[index][field] = value;
    setSubcontractors(updated);
  };

  const deleteSubcontractorRow = (index) => {
    setSubcontractors(subcontractors.filter((_, i) => i !== index));
  };

  // Material functions
  const addMaterialRow = () => {
    setMaterials([...materials, {
      description: '',
      quantity: 0,
      unit_cost: 0,
      total: 0
    }]);
  };

  const updateMaterialRow = (index, field, value) => {
    const updated = [...materials];
    updated[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_cost') {
      updated[index].total = (Number(updated[index].quantity) || 0) * (Number(updated[index].unit_cost) || 0);
    }
    
    setMaterials(updated);
  };

  const deleteMaterialRow = (index) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  // Equipment functions
  const addEquipmentRow = () => {
    setEquipment([...equipment, {
      description: '',
      quantity: 0,
      days: 0,
      rate: 0,
      total: 0
    }]);
  };

  // Transportation functions
  const addTransportationRow = () => {
    setTransportation([...transportation, {
      description: '',
      city_town: '',
      roundtrip_miles: 0,
      cost_per_mile: 0,
      days: 0,
      total: 0
    }]);
  };

  const updateTransportationRow = (index, field, value) => {
    const updated = [...transportation];
    updated[index][field] = value;
    
    if (field === 'roundtrip_miles' || field === 'cost_per_mile' || field === 'days') {
      updated[index].total = (Number(updated[index].roundtrip_miles) || 0) * 
                              (Number(updated[index].cost_per_mile) || 0) * 
                              (Number(updated[index].days) || 0);
    }
    
    setTransportation(updated);
  };

  const deleteTransportationRow = (index) => {
    setTransportation(transportation.filter((_, i) => i !== index));
  };

  const updateEquipmentRow = (index, field, value) => {
    const updated = [...equipment];
    updated[index][field] = value;
    
    if (field === 'quantity' || field === 'days' || field === 'rate') {
      updated[index].total = (Number(updated[index].quantity) || 0) * 
                             (Number(updated[index].days) || 0) * 
                             (Number(updated[index].rate) || 0);
    }
    
    setEquipment(updated);
  };

  const deleteEquipmentRow = (index) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  // General Conditions functions
  const addGCRow = () => {
    setGeneralConditions([...generalConditions, {
      description: '',
      quantity: 0,
      unit_cost: 0,
      total: 0
    }]);
  };

  const updateGCRow = (index, field, value) => {
    const updated = [...generalConditions];
    updated[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_cost') {
      updated[index].total = (Number(updated[index].quantity) || 0) * (Number(updated[index].unit_cost) || 0);
    }
    
    setGeneralConditions(updated);
  };

  const deleteGCRow = (index) => {
    setGeneralConditions(generalConditions.filter((_, i) => i !== index));
  };

  // Calculate totals - Simple sum only
  const calculateTotals = () => {
    const totalLabor = laborCosts.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
    const totalSubcontractors = subcontractors.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    const totalMaterials = materials.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const totalEquipment = equipment.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const totalTransportation = transportation.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const totalGC = generalConditions.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    
    const subtotal = totalLabor + totalSubcontractors + totalMaterials + 
                     totalEquipment + totalTransportation + totalGC;

    return {
      totalLabor,
      totalSubcontractors,
      totalMaterials,
      totalEquipment,
      totalTransportation,
      totalGC,
      subtotal,
      grandTotal: subtotal
    };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-center text-slate-500">Cargando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/cost-estimates')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {estimateId === 'new' ? 'Nueva Estimación' : estimate?.estimate_name}
              </h1>
              <p className="text-slate-600">
                {estimate?.project_name || 'Selecciona un proyecto'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {estimateId !== 'new' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => window.open(`${getBackendUrl()}/api/cost-estimates/${estimateId}/export/pdf`, '_blank')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`${getBackendUrl()}/api/cost-estimates/${estimateId}/export/excel`, '_blank')}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>

        {/* Basic Info for new estimates */}
        {estimateId === 'new' && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre de la Estimación</Label>
                  <Input
                    value={estimate?.estimate_name || ''}
                    onChange={(e) => setEstimate({ ...estimate, estimate_name: e.target.value })}
                    placeholder="Ej: Estimación Proyecto ABC"
                  />
                </div>
                <div>
                  <Label>Proyecto</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={estimate?.project_id || ''}
                    onChange={(e) => {
                      const proj = projects.find(p => p.project_id === e.target.value);
                      setEstimate({ 
                        ...estimate, 
                        project_id: e.target.value,
                        project_name: proj?.name || ''
                      });
                    }}
                  >
                    <option value="">Selecciona un proyecto</option>
                    {projects.map(p => (
                      <option key={p.project_id} value={p.project_id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 text-sm">
            <TabsTrigger value="summary">Resumen</TabsTrigger>
            <TabsTrigger value="labor">Mano de Obra</TabsTrigger>
            <TabsTrigger value="subcontractors">Subcontratistas</TabsTrigger>
            <TabsTrigger value="materials">Materiales</TabsTrigger>
            <TabsTrigger value="equipment">Equipos</TabsTrigger>
            <TabsTrigger value="transportation">Transporte</TabsTrigger>
            <TabsTrigger value="general">Cond. Generales</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Costos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm text-slate-600">Tipo</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-600">Total</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-3 border-b">
                    <div>
                      <p className="font-medium">Mano de Obra</p>
                    </div>
                    <div className="text-right text-blue-600 font-semibold">
                      ${totals.totalLabor.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-3 border-b">
                    <div>
                      <p className="font-medium">Subcontratistas</p>
                    </div>
                    <div className="text-right text-blue-600 font-semibold">
                      ${totals.totalSubcontractors.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-3 border-b">
                    <div>
                      <p className="font-medium">Materiales</p>
                    </div>
                    <div className="text-right text-blue-600 font-semibold">
                      ${totals.totalMaterials.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-3 border-b">
                    <div>
                      <p className="font-medium">Equipos</p>
                    </div>
                    <div className="text-right text-blue-600 font-semibold">
                      ${totals.totalEquipment.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-3 border-b">
                    <div>
                      <p className="font-medium">Transporte</p>
                    </div>
                    <div className="text-right text-blue-600 font-semibold">
                      ${totals.totalTransportation.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-3 border-b">
                    <div>
                      <p className="font-medium">Condiciones Generales</p>
                    </div>
                    <div className="text-right text-blue-600 font-semibold">
                      ${totals.totalGC.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg font-bold text-lg">
                    <div>SUBTOTAL</div>
                    <div className="text-right text-blue-600">
                      ${totals.subtotal.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg font-bold text-xl mt-6">
                    <div>TOTAL FINAL</div>
                    <div className="text-right text-blue-600">
                      ${totals.grandTotal.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Labor Tab */}
          <TabsContent value="labor">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mano de Obra</CardTitle>
                  <Button onClick={addLaborRow} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Rol
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="p-2 text-left text-xs">Rol</th>
                        <th className="p-2 text-left text-xs">Cant.</th>
                        <th className="p-2 text-left text-xs">Hrs Regular</th>
                        <th className="p-2 text-left text-xs">Hrs Overtime</th>
                        <th className="p-2 text-left text-xs">Tarifa/Hora</th>
                        <th className="p-2 text-left text-xs">Tarifa OT</th>
                        <th className="p-2 text-right text-xs">Subtotal</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {laborCosts.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">
                            <select
                              className="w-full border rounded px-2 py-1 text-sm"
                              value={item.role_name}
                              onChange={(e) => updateLaborRow(idx, 'role_name', e.target.value)}
                            >
                              {laborRates.map(rate => (
                                <option key={rate.rate_id} value={rate.role_name}>
                                  {rate.role_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="w-20"
                              value={item.qty_personnel}
                              onChange={(e) => updateLaborRow(idx, 'qty_personnel', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="w-24"
                              value={item.regular_hours}
                              onChange={(e) => updateLaborRow(idx, 'regular_hours', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="w-24"
                              value={item.overtime_hours}
                              onChange={(e) => updateLaborRow(idx, 'overtime_hours', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24"
                              value={item.rate}
                              onChange={(e) => updateLaborRow(idx, 'rate', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24"
                              value={item.overtime_rate}
                              onChange={(e) => updateLaborRow(idx, 'overtime_rate', e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-right text-sm text-blue-600 font-semibold">
                            ${item.subtotal.toFixed(2)}
                          </td>
                          <td className="p-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteLaborRow(idx)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subcontractors Tab */}
          <TabsContent value="subcontractors">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Subcontratistas</CardTitle>
                  <Button onClick={addSubcontractorRow} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Subcontratista
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="p-2 text-left text-xs">Tipo</th>
                        <th className="p-2 text-left text-xs">Descripción</th>
                        <th className="p-2 text-right text-xs">Costo</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {subcontractors.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">
                            <select
                              className="w-full border rounded px-2 py-1"
                              value={item.trade}
                              onChange={(e) => updateSubcontractorRow(idx, 'trade', e.target.value)}
                            >
                              <option value="Civil">Civil</option>
                              <option value="Mechanical">Mecánico</option>
                              <option value="Electrical">Eléctrico</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <Input
                              value={item.description}
                              onChange={(e) => updateSubcontractorRow(idx, 'description', e.target.value)}
                              placeholder="Descripción del trabajo"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="text-right"
                              value={item.cost}
                              onChange={(e) => updateSubcontractorRow(idx, 'cost', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteSubcontractorRow(idx)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Materiales</CardTitle>
                  <Button onClick={addMaterialRow} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Material
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="p-2 text-left text-xs">Descripción</th>
                        <th className="p-2 text-right text-xs">Cantidad</th>
                        <th className="p-2 text-right text-xs">Costo Unitario</th>
                        <th className="p-2 text-right text-xs">Total</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">
                            <Input
                              value={item.description}
                              onChange={(e) => updateMaterialRow(idx, 'description', e.target.value)}
                              placeholder="Descripción del material"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="text-right"
                              value={item.quantity}
                              onChange={(e) => updateMaterialRow(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="text-right"
                              value={item.unit_cost}
                              onChange={(e) => updateMaterialRow(idx, 'unit_cost', e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-right font-semibold">
                            ${item.total.toFixed(2)}
                          </td>
                          <td className="p-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMaterialRow(idx)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Equipos y Transporte</CardTitle>
                  <Button onClick={addEquipmentRow} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Equipo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="p-2 text-left text-xs">Descripción</th>
                        <th className="p-2 text-right text-xs">Cantidad</th>
                        <th className="p-2 text-right text-xs">Días</th>
                        <th className="p-2 text-right text-xs">Tarifa/Día</th>
                        <th className="p-2 text-right text-xs">Total</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">
                            <Input
                              value={item.description}
                              onChange={(e) => updateEquipmentRow(idx, 'description', e.target.value)}
                              placeholder="Descripción del equipo"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="text-right w-24"
                              value={item.quantity}
                              onChange={(e) => updateEquipmentRow(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="text-right w-24"
                              value={item.days}
                              onChange={(e) => updateEquipmentRow(idx, 'days', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="text-right w-24"
                              value={item.rate}
                              onChange={(e) => updateEquipmentRow(idx, 'rate', e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-right font-semibold">
                            ${item.total.toFixed(2)}
                          </td>
                          <td className="p-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteEquipmentRow(idx)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transportation Tab */}
          <TabsContent value="transportation">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Transporte y Viajes</CardTitle>
                  <Button onClick={addTransportationRow} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Ruta
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="p-2 text-left text-xs">Descripción</th>
                        <th className="p-2 text-left text-xs">Ciudad/Pueblo</th>
                        <th className="p-2 text-right text-xs">Millas Ida/Vuelta</th>
                        <th className="p-2 text-right text-xs">Costo por Milla</th>
                        <th className="p-2 text-right text-xs">Días</th>
                        <th className="p-2 text-right text-xs">Total</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {transportation.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">
                            <Input
                              value={item.description}
                              onChange={(e) => updateTransportationRow(idx, 'description', e.target.value)}
                              placeholder="Ej: Transporte al site"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={item.city_town}
                              onChange={(e) => updateTransportationRow(idx, 'city_town', e.target.value)}
                              placeholder="Ej: San Juan"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.1"
                              className="text-right w-28"
                              value={item.roundtrip_miles}
                              onChange={(e) => updateTransportationRow(idx, 'roundtrip_miles', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="text-right w-24"
                              value={item.cost_per_mile}
                              onChange={(e) => updateTransportationRow(idx, 'cost_per_mile', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="text-right w-20"
                              value={item.days}
                              onChange={(e) => updateTransportationRow(idx, 'days', e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-right font-semibold">
                            ${item.total.toFixed(2)}
                          </td>
                          <td className="p-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteTransportationRow(idx)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-slate-600">
                    💡 <strong>Cálculo:</strong> Total = Millas Ida/Vuelta × Costo por Milla × Días
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Ejemplo: 50 millas × $0.65/milla × 20 días = $650.00
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Conditions Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Condiciones Generales</CardTitle>
                  <Button onClick={addGCRow} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="p-2 text-left text-xs">Descripción</th>
                        <th className="p-2 text-right text-xs">Cantidad</th>
                        <th className="p-2 text-right text-xs">Costo Unitario</th>
                        <th className="p-2 text-right text-xs">Total</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {generalConditions.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">
                            <Input
                              value={item.description}
                              onChange={(e) => updateGCRow(idx, 'description', e.target.value)}
                              placeholder="Ej: Supervisión, Permisos, Seguros"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="text-right"
                              value={item.quantity}
                              onChange={(e) => updateGCRow(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="text-right"
                              value={item.unit_cost}
                              onChange={(e) => updateGCRow(idx, 'unit_cost', e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-right font-semibold">
                            ${item.total.toFixed(2)}
                          </td>
                          <td className="p-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteGCRow(idx)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CostEstimateDetail;
