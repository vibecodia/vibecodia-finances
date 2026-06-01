import React, { useState } from "react";
import { cn } from "../lib/utils";

interface Particle {
  id: number;
  emoji: string;
  angle: number;
  speed: number;
}

interface BandaidEasterEggProps {
  type: "slugs" | "coins" | "hearts";
  children: React.ReactNode;
  className?: string;
}

export const BandaidEasterEgg: React.FC<BandaidEasterEggProps> = ({
  type,
  children,
  className,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const playSquishSound = () => {
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      // Frequência começa média e cai rápido para simular o "squish"
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        40,
        audioCtx.currentTime + 0.1,
      );

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.1,
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);

      // Fechar o contexto após o som para economizar recursos
      setTimeout(() => audioCtx.close(), 200);
    } catch (e) {
      console.error("Audio context error:", e);
    }
  };

  const handleClick = () => {
    playSquishSound();
    const emojis = {
      slugs: ["🐌", "🐛", "🐌"],
      coins: ["🪙", "✨", "💰"],
      hearts: ["💖", "✨", "💝"],
    };

    const newParticles: Particle[] = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      emoji: emojis[type][Math.floor(Math.random() * emojis[type].length)],
      angle: Math.random() * 360 * (Math.PI / 180),
      speed: 2 + Math.random() * 3,
    }));

    setParticles((prev) => [...prev, ...newParticles]);

    // Limpar partículas após a animação
    setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.find((np) => np.id === p.id)),
      );
    }, 2000);
  };

  return (
    <div
      className={cn("relative cursor-pointer select-none", className)}
      onClick={handleClick}
    >
      {children}
      {particles.map((p) => (
        <div
          key={p.id}
          className={cn(
            "absolute pointer-events-none text-xl z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            type === "slugs"
              ? "animate-slug-crawl"
              : type === "coins"
                ? "animate-coin-pop"
                : "animate-heart-float",
          )}
          style={
            {
              "--angle": `${p.angle}rad`,
              "--speed": `${p.speed}`,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </div>
      ))}
      <style>{`
        @keyframes slug-crawl {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          20% { transform: translate(calc(cos(var(--angle)) * 20px - 50%), calc(sin(var(--angle)) * 20px - 50%)) scale(1); opacity: 1; }
          100% { transform: translate(calc(cos(var(--angle)) * 60px - 50%), calc(sin(var(--angle)) * 60px - 50%)) scale(0.8); opacity: 0; }
        }
        @keyframes coin-pop {
          0% { transform: translate(-50%, -50%) scale(0) translateY(0); opacity: 0; }
          50% { transform: translate(calc(cos(var(--angle)) * 40px - 50%), calc(sin(var(--angle)) * 40px - 50% - 30px)) scale(1.2); opacity: 1; }
          100% { transform: translate(calc(cos(var(--angle)) * 50px - 50%), calc(sin(var(--angle)) * 50px - 50% + 20px)) scale(0); opacity: 0; }
        }
        @keyframes heart-float {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          30% { transform: translate(calc(cos(var(--angle)) * 30px - 50%), calc(sin(var(--angle)) * 30px - 50% - 20px)) scale(1.3); opacity: 1; }
          100% { transform: translate(calc(cos(var(--angle)) * 40px - 50%), calc(sin(var(--angle)) * 40px - 50% - 60px)) scale(0.5); opacity: 0; }
        }
        .animate-slug-crawl { animation: slug-crawl 2s ease-out forwards; }
        .animate-coin-pop { animation: coin-pop 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-heart-float { animation: heart-float 1.8s ease-in-out forwards; }
      `}</style>
    </div>
  );
};
