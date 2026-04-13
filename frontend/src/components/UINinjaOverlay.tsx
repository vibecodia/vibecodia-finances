import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';

// --- Tipagens ---

interface UIElementData {
  id: string;
  html: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rv: number;
  width: number;
  height: number;
  isSliced: boolean;
  sliceAngle: number;
  halfX: number;
  halfY: number;
  domRef: HTMLDivElement | null;
}

interface UINinjaOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
}

const GRAVITY = 0.22;

// --- Componente Principal ---

export const UINinjaOverlay: React.FC<UINinjaOverlayProps> = ({ isVisible, onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs de Estado do Jogo (Mutable para Performance)
  const elementsRef = useRef<UIElementData[]>([]);
  const trailRef = useRef<{ x: number, y: number, t: number }[]>([]);
  const mouseRef = useRef<{ x: number, y: number } | null>(null);
  const requestRef = useRef<number>();
  const scoreRef = useRef(0);
  const onCompleteRef = useRef(onComplete);

  // Sincronizar callback sem disparar re-renders
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const [displayScore, setDisplayScore] = useState(0);

  // 1. Capturar Elementos da Interface Atual
  const captureElements = useCallback(() => {
    // Selecionar elementos que dão satisfação ao fatiar
    const selectors = 'button, .card, h1, h2, h3, [role="button"], .rounded-xl, .bg-card';
    const found = document.querySelectorAll(selectors);
    const captured: UIElementData[] = [];

    found.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      
      // Ignorar elementos ocultos ou muito pequenos
      if (rect.width < 15 || rect.height < 15 || rect.top < -100) return;
      
      // Seleção aleatória para não sobrecarregar a tela (50% de chance)
      if (Math.random() > 0.5) return;

      captured.push({
        id: `ui-${index}-${Date.now()}`,
        html: el.outerHTML,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        vx: (Math.random() - 0.5) * 6, // Impulso lateral
        vy: -(Math.random() * 12 + 6), // Lançar para cima
        rotation: 0,
        rv: (Math.random() - 0.5) * 0.15,
        width: rect.width,
        height: rect.height,
        isSliced: false,
        sliceAngle: 0,
        halfX: 0,
        halfY: 0,
        domRef: null
      });

      // Esconder o elemento original da página
      (el as HTMLElement).style.visibility = 'hidden';
    });

    elementsRef.current = captured;
  }, []);

  const restoreElements = useCallback(() => {
    const selectors = 'button, .card, h1, h2, h3, [role="button"], .rounded-xl, .bg-card';
    document.querySelectorAll(selectors).forEach(el => {
      (el as HTMLElement).style.visibility = 'visible';
    });
  }, []);

  // 2. Loop de Animação Principal
  useEffect(() => {
    if (!isVisible) {
      restoreElements();
      return;
    }

    // Reset jogo
    scoreRef.current = 0;
    setDisplayScore(0);
    captureElements();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- Desenhar Trail (Canvas) ---
      const now = Date.now();
      trailRef.current = trailRef.current.filter(p => now - p.t < 160);
      if (mouseRef.current) trailRef.current.push({ ...mouseRef.current, t: now });

      if (trailRef.current.length > 2) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(trailRef.current[0].x, trailRef.current[0].y);
        for (let i = 1; i < trailRef.current.length; i++) {
          ctx.lineTo(trailRef.current[i].x, trailRef.current[i].y);
        }
        ctx.strokeStyle = '#22d3ee'; // Cyan 400
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // Efeito Neon Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(34, 211, 238, 0.8)';
        ctx.stroke();
        ctx.restore();
      }

      // --- Física dos Elementos (DOM + Parábola) ---
      elementsRef.current.forEach((el) => {
        if (!el.domRef) return;

        if (!el.isSliced) {
          el.x += el.vx;
          el.y += el.vy;
          el.vy += GRAVITY;
          el.rotation += el.rv;
        } else {
          // Metades se separam violentamente
          el.halfX += 6;
          el.halfY += GRAVITY * 2.5;
          el.y += el.vy + el.halfY;
          el.vy += GRAVITY;
        }

        // Atualização direta no DOM para performance (bypass React render)
        el.domRef.style.transform = `translate(${el.x}px, ${el.y}px) translate(-50%, -50%) rotate(${el.rotation}rad)`;

        // --- Detecção de Colisão ---
        if (!el.isSliced && trailRef.current.length >= 2 && mouseRef.current) {
          const m = mouseRef.current;
          const dist = Math.hypot(el.x - m.x, el.y - m.y);
          const hitbox = Math.max(el.width, el.height) * 0.55;

          if (dist < hitbox) {
            el.isSliced = true;
            const p1 = trailRef.current[trailRef.current.length - 2];
            el.sliceAngle = Math.atan2(m.y - p1.y, m.x - p1.x);
            scoreRef.current++;
            setDisplayScore(scoreRef.current);

            // Animar as metades no primeiro frame do corte
            const upper = el.domRef.querySelector('.ui-upper') as HTMLElement;
            const lower = el.domRef.querySelector('.ui-lower') as HTMLElement;
            if (upper && lower) {
              upper.style.transform = `rotate(${el.sliceAngle}rad) translateY(-20px) rotate(-10deg)`;
              lower.style.transform = `rotate(${el.sliceAngle}rad) translateY(20px) rotate(10deg)`;
            }
          }
        }
      });

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      restoreElements();
    };
  }, [isVisible, captureElements, restoreElements]);

  const handleInput = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    mouseRef.current = { x: clientX, y: clientY };
  };

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[10000] overflow-hidden bg-black/60 backdrop-blur-[6px] touch-none select-none cursor-none"
      onMouseMove={handleInput}
      onTouchMove={handleInput}
      onMouseDown={handleInput}
      onTouchStart={handleInput}
      onMouseUp={() => { mouseRef.current = null; }}
      onTouchEnd={() => { mouseRef.current = null; }}
    >
      {/* HUD Score Estilizado */}
      <div className="absolute top-10 left-10 flex flex-col pointer-events-none z-50 animate-in slide-in-from-left duration-500">
        <span className="text-cyan-400 text-[10px] font-black tracking-[0.4em] uppercase mb-1">Interface Destruída</span>
        <span className="text-white text-8xl font-black italic tracking-tighter drop-shadow-[0_0_25px_rgba(34,211,238,0.6)] leading-none">
          {displayScore}
        </span>
      </div>

      <button
        onClick={() => onCompleteRef.current()}
        className="absolute top-10 right-10 bg-white/10 hover:bg-red-500 text-white p-5 rounded-3xl font-black backdrop-blur-xl border-2 border-white/20 transition-all hover:scale-110 active:scale-95 z-50 cursor-pointer group"
      >
        <X className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Rastro da Lâmina (Canvas Overlay) */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Camada de Destruição (DOM Elements) */}
      <div className="absolute inset-0 pointer-events-none">
        {elementsRef.current.map((el) => (
          <div
            key={el.id}
            ref={(ref) => { el.domRef = ref; }}
            className="absolute will-change-transform"
            style={{ width: el.width, height: el.height }}
          >
            <div className="relative w-full h-full">
              {/* Metade Superior */}
              <div 
                className="ui-upper absolute inset-0 overflow-hidden transition-transform duration-700 ease-out"
                style={{ clipPath: 'inset(0 0 50% 0)' }}
                dangerouslySetInnerHTML={{ __html: el.html }}
              />
              {/* Metade Inferior */}
              <div 
                className="ui-lower absolute inset-0 overflow-hidden transition-transform duration-700 ease-out"
                style={{ clipPath: 'inset(50% 0 0 0)' }}
                dangerouslySetInnerHTML={{ __html: el.html }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-cyan-500/20 text-[10px] font-black uppercase tracking-[1.2em] pointer-events-none animate-pulse">
        SISTEMA VULNERÁVEL
      </div>

      <style>{`
        .cursor-none { cursor: none !important; }
        /* Garantir que nada dentro das metades fatiadas responda a eventos ou quebre o layout */
        .ui-upper *, .ui-lower * { 
          pointer-events: none !important; 
          user-select: none !important;
          animation: none !important;
          transition: none !important;
        }
      `}</style>
    </div>
  );
};
