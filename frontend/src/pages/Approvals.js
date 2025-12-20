import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { CheckCircle, XCircle, Clock, DollarSign, FileText, User } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const Approvals = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState({});

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      const response = await api.get('/approvals');
      setApprovals(response.data);
    } catch (error) {
      toast.error('Error al cargar aprobaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id, status) => {
    try {
      await api.put(`/approvals/${id}`, { status, notes: reviewNotes[id] || '' });
      toast.success(status === 'approved' ? 'Aprobado' : 'Rechazado');
      loadApprovals();
    } catch (error) {
      toast.error('Error al procesar');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'purchase_order': return <FileText className="w-5 h-5" />;
      case 'expense': return <DollarSign className="w-5 h-5" />;
      case 'overtime': return <Clock className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeName = (type) => {
    switch (type) {
      case 'purchase_order': return 'Orden de Compra';
      case 'expense': return 'Gasto';
      case 'overtime': return 'Tiempo Extra';
      default: return type;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const pending = approvals.filter(a => a.status === 'pending');
  const processed = approvals.filter(a => a.status !== 'pending');

  if (loading) return <Layout><div className="p-8">Cargando...</div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Aprobaciones</h1>

        {pending.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                Pendientes ({pending.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pending.map(approval => (
                <div key={approval.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(approval.type)}
                      <div>
                        <p className="font-medium">{getTypeName(approval.type)}</p>
                        <p className="text-sm text-slate-500">{approval.reference_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${approval.amount?.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{moment(approval.requested_at).fromNow()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User className="w-4 h-4" />
                    <span>Solicitado por: {approval.requested_by_name}</span>
                  </div>
                  {approval.notes && <p className="text-sm bg-slate-50 p-2 rounded">{approval.notes}</p>}
                  <Textarea
                    placeholder="Notas de revisión (opcional)"
                    value={reviewNotes[approval.id] || ''}
                    onChange={(e) => setReviewNotes({...reviewNotes, [approval.id]: e.target.value})}
                    className="h-16"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => handleApproval(approval.id, 'approved')} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" /> Aprobar
                    </Button>
                    <Button onClick={() => handleApproval(approval.id, 'rejected')} variant="destructive">
                      <XCircle className="w-4 h-4 mr-2" /> Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {pending.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300" />
              <p>No hay aprobaciones pendientes</p>
            </CardContent>
          </Card>
        )}

        {processed.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {processed.slice(0, 20).map(approval => (
                  <div key={approval.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(approval.type)}
                      <div>
                        <p className="font-medium">{approval.reference_name}</p>
                        <p className="text-xs text-slate-500">{moment(approval.reviewed_at).format('DD/MM/YY HH:mm')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono">${approval.amount?.toLocaleString()}</span>
                      {getStatusBadge(approval.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Approvals;
