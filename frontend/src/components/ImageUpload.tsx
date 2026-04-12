import axios from 'axios';
import Cookies from 'js-cookie';
import { Upload, Loader2, CheckCircle, Camera, Link as LinkIcon, AlertCircle } from 'lucide-react';
import React, { useState, useRef } from 'react';

import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

import QRScanner from './QRScanner';

type ImageUploadProps = {
  onUploadError?: (error: string) => void;
  onReceiptDetected?: (data: { description: string; amount: number; date: string }) => void;
};

const ImageUpload: React.FC<ImageUploadProps> = ({ onUploadError, onReceiptDetected }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  const processQRUrl = async (qrUrl: string) => {
    if (qrUrl && (qrUrl.includes('fazenda') || qrUrl.includes('sefaz'))) {
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
    <div className="space-y-4">
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

      <div className="grid grid-cols-2 gap-3">
        <Button 
          type="button"
          onClick={() => setIsLiveScanning(true)}
          variant="outline"
          className="h-auto py-6 flex flex-col gap-2 border-dashed border-2"
        >
          <Camera className="w-8 h-8 text-primary" />
          <div className="text-center">
            <span className="block text-sm font-black uppercase tracking-tight">Escanear ao vivo</span>
            <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Abre a câmera</span>
          </div>
        </Button>

        <label className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isProcessing}
          />
          <Card className="h-full py-6 flex flex-col items-center justify-center gap-2 border-dashed border-2 cursor-pointer hover:bg-card/50 transition-all">
            {isProcessing ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-primary" />
            )}
            <div className="text-center">
              <span className="block text-sm font-black uppercase tracking-tight">Galeria / Foto</span>
              <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Subir imagem</span>
            </div>
          </Card>
        </label>
      </div>

      {!showManualInput ? (
        <Button
          onClick={() => setShowManualInput(true)}
          variant="ghost"
          size="sm"
          className="w-full text-[10px] font-black uppercase tracking-widest opacity-60"
        >
          <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
          Colar link da nota fiscal (URL)
        </Button>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          <Input
            ref={inputRef}
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Cole o link da nota aqui..."
            className="text-xs py-2"
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1" disabled={isProcessing || !manualUrl}>
              {isProcessing ? 'Buscando...' : 'Buscar Nota'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowManualInput(false);
                setManualUrl('');
                setStatus('idle');
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 animate-in zoom-in-95 duration-200">
          <CheckCircle className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Nota Fiscal detectada com sucesso!</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 animate-in shake duration-300">
          <AlertCircle className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;