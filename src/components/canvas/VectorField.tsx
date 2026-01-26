/**
 * VectorField.tsx
 * 
 * A flowing vector field visualization using Simplex noise.
 * Creates an organic, physics-inspired background effect.
 * 
 * PHYSICS INSPIRATION:
 * - Simulates a 2D flow field (like wind or fluid dynamics)
 * - Particles follow the gradient of a noise function
 * - Mouse interaction curves the field (like a charged particle affecting field lines)
 * 
 * MATHEMATICAL BEAUTY:
 * - Uses Simplex noise for smooth, organic patterns
 * - Field angles derived from noise gradient
 * - Particle trails create emergent flow patterns
 */

import { useEffect, useRef, useCallback } from 'react';
import { createNoise3D } from 'simplex-noise';

interface VectorFieldProps {
  className?: string;
  particleCount?: number;
  /** Flow speed multiplier */
  speed?: number;
  /** How strongly mouse affects the field */
  mouseInfluence?: number;
}

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  speed: number;
  life: number;
  maxLife: number;
}

export default function VectorField({
  className = '',
  particleCount = 800,
  speed = 1,
  mouseInfluence = 0.15,
}: VectorFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const timeRef = useRef(0);
  const noiseRef = useRef(createNoise3D());
  
  // Get theme colors from CSS variables
  const getColors = useCallback(() => {
    if (typeof window === 'undefined') return { primary: '#2D5A7B', bg: '#F8F7F4' };
    
    const style = getComputedStyle(document.documentElement);
    return {
      primary: style.getPropertyValue('--color-accent-primary').trim() || '#2D5A7B',
      secondary: style.getPropertyValue('--color-accent-secondary').trim() || '#8B4C3C',
      tertiary: style.getPropertyValue('--color-accent-tertiary').trim() || '#4A5D4F',
      bg: style.getPropertyValue('--color-bg-primary').trim() || '#F8F7F4',
    };
  }, []);

  // Initialize a single particle
  const createParticle = useCallback((width: number, height: number): Particle => {
    const x = Math.random() * width;
    const y = Math.random() * height;
    return {
      x,
      y,
      prevX: x,
      prevY: y,
      speed: 0.5 + Math.random() * 1.5,
      life: 0,
      maxLife: 100 + Math.random() * 200,
    };
  }, []);

  // Reset particle to random position
  const resetParticle = useCallback((particle: Particle, width: number, height: number) => {
    particle.x = Math.random() * width;
    particle.y = Math.random() * height;
    particle.prevX = particle.x;
    particle.prevY = particle.y;
    particle.life = 0;
    particle.maxLife = 100 + Math.random() * 200;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Just draw a subtle static gradient
      const colors = getColors();
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    
    // Set canvas size
    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      
      // Reinitialize particles on resize
      particlesRef.current = Array.from({ length: particleCount }, () => 
        createParticle(width, height)
      );
    };
    
    resize();
    window.addEventListener('resize', resize);

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Field scale - larger = smoother, smaller = more turbulent
    const fieldScale = 0.003;
    const noise = noiseRef.current;

    // Animation loop
    const animate = () => {
      timeRef.current += 0.003 * speed;
      const t = timeRef.current;
      const colors = getColors();

      // Fade previous frame (creates trails)
      ctx.fillStyle = colors.bg + 'E6'; // ~90% opacity for subtle trails
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles
      const particles = particlesRef.current;
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Store previous position for drawing lines
        p.prevX = p.x;
        p.prevY = p.y;

        // Get flow angle from noise field
        // The noise function returns values in [-1, 1], we map to [0, 2π]
        let angle = noise(p.x * fieldScale, p.y * fieldScale, t) * Math.PI * 2;

        // Mouse influence - curve field toward/away from cursor
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const distSq = dx * dx + dy * dy;
          const maxDist = 200;
          
          if (distSq < maxDist * maxDist) {
            const dist = Math.sqrt(distSq);
            const influence = (1 - dist / maxDist) * mouseInfluence;
            const mouseAngle = Math.atan2(dy, dx);
            // Blend toward mouse angle
            angle = angle + (mouseAngle - angle) * influence;
          }
        }

        // Move particle along field
        const vx = Math.cos(angle) * p.speed * speed;
        const vy = Math.sin(angle) * p.speed * speed;
        p.x += vx;
        p.y += vy;
        p.life++;

        // Reset if out of bounds or too old
        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height || p.life > p.maxLife) {
          resetParticle(p, width, height);
          continue;
        }

        // Calculate opacity based on life (fade in and out)
        const lifeRatio = p.life / p.maxLife;
        const fadeIn = Math.min(1, p.life / 20);
        const fadeOut = Math.min(1, (p.maxLife - p.life) / 30);
        const baseAlpha = fadeIn * fadeOut * 0.4;

        // Color based on position (creates subtle gradient)
        const xRatio = p.x / width;
        const yRatio = p.y / height;
        let color: string;
        
        if (xRatio + yRatio < 1) {
          color = colors.primary;
        } else if (xRatio > yRatio) {
          color = colors.secondary;
        } else {
          color = colors.tertiary;
        }

        // Draw line from previous to current position
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = baseAlpha;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationRef.current);
    };
  }, [particleCount, speed, mouseInfluence, createParticle, resetParticle, getColors]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
      }}
    />
  );
}
