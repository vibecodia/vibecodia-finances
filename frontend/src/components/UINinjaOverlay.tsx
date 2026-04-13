import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface UIElement {
  id: string;
  emoji: string | null;
  text: string | null;
  html: string;
  x: number;
  y: number;
  speed: number;
  size: { width: number; height: number };
  rotation: number;
  rotationSpeed: number;
  isSliced: boolean;
  sliceAngle: number;
  type: 'text' | 'button' | 'icon' | 'card';
  originalRect: DOMRect;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

interface UINinjaOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const UINinjaOverlay: React.FC<UINinjaOverlayProps> = ({ isVisible, onComplete }) => {
  const [elements, setElements] = useState<UIElement[]>([]);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [score, setScore] = useState(0);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);

  const captureElements = useCallback(() => {
    // Selecionar elementos interessantes da página
    const selectors = 'h1, h2, h3, p, span, button, .card, .rounded-xl, .font-black';
    const foundElements = document.querySelectorAll(selectors);
    const captured: UIElement[] = [];

    foundElements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      // Filtrar elementos pequenos ou fora da tela inicial
      if (rect.width < 10 || rect.height < 10 || rect.top > window.innerHeight) return;
      
      // Apenas uma amostra para não sobrecarregar
      if (Math.random() > 0.4) return;

      captured.push({
        id: `ui-${index}-${Date.now()}`,
        emoji: null,
        text: el.textContent?.trim().substring(0, 20) || null,
        html: el.outerHTML,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        speed: 1 + Math.random() * 2,
        size: { width: rect.width, height: rect.height },
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 4,
        isSliced: false,
        sliceAngle: 0,
        type: el.tagName.toLowerCase() === 'button' ? 'button' : 'text',
        originalRect: rect
      });

      // Esconder o elemento original
      (el as HTMLElement).style.visibility = 'hidden';
    });

    setElements(captured);
  }, []);

  const restoreElements = useCallback(() => {
    const selectors = 'h1, h2, h3, p, span, button, .card, .rounded-xl, .font-black';
    document.querySelectorAll(selectors).forEach(el => {
      (el as HTMLElement).style.visibility = 'visible';
    });
  }, []);

  useEffect(() => {
    if (isVisible) {
      captureElements();
      setScore(0);
    } else {
      restoreElements();
      setElements([]);
    }
    return () => restoreElements();
  }, [isVisible, captureElements, restoreElements]);

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current;

      setElements(prevElements => {
        const newElements = prevElements.map(el => {
          let { y, rotation, isSliced, sliceAngle } = el;
          
          y += el.speed;
          rotation += el.rotationSpeed;

          if (!isSliced && mouseRef.current && lastMouseRef.current) {
            const x1 = lastMouseRef.current.x;
            const y1 = lastMouseRef.current.y;
            const x2 = mouseRef.current.x;
            const y2 = mouseRef.current.y;

            const dx = x2 - x1;
            const dy = y2 - y1;
            
            if (dx !== 0 || dy !== 0) {
              const t = ((el.x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
              const closestX = x1 + Math.max(0, Math.min(1, t)) * dx;
              const closestY = y1 + Math.max(0, Math.min(1, t)) * dy;
              
              const distDx = el.x - closestX;
              const distDy = y - closestY;
              const distance = Math.sqrt(distDx * distDx + distDy * distDy);

              if (distance < Math.max(el.size.width, el.size.height) * 0.5) {
                isSliced = true;
                setScore(s => s + 1);
                sliceAngle = Math.atan2(dy, dx) * (180 / Math.PI);
              }
            }
          }

          return { ...el, y, rotation, isSliced, sliceAngle };
        });

        return newElements.filter(el => el.y < window.innerHeight + 200);
      });

      setTrail(prevTrail => {
        const newTrail = prevTrail
          .map(p => ({ ...p, age: p.age + deltaTime }))
          .filter(p => p.age < 300);

        if (mouseRef.current) {
          newTrail.push({ ...mouseRef.current, age: 0 });
        }
        return newTrail;
      });

      lastMouseRef.current = mouseRef.current;
    }
    
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (isVisible) {
      requestRef.current = requestAnimationFrame(animate);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isVisible, animate]);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    mouseRef.current = { x, y };
  };

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-auto z-[10000] overflow-hidden cursor-none touch-none bg-black/20 backdrop-blur-[2px]"
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      <div className="absolute top-10 left-1/2 -translate-x-1/2 text-white text-4xl font-black italic uppercase tracking-tighter drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] flex flex-col items-center pointer-events-none">
        <span className="text-xs tracking-widest opacity-70 mb-1 font-sans">UI DESTRUIDA</span>
        <span className="text-6xl animate-bounce">{score}</span>
      </div>

      <button
        onClick={onComplete}
        className="absolute top-10 right-10 bg-white/20 hover:bg-red-500 text-white p-4 rounded-2xl font-black uppercase backdrop-blur-md border-2 border-white/20 transition-all hover:scale-110 active:scale-95 z-[10001] cursor-pointer group"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/60 text-xs font-black uppercase tracking-[0.3em] pointer-events-none animate-pulse">
        Corte a Interface!
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <filter id="ui-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {trail.length > 1 && (
          <path
            d={`M ${trail.map(p => `${p.x} ${p.y}`).join(' L ')}`}
            fill="none"
            stroke="cyan"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#ui-glow)"
            className="opacity-80"
          />
        )}
      </svg>

      {elements.map((el) => (
        <div
          key={el.id}
          className="absolute pointer-events-none"
          style={{
            left: `${el.x}px`,
            top: `${el.y}px`,
            width: `${el.size.width}px`,
            height: `${el.size.height}px`,
            transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
          }}
        >
          {el.isSliced ? (
            <div 
              className="relative w-full h-full animate-out fade-out duration-700 fill-mode-forwards"
              style={{ transform: `rotate(${el.sliceAngle}deg)` }}
            >
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ 
                  clipPath: 'inset(0 0 50% 0)',
                  transform: 'translateY(-20px) rotate(-15deg)',
                }}
                dangerouslySetInnerHTML={{ __html: el.html }}
              />
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ 
                  clipPath: 'inset(50% 0 0 0)',
                  transform: 'translateY(20px) rotate(15deg)',
                }}
                dangerouslySetInnerHTML={{ __html: el.html }}
              />
            </div>
          ) : (
            <div 
              className="w-full h-full drop-shadow-xl overflow-hidden rounded-lg"
              dangerouslySetInnerHTML={{ __html: el.html }}
            />
          )}
        </div>
      ))}

      <style>{`
        .cursor-none { cursor: none !important; }
        [dangerouslySetInnerHTML] * { pointer-events: none !important; }
      `}</style>
    </div>
  );
};
