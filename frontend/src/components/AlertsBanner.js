import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, DollarSign, FileText, CheckCircle, X } from 'lucide-react';

const AlertsBanner = () => {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await api.get('/alerts');
      setAlerts(response.data);
    } catch (error) {
      console.error('Error loading alerts');
    }
  };

  const dismiss = (index) => {
    setDismissed([...dismissed, index]);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'budget': return <DollarSign className="w-4 h-4" />;
      case 'invoice': return <FileText className="w-4 h-4" />;
      case 'approval': return <CheckCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const visibleAlerts = alerts.filter((_, i) => !dismissed.includes(i));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visibleAlerts.map((alert, index) => (
        <div
          key={index}
          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${getColor(alert.severity)}`}
          onClick={() => alert.link && navigate(alert.link)}
        >
          <div className="flex items-center gap-3">
            {getIcon(alert.type)}
            <div>
              <p className="font-medium text-sm">{alert.title}</p>
              <p className="text-xs opacity-80">{alert.message}</p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(index); }}
            className="p-1 hover:bg-white/50 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertsBanner;
