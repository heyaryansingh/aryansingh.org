/**
 * DoublePendulum.tsx
 * 
 * Interactive double pendulum with periodic "reveal" moments.
 * Every few seconds, it displays a piece of information when in a specific state.
 * 
 * PHYSICS: Lagrangian mechanics for realistic chaotic motion
 * FEATURE: Reveals stats/facts at interval moments
 */

import { useEffect, useRef, useState } from 'react';

interface DoublePendulumProps {
    className?: string;
    width?: number;
    height?: number;
    facts?: string[];
    revealInterval?: number;
}

const defaultFacts = [
    "4.0 GPA",
    "USACO Platinum",
    "USAPhO Gold",
    "50K+ screenings",
    "8 US states",
    "$150K+ raised",
    "JHU CS + BME",
    "NeuroVoice",
];

export default function DoublePendulum({
    className = '',
    width = 350,
    height = 350,
    facts = defaultFacts,
    revealInterval = 5000,
}: DoublePendulumProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const [currentFact, setCurrentFact] = useState('');
    const [showFact, setShowFact] = useState(false);
    const factIndexRef = useRef(0);

    useEffect(() => {
        // Reveal facts at intervals
        const revealTimer = setInterval(() => {
            setShowFact(true);
            setCurrentFact(facts[factIndexRef.current % facts.length]);
            factIndexRef.current++;

            // Hide after 2s
            setTimeout(() => setShowFact(false), 2500);
        }, revealInterval);

        return () => clearInterval(revealTimer);
    }, [facts, revealInterval]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const g = 0.5;
        const damping = 0.9999;
        const length1 = 90;
        const length2 = 70;
        const mass1 = 10;
        const mass2 = 10;

        let angle1 = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
        let angle2 = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        let angVel1 = 0;
        let angVel2 = 0;

        const trail: { x: number; y: number; opacity: number }[] = [];
        const maxTrail = 200;

        const originX = width / 2;
        const originY = height / 3;

        const animate = () => {
            if (prefersReducedMotion) {
                ctx.fillStyle = 'rgba(10, 10, 12, 1)';
                ctx.fillRect(0, 0, width, height);
                return;
            }

            animationRef.current = requestAnimationFrame(animate);

            // Physics
            const L1 = length1;
            const L2 = length2;
            const m1 = mass1;
            const m2 = mass2;

            const num1 = -g * (2 * m1 + m2) * Math.sin(angle1);
            const num2 = -m2 * g * Math.sin(angle1 - 2 * angle2);
            const num3 = -2 * Math.sin(angle1 - angle2) * m2;
            const num4 = angVel2 * angVel2 * L2 + angVel1 * angVel1 * L1 * Math.cos(angle1 - angle2);
            const den = L1 * (2 * m1 + m2 - m2 * Math.cos(2 * angle1 - 2 * angle2));
            const angAcc1 = (num1 + num2 + num3 * num4) / den;

            const num5 = 2 * Math.sin(angle1 - angle2);
            const num6 = angVel1 * angVel1 * L1 * (m1 + m2);
            const num7 = g * (m1 + m2) * Math.cos(angle1);
            const num8 = angVel2 * angVel2 * L2 * m2 * Math.cos(angle1 - angle2);
            const den2 = L2 * (2 * m1 + m2 - m2 * Math.cos(2 * angle1 - 2 * angle2));
            const angAcc2 = (num5 * (num6 + num7 + num8)) / den2;

            angVel1 += angAcc1;
            angVel2 += angAcc2;
            angVel1 *= damping;
            angVel2 *= damping;
            angle1 += angVel1;
            angle2 += angVel2;

            const x1 = originX + L1 * Math.sin(angle1);
            const y1 = originY + L1 * Math.cos(angle1);
            const x2 = x1 + L2 * Math.sin(angle2);
            const y2 = y1 + L2 * Math.cos(angle2);

            // Add to trail with fading
            trail.push({ x: x2, y: y2, opacity: 1 });
            if (trail.length > maxTrail) trail.shift();

            // Fade trail
            trail.forEach(p => p.opacity *= 0.99);

            // Clear with fade
            ctx.fillStyle = 'rgba(10, 10, 12, 0.12)';
            ctx.fillRect(0, 0, width, height);

            // Draw trail with gradient
            if (trail.length > 1) {
                for (let i = 1; i < trail.length; i++) {
                    const p1 = trail[i - 1];
                    const p2 = trail[i];
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(74, 95, 189, ${p2.opacity * 0.8})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            // Draw pendulum
            ctx.strokeStyle = 'rgba(232, 232, 236, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Draw pivot
            ctx.fillStyle = 'rgba(232, 232, 236, 0.4)';
            ctx.beginPath();
            ctx.arc(originX, originY, 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw masses with glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(74, 95, 189, 0.5)';

            ctx.fillStyle = '#4A5FBD';
            ctx.beginPath();
            ctx.arc(x1, y1, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#6B7FD4';
            ctx.beginPath();
            ctx.arc(x2, y2, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
        };

        animate();

        return () => {
            cancelAnimationFrame(animationRef.current);
        };
    }, [width, height]);

    return (
        <div className={className} style={{ position: 'relative', display: 'inline-block' }}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{
                    borderRadius: '12px',
                    background: '#0A0A0C',
                }}
            />

            {/* Fact reveal overlay */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#4A5FBD',
                    textAlign: 'center',
                    opacity: showFact ? 1 : 0,
                    transition: 'opacity 0.5s ease',
                    textShadow: '0 0 10px rgba(74, 95, 189, 0.5)',
                    whiteSpace: 'nowrap',
                }}
            >
                {currentFact}
            </div>
        </div>
    );
}
