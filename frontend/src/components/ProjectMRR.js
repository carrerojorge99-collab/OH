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
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import { 
  Plus, Trash2, Edit, Eye, CheckCircle, Clock,
  Package, Download, Search, Filter, MoreVertical,
  FileText, Calendar, Building2, User, Upload, ExternalLink,
  Truck, ClipboardList, Printer
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
  received: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  inspected: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800'
};

const statusLabels = {
  draft: 'Borrador',
  received: 'Recibido',
  pending: 'Pendiente',
  inspected: 'Inspeccionado',
  rejected: 'Rechazado'
};

// MRR Document Component for print preview
const MRRDocument = ({ mrr, projectName }) => {
  return (
    <div className="bg-white p-4 text-sm font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header Title */}
      <div className="text-center font-bold text-lg border-2 border-black bg-gray-200 py-2 mb-0">
        MATERIAL RECEIVING REPORT (MRR)
      </div>
      
      {/* Main Header Grid */}
      <table className="w-full border-collapse border-2 border-black">
        <tbody>
          {/* Row 1 */}
          <tr>
            <td className="border border-black p-2 w-1/3">
              <div className="text-xs text-gray-600">SUPPLIER:</div>
              <div className="font-semibold">{mrr.supplier || 'N/A'}</div>
            </td>
            <td className="border border-black p-2 w-1/3">
              <div className="text-xs text-gray-600">SHIPPER</div>
              <div>{mrr.shipper || 'N/A'}</div>
            </td>
            <td className="border border-black p-2 w-1/3">
              <div className="text-xs text-gray-600">PURCHASE ORDER NO.:</div>
              <div className="font-bold text-lg">{mrr.po_number || 'N/A'}</div>
            </td>
          </tr>
          {/* Row 2 */}
          <tr>
            <td className="border border-black p-2">
              <div className="text-xs text-gray-600">CARRIER:</div>
              <div className="font-semibold">{mrr.carrier || 'N/A'}</div>
            </td>
            <td className="border border-black p-2">
              <div className="text-xs text-gray-600">SHIPPING POINT:</div>
              <div>{mrr.shipping_point || 'N/A'}</div>
            </td>
            <td className="border border-black p-2">
              <div className="text-xs text-gray-600">MRR NO.</div>
              <div className="font-bold text-xl text-center">{mrr.mrr_number}</div>
            </td>
          </tr>
          {/* Row 3 - FOB, SHIPMENT, CHARGES */}
          <tr>
            <td className="border border-black p-2">
              <div className="text-xs text-gray-600 font-bold">FOB POINT</div>
              <div className="flex flex-col gap-1 mt-1">
                <label className="flex items-center gap-2">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.fob_point === 'job_site' ? 'bg-black' : ''}`}>
                    {mrr.fob_point === 'job_site' && <span className="text-white text-xs">✓</span>}
                  </span>
                  JOB SITE
                </label>
                <label className="flex items-center gap-2">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.fob_point === 'shipping_point' ? 'bg-black' : ''}`}>
                    {mrr.fob_point === 'shipping_point' && <span className="text-white text-xs">✓</span>}
                  </span>
                  SHIPPING POINT
                </label>
              </div>
            </td>
            <td className="border border-black p-2">
              <div className="text-xs text-gray-600 font-bold">SHIPMENT</div>
              <div className="flex flex-col gap-1 mt-1">
                <label className="flex items-center gap-2">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.shipment_type === 'partial' ? 'bg-black' : ''}`}>
                    {mrr.shipment_type === 'partial' && <span className="text-white text-xs">✓</span>}
                  </span>
                  PARTIAL
                </label>
                <label className="flex items-center gap-2">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.shipment_type === 'complete' ? 'bg-black' : ''}`}>
                    {mrr.shipment_type === 'complete' && <span className="text-white text-xs">✓</span>}
                  </span>
                  COMPLETE
                </label>
              </div>
            </td>
            <td className="border border-black p-2" rowSpan={2}>
              <div className="text-xs text-gray-600 font-bold">CHARGES</div>
              <div className="flex flex-col gap-1 mt-1">
                <label className="flex items-center gap-2">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.charges === 'prepaid' ? 'bg-black' : ''}`}>
                    {mrr.charges === 'prepaid' && <span className="text-white text-xs">✓</span>}
                  </span>
                  PREPAID
                </label>
                <label className="flex items-center gap-2">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.charges === 'collect' ? 'bg-black' : ''}`}>
                    {mrr.charges === 'collect' && <span className="text-white text-xs">✓</span>}
                  </span>
                  COLLECT
                </label>
              </div>
              <div className="mt-3 border-t pt-2">
                <div className="text-xs text-gray-600">FREIGHT BILL PRODUCT NO.</div>
                <div>{mrr.freight_bill_no || 'N/A'}</div>
              </div>
              <div className="mt-2">
                <div className="text-xs text-gray-600">DATE RECEIVED</div>
                <div>{mrr.date_received || 'N/A'}</div>
              </div>
            </td>
          </tr>
          {/* Row 4 - Packing List, Car No, Weight, etc */}
          <tr>
            <td className="border border-black p-2" colSpan={2}>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <div className="text-xs text-gray-600">PACKING LIST NO.</div>
                  <div>{mrr.packing_list_no || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">CAR NO.</div>
                  <div>{mrr.car_no || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">WEIGHT</div>
                  <div>{mrr.weight || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">NO. OF CARTONS</div>
                  <div>{mrr.no_of_cartons || 'N/A'}</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Receiving Inspection Section */}
      <div className="text-center font-bold bg-gray-300 border-2 border-t-0 border-black py-1">
        RECEIVING INSPECTION
      </div>
      <table className="w-full border-collapse border-2 border-t-0 border-black">
        <tbody>
          <tr>
            <td className="border border-black p-2 w-1/4">
              <div className="text-xs text-gray-600">Received by:</div>
              <div className="font-semibold">{mrr.received_by}</div>
            </td>
            <td className="border border-black p-2 w-1/6">
              <div className="text-xs text-gray-600">Date:</div>
              <div>{mrr.received_date || mrr.date_received || 'N/A'}</div>
            </td>
            <td className="border border-black p-2 w-1/3">
              <div className="text-xs text-gray-600 font-bold">Q.C. Inspection Required</div>
              <div className="flex gap-3 mt-1">
                <label className="flex items-center gap-1">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.qc_inspection_required === 'yes' ? 'bg-black' : ''}`}>
                    {mrr.qc_inspection_required === 'yes' && <span className="text-white text-xs">✓</span>}
                  </span>
                  Yes
                </label>
                <label className="flex items-center gap-1">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.qc_inspection_required === 'no' ? 'bg-black' : ''}`}>
                    {mrr.qc_inspection_required === 'no' && <span className="text-white text-xs">✓</span>}
                  </span>
                  No
                </label>
                <label className="flex items-center gap-1">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.qc_inspection_required === 'na' ? 'bg-black' : ''}`}>
                    {mrr.qc_inspection_required === 'na' && <span className="text-white text-xs">✓</span>}
                  </span>
                  N/A
                </label>
              </div>
            </td>
            <td className="border border-black p-2 w-1/4">
              <div className="text-xs text-gray-600 font-bold">Q.C. Status</div>
              <div className="flex gap-3 mt-1">
                <label className="flex items-center gap-1">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.qc_status === 'hold' ? 'bg-black' : ''}`}>
                    {mrr.qc_status === 'hold' && <span className="text-white text-xs">✓</span>}
                  </span>
                  Hold
                </label>
                <label className="flex items-center gap-1">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.qc_status === 'accepted' ? 'bg-black' : ''}`}>
                    {mrr.qc_status === 'accepted' && <span className="text-white text-xs">✓</span>}
                  </span>
                  Accepted
                </label>
                <label className="flex items-center gap-1">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.qc_status === 'na' ? 'bg-black' : ''}`}>
                    {mrr.qc_status === 'na' && <span className="text-white text-xs">✓</span>}
                  </span>
                  N/A
                </label>
              </div>
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2" colSpan={4}>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold">Q.C. Documents Received</span>
                <label className="flex items-center gap-1">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.qc_documents_received === 'yes' ? 'bg-black' : ''}`}>
                    {mrr.qc_documents_received === 'yes' && <span className="text-white text-xs">✓</span>}
                  </span>
                  Yes
                </label>
                <label className="flex items-center gap-1">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.qc_documents_received === 'no' ? 'bg-black' : ''}`}>
                    {mrr.qc_documents_received === 'no' && <span className="text-white text-xs">✓</span>}
                  </span>
                  No
                </label>
                <label className="flex items-center gap-1">
                  <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${mrr.qc_documents_received === 'not_required' ? 'bg-black' : ''}`}>
                    {mrr.qc_documents_received === 'not_required' && <span className="text-white text-xs">✓</span>}
                  </span>
                  Not Required
                </label>
              </div>
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2" colSpan={4}>
              <div className="text-xs text-gray-600 font-bold">Remarks:</div>
              <div className="min-h-[40px]">{mrr.remarks || ''}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items Table */}
      <table className="w-full border-collapse border-2 border-t-0 border-black mt-0">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-left w-16">PO Item</th>
            <th className="border border-black p-2 text-left w-20">Qty. Received</th>
            <th className="border border-black p-2 text-left w-28">Item Code No.</th>
            <th className="border border-black p-2 text-left w-16">Size</th>
            <th className="border border-black p-2 text-left">Description of Material</th>
            <th className="border border-black p-2 text-left w-28">Storage Location</th>
          </tr>
        </thead>
        <tbody>
          {(mrr.items || []).length > 0 ? (
            mrr.items.map((item, idx) => (
              <tr key={idx}>
                <td className="border border-black p-2 text-center">{item.po_item || idx + 1}</td>
                <td className="border border-black p-2 text-center">{item.qty_received || 0}</td>
                <td className="border border-black p-2">{item.item_code || 'N/A'}</td>
                <td className="border border-black p-2">{item.size || 'N/A'}</td>
                <td className="border border-black p-2">{item.description}</td>
                <td className="border border-black p-2">{item.storage_location || ''}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="border border-black p-2 text-center" colSpan={6}>
                Sin materiales registrados
              </td>
            </tr>
          )}
          {/* Empty rows for spacing */}
          {[...Array(Math.max(0, 5 - (mrr.items?.length || 0)))].map((_, idx) => (
            <tr key={`empty-${idx}`}>
              <td className="border border-black p-2">&nbsp;</td>
              <td className="border border-black p-2">&nbsp;</td>
              <td className="border border-black p-2">&nbsp;</td>
              <td className="border border-black p-2">&nbsp;</td>
              <td className="border border-black p-2">&nbsp;</td>
              <td className="border border-black p-2">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="border-2 border-t-0 border-black p-3">
        <div className="font-bold">MRR PREPARED BY AND DATE:</div>
        <div className="mt-2 ml-8 text-lg">
          {mrr.prepared_by || mrr.created_by_name} {mrr.prepared_date || moment(mrr.created_at).format('MM/DD/YYYY')}
        </div>
      </div>
    </div>
  );
};

// MRR Form Fields Component - Extracted outside to prevent re-mounting on state changes
const MRRFormFields = ({ mrrForm, handleInputChange, updateItem, addItem, removeItem, fileInputRef, handleFileUpload, uploadingFile, removeAttachment }) => (
  <div className="space-y-6">
    {/* Header Section */}
    <div className="border rounded-lg p-4 bg-slate-50">
      <h3 className="font-semibold mb-4 text-slate-700">Información del Envío</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Supplier (Proveedor) *</Label>
          <Input
            value={mrrForm.supplier}
            onChange={(e) => handleInputChange('supplier', e.target.value)}
            placeholder="Ej: Life Technologies Corp."
            required
            data-testid="mrr-supplier-input"
          />
        </div>
        <div className="space-y-2">
          <Label>Shipper</Label>
          <Input
            value={mrrForm.shipper}
            onChange={(e) => handleInputChange('shipper', e.target.value)}
            placeholder="Ej: Life Technologies"
          />
        </div>
        <div className="space-y-2">
          <Label>Purchase Order No.</Label>
          <Input
            value={mrrForm.po_number}
            onChange={(e) => handleInputChange('po_number', e.target.value)}
            placeholder="Ej: 7300484779"
            data-testid="mrr-po-input"
          />
        </div>
        <div className="space-y-2">
          <Label>Carrier (Transportista)</Label>
          <Input
            value={mrrForm.carrier}
            onChange={(e) => handleInputChange('carrier', e.target.value)}
            placeholder="Ej: FedEx, UPS"
          />
        </div>
        <div className="space-y-2">
          <Label>Shipping Point</Label>
          <Input
            value={mrrForm.shipping_point}
            onChange={(e) => handleInputChange('shipping_point', e.target.value)}
            placeholder="Ej: Amgen Juncos, PR"
          />
        </div>
        <div className="space-y-2">
          <Label>Date Received</Label>
          <Input
            type="date"
            value={mrrForm.date_received ? moment(mrrForm.date_received, 'MM/DD/YYYY').format('YYYY-MM-DD') : ''}
            onChange={(e) => handleInputChange('date_received', moment(e.target.value).format('MM/DD/YYYY'))}
          />
        </div>
      </div>

      {/* Checkboxes Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="space-y-2">
          <Label className="font-semibold">FOB Point</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fob_point"
                checked={mrrForm.fob_point === 'job_site'}
                onChange={() => handleInputChange('fob_point', 'job_site')}
                className="w-4 h-4"
              />
              Job Site
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fob_point"
                checked={mrrForm.fob_point === 'shipping_point'}
                onChange={() => handleInputChange('fob_point', 'shipping_point')}
                className="w-4 h-4"
              />
              Shipping Point
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold">Shipment</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="shipment_type"
                checked={mrrForm.shipment_type === 'partial'}
                onChange={() => handleInputChange('shipment_type', 'partial')}
                className="w-4 h-4"
              />
              Partial
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="shipment_type"
                checked={mrrForm.shipment_type === 'complete'}
                onChange={() => handleInputChange('shipment_type', 'complete')}
                className="w-4 h-4"
              />
              Complete
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold">Charges</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="charges"
                checked={mrrForm.charges === 'prepaid'}
                onChange={() => handleInputChange('charges', 'prepaid')}
                className="w-4 h-4"
              />
              Prepaid
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="charges"
                checked={mrrForm.charges === 'collect'}
                onChange={() => handleInputChange('charges', 'collect')}
                className="w-4 h-4"
              />
              Collect
            </label>
          </div>
        </div>
      </div>

      {/* Additional Fields */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
        <div className="space-y-2">
          <Label>Packing List No.</Label>
          <Input
            value={mrrForm.packing_list_no}
            onChange={(e) => handleInputChange('packing_list_no', e.target.value)}
            placeholder="Ej: 030 1762907"
          />
        </div>
        <div className="space-y-2">
          <Label>Car No.</Label>
          <Input
            value={mrrForm.car_no}
            onChange={(e) => handleInputChange('car_no', e.target.value)}
            placeholder="N/A"
          />
        </div>
        <div className="space-y-2">
          <Label>Weight</Label>
          <Input
            value={mrrForm.weight}
            onChange={(e) => handleInputChange('weight', e.target.value)}
            placeholder="N/A"
          />
        </div>
        <div className="space-y-2">
          <Label>No. of Cartons</Label>
          <Input
            value={mrrForm.no_of_cartons}
            onChange={(e) => handleInputChange('no_of_cartons', e.target.value)}
            placeholder="N/A"
          />
        </div>
        <div className="space-y-2">
          <Label>Freight Bill No.</Label>
          <Input
            value={mrrForm.freight_bill_no}
            onChange={(e) => handleInputChange('freight_bill_no', e.target.value)}
            placeholder="N/A"
          />
        </div>
      </div>
    </div>

    {/* Receiving Inspection Section */}
    <div className="border rounded-lg p-4 bg-emerald-50">
      <h3 className="font-semibold mb-4 text-emerald-800">Receiving Inspection</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Received By *</Label>
          <Input
            value={mrrForm.received_by}
            onChange={(e) => handleInputChange('received_by', e.target.value)}
            placeholder="Ej: Pedro Rivera"
            required
            data-testid="mrr-received-by-input"
          />
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={mrrForm.received_date ? moment(mrrForm.received_date, 'MM/DD/YYYY').format('YYYY-MM-DD') : ''}
            onChange={(e) => handleInputChange('received_date', moment(e.target.value).format('MM/DD/YYYY'))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="space-y-2">
          <Label className="font-semibold">Q.C. Inspection Required</Label>
          <div className="flex gap-3">
            {[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
              { value: 'na', label: 'N/A' }
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="qc_inspection"
                  checked={mrrForm.qc_inspection_required === opt.value}
                  onChange={() => handleInputChange('qc_inspection_required', opt.value)}
                  className="w-4 h-4"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold">Q.C. Status</Label>
          <div className="flex gap-3">
            {[
              { value: 'hold', label: 'Hold' },
              { value: 'accepted', label: 'Accepted' },
              { value: 'na', label: 'N/A' }
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="qc_status"
                  checked={mrrForm.qc_status === opt.value}
                  onChange={() => handleInputChange('qc_status', opt.value)}
                  className="w-4 h-4"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold">Q.C. Documents Received</Label>
          <div className="flex gap-3 flex-wrap">
            {[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
              { value: 'not_required', label: 'Not Required' }
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="qc_docs"
                  checked={mrrForm.qc_documents_received === opt.value}
                  onChange={() => handleInputChange('qc_documents_received', opt.value)}
                  className="w-4 h-4"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label>Remarks</Label>
        <Textarea
          value={mrrForm.remarks}
          onChange={(e) => handleInputChange('remarks', e.target.value)}
          placeholder="Observaciones adicionales..."
          rows={2}
        />
      </div>
    </div>

    {/* Items Table */}
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-slate-700">Materiales Recibidos</h3>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="w-4 h-4 mr-1" />
          Agregar Item
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left w-16">PO Item</th>
              <th className="p-2 text-left w-20">Qty</th>
              <th className="p-2 text-left w-28">Item Code</th>
              <th className="p-2 text-left w-20">Size</th>
              <th className="p-2 text-left">Description *</th>
              <th className="p-2 text-left w-28">Storage Location</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {mrrForm.items.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="p-1">
                  <Input
                    type="number"
                    value={item.po_item}
                    onChange={(e) => updateItem(idx, 'po_item', parseInt(e.target.value) || 0)}
                    className="h-8 text-center"
                  />
                </td>
                <td className="p-1">
                  <Input
                    type="number"
                    value={item.qty_received}
                    onChange={(e) => updateItem(idx, 'qty_received', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={item.item_code}
                    onChange={(e) => updateItem(idx, 'item_code', e.target.value)}
                    placeholder="SV63200.27"
                    className="h-8"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={item.size}
                    onChange={(e) => updateItem(idx, 'size', e.target.value)}
                    placeholder="N/A"
                    className="h-8"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    placeholder="Descripción del material"
                    required
                    className="h-8"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={item.storage_location}
                    onChange={(e) => updateItem(idx, 'storage_location', e.target.value)}
                    placeholder="Super Skid"
                    className="h-8"
                  />
                </td>
                <td className="p-1">
                  {mrrForm.items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(idx)}
                      className="h-8 w-8 p-0 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Footer Section */}
    <div className="border rounded-lg p-4 bg-slate-50">
      <h3 className="font-semibold mb-4 text-slate-700">Preparado Por</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>MRR Prepared By</Label>
          <Input
            value={mrrForm.prepared_by}
            onChange={(e) => handleInputChange('prepared_by', e.target.value)}
            placeholder="Nombre del preparador"
          />
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={mrrForm.prepared_date ? moment(mrrForm.prepared_date, 'MM/DD/YYYY').format('YYYY-MM-DD') : ''}
            onChange={(e) => handleInputChange('prepared_date', moment(e.target.value).format('MM/DD/YYYY'))}
          />
        </div>
      </div>
    </div>

    {/* Attachments Section */}
    <div className="border rounded-lg p-4">
      <Label className="flex items-center gap-2 font-semibold mb-3">
        <FileText className="w-4 h-4" />
        Documentos Adjuntos
      </Label>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            data-testid="mrr-file-input"
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
        
        {mrrForm.attachments.length > 0 && (
          <div className="space-y-2">
            {mrrForm.attachments.map((file, index) => (
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
      </div>
    </div>
  </div>
);

const ProjectMRR = ({ projectId, projectName, projectNumber }) => {
  const [mrrs, setMrrs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMrr, setSelectedMrr] = useState(null);
  
  // Form state matching the document structure
  const [mrrForm, setMrrForm] = useState({
    // Header Section
    supplier: '',
    shipper: '',
    po_number: '',
    carrier: '',
    shipping_point: '',
    fob_point: '', // 'job_site' or 'shipping_point'
    shipment_type: '', // 'partial' or 'complete'
    charges: '', // 'prepaid' or 'collect'
    freight_bill_no: '',
    date_received: '',
    packing_list_no: '',
    car_no: '',
    weight: '',
    no_of_cartons: '',
    mrr_date: '',
    // RECEIVING INSPECTION Section
    received_by: '',
    received_date: '',
    qc_inspection_required: '', // 'yes', 'no', 'na'
    qc_status: '', // 'hold', 'accepted', 'na'
    qc_documents_received: '', // 'yes', 'no', 'not_required'
    remarks: '',
    // Items Table
    items: [],
    // Footer
    prepared_by: '',
    prepared_date: '',
    // Attachments
    attachments: []
  });
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  const printRef = useRef(null);

  // Optimized input change handler to avoid full re-renders
  const handleInputChange = (field, value) => {
    setMrrForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      const [mrrsRes, statsRes] = await Promise.all([
        api.get(`/mrrs?project_id=${projectId}`, { withCredentials: true }),
        api.get(`/projects/${projectId}/mrr-stats`, { withCredentials: true })
      ]);
      setMrrs(mrrsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading MRRs:', error);
      toast.error('Error al cargar MRRs');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMrrForm({
      supplier: '',
      shipper: '',
      po_number: '',
      carrier: '',
      shipping_point: '',
      fob_point: '',
      shipment_type: '',
      charges: '',
      freight_bill_no: '',
      date_received: moment().format('MM/DD/YYYY'),
      packing_list_no: '',
      car_no: '',
      weight: '',
      no_of_cartons: '',
      mrr_date: moment().format('MM/DD/YYYY'),
      received_by: '',
      received_date: moment().format('MM/DD/YYYY'),
      qc_inspection_required: 'na',
      qc_status: 'na',
      qc_documents_received: 'not_required',
      remarks: '',
      items: [{ po_item: 1, qty_received: 0, item_code: '', size: '', description: '', storage_location: '' }],
      prepared_by: '',
      prepared_date: moment().format('MM/DD/YYYY'),
      attachments: []
    });
  };

  // Handle file upload for MRR attachments
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

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

      setMrrForm(prev => ({
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

  const removeAttachment = (index) => {
    setMrrForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // Item management
  const addItem = () => {
    setMrrForm(prev => ({
      ...prev,
      items: [...prev.items, { 
        po_item: prev.items.length + 1, 
        qty_received: 0, 
        item_code: '', 
        size: '', 
        description: '', 
        storage_location: '' 
      }]
    }));
  };

  const removeItem = (index) => {
    setMrrForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, po_item: i + 1 }))
    }));
  };

  const updateItem = (index, field, value) => {
    setMrrForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleCreateMrr = async (e) => {
    e.preventDefault();
    if (!mrrForm.supplier || !mrrForm.received_by) {
      toast.error('Complete los campos requeridos (Supplier, Received By)');
      return;
    }

    try {
      await api.post('/mrrs', {
        project_id: projectId,
        ...mrrForm
      }, { withCredentials: true });
      
      toast.success('MRR creado exitosamente');
      setCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear MRR');
    }
  };

  const handleUpdateMrr = async (e) => {
    e.preventDefault();
    if (!selectedMrr) return;

    try {
      await api.put(`/mrrs/${selectedMrr.mrr_id}`, mrrForm, { withCredentials: true });
      toast.success('MRR actualizado exitosamente');
      setEditDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar MRR');
    }
  };

  const handleDeleteMrr = async (mrrId) => {
    if (!window.confirm('¿Está seguro de eliminar este MRR?')) return;

    try {
      await api.delete(`/mrrs/${mrrId}`, { withCredentials: true });
      toast.success('MRR eliminado exitosamente');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar MRR');
    }
  };

  const handleStatusChange = async (mrrId, newStatus) => {
    try {
      await api.put(`/mrrs/${mrrId}/status`, { status: newStatus }, { withCredentials: true });
      toast.success(`Estado cambiado a ${statusLabels[newStatus]}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar estado');
    }
  };

  const openEditDialog = (mrr) => {
    setSelectedMrr(mrr);
    setMrrForm({
      supplier: mrr.supplier || mrr.supplier_name || '',
      shipper: mrr.shipper || '',
      po_number: mrr.po_number || '',
      carrier: mrr.carrier || '',
      shipping_point: mrr.shipping_point || '',
      fob_point: mrr.fob_point || '',
      shipment_type: mrr.shipment_type || '',
      charges: mrr.charges || '',
      freight_bill_no: mrr.freight_bill_no || '',
      date_received: mrr.date_received || '',
      packing_list_no: mrr.packing_list_no || '',
      car_no: mrr.car_no || '',
      weight: mrr.weight || '',
      no_of_cartons: mrr.no_of_cartons || '',
      mrr_date: mrr.mrr_date || '',
      received_by: mrr.received_by || '',
      received_date: mrr.received_date || '',
      qc_inspection_required: mrr.qc_inspection_required || 'na',
      qc_status: mrr.qc_status || 'na',
      qc_documents_received: mrr.qc_documents_received || 'not_required',
      remarks: mrr.remarks || '',
      items: mrr.items?.length > 0 ? mrr.items : [{ po_item: 1, qty_received: 0, item_code: '', size: '', description: '', storage_location: '' }],
      prepared_by: mrr.prepared_by || '',
      prepared_date: mrr.prepared_date || '',
      attachments: mrr.attachments || []
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = (mrr) => {
    setSelectedMrr(mrr);
    setViewDialogOpen(true);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('mrr-print-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>MRR - ${selectedMrr?.mrr_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { border-collapse: collapse; width: 100%; }
              td, th { border: 1px solid black; padding: 8px; }
              .bg-gray-200 { background-color: #e5e5e5; }
              .bg-gray-300 { background-color: #d4d4d4; }
              .bg-gray-100 { background-color: #f5f5f5; }
              .font-bold { font-weight: bold; }
              .text-center { text-align: center; }
              .text-lg { font-size: 1.125rem; }
              .text-xl { font-size: 1.25rem; }
              .text-xs { font-size: 0.75rem; }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Filter MRRs
  const filteredMrrs = mrrs.filter(mrr => {
    const matchesSearch = !searchTerm || 
      mrr.mrr_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mrr.supplier || mrr.supplier_name || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mrr.po_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || mrr.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Cargando MRRs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Package className="w-8 h-8 text-slate-400" />
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
                  <p className="text-xs text-slate-500">Pendientes</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Recibidos</p>
                  <p className="text-2xl font-bold">{stats.received}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Inspeccionados</p>
                  <p className="text-2xl font-bold">{stats.inspected}</p>
                </div>
                <ClipboardList className="w-8 h-8 text-blue-400" />
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
              placeholder="Buscar MRR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-64"
              data-testid="mrr-search-input"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40" data-testid="mrr-status-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="received">Recibido</SelectItem>
              <SelectItem value="inspected">Inspeccionado</SelectItem>
              <SelectItem value="rejected">Rechazado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button
          onClick={() => {
            resetForm();
            setCreateDialogOpen(true);
          }}
          className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto"
          data-testid="create-mrr-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo MRR
        </Button>
      </div>

      {/* MRR List */}
      <div className="space-y-4">
        {filteredMrrs.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No hay MRRs {statusFilter !== 'all' ? `con estado "${statusLabels[statusFilter]}"` : ''}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  resetForm();
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer MRR
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredMrrs.map((mrr) => (
            <Card key={mrr.mrr_id} className="border-slate-200 hover:shadow-md transition-shadow" data-testid={`mrr-card-${mrr.mrr_id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-lg">MRR #{mrr.mrr_number}</span>
                      <Badge className={statusColors[mrr.status]}>
                        {statusLabels[mrr.status]}
                      </Badge>
                      {mrr.attachments && mrr.attachments.length > 0 && (
                        <Badge variant="outline" className="text-blue-600">
                          <FileText className="w-3 h-3 mr-1" />
                          {mrr.attachments.length} adjunto(s)
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {mrr.supplier || mrr.supplier_name || 'N/A'}
                      </span>
                      {mrr.po_number && (
                        <span className="flex items-center gap-1">
                          <ClipboardList className="w-3 h-3" />
                          PO: {mrr.po_number}
                        </span>
                      )}
                      {mrr.carrier && (
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          {mrr.carrier}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {mrr.date_received || moment(mrr.created_at).format('MM/DD/YYYY')}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Recibido: {mrr.received_by}
                      </span>
                      {(mrr.items?.length > 0) && (
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {mrr.items.length} item(s)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openViewDialog(mrr)}
                      data-testid={`view-mrr-${mrr.mrr_id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(mrr)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {mrr.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(mrr.mrr_id, 'pending')}>
                            <Clock className="w-4 h-4 mr-2" />
                            Marcar Pendiente
                          </DropdownMenuItem>
                        )}
                        {mrr.status === 'pending' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(mrr.mrr_id, 'received')}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Marcar Recibido
                          </DropdownMenuItem>
                        )}
                        {mrr.status === 'received' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(mrr.mrr_id, 'inspected')}>
                            <ClipboardList className="w-4 h-4 mr-2" />
                            Marcar Inspeccionado
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDeleteMrr(mrr.mrr_id)}
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

      {/* Create MRR Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Nuevo Material Receiving Report (MRR)</DialogTitle>
            <DialogDescription>
              Complete el formulario para crear un nuevo MRR
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMrr}>
            <MRRFormFields 
              mrrForm={mrrForm}
              handleInputChange={handleInputChange}
              updateItem={updateItem}
              addItem={addItem}
              removeItem={removeItem}
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              uploadingFile={uploadingFile}
              removeAttachment={removeAttachment}
            />
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" data-testid="submit-create-mrr">
                Crear MRR
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit MRR Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Editar MRR #{selectedMrr?.mrr_number}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateMrr}>
            <MRRFormFields 
              mrrForm={mrrForm}
              handleInputChange={handleInputChange}
              updateItem={updateItem}
              addItem={addItem}
              removeItem={removeItem}
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              uploadingFile={uploadingFile}
              removeAttachment={removeAttachment}
            />
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View MRR Dialog - Document Style */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center justify-between">
              <span className="flex items-center gap-3">
                MRR #{selectedMrr?.mrr_number}
                <Badge className={statusColors[selectedMrr?.status]}>
                  {statusLabels[selectedMrr?.status]}
                </Badge>
              </span>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedMrr && (
            <div id="mrr-print-content">
              <MRRDocument mrr={selectedMrr} projectName={projectName} />
            </div>
          )}

          {/* Attachments if any */}
          {selectedMrr?.attachments && selectedMrr.attachments.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documentos Adjuntos
              </h4>
              <div className="space-y-2">
                {selectedMrr.attachments.map((file, index) => (
                  <a 
                    key={index}
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    {file.name}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectMRR;
