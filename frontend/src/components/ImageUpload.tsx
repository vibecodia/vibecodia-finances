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
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl) return;

    setIsScanning(true);
    const pin = Cookies.get('pin_code') || '';
    
    try {
      const receiptResponse = await axios.get(`/api/fetch-receipt-data?url=${encodeURIComponent(manualUrl)}`, {
        headers: { 'x-pin': pin }
      });
      if (receiptResponse.data.success && onReceiptDetected) {
        onReceiptDetected(receiptResponse.data.data);
        setShowManualInput(false);
        setManualUrl('');
      }
    } catch (err) {
      console.error('Manual fetch error:', err);
      alert('Não foi possível ler este link. Verifique se a URL está correta.');
    } finally {
      setIsScanning(false);
    }
  };

  const scanQRCode = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          console.log(`📸 Iniciando processamento de imagem: ${img.width}x${img.height}`);

          // 1. Tentar usar a API nativa do Navegador (BarcodeDetector) - Primeira tentativa (Original)
          // @ts-ignore
          if ('BarcodeDetector' in window) {
            try {
              // @ts-ignore
              const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await detector.detect(img);
              if (barcodes.length > 0) {
                console.log('✅ QR Code detectado via API Nativa (Original)');
                return resolve(barcodes[0].rawValue);
              }
            } catch (err) {
              console.warn('BarcodeDetector error:', err);
            }
          } else {
            console.log('ℹ️ BarcodeDetector não disponível neste navegador.');
          }

          // 2. Preparar Canvas para processamento de imagem
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) return resolve(null);

          // Redimensionar para um "sweet spot" (evita que o jsQR se perca em pixels demais)
          const MAX_SIZE = 2000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          
          // Aplicar filtros de imagem para melhorar o contraste do QR Code
          context.filter = 'grayscale(100%) contrast(150%) brightness(110%)';
          context.drawImage(img, 0, 0, width, height);

          // 3. Tentar API Nativa novamente com a imagem melhorada
          // @ts-ignore
          if ('BarcodeDetector' in window) {
            try {
              // @ts-ignore
              const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await detector.detect(canvas);
              if (barcodes.length > 0) {
                console.log('✅ QR Code detectado via API Nativa (Processada)');
                return resolve(barcodes[0].rawValue);
              }
            } catch (err) {}
          }

          // 4. Fallback final para jsQR com a imagem processada
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          // @ts-ignore - jsQR is loaded via CDN in index.html
          const code = window.jsQR ? window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          }) : null;
          
          if (code) {
            console.log('✅ QR Code detectado via jsQR');
            resolve(code.data);
          } else {
            console.log('❌ Nenhum QR Code encontrado após múltiplas tentativas.');
            resolve(null);
          }
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

      <div className="pt-2 text-center">
        {!showManualInput ? (
          <button 
            type="button"
            onClick={() => setShowManualInput(true)}
            className="text-xs text-primary hover:underline"
          >
            Não conseguiu escanear? Clique aqui para colar o link.
          </button>
        ) : (
          <div className="space-y-2 text-left">
            <input 
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://www.nfce.fazenda.sp.gov.br..."
              className="w-full p-2 text-xs rounded-lg border focus:ring-1 focus:ring-primary focus:outline-none"
              style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
              required
            />
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleManualSubmit(e);
                }}
                disabled={isScanning || !manualUrl}
                className="flex-1 p-2 text-xs bg-primary text-white rounded-lg hover:bg-secondary disabled:opacity-50"
              >
                {isScanning ? 'Processando...' : 'Ler Link'}
              </button>
              <button 
                type="button"
                onClick={() => setShowManualInput(false)}
                className="p-2 text-xs bg-cardBorder text-text rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;