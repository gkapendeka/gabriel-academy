import React, { useEffect, useRef } from 'react';
import './AnimatedHowItWorks.css';

export default function AnimatedHowItWorks() {
  const c1Ref = useRef(null);
  const c2Ref = useRef(null);
  const c3Ref = useRef(null);
  const c4Ref = useRef(null);

  useEffect(() => {
    const PI = Math.PI;
    const TAU = PI * 2;
    let t = 0;
    let animationId;

    function drawPerson(ctx, x, y, color, opts) {
      opts = opts || {};
      const s = opts.scale || 1;
      const headR = 10 * s;
      const bodyH = 28 * s;
      const legL = 22 * s;
      const armL = 18 * s;
      const leanX = opts.leanX || 0;
      const leanA = opts.leanAngle || 0;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(leanA);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5 * s;
      ctx.lineCap = 'round';

      const headY = -bodyH - legL / 2 - headR * 2 + 10 * s;
      const bodyTop = headY + headR * 2;
      const bodyBot = bodyTop + bodyH;

      ctx.beginPath();
      ctx.arc(leanX, headY + headR, headR, 0, TAU);
      ctx.stroke();

      let blink = opts.blink || 0;
      ctx.save();
      ctx.translate(leanX, headY + headR);
      ctx.scale(1, blink < .5 ? 1 : .2);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(-3.5 * s, -1 * s, 1.8 * s, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(3.5 * s, -1 * s, 1.8 * s, 0, TAU); ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(leanX, bodyTop);
      ctx.lineTo(leanX, bodyBot);
      ctx.stroke();

      const la = opts.leftArm || -PI / 4;
      const ra = opts.rightArm || PI / 4;
      ctx.beginPath();
      ctx.moveTo(leanX, bodyTop + 6 * s);
      ctx.lineTo(leanX + Math.cos(PI + la) * armL, bodyTop + 6 * s + Math.sin(PI + la) * armL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(leanX, bodyTop + 6 * s);
      ctx.lineTo(leanX + Math.cos(ra) * armL, bodyTop + 6 * s + Math.sin(ra) * armL);
      ctx.stroke();

      const ll = opts.leftLeg || PI / 4;
      const rl = opts.rightLeg || -PI / 4;
      ctx.beginPath();
      ctx.moveTo(leanX, bodyBot);
      ctx.lineTo(leanX + Math.cos(PI / 2 + ll) * legL, bodyBot + Math.cos(ll) * legL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(leanX, bodyBot);
      ctx.lineTo(leanX + Math.cos(PI / 2 + rl) * legL, bodyBot + Math.cos(rl) * legL);
      ctx.stroke();

      ctx.restore();
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function scene1(ctx, t) {
      ctx.clearRect(0, 0, 140, 180);
      const cy = 145;

      const blink = Math.sin(t * 0.3) > 0.95 ? 0.1 : 1;
      const writePhase = (Math.sin(t * 2.5) + 1) / 2;
      const pencilX = 30 + writePhase * 28;
      const pencilY = cy - 44 + Math.sin(t * 2.5) * 3;

      ctx.save();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(59,130,246,0.08)';
      roundRect(ctx, 20, cy - 56, 100, 36, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const lines = [0, 8, 16];
      lines.forEach((ly, i) => {
        const lineW = i === 0 ? 60 : i === 1 ? 45 : 30;
        ctx.save();
        ctx.strokeStyle = 'rgba(59,130,246,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(28, cy - 48 + ly);
        ctx.lineTo(28 + lineW, cy - 48 + ly);
        ctx.stroke();
        ctx.restore();
      });

      ctx.save();
      ctx.translate(pencilX, pencilY);
      ctx.rotate(-0.5);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(3, 8); ctx.lineTo(-3, 8); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.strokeRect(-3, -14, 6, 6);
      ctx.restore();

      const armR = -PI / 3 + Math.sin(t * 2.5) * 0.4;
      drawPerson(ctx, 70, cy, '#3b82f6', {
        blink, leftArm: -PI / 5, rightArm: armR,
        leftLeg: 0.15, rightLeg: -0.15,
        leanX: Math.sin(t * 0.7) * 2
      });

      ctx.save();
      ctx.fillStyle = 'rgba(59,130,246,0.15)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(70, cy + 2, 18, 5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    function scene2(ctx, t) {
      ctx.clearRect(0, 0, 140, 180);
      const cy = 145;
      const blink = Math.sin(t * 0.28) > 0.95 ? 0.1 : 1;

      const numDots = 5;
      for (let i = 0; i < numDots; i++) {
        const angle = t * 1.2 + i * (TAU / numDots);
        const r = 38;
        const dx = Math.cos(angle) * r;
        const dy = Math.sin(angle) * r * 0.4;
        const sz = 5 + Math.sin(angle) * 2;
        const alpha = 0.3 + Math.sin(angle + PI) * 0.3;
        ctx.save();
        ctx.fillStyle = `rgba(245,158,11,${alpha})`;
        ctx.beginPath();
        ctx.arc(70 + dx, cy - 55 + dy, sz, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.lineDashOffset = -t * 12 % 24;
      ctx.beginPath();
      ctx.arc(70, cy - 55, 38, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      const magBob = Math.sin(t * 2) * 6;
      ctx.save();
      ctx.translate(92 + Math.sin(t * 1.5) * 4, cy - 72 + magBob);
      ctx.rotate(0.4 + Math.sin(t * 1.5) * 0.2);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(8, 8); ctx.lineTo(16, 16);
      ctx.stroke();
      ctx.restore();

      const armR = -PI * 0.4 + Math.sin(t * 2) * 0.3;
      drawPerson(ctx, 70, cy, '#f59e0b', {
        blink, rightArm: armR, leftArm: -PI / 5,
        leftLeg: 0.1, rightLeg: -0.1,
        leanAngle: Math.sin(t * 0.8) * 0.05
      });
    }

    function scene3(ctx, t) {
      ctx.clearRect(0, 0, 140, 180);
      const cy = 145;
      const blink = Math.sin(t * 0.25) > 0.95 ? 0.1 : 1;

      const bob = Math.sin(t * 1.5) * 3;

      ctx.save();
      ctx.fillStyle = 'rgba(16,185,129,0.1)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      roundRect(ctx, 30, cy - 86 + bob, 80, 60, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(16,185,129,0.2)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      roundRect(ctx, 36, cy - 80 + bob, 68, 12, 3);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      const checkProg = Math.min(1, (Math.sin(t * 1.5) + 1) / 2);
      if (checkProg > 0.1) {
        ctx.save();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(45, cy - 58 + bob);
        ctx.lineTo(55, cy - 48 + bob);
        ctx.lineTo(95, cy - 72 + bob);
        ctx.stroke();
        ctx.restore();
      }

      for (let i = 0; i < 4; i++) {
        const sa = (TAU / 4) * i + t * 2;
        const sr = 12 + Math.sin(t * 3 + i) * 4;
        ctx.save();
        ctx.fillStyle = '#10b981';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(70 + Math.cos(sa) * sr, cy - 56 + bob + Math.sin(sa) * sr * 0.5, 2, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      drawPerson(ctx, 70, cy, '#10b981', {
        blink,
        rightArm: -PI * 0.6 + Math.sin(t * 2) * 0.15,
        leftArm: -PI / 6,
        leftLeg: 0.12, rightLeg: -0.12,
        leanX: Math.sin(t * 0.6) * 1.5
      });
    }

    function scene4(ctx, t) {
      ctx.clearRect(0, 0, 140, 180);
      const cy = 145;
      const blink = Math.sin(t * 0.22) > 0.95 ? 0.1 : 1;

      const jumpH = Math.max(0, -Math.abs(Math.sin(t * 1.5)) * 22 + 2);
      const docBob = Math.sin(t * 1.8) * 5;

      ctx.save();
      ctx.fillStyle = 'rgba(139,92,246,0.12)';
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 1.5;
      roundRect(ctx, 42, cy - 92 + docBob, 52, 64, 6);
      ctx.fill();
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = 'rgba(139,92,246,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(50, cy - 80 + i * 10 + docBob);
        ctx.lineTo(86, cy - 80 + i * 10 + docBob);
        ctx.stroke();
      }

      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(70, cy - 42 + docBob, 8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'var(--bg)';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', 70, cy - 42 + docBob);
      ctx.restore();

      const confN = 6;
      for (let i = 0; i < confN; i++) {
        const cf = ((t * 0.5 + i / confN) % 1);
        const cx2 = 40 + i * 14 + Math.sin(t * 2 + i) * 8;
        const cy2 = cy - 110 + cf * 60;
        ctx.save();
        ctx.fillStyle = ['#3b82f6', '#10b981', '#f59e0b', '#f472b6', '#8b5cf6', '#10b981'][i];
        ctx.globalAlpha = (1 - cf) * 0.9;
        ctx.translate(cx2, cy2);
        ctx.rotate(t * 3 + i);
        ctx.fillRect(-3, -2, 6, 4);
        ctx.restore();
      }

      const jumpY = cy - jumpH;
      drawPerson(ctx, 70, jumpY, '#8b5cf6', {
        blink,
        leftArm: -PI * 0.7 + Math.sin(t * 3) * 0.4,
        rightArm: PI * 0.6 + Math.sin(t * 3 + 1) * 0.4,
        leftLeg: 0.3 + Math.sin(t * 3) * 0.2,
        rightLeg: -0.3 + Math.sin(t * 3 + 0.5) * 0.2,
        leanAngle: Math.sin(t * 1.5) * 0.06
      });
    }

    const scenes = [
      { ref: c1Ref, fn: scene1 },
      { ref: c2Ref, fn: scene2 },
      { ref: c3Ref, fn: scene3 },
      { ref: c4Ref, fn: scene4 }
    ];

    function loop() {
      t += 0.016;
      scenes.forEach(({ ref, fn }) => {
        if (ref.current) {
          const ctx = ref.current.getContext('2d');
          fn(ctx, t);
        }
      });
      animationId = requestAnimationFrame(loop);
    }
    loop();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="animated-hw-wrap">
      <div className="animated-hw-stages">
        <div className="animated-hw-stage">
          <canvas ref={c1Ref} className="animated-hw-canvas" width="140" height="180"></canvas>
          <div className="animated-hw-conn">
            <svg viewBox="0 0 44 24">
              <path d="M4 12 Q22 4 40 12" stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeDasharray="4 3" opacity=".5">
                <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.2s" repeatCount="indefinite" />
              </path>
              <polygon points="36,8 40,12 36,16" fill="#3b82f6" opacity=".5" />
            </svg>
          </div>
          <div className="animated-hw-label">
            <span className="animated-hw-num">step 01</span>
            <h3>Submit your request</h3>
            <p>Describe your assignment — topic, level, pages, deadline.</p>
          </div>
        </div>

        <div className="animated-hw-stage">
          <canvas ref={c2Ref} className="animated-hw-canvas" width="140" height="180"></canvas>
          <div className="animated-hw-conn">
            <svg viewBox="0 0 44 24">
              <path d="M4 12 Q22 4 40 12" stroke="#f59e0b" strokeWidth="1.5" fill="none" strokeDasharray="4 3" opacity=".5">
                <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.2s" repeatCount="indefinite" />
              </path>
              <polygon points="36,8 40,12 36,16" fill="#f59e0b" opacity=".5" />
            </svg>
          </div>
          <div className="animated-hw-label">
            <span className="animated-hw-num">step 02</span>
            <h3>We match an expert</h3>
            <p>Gabriel Academics selects your best-fit consultant.</p>
          </div>
        </div>

        <div className="animated-hw-stage">
          <canvas ref={c3Ref} className="animated-hw-canvas" width="140" height="180"></canvas>
          <div className="animated-hw-conn">
            <svg viewBox="0 0 44 24">
              <path d="M4 12 Q22 4 40 12" stroke="#10b981" strokeWidth="1.5" fill="none" strokeDasharray="4 3" opacity=".5">
                <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.2s" repeatCount="indefinite" />
              </path>
              <polygon points="36,8 40,12 36,16" fill="#10b981" opacity=".5" />
            </svg>
          </div>
          <div className="animated-hw-label">
            <span className="animated-hw-num">step 03</span>
            <h3>Quality review</h3>
            <p>Every submission passes our internal quality check.</p>
          </div>
        </div>

        <div className="animated-hw-stage">
          <canvas ref={c4Ref} className="animated-hw-canvas" width="140" height="180"></canvas>
          <div className="animated-hw-label">
            <span className="animated-hw-num">step 04</span>
            <h3>Secure delivery</h3>
            <p>Receive your work, rate the service, request revisions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
