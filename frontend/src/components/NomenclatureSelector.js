import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { getBackendUrl } from '../utils/api';

const API_URL = getBackendUrl();

export const useNomenclature = (onNumberGenerated) => {
  const [nomenclatures, setNomenclatures] = useState([]);
  const [selectedNomenclature, setSelectedNomenclature] = useState('');
  const [generatedNumber, setGeneratedNumber] = useState('');

  useEffect(() => {
    loadNomenclatures();
  }, []);

  const loadNomenclatures = async () => {
    try {
      console.log('Loading nomenclatures from:', `${API_URL}/api/nomenclatures`);
      const response = await axios.get(`${API_URL}/api/nomenclatures`, { withCredentials: true });
      console.log('Nomenclatures loaded:', response.data);
      setNomenclatures(response.data || []);
    } catch (error) {
      console.error('Error loading nomenclatures:', error);
    }
  };

  const handleSelectNomenclature = async (nomenclatureId) => {
    if (!nomenclatureId) {
      setSelectedNomenclature('');
      setGeneratedNumber('');
      onNumberGenerated && onNumberGenerated('');
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/api/nomenclatures/next-number/${nomenclatureId}`, {
        withCredentials: true
      });
      setSelectedNomenclature(nomenclatureId);
      setGeneratedNumber(response.data.number);
      onNumberGenerated && onNumberGenerated(response.data.number);
    } catch (error) {
      toast.error('Error al generar número');
    }
  };

  return {
    nomenclatures,
    selectedNomenclature,
    generatedNumber,
    handleSelectNomenclature
  };
};

const NomenclatureSelector = ({ nomenclatures = [], selectedNomenclature, generatedNumber, onSelect, label = "Nomenclatura" }) => {
  console.log('NomenclatureSelector render, nomenclatures:', nomenclatures);
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>{label}</Label>
        <select 
          className="w-full border rounded px-3 py-2"
          value={selectedNomenclature}
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="">Manual (sin nomenclatura)</option>
          {Array.isArray(nomenclatures) && nomenclatures.map(n => (
            <option key={n.nomenclature_id} value={n.nomenclature_id}>
              {n.name} ({n.prefix}{n.department_number ? `-${n.department_number}` : ''})
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Número Generado</Label>
        <Input value={generatedNumber} disabled placeholder="Se generará automáticamente" />
      </div>
    </div>
  );
};

export default NomenclatureSelector;
