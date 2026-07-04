import { useEffect, useRef, memo } from 'react';
import { useAnimation } from '../context/AnimationContext';

const CONFETTI_COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#a3e635',
];
const PETAL_COLORS = ['#fda4af','#f9a8d4','#c084fc','#f0abfc','#fbcfe8'];
const LEAF_COLORS  = ['#d97706','#b45309','#92400e','#ea580c','#dc2626'];

function randomBetween(a: number, b: number) { return a + Math.random() * (b - a); }

type Particle = {
  id: number;
  x: number;      // left %
  size: number;   // px
  duration: number; // seconds
  delay: number;    // seconds
  color: string;
  rotation?: number;
  shape?: 'circle' | 'rect' | 'square';
};

function useParticles(count: number): Particle[] {
  const ref = useRef<Particle[]>([]);
  if (ref.current.length !== count) {
    ref.current = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 95,
      size: randomBetween(4, 12),
      duration: randomBetween(4, 10),
      delay: randomBetween(0, 8),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotation: Math.random() * 360,
      shape: ['circle','rect','square'][Math.floor(Math.random() * 3)] as Particle['shape'],
    }));
  }
  return ref.current;
}

const SnowOverlay = memo(({ count }: { count: number }) => {
  const particles = useParticles(count);
  return (
    <div className="seasonal-overlay" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle-snow"
          style={{
            left: `${p.x}%`,
            width: p.size, height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
});

const ConfettiOverlay = memo(({ count, colors = CONFETTI_COLORS }: { count: number; colors?: string[] }) => {
  const particles = useParticles(count);
  return (
    <div className="seasonal-overlay" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle-confetti"
          style={{
            left: `${p.x}%`,
            width: p.shape === 'rect' ? p.size * 2 : p.size,
            height: p.size,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '2px' : '0',
            background: colors[p.id % colors.length],
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
});

const PetalOverlay = memo(({ count }: { count: number }) => {
  const particles = useParticles(count);
  return (
    <div className="seasonal-overlay" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle-petal"
          style={{
            left: `${p.x}%`,
            width: p.size * 1.5, height: p.size,
            background: PETAL_COLORS[p.id % PETAL_COLORS.length],
            animationDuration: `${p.duration + 2}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
});

const LeafOverlay = memo(({ count }: { count: number }) => {
  const particles = useParticles(count);
  return (
    <div className="seasonal-overlay" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle-leaf"
          style={{
            left: `${p.x}%`,
            width: p.size * 1.2, height: p.size * 1.2,
            background: LEAF_COLORS[p.id % LEAF_COLORS.length],
            animationDuration: `${p.duration + 3}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
});

const HeartOverlay = memo(({ count }: { count: number }) => {
  const particles = useParticles(count);
  return (
    <div className="seasonal-overlay" aria-hidden="true">
      {particles.map(p => (
        <span
          key={p.id}
          className="particle-heart select-none"
          style={{
            left: `${p.x}%`,
            top: `${randomBetween(10, 80)}%`,
            fontSize: p.size * 2,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          ❤️
        </span>
      ))}
    </div>
  );
});

const FireworksOverlay = memo(({ count }: { count: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string };
    const sparks: Spark[] = [];
    let running = true;

    const launch = () => {
      const colors = ['#fbbf24','#34d399','#60a5fa','#f472b6','#a78bfa','#fb923c'];
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height * 0.5 + 50;
      const n  = 40 + Math.floor(Math.random() * 30);
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        const speed = randomBetween(1.5, 5);
        sparks.push({ x: cx, y: cy, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 1, color: colors[Math.floor(Math.random()*colors.length)] });
      }
    };

    const intervals: ReturnType<typeof setInterval>[] = [];
    for (let i = 0; i < Math.min(count, 8); i++) {
      intervals.push(setInterval(launch, 800 + i * 300));
    }

    const draw = () => {
      if (!running) return;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.5 * s.life, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.life;
        ctx.fill();
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.05;
        s.life -= 0.018;
        if (s.life <= 0) sparks.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    };
    draw();

    return () => {
      running = false;
      intervals.forEach(clearInterval);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="seasonal-overlay"
      aria-hidden="true"
      style={{ zIndex: 9999 }}
    />
  );
});

// ── Main export ───────────────────────────────────────────────────────────────
export default function SeasonalOverlay() {
  const { settings, seasonal } = useAnimation();

  if (!settings.enabled || !settings.seasonalThemes || !settings.particles || settings.minimal) {
    return null;
  }
  if (settings.intensity === 'off') return null;

  const count = Math.ceil(
    seasonal.particleCount * (
      settings.intensity === 'low' ? 0.4 :
      settings.intensity === 'high' ? 1.6 : 1
    )
  );

  switch (seasonal.particle) {
    case 'snow':      return <SnowOverlay count={count} />;
    case 'confetti':  return <ConfettiOverlay count={count} />;
    case 'petals':    return <PetalOverlay count={count} />;
    case 'leaves':    return <LeafOverlay count={count} />;
    case 'hearts':    return <HeartOverlay count={count} />;
    case 'fireworks': return <FireworksOverlay count={count} />;
    default:          return null;
  }
}
