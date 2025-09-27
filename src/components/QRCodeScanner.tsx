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

  useEffect(() => {
    if (!isScanning) return;
    if (!videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    // decodeFromConstraints retorna um IScannerControls
    reader
      .decodeFromConstraints({ video: { facingMode: 'environment' } }, videoRef.current, (result, err) => {
        if (result) {
          setStatus('success');
          setIsScanning(false);
          onScanSuccess(result.getText());

          // para o scanner
          controlsRef.current?.stop();
        }

        if (err && err.name !== 'NotFoundException' && err.name !== 'NotFoundException2') {
          console.error('QR Scanner Error:', err);
          setStatus('error');
          setErrorMessage(err?.message || 'Erro desconhecido');
          setIsScanning(false);
          onScanError?.(err?.message || 'Erro desconhecido');

          controlsRef.current?.stop();
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch((err) => {
        console.error('Erro ao iniciar scanner:', err);
        setStatus('error');
        setErrorMessage(err?.message || 'Erro desconhecido');
        setIsScanning(false);
      });

    return () => {
      controlsRef.current?.stop();
    };
  }, [isScanning, onScanSuccess, onScanError]);

  return (
    <div className="space-y-2">
      {!isScanning ? (
        <button
          onClick={() => {
            setIsScanning(true);
            setStatus('idle');
            setErrorMessage('');
          }}
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
      ) : (
        <div className="relative rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            style={{ width: '100%' }}
            className="rounded-lg"
            muted
            autoPlay
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-8 h-8 animate-spin text-primary bg-white bg-opacity-70 rounded-full p-1" />
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle className="w-4 h-4" />
          <span>QR Code lido com sucesso!</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-error">
          <XCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default QRCodeScanner;
