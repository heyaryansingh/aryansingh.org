/**
 * SpacetimeCursor.tsx
 * 
 * Canvas overlay that draws spacetime manifold lines that curve toward the cursor.
 * Lines become MORE visible and apparent over time.
 * Creates the effect of a "mass" in spacetime bending geodesics.
 */

import { useEffect, useRef } from 'react';

interface SpacetimeCursorProps {
    lineCount?: number;
}

// Get line color based on theme - white in dark mode, dark in light mode
const getLineColor = () => {
    if (typeof window === 'undefined') return { r: 200, g: 200, b: 200 };

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    if (isDark) {
        // White/light gray for dark mode
        return { r: 180, g: 180, b: 190 };
    } else {
        // Dark gray for light mode
        return { r: 60, g: 60, b: 70 };
    }
};

export default function SpacetimeCursor({
    lineCount = 14,
}: SpacetimeCursorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const animationRef = useRef<number>(0);
    const timeRef = useRef(0);
    const intensityRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Check for reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        // Resize handler
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Mouse tracking
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
        };

        const handleMouseLeave = () => {
            mouseRef.current.x = -1000;
            mouseRef.current.y = -1000;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        // Draw a bent line toward the cursor with variable intensity
        const drawBentLine = (
            x1: number, y1: number, x2: number, y2: number,
            mouseX: number, mouseY: number,
            intensity: number,
            time: number
        ) => {
            const segments = 60;
            ctx.beginPath();
            ctx.moveTo(x1, y1);

            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const baseX = x1 + (x2 - x1) * t;
                const baseY = y1 + (y2 - y1) * t;

                // Time-based wave
                const wave = Math.sin(time * 0.5 + t * 4) * 3 * intensity;

                // Calculate bend toward cursor
                const dx = mouseX - baseX;
                const dy = mouseY - baseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxInfluence = 250;

                let bendX = baseX;
                let bendY = baseY + wave;

                if (dist < maxInfluence && dist > 10) {
                    const influence = Math.pow(1 - dist / maxInfluence, 2) * 50 * intensity;
                    bendX = baseX + (dx / dist) * influence;
                    bendY = baseY + (dy / dist) * influence + wave;
                }

                ctx.lineTo(bendX, bendY);
            }

            ctx.stroke();
        };

        // Animation loop
        const pageColor = getLineColor();
        const { r, g, b } = pageColor;

        const animate = () => {
            animationRef.current = requestAnimationFrame(animate);
            timeRef.current += 0.03;

            // Intensity increases over time (first 10 seconds)
            intensityRef.current = Math.min(1, intensityRef.current + 0.002);
            const intensity = intensityRef.current;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;
            const time = timeRef.current;

            // Base opacity increases with intensity
            const baseOpacity = 0.05 + intensity * 0.15;

            // Draw horizontal lines
            for (let i = 0; i <= lineCount; i++) {
                const y = (i / lineCount) * canvas.height;
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${baseOpacity})`;
                ctx.lineWidth = 1;
                drawBentLine(0, y, canvas.width, y, mx, my, intensity, time + i * 0.1);
            }

            // Draw vertical lines
            for (let i = 0; i <= lineCount; i++) {
                const x = (i / lineCount) * canvas.width;
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${baseOpacity})`;
                ctx.lineWidth = 1;
                drawBentLine(x, 0, x, canvas.height, mx, my, intensity, time + i * 0.1 + 5);
            }

            // Draw glow around cursor with pulsing
            if (mx > 0 && my > 0) {
                const pulseSize = 150 + Math.sin(time * 2) * 20;
                const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, pulseSize);
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.15 * intensity})`);
                gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${0.08 * intensity})`);
                gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(mx, my, pulseSize, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        animate();

        return () => {
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [lineCount]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 1,
            }}
        />
    );
}
