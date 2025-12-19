import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Plus, Trash2, FileText } from 'lucide-react';

const DocumentsTab = ({
  documentsFromClient,
  documentsToClient,
  newDocFromClient,
  setNewDocFromClient,
  newDocToClient,
  setNewDocToClient,
  handleAddDocFromClient,
  handleAddDocToClient,
  handleDeleteDoc
}) => {
  return (
    <div className="space-y-6">
      {/* Documents FROM Client */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documentos que el Cliente Debe Enviar
          </CardTitle>
          <CardDescription>
            Lista de documentos requeridos del cliente para iniciar el proyecto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Ej: Permiso de Construcción"
              value={newDocFromClient}
              onChange={(e) => setNewDocFromClient(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDocFromClient()}
            />
            <Button onClick={handleAddDocFromClient}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>
          
          {documentsFromClient.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No hay documentos configurados</p>
          ) : (
            <ul className="space-y-2">
              {documentsFromClient.map((doc) => (
                <li key={doc.document_id} className="flex items-center justify-between p-3 border rounded hover:bg-slate-50">
                  <span>{doc.document_name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteDoc(doc.document_id, 'from')}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Documents TO Client */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documentos que Debo Enviar al Cliente
          </CardTitle>
          <CardDescription>
            Lista de documentos que debes entregar al cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Ej: Propuesta de Proyecto"
              value={newDocToClient}
              onChange={(e) => setNewDocToClient(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDocToClient()}
            />
            <Button onClick={handleAddDocToClient}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>
          
          {documentsToClient.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No hay documentos configurados</p>
          ) : (
            <ul className="space-y-2">
              {documentsToClient.map((doc) => (
                <li key={doc.document_id} className="flex items-center justify-between p-3 border rounded hover:bg-slate-50">
                  <span>{doc.document_name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteDoc(doc.document_id, 'to')}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentsTab;
