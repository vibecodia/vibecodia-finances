import React, { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

type ImageUploadProps = {
  onUploadSuccess: (imageUrl: string) => void;
  onUploadError?: (error: string) => void;
  onReceiptDetected?: (data: { description: string; amount: number; date: string }) => void;
};

const ImageUpload: React.FC<ImageUploadProps> = ({ onUploadSuccess, onUploadError, onReceiptDetected }) => {
  const { theme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'scanning'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const scanQRCode = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) return resolve(null);

          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0);

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          // @ts-ignore - jsQR is loaded via CDN in index.html
          const code = window.jsQR ? window.jsQR(imageData.data, imageData.width, imageData.height) : null;
          
          resolve(code ? code.data : null);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('scanning');
    setErrorMessage('');

    const pin = Cookies.get('pin_code') || '';

    try {
      // 1. Tentar detectar QR Code primeiro
      const qrUrl = await scanQRCode(file);
      
      if (qrUrl && (qrUrl.includes('fazenda') || qrUrl.includes('sefaz'))) {
        console.log('QR Code detectado:', qrUrl);
        setIsScanning(true);
        try {
          const receiptResponse = await axios.get(`/api/fetch-receipt-data?url=${encodeURIComponent(qrUrl)}`, {
            headers: { 'x-pin': pin }
          });
          if (receiptResponse.data.success && onReceiptDetected) {
            onReceiptDetected(receiptResponse.data.data);
          }
        } catch (err) {
          console.warn('Falha ao buscar dados da SEFAZ, mas seguindo com upload da imagem.');
        } finally {
          setIsScanning(false);
        }
      }

      // 2. Fazer o upload normal da imagem
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-pin': pin
        }
      });

      setUploadStatus('success');
      onUploadSuccess(response.data.imageUrl);
    } catch (error: any) {
      setUploadStatus('error');
      const msg = error.response?.data?.error || 'Erro ao processar imagem. Tente novamente.';
      setErrorMessage(msg);
      onUploadError?.(msg);
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
            <span className="mt-2 text-sm text-text">
              {uploadStatus === 'scanning' ? 'Lendo QR Code...' : 'Enviando imagem...'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-8 h-8 text-primary" />
            <span className="mt-2 text-sm text-text">Faça o upload de Recibos de Compras</span>
            <span className="text-xs text-text opacity-70">Detectamos automaticamente dados de SP, PR e SC</span>
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

      {isScanning && (
        <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Buscando detalhes na SEFAZ...</span>
        </div>
      )}

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