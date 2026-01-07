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
import { ArrowLeft, Plus, Trash2, Save, Download, FileSpreadsheet, FileText, ArrowRightLeft } from 'lucide-react';
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
  
  // Percentage fields
  const [profitPercentage, setProfitPercentage] = useState(0);
  const [overheadPercentage, setOverheadPercentage] = useState(0);
  const [cfsePercentage, setCfsePercentage] = useState(7); // Fixed at 7%
  const [liabilityPercentage, setLiabilityPercentage] = useState(7); // Fixed at 7%
  const [municipalPatentPercentage, setMunicipalPatentPercentage] = useState(1); // Fixed at 1%
  const [contingencyPercentage, setContingencyPercentage] = useState(6); // Fixed at 6%
  const [b2bOhsmsPercentage, setB2bOhsmsPercentage] = useState(0);
  const [b2bOhsmsLaborPercentage, setB2bOhsmsLaborPercentage] = useState(4); // Fixed at 4%
  const [b2bSubcontractorPercentage, setB2bSubcontractorPercentage] = useState(0);
  const [convertingToEstimate, setConvertingToEstimate] = useState(false);

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
        setProfitPercentage(estimateRes.data.profit_percentage || 0);
        setOverheadPercentage(estimateRes.data.overhead_percentage || 0);
        // Fixed percentages - use saved values or defaults
        setCfsePercentage(estimateRes.data.cfse_percentage ?? 7);
        setLiabilityPercentage(estimateRes.data.liability_percentage ?? 7);
        setMunicipalPatentPercentage(estimateRes.data.municipal_patent_percentage ?? 1);
        setContingencyPercentage(estimateRes.data.contingency_percentage ?? 6);
        setB2bOhsmsPercentage(estimateRes.data.b2b_ohsms_percentage || 0);
        setB2bOhsmsLaborPercentage(estimateRes.data.b2b_ohsms_labor_percentage ?? 4);
        setB2bSubcontractorPercentage(estimateRes.data.b2b_subcontractor_percentage || 0);
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
        general_conditions: generalConditions,
        profit_percentage: Number(profitPercentage),
        overhead_percentage: Number(overheadPercentage),
        cfse_percentage: Number(cfsePercentage),
        liability_percentage: Number(liabilityPercentage),
        municipal_patent_percentage: Number(municipalPatentPercentage),
        contingency_percentage: Number(contingencyPercentage),
        b2b_ohsms_percentage: Number(b2bOhsmsPercentage),
        b2b_ohsms_labor_percentage: Number(b2bOhsmsLaborPercentage),
        b2b_subcontractor_percentage: Number(b2bSubcontractorPercentage)
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
      cost: 0,
      labor_cost: 0
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

  // Convert Cost Estimate to Estimate (Estimado)
  const handleConvertToEstimate = async () => {
    if (!estimate?.project_id) {
      toast.error('Debe seleccionar un proyecto primero');
      return;
    }
    
    setConvertingToEstimate(true);
    try {
      // First save the current cost estimate
      await handleSave();
      
      // Call backend endpoint to convert
      const response = await api.post(`/cost-estimates/${estimateId}/convert-to-estimate`, {}, { withCredentials: true });
      
      toast.success('Estimado creado exitosamente');
      navigate(`/estimados`);
    } catch (error) {
      console.error('Error converting to estimate:', error);
      toast.error(error.response?.data?.detail || 'Error al convertir a estimado');
    } finally {
      setConvertingToEstimate(false);
    }
  };

  // Calculate totals - Custom cascading formula
  // Formula:
  // Subtotal x Profit = s
  // s x Overhead = w
  // Mano de Obra x CFSE = q (CFSE only applies to labor - just the increment)
  // w + cfseAmount = qq (add CFSE increment to overhead result)
  // qq x Liability = M
  // M x Municipal Patent = C
  // C x Contingency = U
  // U x B2B OHSMS (global) = TOTAL
  // Plus: B2B Subcontractor applies only to subcontractor's labor cost
  // B2B M.O. = Labor (from orange area) x 4% (fixed)
  const calculateTotals = () => {
    // Helper function to round to 2 decimals
    const round2 = (num) => Math.round(num * 100) / 100;
    
    const totalLabor = round2(laborCosts.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0));
    const totalSubcontractors = round2(subcontractors.reduce((sum, item) => sum + (Number(item.cost) || 0), 0));
    const totalSubcontractorLabor = round2(subcontractors.reduce((sum, item) => sum + (Number(item.labor_cost) || 0), 0));
    const totalMaterials = round2(materials.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
    const totalEquipment = round2(equipment.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
    const totalTransportation = round2(transportation.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
    const totalGC = round2(generalConditions.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
    
    // Calculate IVU (11.5%) on materials only
    const ivuPercentage = 11.5;
    const ivuAmount = round2(totalMaterials * (ivuPercentage / 100));
    
    const subtotal = round2(totalLabor + totalSubcontractors + totalMaterials + 
                     totalEquipment + totalTransportation + totalGC);
    
    // B2B Subcontractor - applies only to subcontractor's LABOR COST (added at the end)
    const b2bSubcontractorAmount = round2(totalSubcontractorLabor * (Number(b2bSubcontractorPercentage) / 100));
    
    // Step 1: Subtotal x (1 + Profit%) = s
    const profitMultiplier = 1 + (Number(profitPercentage) / 100);
    const afterProfit = round2(subtotal * profitMultiplier); // s
    const profitAmount = round2(afterProfit - subtotal);
    
    // Step 2: s x (1 + Overhead%) = w
    const overheadMultiplier = 1 + (Number(overheadPercentage) / 100);
    const afterOverhead = round2(afterProfit * overheadMultiplier); // w
    const overheadAmount = round2(afterOverhead - afterProfit);
    
    // Step 3: Mano de Obra x CFSE% = cfseAmount (only the increment, not the total)
    const cfseAmount = round2(totalLabor * (Number(cfsePercentage) / 100)); // q is just the increment
    
    // Step 4: w + cfseAmount = qq (add CFSE increment to overhead result)
    const combinedTotal = round2(afterOverhead + cfseAmount); // qq
    
    // Step 5: qq x (1 + Liability%) = M
    const liabilityMultiplier = 1 + (Number(liabilityPercentage) / 100);
    const afterLiability = round2(combinedTotal * liabilityMultiplier); // M
    const liabilityAmount = round2(afterLiability - combinedTotal);
    
    // Step 6: M x (1 + Municipal Patent%) = C
    const municipalPatentMultiplier = 1 + (Number(municipalPatentPercentage) / 100);
    const afterMunicipalPatent = round2(afterLiability * municipalPatentMultiplier); // C
    const municipalPatentAmount = round2(afterMunicipalPatent - afterLiability);
    
    // Step 7: C x (1 + Contingency%) = U
    const contingencyMultiplier = 1 + (Number(contingencyPercentage) / 100);
    const afterContingency = round2(afterMunicipalPatent * contingencyMultiplier); // U
    const contingencyAmount = round2(afterContingency - afterMunicipalPatent);
    
    // Step 8: U x B2B OHSMS% = B2B OHSMS Amount (global - applies to total)
    const b2bOhsmsAmount = round2(afterContingency * (Number(b2bOhsmsPercentage) / 100));
    const afterB2bOhsms = round2(afterContingency + b2bOhsmsAmount);
    
    // B2B OHSMS Labor - FORMULA: Labor (from orange area breakdown) x 4% (fixed)
    const totalMaterialEquipment = round2(totalSubcontractors + totalMaterials + totalEquipment + totalTransportation + totalGC);
    const laborRatio = subtotal > 0 ? totalLabor / subtotal : 0;
    const matEquipRatio = subtotal > 0 ? totalMaterialEquipment / subtotal : 0;
    
    // Labor del Price Breakdown = proporción labor del cascaded total (CFSE ya está incluido en afterB2bOhsms)
    const laborForPriceBreakdown = round2(afterB2bOhsms * laborRatio);
    
    // B2B OHSMS Labor = Labor (del Price Breakdown) x 4%
    const b2bOhsmsLaborAmount = round2(laborForPriceBreakdown * (Number(b2bOhsmsLaborPercentage) / 100));
    
    // Final total = cascaded total + B2B subcontractor (labor) + B2B OHSMS (labor)
    const grandTotal = round2(afterB2bOhsms + b2bSubcontractorAmount + b2bOhsmsLaborAmount);
    
    // Labor with all percentages = Labor proporción del cascade + B2B OHSMS Labor
    const laborWithPercentages = round2(laborForPriceBreakdown + b2bOhsmsLaborAmount);
    
    // Material/Equipment with all percentages = proporción mat/equip del cascade + B2B Subcontractor
    const matEquipWithPercentages = round2((afterB2bOhsms * matEquipRatio) + b2bSubcontractorAmount);
    
    // Calculate total of all percentage amounts
    const totalPercentageAmounts = round2(
      profitAmount + 
      overheadAmount + 
      cfseAmount + 
      liabilityAmount + 
      municipalPatentAmount + 
      contingencyAmount + 
      b2bOhsmsAmount + 
      b2bOhsmsLaborAmount + 
      b2bSubcontractorAmount
    );

    return {
      totalLabor,
      totalSubcontractors,
      totalSubcontractorLabor,
      totalMaterials,
      totalEquipment,
      totalTransportation,
      totalGC,
      totalMaterialEquipment,
      laborWithPercentages,
      matEquipWithPercentages,
      subtotal,
      ivuAmount,
      ivuPercentage,
      profitAmount,
      afterProfit,
      overheadAmount,
      afterOverhead,
      cfseAmount,
      combinedTotal,
      liabilityAmount,
      afterLiability,
      municipalPatentAmount,
      afterMunicipalPatent,
      contingencyAmount,
      afterContingency,
      b2bOhsmsAmount,
      afterB2bOhsms,
      b2bOhsmsLaborAmount,
      b2bSubcontractorAmount,
      totalPercentageAmounts,
      grandTotal
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
                  onClick={handleConvertToEstimate}
                  disabled={convertingToEstimate || !estimate?.project_id}
                  className="bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-700"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  {convertingToEstimate ? 'Convirtiendo...' : 'Convertir a Estimado'}
                </Button>
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

        {/* Basic Info - shows for new estimates OR existing estimates without project */}
        {(estimateId === 'new' || !estimate?.project_id) && (
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
                  <Label>Proyecto {!estimate?.project_id && <span className="text-red-500">*</span>}</Label>
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
                  {!estimate?.project_id && (
                    <p className="text-xs text-amber-600 mt-1">* Selecciona un proyecto para poder convertir a estimado</p>
                  )}
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
                      <p className="font-medium">Materiales (incluye IVU 11.5%)</p>
                    </div>
                    <div className="text-right text-blue-600 font-semibold">
                      ${(totals.totalMaterials + totals.ivuAmount).toLocaleString('es-PR', { minimumFractionDigits: 2 })}
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

                  {/* SUBTOTAL */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg font-bold text-lg mt-4">
                    <div>SUBTOTAL</div>
                    <div className="text-right text-blue-600">
                      ${totals.subtotal.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Percentages Section */}
                  <div className="space-y-4 mt-6 p-4 border rounded-lg bg-slate-50">
                    <p className="font-semibold text-slate-700">Porcentajes (Cálculo en Cascada)</p>
                    <p className="text-xs text-slate-500">Subtotal × Profit = s → s × Overhead = w → (w + M.O.×CFSE) × Liability × Municipal Patent × Contingency × B2B OHSMS = TOTAL</p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <Label>Profit (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={profitPercentage}
                          onChange={(e) => setProfitPercentage(e.target.value)}
                        />
                        {totals.profitAmount > 0 && (
                          <p className="text-xs text-green-600 mt-1">+${totals.profitAmount.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                        )}
                      </div>
                      <div>
                        <Label>Overhead (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={overheadPercentage}
                          onChange={(e) => setOverheadPercentage(e.target.value)}
                        />
                        {totals.overheadAmount > 0 && (
                          <p className="text-xs text-green-600 mt-1">+${totals.overheadAmount.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                        )}
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                        <Label className="text-blue-700">CFSE (%) - Fijo</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={cfsePercentage}
                          readOnly
                          className="bg-blue-100 cursor-not-allowed"
                        />
                        {totals.cfseAmount > 0 && (
                          <p className="text-xs text-blue-600 mt-1">+${totals.cfseAmount.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                        )}
                        <p className="text-xs text-blue-500">*Solo M.O.: ${totals.totalLabor?.toLocaleString('es-PR', { minimumFractionDigits: 2 }) || '0.00'}</p>
                      </div>
                      <div className="bg-gray-100 p-2 rounded">
                        <Label className="text-gray-700">Liability (%) - Fijo</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={liabilityPercentage}
                          readOnly
                          className="bg-gray-200 cursor-not-allowed"
                        />
                        {totals.liabilityAmount > 0 && (
                          <p className="text-xs text-green-600 mt-1">+${totals.liabilityAmount.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                        )}
                      </div>
                      <div className="bg-gray-100 p-2 rounded">
                        <Label className="text-gray-700">Municipal Patent (%) - Fijo</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={municipalPatentPercentage}
                          readOnly
                          className="bg-gray-200 cursor-not-allowed"
                        />
                        {totals.municipalPatentAmount > 0 && (
                          <p className="text-xs text-green-600 mt-1">+${totals.municipalPatentAmount.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                        )}
                      </div>
                      <div className="bg-gray-100 p-2 rounded">
                        <Label className="text-gray-700">Contingency (%) - Fijo</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={contingencyPercentage}
                          readOnly
                          className="bg-gray-200 cursor-not-allowed"
                        />
                        {totals.contingencyAmount > 0 && (
                          <p className="text-xs text-green-600 mt-1">+${totals.contingencyAmount.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                        )}
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <Label className="text-green-700">B2B OHSMS (%) - Global</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={b2bOhsmsPercentage}
                          onChange={(e) => setB2bOhsmsPercentage(e.target.value)}
                        />
                        {totals.b2bOhsmsAmount > 0 && (
                          <p className="text-xs text-green-600 mt-1">+${totals.b2bOhsmsAmount.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                        )}
                        <p className="text-xs text-green-500">*Aplica al total</p>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <Label className="text-green-700">B2B OHSMS (%) - M.O. - Fijo 4%</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={b2bOhsmsLaborPercentage}
                          readOnly
                          className="bg-green-100 cursor-not-allowed"
                        />
                        {totals.b2bOhsmsLaborAmount > 0 && (
                          <p className="text-xs text-green-600 mt-1">+${totals.b2bOhsmsLaborAmount.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                        )}
                        <p className="text-xs text-green-500">*Labor × 4%</p>
                      </div>
                      <div className="bg-amber-50 p-2 rounded">
                        <Label className="text-amber-700">B2B Subcontratista (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={b2bSubcontractorPercentage}
                          onChange={(e) => setB2bSubcontractorPercentage(e.target.value)}
                        />
                        {totals.b2bSubcontractorAmount > 0 && (
                          <p className="text-xs text-amber-600 mt-1">+${totals.b2bSubcontractorAmount.toLocaleString('es-PR', { minimumFractionDigits: 2 })}</p>
                        )}
                        <p className="text-xs text-amber-500">*M.O. Subcontr.: ${totals.totalSubcontractorLabor?.toLocaleString('es-PR', { minimumFractionDigits: 2 }) || '0.00'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Total of Percentage Amounts */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg font-bold text-lg mt-4 border border-purple-200">
                    <div className="text-purple-800">TOTAL PORCENTAJES</div>
                    <div className="text-right text-purple-600">
                      ${totals.totalPercentageAmounts.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Breakdown: Material/Equipment | Labor | Total - MOVED HERE before TOTAL FINAL */}
                  <div className="mt-6 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-orange-500 text-white p-2 rounded font-semibold">
                        Material/Equipment
                      </div>
                      <div className="bg-orange-400 text-white p-2 rounded font-semibold">
                        Labor
                      </div>
                      <div className="bg-orange-500 text-white p-2 rounded font-semibold">
                        Total
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center mt-2 bg-gray-100 p-3 rounded">
                      <div className="font-bold text-lg">
                        ${totals.matEquipWithPercentages.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="font-bold text-lg bg-orange-100 rounded py-1">
                        ${totals.laborWithPercentages.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="font-bold text-lg">
                        ${totals.grandTotal.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                      </div>
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
                        <th className="p-2 text-right text-xs">Costo Total</th>
                        <th className="p-2 text-right text-xs bg-amber-50">Mano de Obra (para B2B)</th>
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
                          <td className="p-2 bg-amber-50">
                            <Input
                              type="number"
                              step="0.01"
                              className="text-right border-amber-300"
                              value={item.labor_cost || 0}
                              onChange={(e) => updateSubcontractorRow(idx, 'labor_cost', e.target.value)}
                              placeholder="Mano de obra"
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
                  <p className="text-xs text-amber-600 mt-2">* El B2B Subcontratista se calcula sobre la columna Mano de Obra</p>
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
