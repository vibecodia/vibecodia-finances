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
  const isMountedRef = useRef<boolean>(true);

  const stopScanner = () => {
    isMountedRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startScanner = async () => {
    if (!isMountedRef.current) return;
    
    setIsInitializing(true);
    setCameraError(null);
    console.log('Iniciando startScanner...');

    // Segurança: se em 10 segundos não inicializar, cancela
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && isInitializing) {
        console.warn('Timeout na inicialização da câmera.');
        setCameraError('A inicialização da câmera demorou demais. Tente recarregar a página.');
        setIsInitializing(false);
      }
    }, 10000);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      clearTimeout(timeoutId);
      const msg = 'Seu navegador não suporta acesso à câmera ou você não está em um ambiente seguro (HTTPS).';
      setCameraError(msg);
      onError?.(msg);
      setIsInitializing(false);
      return;
    }
    
    try {
      // Tenta primeiro com a câmera traseira, se falhar, tenta qualquer uma
      const getStream = async (facingMode: 'environment' | 'user' | null) => {
        const videoConstraints: any = facingMode ? { 
          facingMode: { ideal: facingMode },
        } : true;

        const constraints: MediaStreamConstraints = {
          video: videoConstraints
        };
        
        console.log('Solicitando getUserMedia com constraints:', constraints);
        return await navigator.mediaDevices.getUserMedia(constraints);
      };

      let newStream: MediaStream;
      try {
        newStream = await getStream('environment');
      } catch (e) {
        console.warn('Falha ao abrir câmera traseira, tentando qualquer câmera disponível:', e);
        try {
          newStream = await getStream(null);
        } catch (e2) {
          console.error('Falha em todas as tentativas de abrir câmera:', e2);
          throw e2;
        }
      }

      clearTimeout(timeoutId);

      if (!isMountedRef.current) {
        console.log('Componente desmontado durante a obtenção do stream, parando tracks.');
        newStream.getTracks().forEach(track => track.stop());
        return;
      }
      
      setStream(newStream);
      console.log('Stream obtido com sucesso.');
      
      if (videoRef.current) {
        console.log('Configurando video element...');
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        
        try {
          await videoRef.current.play();
          console.log('Video.play() resolvido.');
          if (isMountedRef.current) {
            requestAnimationFrame(tick);
          }
        } catch (playErr: any) {
          console.error('Erro no video.play():', playErr);
          // Ignora erros de interrupção do play() se estivermos desmontando
          if (playErr.name !== 'AbortError' && isMountedRef.current) {
            throw playErr;
          }
        }
      } else {
        console.warn('videoRef.current não está disponível ao configurar o stream.');
      }

      if (isMountedRef.current) {
        console.log('Finalizando inicialização com sucesso.');
        setIsInitializing(false);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (!isMountedRef.current) return;
      
      console.error('Erro fatal ao acessar a câmera:', err);
      const msg = err.name === 'NotAllowedError' 
        ? 'Permissão de câmera negada. Por favor, habilite o acesso.' 
        : 'Não foi possível acessar a câmera ou dispositivo não encontrado.';
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
        stopScanner(); // Para tudo antes de notificar o componente pai
        onScan(code.data);
        return; // Stop the loop once a code is found
      }
    }
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    // Pequeno delay para evitar conflitos de hardware em remounts rápidos (Strict Mode)
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        startScanner();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
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