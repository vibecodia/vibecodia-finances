import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Loader2, CheckCircle, XCircle, Camera } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

type QRCodeScannerProps = {
  onScanSuccess: (data: string) => void;
  onScanError?: (error: string) => void;
};

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScanSuccess, onScanError }) => {
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const readerRef = useRef<BrowserMultiFormatReader>();
  const controlsRef = useRef<IScannerControls>();
  const hasScannedRef = useRef(false); // Flag para evitar múltiplas leituras

  useEffect(() => {
    if (!isScanning || !videoRef.current) return;

    const startScanning = async () => {
      try {
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        hasScannedRef.current = false; // Reset da flag

        const video = videoRef.current!;
        
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          video,
          (result, err) => {
            // Se já escaneou, ignora
            if (hasScannedRef.current) return;

            if (result) {
              hasScannedRef.current = true; // Marca como escaneado
              setStatus('success');
              
              // Para o scanner imediatamente
              controlsRef.current?.stop();
              setIsScanning(false);
              
              // Chama o callback após um pequeno delay para garantir que parou
              setTimeout(() => {
                onScanSuccess(result.getText());
              }, 100);
            }

            if (err && !err.name.includes('NotFoundException')) {
              console.error('QR Scanner Error:', err);
              setStatus('error');
              setErrorMessage(err?.message || 'Erro desconhecido');
              controlsRef.current?.stop();
              setIsScanning(false);
              onScanError?.(err?.message || 'Erro desconhecido');
            }
          }
        );

        controlsRef.current = controls;

        video.addEventListener('loadedmetadata', () => {
          console.log('Video metadata loaded:', video.videoWidth, video.videoHeight);
        });

      } catch (err: any) {
        console.error('Erro ao iniciar scanner:', err);
        setStatus('error');
        setErrorMessage(err?.message || 'Erro ao acessar a câmera');
        setIsScanning(false);
        onScanError?.(err?.message || 'Erro ao acessar a câmera');
      }
    };

    const timer = setTimeout(startScanning, 100);

    return () => {
      clearTimeout(timer);
      controlsRef.current?.stop();
      hasScannedRef.current = false;
    };
  }, [isScanning, onScanSuccess, onScanError]);

  const handleStartScan = () => {
    setIsScanning(true);
    setStatus('idle');
    setErrorMessage('');
    hasScannedRef.current = false; // Reset da flag
  };

  const handleStopScan = () => {
    setIsScanning(false);
    controlsRef.current?.stop();
    hasScannedRef.current = false;
  };

  const handleScanAgain = () => {
    setStatus('idle');
    setErrorMessage('');
    handleStartScan();
  };

  return (
    <div className="space-y-2">
      {!isScanning && status !== 'success' ? (
        <button
          onClick={handleStartScan}
          className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition hover:bg-opacity-50"
          style={{
            borderColor: theme.cardBorder,
            backgroundColor: theme.cardBackground
          }}
        >
          <Camera className="w-8 h-8 text-primary" />
          <span className="mt-2 text-sm text-text">Ler QR Code com a Câmera</span>
          <span className="text-xs text-text opacity-70">Aponte para o código para capturar</span>
        </button>
      ) : isScanning ? (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              style={{ width: '100%', minHeight: '200px' }}
              className="rounded-lg bg-black"
              muted
              autoPlay
              playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Loader2 className="w-8 h-8 animate-spin text-primary bg-white bg-opacity-70 rounded-full p-1" />
            </div>
          </div>
          
          <button
            onClick={handleStopScan}
            className="w-full px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Parar Scanner
          </button>
        </div>
      ) : null}

      {status === 'success' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>QR Code lido com sucesso!</span>
          </div>
          <button
            onClick={handleScanAgain}
            className="w-full px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Escanear Novamente
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <XCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={handleScanAgain}
            className="w-full px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
};

export default QRCodeScanner;