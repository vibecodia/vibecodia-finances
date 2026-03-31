import axios from 'axios';
import Cookies from 'js-cookie';
import { Upload, Loader2, CheckCircle, XCircle, Camera } from 'lucide-react';
import React, { useState, useRef } from 'react';

import { useTheme } from '../contexts/ThemeContext';

import QRScanner from './QRScanner';

type ImageUploadProps = {
  onUploadError?: (error: string) => void;
  onReceiptDetected?: (data: { description: string; amount: number; date: string }) => void;
};

const ImageUpload: React.FC<ImageUploadProps> = ({ onUploadError, onReceiptDetected }) => {
  const { theme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
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

  const processQRUrl = async (qrUrl: string) => {
    if (qrUrl && (qrUrl.includes('fazenda') || qrUrl.includes('sefaz'))) {
      setIsScanning(true);
      const pin = Cookies.get('pin_code') || '';
      try {
        const receiptResponse = await axios.get(`/api/fetch-receipt-data?url=${encodeURIComponent(qrUrl)}`, {
          headers: { 'x-pin': pin }
        });
        if (receiptResponse.data.success && onReceiptDetected) {
          onReceiptDetected(receiptResponse.data.data);
          setStatus('success');
          return true;
        }
      } catch (err) {
        throw new Error('QR Code detectado, mas falha ao buscar dados na SEFAZ.');
      } finally {
        setIsScanning(false);
      }
    } else {
      throw new Error('Nenhum QR Code de Nota Fiscal detectado.');
    }
    return false;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl) return;

    setStatus('idle');
    try {
      const success = await processQRUrl(manualUrl);
      if (success) {
        setShowManualInput(false);
        setManualUrl('');
      }
    } catch (err: any) {
      console.error('Manual fetch error:', err);
      setErrorMessage(err.message || 'Não foi possível ler este link. Verifique a URL.');
      setStatus('error');
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
            } catch (_err) {
              // intencional
            }
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

    try {
      const qrUrl = await scanQRCode(file);
      if (qrUrl) {
        await processQRUrl(qrUrl);
      } else {
        throw new Error('Nenhum QR Code detectado nesta imagem.');
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

  const handleLiveScan = async (data: string) => {
    setIsLiveScanning(false);
    setIsProcessing(true);
    setStatus('idle');
    setErrorMessage('');
    
    try {
      await processQRUrl(data);
    } catch (error: any) {
      setStatus('error');
      const msg = error.message || 'Erro ao processar QR Code.';
      setErrorMessage(msg);
      onUploadError?.(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      {isLiveScanning && (
        <QRScanner 
          onScan={handleLiveScan} 
          onClose={() => setIsLiveScanning(false)}
          onError={(err) => {
            setErrorMessage(err);
            setStatus('error');
            setIsLiveScanning(false);
          }}
        />
      )}

      <div className="flex gap-2">
        <button 
          type="button"
          onClick={() => setIsLiveScanning(true)}
          className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-all hover:opacity-80 active:scale-95"
          style={{ 
            borderColor: theme.cardBorder,
            backgroundColor: theme.cardBackground
          }}
        >
          <Camera className="w-8 h-8 text-primary" />
          <span className="mt-2 text-sm text-text font-medium">Escanear ao vivo</span>
          <span className="text-xs text-text opacity-70">Abre a câmera agora</span>
        </button>

        <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:opacity-80 active:scale-95"
          style={{ 
            borderColor: theme.cardBorder,
            backgroundColor: theme.cardBackground
          }}>
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="mt-2 text-sm text-text">
                {isScanning ? 'Lendo SEFAZ...' : 'Lendo...'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <Upload className="w-8 h-8 text-primary" />
              <span className="mt-2 text-sm text-text font-medium">Foto da Galeria</span>
              <span className="text-xs text-text opacity-70">Detectar na foto</span>
            </div>
          )}
          <input 
            type="file" 
            className="hidden" 
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>
      </div>

      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-success justify-center p-2 rounded-lg bg-success/10 border border-success/20">
          <CheckCircle className="w-4 h-4" />
          <span>Dados extraídos com sucesso!</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-1 text-sm text-error text-center p-2 rounded-lg bg-error/10 border border-error/20">
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
            Não conseguiu ler? Colar link manualmente
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
                className="flex-1 p-2 text-xs bg-primary text-white rounded-lg hover:bg-secondary disabled:opacity-50 transition-colors"
              >
                {isScanning ? 'Processando...' : 'Processar Link'}
              </button>
              <button 
                type="button"
                onClick={() => setShowManualInput(false)}
                className="p-2 text-xs rounded-lg transition-colors"
                style={{ backgroundColor: theme.cardBorder, color: theme.text }}
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