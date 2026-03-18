import { X, Camera, RefreshCw } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { useTheme } from '../contexts/ThemeContext';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    jsQR: any;
  }
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, onError }) => {
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();

  const stopScanner = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startScanner = async () => {
    setIsInitializing(true);
    setCameraError(null);
    
    try {
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        await videoRef.current.play();
        
        requestAnimationFrame(tick);
      }
      setIsInitializing(false);
    } catch (err: any) {
      console.error('Erro ao acessar a câmera:', err);
      const msg = err.name === 'NotAllowedError' 
        ? 'Permissão de câmera negada. Por favor, habilite o acesso.' 
        : 'Não foi possível acessar a câmera.';
      setCameraError(msg);
      onError?.(msg);
      setIsInitializing(false);
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = videoRef.current.videoHeight;
      canvas.width = videoRef.current.videoWidth;
      
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      const code = window.jsQR ? window.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      }) : null;

      if (code && code.data) {
        onScan(code.data);
        return; // Stop the loop once a code is found
      }
    }
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 text-white backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <span className="font-medium">Escanear QR Code</span>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera View */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black z-10">
            <RefreshCw className="w-10 h-10 text-primary animate-spin mb-4" />
            <p>Iniciando câmera...</p>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black z-10 p-6 text-center">
            <X className="w-12 h-12 text-red-500 mb-4" />
            <p className="mb-4 text-lg">{cameraError}</p>
            <button 
              onClick={startScanner}
              className="px-6 py-2 rounded-full font-medium"
              style={{ backgroundColor: theme.primary }}
            >
              Tentar Novamente
            </button>
          </div>
        )}

        <video 
          ref={videoRef} 
          className="h-full w-full object-cover"
        />
        
        {/* Scanning UI Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative w-64 h-64 border-2 border-primary/50 rounded-lg">
            {/* Animated Scanning Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/60 animate-scan shadow-[0_0_10px_#10b981]"></div>
            
            {/* Corner Borders */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-sm"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-sm"></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-sm"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-sm"></div>
          </div>
          <p className="mt-8 px-4 py-2 bg-black/60 text-white text-sm rounded-full backdrop-blur-md">
            Posicione o QR Code dentro do quadrado
          </p>
        </div>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* CSS Animation for the scan line */}
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default QRScanner;