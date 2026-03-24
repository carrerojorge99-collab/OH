import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Pen, Trash2, Check, X } from 'lucide-react';

const SignaturePad = ({ 
  isOpen, 
  onClose, 
  onSave, 
  signerName: initialSignerName = '',
  existingSignature = null 
}) => {
  const sigCanvas = useRef(null);
  const [signerName, setSignerName] = useState(initialSignerName);
  const [isEmpty, setIsEmpty] = useState(true);

  const clear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
    }
  };

  const handleEnd = () => {
    if (sigCanvas.current) {
      setIsEmpty(sigCanvas.current.isEmpty());
    }
  };

  const save = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      // Use toDataURL directly instead of getTrimmedCanvas due to compatibility issues
      const signatureData = sigCanvas.current.toDataURL('image/png');
      onSave({
        signature_data: signatureData,
        signer_name: signerName
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="w-5 h-5 text-orange-500" />
            Firmar Daily Log
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Signer Name */}
          <div>
            <Label htmlFor="signer-name">Nombre del firmante</Label>
            <Input
              id="signer-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Ingrese su nombre completo"
              className="mt-1"
              data-testid="signer-name-input"
            />
          </div>

          {/* Signature Canvas */}
          <div>
            <Label>Dibuje su firma</Label>
            <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg bg-white relative">
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                canvasProps={{
                  width: 450,
                  height: 200,
                  className: 'signature-canvas rounded-lg',
                  style: { width: '100%', height: '200px' }
                }}
                onEnd={handleEnd}
              />
              {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-gray-400 text-sm">Firme aquí con el mouse o dedo</p>
                </div>
              )}
            </div>
          </div>

          {/* Clear Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clear}
            className="w-full"
            data-testid="clear-signature-btn"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpiar firma
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="cancel-signature-btn">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={save} 
            disabled={isEmpty || !signerName.trim()}
            className="bg-orange-500 hover:bg-orange-600"
            data-testid="save-signature-btn"
          >
            <Check className="w-4 h-4 mr-2" />
            Guardar Firma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignaturePad;
