import React, { useEffect, useRef } from 'react';

export const EVCanvasBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle nodes for cyber EV energy flow
    const particleCount = Math.min(Math.floor(width / 22), 65);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        color: Math.random() > 0.45 ? '#00E676' : '#00B4FF',
        alpha: Math.random() * 0.5 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
      });
    }

    // Light trails on the simulated highway
    const highwayTrails = [];
    const trailCount = 12;
    for (let i = 0; i < trailCount; i++) {
      highwayTrails.push({
        x: (Math.random() - 0.5) * (width * 0.8) + width * 0.5,
        y: height * 0.55 + Math.random() * (height * 0.45),
        length: Math.random() * 120 + 60,
        speed: Math.random() * 4 + 3,
        color: i % 2 === 0 ? '#00E676' : '#00B4FF',
        width: Math.random() * 1.8 + 1,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Deep dark base gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.4,
        50,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.9
      );
      bgGrad.addColorStop(0, '#0E1624');
      bgGrad.addColorStop(0.5, '#0A0F17');
      bgGrad.addColorStop(1, '#05070B');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Central electric charging ambient glow
      const glowGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        10,
        width * 0.5,
        height * 0.45,
        width * 0.45
      );
      glowGrad.addColorStop(0, 'rgba(0, 230, 118, 0.12)');
      glowGrad.addColorStop(0.35, 'rgba(0, 180, 255, 0.06)');
      glowGrad.addColorStop(0.8, 'rgba(6, 182, 212, 0.01)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Cyber Perspective Grid Horizon
      const horizonY = height * 0.62;
      ctx.strokeStyle = 'rgba(0, 230, 118, 0.05)';
      ctx.lineWidth = 1;

      // Draw perspective vanishing lines
      const fovLines = 16;
      for (let i = -fovLines; i <= fovLines; i++) {
        ctx.beginPath();
        ctx.moveTo(width / 2, horizonY);
        const bottomX = width / 2 + (i * width) / (fovLines * 0.85);
        ctx.lineTo(bottomX, height);
        ctx.stroke();
      }

      // Draw horizontal scanning grid lines
      for (let y = horizonY; y < height; y += (height - horizonY) / 10) {
        const offsetProgress = (y - horizonY) / (height - horizonY);
        const currentY = horizonY + Math.pow(offsetProgress, 1.8) * (height - horizonY);
        ctx.strokeStyle = `rgba(0, 180, 255, ${0.03 + offsetProgress * 0.08})`;
        ctx.beginPath();
        ctx.moveTo(0, currentY);
        ctx.lineTo(width, currentY);
        ctx.stroke();
      }

      // Highway light trails (simulating high-speed EV light pulses)
      highwayTrails.forEach((trail) => {
        trail.y += trail.speed;
        if (trail.y > height) {
          trail.y = horizonY + 5;
          trail.x = (Math.random() - 0.5) * (width * 0.7) + width * 0.5;
        }

        const trailProgress = (trail.y - horizonY) / (height - horizonY);
        const trailAlpha = Math.sin(trailProgress * Math.PI) * 0.5;

        const lineGrad = ctx.createLinearGradient(trail.x, trail.y - trail.length, trail.x, trail.y);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(1, trail.color);

        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = trail.width * (1 + trailProgress * 1.5);
        ctx.globalAlpha = trailAlpha;
        ctx.beginPath();
        ctx.moveTo(trail.x, trail.y - trail.length);
        ctx.lineTo(trail.x, trail.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Render connected energy particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const dynamicAlpha = p.alpha + Math.sin(time + i) * 0.15;

        // Particle circle
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, dynamicAlpha));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Connect near particles with faint cyber lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 110) {
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = (1 - dist / 110) * 0.12;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Subtle vignette and scanline overlay */}
      <div className="absolute inset-0 bg-radial-vignette opacity-70" />
      <div className="absolute inset-0 cyber-grid opacity-20" />
    </div>
  );
};
