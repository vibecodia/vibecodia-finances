import React, { useState, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

type ImageUploadProps = {
  onUploadError?: (error: string) => void;
  onReceiptDetected?: (data: { description: string; amount: number; date: string }) => void;
};

const ImageUpload: React.FC<ImageUploadProps> = ({ onUploadError, onReceiptDetected }) => {
  const { theme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  const toggleManualInput = () => {
    setShowManualInput(true);
    // Pequeno delay para garantir que o elemento foi montado no DOM
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl) return;

    setIsScanning(true);
    setStatus('idle');
    const pin = Cookies.get('pin_code') || '';
    
    try {
      const receiptResponse = await axios.get(`/api/fetch-receipt-data?url=${encodeURIComponent(manualUrl)}`, {
        headers: { 'x-pin': pin }
      });
      if (receiptResponse.data.success && onReceiptDetected) {
        onReceiptDetected(receiptResponse.data.data);
        setShowManualInput(false);
        setManualUrl('');
        setStatus('success');
      }
    } catch (err) {
      console.error('Manual fetch error:', err);
      setErrorMessage('Não foi possível ler este link. Verifique a URL.');
      setStatus('error');
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
          // 1. BarcodeDetector (Nativa)
          // @ts-ignore
          if ('BarcodeDetector' in window) {
            try {
              // @ts-ignore
              const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await detector.detect(img);
              if (barcodes.length > 0) return resolve(barcodes[0].rawValue);
            } catch (err) {}
          }

          // 2. jsQR com Canvas Processado
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) return resolve(null);

          const MAX_SIZE = 2000;
          let width = img.width;
          let height = img.height;
          if (width > MAX_SIZE || height > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
            width *= ratio; height *= ratio;
          }

          canvas.width = width; canvas.height = height;
          context.filter = 'grayscale(100%) contrast(150%)';
          context.drawImage(img, 0, 0, width, height);

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          // @ts-ignore
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

    setIsProcessing(true);
    setStatus('idle');
    setErrorMessage('');

    const pin = Cookies.get('pin_code') || '';

    try {
      const qrUrl = await scanQRCode(file);
      
      if (qrUrl && (qrUrl.includes('fazenda') || qrUrl.includes('sefaz'))) {
        setIsScanning(true);
        try {
          const receiptResponse = await axios.get(`/api/fetch-receipt-data?url=${encodeURIComponent(qrUrl)}`, {
            headers: { 'x-pin': pin }
          });
          if (receiptResponse.data.success && onReceiptDetected) {
            onReceiptDetected(receiptResponse.data.data);
            setStatus('success');
          }
        } catch (err) {
          throw new Error('QR Code detectado, mas falha ao buscar dados na SEFAZ.');
        } finally {
          setIsScanning(false);
        }
      } else {
        throw new Error('Nenhum QR Code de Nota Fiscal detectado nesta imagem.');
      }
    } catch (error: any) {
      setStatus('error');
      const msg = error.message || 'Erro ao processar imagem.';
      setErrorMessage(msg);
      onUploadError?.(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer"
        style={{ 
          borderColor: theme.cardBorder,
          backgroundColor: theme.cardBackground
        }}>
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="mt-2 text-sm text-text">
              {isScanning ? 'Buscando dados na SEFAZ...' : 'Lendo imagem...'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <Upload className="w-8 h-8 text-primary" />
            <span className="mt-2 text-sm text-text font-medium">Capturar Nota Fiscal (QR Code)</span>
            <span className="text-xs text-text opacity-70">Apenas lemos os dados, não salvamos a imagem</span>
          </div>
        )}
        <input 
          type="file" 
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
      </label>

      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-success justify-center">
          <CheckCircle className="w-4 h-4" />
          <span>Dados extraídos com sucesso!</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-1 text-sm text-error text-center">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="pt-1 text-center">
        {!showManualInput ? (
          <button 
            type="button"
            onClick={toggleManualInput}
            className="text-[10px] text-primary hover:underline opacity-80"
          >
            Não conseguiu ler a foto? Colar link manualmente
          </button>
        ) : (
          <div className="space-y-2 mt-2 p-3 rounded-lg border border-dashed" style={{ borderColor: theme.cardBorder }}>
            <input 
              ref={inputRef}
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="Cole aqui a URL da Nota Fiscal..."
              className="w-full p-2 text-xs rounded-lg border focus:ring-1 focus:ring-primary focus:outline-none"
              style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
            />
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={handleManualSubmit}
                disabled={isScanning || !manualUrl}
                className="flex-1 p-2 text-xs bg-primary text-white rounded-lg hover:bg-secondary disabled:opacity-50"
              >
                {isScanning ? 'Processando...' : 'Processar Link'}
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