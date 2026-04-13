import React, { useEffect, useRef, useState } from 'react';

// --- Tipagens e Constantes ---

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

const GRAVITY = 0.15;

// --- Classes de Entidades ---

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.color = color;
    this.size = Math.random() * 4 + 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life -= 0.02;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

class Fruit {
  id: number;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rv: number;
  size: number;
  isSliced: boolean;
  sliceAngle: number;
  halfX: number = 0;
  halfY: number = 0;

  constructor(canvasWidth: number, canvasHeight: number, emoji: string) {
    this.id = Math.random();
    this.emoji = emoji;
    this.size = 60 + Math.random() * 20;
    // Lançar de baixo para cima
    this.x = Math.random() * (canvasWidth - 100) + 50;
    this.y = canvasHeight + 50;
    
    // Alvo é o centro horizontal da tela
    const targetX = canvasWidth / 2;
    this.vx = (targetX - this.x) * 0.01 + (Math.random() - 0.5) * 3;
    this.vy = -(Math.random() * 5 + 12);
    
    this.rotation = Math.random() * Math.PI * 2;
    this.rv = (Math.random() - 0.5) * 0.15;
    this.isSliced = false;
    this.sliceAngle = 0;
  }

  update() {
    if (!this.isSliced) {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += GRAVITY;
      this.rotation += this.rv;
    } else {
      this.halfX += 4;
      this.halfY += GRAVITY * 2;
      this.y += this.vy + this.halfY;
      this.vy += GRAVITY;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.font = `${this.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (!this.isSliced) {
      // Efeito de sombra leve
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.fillText(this.emoji, 0, 0);
    } else {
      ctx.save();
      ctx.rotate(this.sliceAngle);
      
      // Metade Superior
      ctx.save();
      ctx.translate(-this.halfX, -5);
      ctx.beginPath();
      ctx.rect(-this.size, -this.size, this.size * 2, this.size);
      ctx.clip();
      ctx.rotate(-this.sliceAngle);
      ctx.fillText(this.emoji, 0, 0);
      ctx.restore();

      // Metade Inferior
      ctx.save();
      ctx.translate(this.halfX, 5);
      ctx.beginPath();
      ctx.rect(-this.size, 0, this.size * 2, this.size);
      ctx.clip();
      ctx.rotate(-this.sliceAngle);
      ctx.fillText(this.emoji, 0, 0);
      ctx.restore();
      
      ctx.restore();
    }
    ctx.restore();
  }
}

// --- Componente Principal ---

export const FallingItems: React.FC<FallingItemsProps> = ({ 
  category, 
  isVisible, 
  onComplete, 
  mode = '10s' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs para Engine (Mutable State)
  const fruitsRef = useRef<Fruit[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<{ x: number, y: number, t: number }[]>([]);
  const mouseRef = useRef<{ x: number, y: number } | null>(null);
  const scoreRef = useRef(0);
  const requestRef = useRef<number>();
  
  // React State apenas para UI de Overlay
  const [displayScore, setDisplayScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(mode === '10s' ? 10 : 15);

  useEffect(() => {
    if (!isVisible) return;

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

    // Reset Engine
    scoreRef.current = 0;
    setDisplayScore(0);
    fruitsRef.current = [];
    particlesRef.current = [];
    trailRef.current = [];
    setTimeLeft(mode === '10s' ? 10 : 15);
    
    // Timer de spawn (ondas parabólicas)
    const spawnInterval = setInterval(() => {
      const emojis = CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS['Outro'];
      // Spawn wave
      const count = Math.floor(Math.random() * 2) + 1;
      for(let i=0; i<count; i++) {
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        fruitsRef.current.push(new Fruit(canvas.width, canvas.height, emoji));
      }
    }, 1200);

    // Timer de jogo
    let gameTimer: NodeJS.Timeout;
    if (mode !== 'zen') {
      gameTimer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(gameTimer);
            clearInterval(spawnInterval);
            // Pequeno delay para mostrar o último corte antes de fechar
            setTimeout(() => onComplete(), 500);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      trailRef.current = trailRef.current.filter(p => now - p.t < 150);
      if (mouseRef.current) {
        trailRef.current.push({ ...mouseRef.current, t: now });
      }

      // Desenhar Blade Trail
      if (trailRef.current.length > 2) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(trailRef.current[0].x, trailRef.current[0].y);
        for (let i = 1; i < trailRef.current.length; i++) {
          ctx.lineTo(trailRef.current[i].x, trailRef.current[i].y);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();
        ctx.restore();
      }

      // Atualizar e Desenhar Frutas
      fruitsRef.current.forEach((fruit, index) => {
        fruit.update();
        fruit.draw(ctx);

        // Detecção de Corte (Collision Segment-Circle)
        if (!fruit.isSliced && trailRef.current.length >= 2) {
          const p1 = trailRef.current[trailRef.current.length - 2];
          const p2 = trailRef.current[trailRef.current.length - 1];
          
          // Distância ponto-centro
          const dist = Math.hypot(fruit.x - p2.x, fruit.y - p2.y);
          if (dist < fruit.size * 0.7) {
            fruit.isSliced = true;
            fruit.sliceAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            scoreRef.current++;
            setDisplayScore(scoreRef.current);
            
            // Splash Particles
            for (let i = 0; i < 12; i++) {
              particlesRef.current.push(new Particle(fruit.x, fruit.y, 'rgba(255,255,255,0.6)'));
            }
          }
        }

        if (fruit.y > canvas.height + 150) {
          fruitsRef.current.splice(index, 1);
        }
      });

      // Partículas
      particlesRef.current.forEach((p, index) => {
        p.update();
        p.draw(ctx);
        if (p.life <= 0) particlesRef.current.splice(index, 1);
      });

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', resize);
      clearInterval(spawnInterval);
      if (gameTimer) clearInterval(gameTimer);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isVisible, category, mode, onComplete]);

  const handleInput = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    mouseRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-hidden bg-black/40 backdrop-blur-sm touch-none select-none cursor-none"
      onMouseMove={handleInput}
      onTouchMove={handleInput}
      onMouseDown={handleInput}
      onTouchStart={handleInput}
      onMouseUp={() => { mouseRef.current = null; }}
      onTouchEnd={() => { mouseRef.current = null; }}
    >
      {/* HUD de Score */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none drop-shadow-2xl">
        <span className="text-white/60 text-[10px] font-black tracking-[0.4em] uppercase mb-1">CORTES</span>
        <span className="text-white text-7xl font-black italic tracking-tighter animate-in zoom-in duration-300">
          {displayScore}
        </span>
      </div>

      {/* HUD de Tempo */}
      {mode !== 'zen' && (
        <div className="absolute top-10 right-10 text-right pointer-events-none">
          <span className="text-white/40 text-[10px] font-black tracking-widest uppercase block">Tempo</span>
          <span className={`text-4xl font-black ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-white/80'}`}>
            {timeLeft}s
          </span>
        </div>
      )}

      {/* Canvas do Jogo */}
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Botão Finalizar Zen */}
      {mode === 'zen' && (
        <button
          onClick={() => onComplete()}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/10 hover:bg-white/20 text-white px-10 py-4 rounded-full font-black uppercase tracking-widest border border-white/20 backdrop-blur-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          Finalizar Sessão
        </button>
      )}

      {/* Dica Visual */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/20 text-[10px] font-black uppercase tracking-[0.5em] pointer-events-none animate-pulse">
        DESLIZE PARA CORTAR
      </div>

      <style>{`
        .cursor-none { cursor: none !important; }
      `}</style>
    </div>
  );
};
