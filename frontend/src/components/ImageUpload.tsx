import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

type ImageUploadProps = {
  onUploadSuccess: (imageUrl: string) => void;
  onUploadError?: (error: string) => void;
};

const ImageUpload: React.FC<ImageUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const { theme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadStatus('success');
      onUploadSuccess(response.data.imageUrl);
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage('Erro ao enviar imagem. Tente novamente.');
      onUploadError?.('Erro ao enviar imagem');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer"
        style={{ 
          borderColor: theme.cardBorder,
          backgroundColor: theme.cardBackground
        }}>
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="mt-2 text-sm text-text">Enviando imagem...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-8 h-8 text-primary" />
            <span className="mt-2 text-sm text-text">Faça o upload de Recibos de Compras</span>
            <span className="text-xs text-text opacity-70">Formatos suportados: JPG, PNG</span>
          </div>
        )}
        <input 
          type="file" 
          className="hidden" 
          accept="image/jpeg, image/png"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>

      {uploadStatus === 'success' && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle className="w-4 h-4" />
          <span>Imagem enviada com sucesso!</span>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="flex items-center gap-2 text-sm text-error">
          <XCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;