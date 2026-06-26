import React, { useEffect, useRef } from 'react';
import './HeroAnimation.css';

export default function HeroAnimation({ children }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const hero = containerRef.current;
    if (!hero) return;

    let W, H, particles, time = 0;
    let animationId;

    const COLORS = [
      [167, 139, 250],
      [96, 165, 250],
      [52, 211, 153],
      [251, 191, 36],
      [244, 114, 182],
      [251, 146, 60],
    ];

    function resize() {
      W = canvas.width = hero.offsetWidth;
      H = canvas.height = hero.offsetHeight;
      initParticles();
    }

    function initParticles() {
      const count = 70;
      particles = [];
      const midClear = 0.28;

      for (let i = 0; i < count; i++) {
        let x;
        if (Math.random() < 0.5) {
          x = Math.random() * W * midClear;
        } else {
          x = W - Math.random() * W * midClear;
        }
        const col = COLORS[Math.floor(Math.random() * COLORS.length)];
        particles.push({
          x,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.18,
          r: 1.5 + Math.random() * 2,
          col,
          alpha: 0.25 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          speed: 0.005 + Math.random() * 0.008,
        });
      }
    }

    function drawOrb(cx, cy, radius, col, alpha) {
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${alpha})`);
      grd.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    const MAX_DIST = 130;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      const ambientL = [
        { cx: W * 0.08, cy: H * 0.35, r: 200, col: [167, 139, 250], a: 0.06 },
        { cx: W * 0.15, cy: H * 0.7,  r: 160, col: [96, 165, 250],   a: 0.05 },
        { cx: W * 0.92, cy: H * 0.3,  r: 200, col: [52, 211, 153],   a: 0.06 },
        { cx: W * 0.85, cy: H * 0.72, r: 160, col: [251, 191, 36],   a: 0.04 },
      ];
      for (const o of ambientL) drawOrb(o.cx, o.cy, o.r, o.col, o.a);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pulse = 0.85 + 0.15 * Math.sin(time * p.speed * 40 + p.phase);

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const fade = 1 - dist / MAX_DIST;
            const blendR = Math.round((p.col[0] + q.col[0]) / 2);
            const blendG = Math.round((p.col[1] + q.col[1]) / 2);
            const blendB = Math.round((p.col[2] + q.col[2]) / 2);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(${blendR},${blendG},${blendB},${fade * 0.18})`;
            ctx.lineWidth = fade * 0.8;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${p.alpha * pulse})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulse * 2.5, 0, Math.PI * 2);
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * pulse * 2.5);
        grd.addColorStop(0, `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${p.alpha * 0.25 * pulse})`);
        grd.addColorStop(1, `rgba(${p.col[0]},${p.col[1]},${p.col[2]},0)`);
        ctx.fillStyle = grd;
        ctx.fill();
      }
    }

    function update() {
      time += 0.016;
      for (const p of particles) {
        p.x += p.vx + 0.12 * Math.sin(time * 0.3 + p.phase);
        p.y += p.vy + 0.08 * Math.cos(time * 0.25 + p.phase);

        if (p.x < 0) p.x = W * 0.28;
        if (p.x > W * 0.28 && p.x < W * 0.72) {
          if (p.vx < 0) p.x = 0;
          else p.x = W;
        }
        if (p.x > W) p.x = W * 0.72;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      }
    }

    function loop() {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', resize);
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div ref={containerRef} className="hero-wrapper" style={{ position: 'relative', width: '100%', minHeight: '600px', background: 'var(--bg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}></canvas>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '160px', background: 'linear-gradient(to right, var(--bg) 0%, transparent 100%)', zIndex: 5, pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '160px', background: 'linear-gradient(to left, var(--bg) 0%, transparent 100%)', zIndex: 5, pointerEvents: 'none' }}></div>

      <div className="left-label">
        <div className="side-chip">
          <div className="chip-dot purple"></div>
          <span className="chip-label">Verified</span>
          <span className="chip-value">Experts</span>
        </div>
        <div className="side-chip">
          <div className="chip-dot blue"></div>
          <span className="chip-label">Quality</span>
          <span className="chip-value">100%</span>
        </div>
        <div className="side-chip">
          <div className="chip-dot teal"></div>
          <span className="chip-label">Privacy</span>
          <span className="chip-value">Secured</span>
        </div>
      </div>

      <div className="right-label">
        <div className="side-chip">
          <div className="chip-dot amber"></div>
          <span className="chip-label">Experience</span>
          <span className="chip-value">10+ yr</span>
        </div>
        <div className="side-chip">
          <div className="chip-dot pink"></div>
          <span className="chip-label">Disciplines</span>
          <span className="chip-value">50+</span>
        </div>
        <div className="side-chip">
          <div className="chip-dot coral"></div>
          <span className="chip-label">Students</span>
          <span className="chip-value">10k+</span>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', width: '100%' }}>
        {children}
      </div>
    </div>
  );
}
