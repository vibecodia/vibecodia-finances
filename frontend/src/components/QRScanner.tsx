import { X, Camera, RefreshCw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { useTheme } from "../contexts/ThemeContext";

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
  const lastScanTimeRef = useRef<number>(0);
  const SCAN_INTERVAL = 200; //ms - Reduz carga na CPU e evita travamentos

  const stopScanner = () => {
    isMountedRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log(`Track ${track.label} finalizada.`);
      });
    }
  };

  const startScanner = async () => {
    if (!isMountedRef.current) return;

    setIsInitializing(true);
    setCameraError(null);
    console.log("Iniciando startScanner otimizado...");

    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && isInitializing) {
        setCameraError("A inicialização demorou demais. Tente recarregar.");
        setIsInitializing(false);
      }
    }, 15000);

    if (!navigator.mediaDevices?.getUserMedia) {
      clearTimeout(timeoutId);
      const msg = "Navegador incompatível ou sem HTTPS.";
      setCameraError(msg);
      onError?.(msg);
      setIsInitializing(false);
      return;
    }

    try {
      // 1. CONSTRAINTS HIERÁRQUICAS PARA CÂMERA TRASEIRA
      const constraintOptions = [
        {
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
          },
        },
        {
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        {
          video: { facingMode: "environment" },
        },
        { video: true },
      ];

      let newStream: MediaStream | null = null;

      for (const constraints of constraintOptions) {
        try {
          console.log("Tentando constraints:", constraints);
          newStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (newStream) break;
        } catch (e) {
          console.warn("Falha na tentativa de constraint:", e);
        }
      }

      if (!newStream)
        throw new Error("Não foi possível acessar nenhuma câmera.");

      clearTimeout(timeoutId);

      if (!isMountedRef.current) {
        newStream.getTracks().forEach((t) => t.stop());
        return;
      }

      // 2. FOCO E CAPABILITIES (Hardware Adjustment)
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities() as any;
        console.log("Capabilities da câmera:", capabilities);

        const constraintsToApply: any = { advanced: [] };

        // Tenta aplicar foco contínuo se suportado (Comum em Samsung/Android)
        if (capabilities.focusMode?.includes("continuous")) {
          constraintsToApply.advanced.push({ focusMode: "continuous" });
        }

        // Se o hardware estiver muito perto e não focar, um leve zoom pode ajudar em alguns casos,
        // mas aqui mantemos o padrão ou aplicamos apenas se houver falha de foco conhecida.

        if (constraintsToApply.advanced.length > 0) {
          try {
            await videoTrack.applyConstraints(constraintsToApply);
            console.log("Constraints de hardware aplicadas com sucesso.");
          } catch (e) {
            console.warn("Erro ao aplicar focusMode:", e);
          }
        }
      }

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute("playsinline", "true");

        await videoRef.current.play();
        if (isMountedRef.current) {
          requestAnimationFrame(tick);
        }
      }

      setIsInitializing(false);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (!isMountedRef.current) return;
      console.error("Erro fatal:", err);
      setCameraError("Erro ao acessar câmera. Verifique as permissões.");
      setIsInitializing(false);
    }
  };

  const tick = (time: number) => {
    if (!videoRef.current || !canvasRef.current || !isMountedRef.current)
      return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      // 3. LOOP OTIMIZADO (Throttle)
      if (time - lastScanTimeRef.current >= SCAN_INTERVAL) {
        lastScanTimeRef.current = time;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return;

        // Garante correspondência exata para evitar distorção
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;

        if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
          canvas.width = videoWidth;
          canvas.height = videoHeight;
        }

        context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
        const imageData = context.getImageData(0, 0, videoWidth, videoHeight);

        const code = window.jsQR
          ? window.jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            })
          : null;

        if (code?.data) {
          console.log("QR Code detectado!");
          stopScanner();
          onScan(code.data);
          return;
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/70 text-white backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <span className="font-semibold tracking-tight">Escanear QR Code</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all"
        >
          <X className="w-7 h-7" />
        </button>
      </div>

      {/* Camera View */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-zinc-950">
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black z-20">
            <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4 opacity-80" />
            <p className="text-sm font-medium animate-pulse">
              Otimizando câmera...
            </p>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-zinc-900 z-20 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
              <X className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Ops! Algo deu errado</h3>
            <p className="mb-8 text-zinc-400 max-w-xs leading-relaxed">
              {cameraError}
            </p>
            <button
              onClick={() => {
                setCameraError(null);
                startScanner();
              }}
              className="px-8 py-3 rounded-xl font-bold text-black transition-transform active:scale-95"
              style={{ backgroundColor: theme.primary }}
            >
              Tentar Novamente
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />

        {/* Scanning UI Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <div className="relative w-72 h-72">
            {/* Area de Leitura (Sombra) */}
            <div className="absolute inset-0 border-2 border-primary/30 rounded-3xl overflow-hidden">
              {/* Animated Scanning Line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-fast shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            </div>

            {/* Corner Borders Estilizados */}
            <div className="absolute -top-2 -left-2 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-2xl"></div>
            <div className="absolute -top-2 -right-2 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-2xl"></div>
            <div className="absolute -bottom-2 -left-2 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-2xl"></div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-2xl"></div>
          </div>

          <div className="mt-12 px-6 py-3 bg-black/60 text-white text-sm font-medium rounded-2xl backdrop-blur-xl border border-white/10 shadow-2xl">
            Aponte para o QR Code
          </div>
        </div>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* CSS Animation for the scan line */}
      <style>{`
        @keyframes scan-fast {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(288px); opacity: 0; }
        }
        .animate-scan-fast {
          animation: scan-fast 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
