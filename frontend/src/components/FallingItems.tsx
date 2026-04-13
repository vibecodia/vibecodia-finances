import React, { useEffect, useState, useRef, useCallback } from 'react';

interface FallingItem {
  id: number;
  emoji: string;
  x: number; // current x position (%)
  y: number; // current y position (px)
  speed: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  isSliced: boolean;
  sliceAngle: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

interface FallingItemsProps {
  category: string;
  isVisible: boolean;
  onComplete: () => void;
  mode?: '10s' | '15s' | 'zen';
}

const CATEGORY_EMOJIS: Record<string, string[]> = {
  'Moradia': ['🏠', '🏡', '🏢', '🏘️', '🔑'],
  'Dívidas': ['💸', '🧾', '💳', '📉', '💰'],
  'Educação': ['📚', '🎓', '✏️', '📓', '🏫'],
  'Serviços': ['🛠️', '🔌', '⚙️', '🔩', '🔧'],
  'Saúde': ['🏥', '💊', '🍎', '🚑', '🩺', '💉'],
  'Internet': ['🌐', '📶', '💻', '🖱️', '📡'],
  'Transporte': ['🚗', '🚌', '🚲', '🚇', '🛞', '⛽', '🛵'],
  'Entretenimento': ['🎬', '🎮', '🍿', '🎟️', '🎭', '🎧'],
  'Alimentação': ['🍎', '🥦', '🍔', '🍕', '🥕', '🍇', '🥑', '🍳', '🍉'],
  'Utilidades': ['💡', '🚰', '🔌', '🔋', '🔥'],
  'Beleza': ['💄', '💅', '💇', '🧴', '💈', '👗'],
  'Compras': ['🛍️', '🛒', '🏷️', '🎁', '👜'],
  'Consumo': ['🛒', '🥛', '🍞', '🥤', '🍱'],
  'Aporte': ['📈', '💰', '🏦', '💹', '💎', '💸'],
  'Outro': ['✨', '📦', '🌀', '🎯', '🌈'],
  'Salário': ['💵', '💰', '🏦', '💸', '🤑'],
  'Vale': ['🎟️', '🎫', '🍔', '🍕'],
  'Reembolsos': ['🔙', '💵', '💰', '💸'],
  'Aluguéis': ['🏠', '🔑', '🏢', '🏗️'],
  'Premiação': ['🏆', '🥇', '🏅', '✨', '🎉'],
  'Déc.Terceiro': ['🎄', '🎁', '💰', '🥂', '🎅'],
  'Férias': ['🏖️', '✈️', '🌴', '🍹', '👙', '🌊'],
  'Rendimentos': ['📊', '💹', '📈', '💎', '🚀'],
};

export const FallingItems: React.FC<FallingItemsProps> = ({ category, isVisible, onComplete, mode = '10s' }) => {
  const [items, setItems] = useState<FallingItem[]>([]);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [score, setScore] = useState(0);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);

  const spawnItems = useCallback((count: number) => {
    const emojis = CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS['Outro'];
    const newItems: FallingItem[] = Array.from({ length: count }).map((_, i) => ({
      id: Math.random() + Date.now() + i,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: 5 + Math.random() * 90,
      y: -100 - (Math.random() * 500),
      speed: 2 + Math.random() * 3, // Slightly slower for smoothness
      size: 45 + Math.random() * 35, // Slightly more consistent sizing
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 6, // Slower rotation
      isSliced: false,
      sliceAngle: 0,
    }));
    setItems(prev => [...prev, ...newItems]);
  }, [category]);

  // Inicializar itens
  useEffect(() => {
    if (isVisible) {
      setItems([]);
      spawnItems(4); // Reduced from 20 to 12
      setScore(0);

      // No Zen mode, keep spawning items
      let spawnInterval: NodeJS.Timeout;
      if (mode === 'zen') {
        spawnInterval = setInterval(() => {
          spawnItems(3); // Reduced from 5 to 3
        }, 2000); // Increased interval from 1.5s to 2s
      } else {
        // In time-limited mode, spawn in smaller waves
        const waveTimer = setTimeout(() => spawnItems(8), 3000);
        return () => clearTimeout(waveTimer);
      }

      // Finaliza a brincadeira se não for Zen mode
      let timer: NodeJS.Timeout;
      if (mode !== 'zen') {
        const duration = mode === '10s' ? 10000 : 15000;
        timer = setTimeout(() => {
          onComplete();
        }, duration);
      }

      return () => {
        if (spawnInterval) clearInterval(spawnInterval);
        if (timer) clearTimeout(timer);
      };
    }
  }, [isVisible, mode, spawnItems, onComplete]);

  // Lógica do Game Loop
  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current;

      setItems(prevItems => {
        const newItems = prevItems.map(item => {
          let { y, rotation, isSliced, sliceAngle } = item;
          
          // Atualiza posição
          y += item.speed;
          rotation += item.rotationSpeed;

          // Se não estiver cortado, checa colisão com o rastro do mouse
          if (!isSliced && mouseRef.current && lastMouseRef.current && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const itemX = (item.x / 100) * rect.width;
            const itemY = y;
            const radius = item.size * 0.6; // Área de colisão um pouco maior para satisfação

            // Detecção de colisão Segmento-Círculo (para movimentos rápidos)
            const x1 = lastMouseRef.current.x;
            const y1 = lastMouseRef.current.y;
            const x2 = mouseRef.current.x;
            const y2 = mouseRef.current.y;

            // Vetor do segmento
            const dx = x2 - x1;
            const dy = y2 - y1;
            
            // Se o mouse se moveu
            if (dx !== 0 || dy !== 0) {
              const t = ((itemX - x1) * dx + (itemY - y1) * dy) / (dx * dx + dy * dy);
              const closestX = x1 + Math.max(0, Math.min(1, t)) * dx;
              const closestY = y1 + Math.max(0, Math.min(1, t)) * dy;
              
              const distDx = itemX - closestX;
              const distDy = itemY - closestY;
              const distance = Math.sqrt(distDx * distDx + distDy * distDy);

              if (distance < radius) {
                isSliced = true;
                setScore(s => s + 1);
                // Ângulo do corte baseado no movimento real do mouse
                sliceAngle = Math.atan2(dy, dx) * (180 / Math.PI);
              }
            }
          }

          return { ...item, y, rotation, isSliced, sliceAngle };
        });

        // Remove itens que já passaram da tela
        return newItems.filter(item => item.y < window.innerHeight + 100);
      });

      // Atualiza o trail do mouse
      setTrail(prevTrail => {
        const newTrail = prevTrail
          .map(p => ({ ...p, age: p.age + deltaTime }))
          .filter(p => p.age < 300); // Trail dura 300ms

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
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isVisible, animate]);

  // Handlers de Mouse/Touch
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    mouseRef.current = { x, y };
  };

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-auto z-[9999] overflow-hidden cursor-none touch-none"
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      {/* Score Counter */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 text-white text-4xl font-black italic uppercase tracking-tighter drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] flex flex-col items-center pointer-events-none">
        <span className="text-xs tracking-widest opacity-70 mb-1">CORTES</span>
        <span className="text-6xl animate-bounce">{score}</span>
      </div>

      {/* Instrução */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40 text-xs font-black uppercase tracking-[0.3em] pointer-events-none animate-pulse">
        {mode === 'zen' ? 'Modo Zen: Cortando para sempre...' : 'Deslize para cortar!'}
      </div>

      {/* Botão de Finalizar no Modo Zen */}
      {mode === 'zen' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white/20 hover:bg-white/40 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest backdrop-blur-md border-2 border-white/20 transition-all hover:scale-110 active:scale-95 z-[10000] cursor-pointer"
        >
          Finalizar Sessão
        </button>
      )}

      {/* Render Trail (Lâmina) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="bladeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="rgba(255,255,255,1)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
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
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="opacity-80"
          />
        )}
      </svg>

      {/* Render Emojis */}
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute"
          style={{
            left: `${item.x}%`,
            top: `${item.y}px`,
            fontSize: `${item.size}px`,
            transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
            userSelect: 'none',
          }}
        >
          {item.isSliced ? (
            <div 
              className="relative animate-out fade-out duration-700 fill-mode-forwards"
              style={{ transform: `rotate(${item.sliceAngle}deg)` }}
            >
              {/* Parte Superior */}
              <div 
                className="absolute inset-0"
                style={{ 
                  clipPath: 'inset(0 0 50% 0)',
                  transform: 'translateY(-15px) rotate(-10deg)',
                  transition: 'transform 0.5s ease-out'
                }}
              >
                <div style={{ transform: `rotate(${-item.sliceAngle}deg)` }}>
                  {item.emoji}
                </div>
              </div>
              {/* Parte Inferior */}
              <div 
                className="absolute inset-0"
                style={{ 
                  clipPath: 'inset(50% 0 0 0)',
                  transform: 'translateY(15px) rotate(10deg)',
                  transition: 'transform 0.5s ease-out'
                }}
              >
                <div style={{ transform: `rotate(${-item.sliceAngle}deg)` }}>
                  {item.emoji}
                </div>
              </div>
            </div>
          ) : (
            <div className="hover:scale-110 transition-transform cursor-none drop-shadow-[0_10px_15px_rgba(0,0,0,0.2)]">
              {item.emoji}
            </div>
          )}
        </div>
      ))}

      {/* Estilo para a lâmina */}
      <style>{`
        .cursor-none { cursor: none !important; }
      `}</style>
    </div>
  );
};
