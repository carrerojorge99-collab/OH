/**
 * CloudinaryUpload Component
 * Reusable component for uploading images to Cloudinary
 */
import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '../utils/cloudinary';
import { toast } from 'sonner';

const CloudinaryUpload = ({
  onUploadComplete,
  folder = 'uploads',
  currentImage = null,
  label = 'Subir imagen',
  accept = 'image/*',
  maxSizeMB = 10,
  className = '',
  showPreview = true,
  previewSize = 'md' // sm, md, lg
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const fileInputRef = useRef(null);

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-48 h-48'
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`El archivo es muy grande. Máximo ${maxSizeMB}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    try {
      const result = await uploadImage(file, folder);
      
      // Update preview with Cloudinary URL
      setPreview(result.secure_url);
      
      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes
        });
      }
      
      toast.success('Imagen subida exitosamente');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir imagen');
      setPreview(currentImage); // Revert to original
    } finally {
      setUploading(false);
      // Clean up local preview URL
      URL.revokeObjectURL(localPreview);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onUploadComplete) {
      onUploadComplete(null);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Preview Area */}
      {showPreview && (
        <div className={`relative ${sizeClasses[previewSize]} rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden`}>
          {preview ? (
            <>
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
              {!uploading && (
                <button
                  onClick={handleRemove}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  type="button"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </>
          ) : (
            <ImageIcon className="w-8 h-8 text-slate-400" />
          )}
          
          {/* Loading overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {label}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CloudinaryUpload;
