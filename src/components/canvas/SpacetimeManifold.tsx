/**
 * SpacetimeManifold.tsx
 * 
 * Three.js particle system with manifold curves representing gravity wells.
 * Particles are high-density (2000+) but low-opacity for ethereal effect.
 * 
 * PHYSICS INSPIRATION:
 * - Particles represent matter flowing through curved spacetime
 * - Curves represent geodesics (straight paths in curved space)
 * - Mouse creates a "mass" that bends nearby spacetime
 * 
 * WEBGL FIXES:
 * - alpha: true for proper transparency
 * - antialias: true for crisp particles in Chrome
 * - Timestamp seed for unique patterns per visit
 */

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface SpacetimeManifoldProps {
    className?: string;
    particleCount?: number;
    curveCount?: number;
}

export default function SpacetimeManifold({
    className = '',
    particleCount = 2500,
    curveCount = 8,
}: SpacetimeManifoldProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const particlesRef = useRef<THREE.Points | null>(null);
    const curvesRef = useRef<THREE.Line[]>([]);
    const animationRef = useRef<number>(0);
    const mouseRef = useRef({ x: 0, y: 0, active: false });
    const timeRef = useRef(0);

    // Unique seed based on timestamp for variation per visit
    const seedRef = useRef(Date.now() % 10000);

    // Seeded random for consistent but unique patterns
    const seededRandom = useCallback((offset: number = 0) => {
        const x = Math.sin(seedRef.current + offset) * 10000;
        return x - Math.floor(x);
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Scene setup
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(
            60,
            container.offsetWidth / container.offsetHeight,
            0.1,
            1000
        );
        camera.position.z = 100;
        cameraRef.current = camera;

        // Renderer with Chrome rendering fixes
        const renderer = new THREE.WebGLRenderer({
            alpha: true,          // Proper transparency
            antialias: true,      // Crisp edges in Chrome
            powerPreference: 'high-performance',
        });
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0); // Transparent background
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Create particles
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const opacities = new Float32Array(particleCount);
        const sizes = new Float32Array(particleCount);
        const velocities: { x: number; y: number; z: number }[] = [];

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            // Distribute in a wide field
            positions[i3] = (seededRandom(i * 3) - 0.5) * 200;
            positions[i3 + 1] = (seededRandom(i * 3 + 1) - 0.5) * 150;
            positions[i3 + 2] = (seededRandom(i * 3 + 2) - 0.5) * 80;

            // Low opacity for ethereal effect
            opacities[i] = 0.05 + seededRandom(i * 5) * 0.15;

            // Variable sizes
            sizes[i] = 0.5 + seededRandom(i * 7) * 1.5;

            // Slow drift velocities
            velocities.push({
                x: (seededRandom(i * 11) - 0.5) * 0.02,
                y: (seededRandom(i * 13) - 0.5) * 0.02,
                z: (seededRandom(i * 17) - 0.5) * 0.01,
            });
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Custom shader for variable opacity particles
        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
                uColor: { value: new THREE.Color(0xE8E8EC) },
            },
            vertexShader: `
        attribute float opacity;
        attribute float size;
        varying float vOpacity;
        uniform float uPixelRatio;
        uniform float uTime;
        
        void main() {
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
            fragmentShader: `
        uniform vec3 uColor;
        varying float vOpacity;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = (1.0 - smoothstep(0.2, 0.5, dist)) * vOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);
        particlesRef.current = particles;

        // Create manifold curves (geodesics in curved spacetime)
        const curves: THREE.Line[] = [];
        const curveMaterial = new THREE.LineBasicMaterial({
            color: 0x4A5FBD,
            transparent: true,
            opacity: 0.12,
            linewidth: 1, // Note: linewidth only works in WebGL2 with specific conditions
        });

        for (let c = 0; c < curveCount; c++) {
            const curvePoints: THREE.Vector3[] = [];
            const startX = (seededRandom(c * 100) - 0.5) * 180;
            const startY = (seededRandom(c * 100 + 1) - 0.5) * 120;
            const amplitude = 20 + seededRandom(c * 100 + 2) * 40;
            const frequency = 0.5 + seededRandom(c * 100 + 3) * 1.5;
            const phase = seededRandom(c * 100 + 4) * Math.PI * 2;

            // Generate curved path (simulating geodesic bending)
            for (let i = 0; i <= 100; i++) {
                const t = i / 100;
                const x = startX + t * 180 - 90;
                const y = startY + Math.sin(t * Math.PI * frequency + phase) * amplitude;
                const z = Math.cos(t * Math.PI * 0.5 + phase) * 20 - 40;
                curvePoints.push(new THREE.Vector3(x, y, z));
            }

            const curveGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
            const curve = new THREE.Line(curveGeometry, curveMaterial.clone());
            scene.add(curve);
            curves.push(curve);
        }
        curvesRef.current = curves;

        // Mouse tracking
        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            mouseRef.current.active = true;
        };

        const handleMouseLeave = () => {
            mouseRef.current.active = false;
        };

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);

        // Animation loop
        const animate = () => {
            if (prefersReducedMotion) {
                renderer.render(scene, camera);
                return;
            }

            animationRef.current = requestAnimationFrame(animate);
            timeRef.current += 0.005;
            const t = timeRef.current;

            // Update particle positions
            const positions = particles.geometry.attributes.position.array as Float32Array;

            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;

                // Base drift
                positions[i3] += velocities[i].x;
                positions[i3 + 1] += velocities[i].y;
                positions[i3 + 2] += velocities[i].z;

                // Add subtle wave motion
                positions[i3 + 1] += Math.sin(t + i * 0.01) * 0.02;

                // Mouse gravity influence
                if (mouseRef.current.active) {
                    const px = positions[i3];
                    const py = positions[i3 + 1];
                    const mx = mouseRef.current.x * 80;
                    const my = mouseRef.current.y * 60;

                    const dx = mx - px;
                    const dy = my - py;
                    const distSq = dx * dx + dy * dy;
                    const maxDist = 2500; // 50^2

                    if (distSq < maxDist && distSq > 1) {
                        const force = 0.3 / Math.sqrt(distSq);
                        positions[i3] += dx * force;
                        positions[i3 + 1] += dy * force;
                    }
                }

                // Wrap around boundaries
                if (positions[i3] > 100) positions[i3] = -100;
                if (positions[i3] < -100) positions[i3] = 100;
                if (positions[i3 + 1] > 75) positions[i3 + 1] = -75;
                if (positions[i3 + 1] < -75) positions[i3 + 1] = 75;
            }

            particles.geometry.attributes.position.needsUpdate = true;

            // Animate curves - subtle wobble simulating spacetime fluctuation
            curves.forEach((curve, idx) => {
                const geo = curve.geometry;
                const pos = geo.attributes.position.array as Float32Array;

                for (let i = 0; i < pos.length / 3; i++) {
                    const originalY = pos[i * 3 + 1];
                    pos[i * 3 + 1] = originalY + Math.sin(t * 2 + i * 0.1 + idx) * 0.3;
                }

                geo.attributes.position.needsUpdate = true;

                // Curve bends toward mouse
                if (mouseRef.current.active) {
                    curve.rotation.z = mouseRef.current.x * 0.02;
                    curve.rotation.x = mouseRef.current.y * 0.01;
                } else {
                    curve.rotation.z *= 0.95;
                    curve.rotation.x *= 0.95;
                }
            });

            // Subtle camera drift
            camera.position.x = Math.sin(t * 0.2) * 2;
            camera.position.y = Math.cos(t * 0.15) * 2;

            // Update shader uniforms
            (particleMaterial.uniforms.uTime as { value: number }).value = t;

            renderer.render(scene, camera);
        };

        animate();

        // Handle resize
        const handleResize = () => {
            if (!container) return;
            camera.aspect = container.offsetWidth / container.offsetHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.offsetWidth, container.offsetHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', handleResize);
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseleave', handleMouseLeave);

            renderer.dispose();
            particleGeometry.dispose();
            particleMaterial.dispose();
            curves.forEach(curve => {
                curve.geometry.dispose();
                (curve.material as THREE.Material).dispose();
            });

            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, [particleCount, curveCount, seededRandom]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'auto',
                overflow: 'hidden',
            }}
        />
    );
}
