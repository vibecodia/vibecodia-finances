import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { VerificationProvider } from './contexts/VerificationContext.tsx';
import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <VerificationProvider>
          <App />
        </VerificationProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registrado com sucesso:', registration.scope);
        
        // Registro de Background Sync opcional na inicialização
        if ('sync' in registration) {
          (registration as any).sync.register('sync-transactions')
            .catch((err: any) => console.log('Background sync falhou:', err));
        }
      })
      .catch(error => {
        console.error('Falha ao registrar SW:', error);
      });
  });
}
