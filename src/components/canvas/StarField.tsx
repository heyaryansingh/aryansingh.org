/**
 * StarField.tsx
 * 
 * WebGL star field using Three.js - site-wide background.
 * Stars twinkle and drift slowly across the void.
 * 
 * VISUAL DESIGN:
 * - Pure white points of varying brightness
 * - Subtle twinkling (opacity oscillation)
 * - Very slow drift (stars feel distant)
 * - No curves/lines - just points of light
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface StarFieldProps {
    className?: string;
    starCount?: number;
}

export default function StarField({
    className = '',
    starCount = 3000,
}: StarFieldProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>(0);

    // Unique seed per visit
    const seedRef = useRef(Date.now() % 10000);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Check for reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Seeded random
        const seededRandom = (offset: number = 0) => {
            const x = Math.sin(seedRef.current + offset) * 10000;
            return x - Math.floor(x);
        };

        // Scene
        const scene = new THREE.Scene();

        // Camera - wide FOV for depth
        const camera = new THREE.PerspectiveCamera(
            75,
            container.offsetWidth / container.offsetHeight,
            0.1,
            2000
        );
        camera.position.z = 500;

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        // Create stars
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const opacities = new Float32Array(starCount);
        const sizes = new Float32Array(starCount);
        const twinklePhases = new Float32Array(starCount);
        const twinkleSpeeds = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;

            // Distribute in a large sphere around camera
            const theta = seededRandom(i * 2) * Math.PI * 2;
            const phi = Math.acos(2 * seededRandom(i * 3) - 1);
            const r = 200 + seededRandom(i * 5) * 800;

            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = r * Math.cos(phi) - 400; // Offset so some are behind

            // Base opacity (will be modulated by twinkling)
            opacities[i] = 0.3 + seededRandom(i * 7) * 0.7;

            // Varying sizes - most small, few larger
            const sizeRand = seededRandom(i * 11);
            sizes[i] = sizeRand < 0.9 ? 1 + sizeRand * 2 : 3 + sizeRand * 3;

            // Twinkle parameters
            twinklePhases[i] = seededRandom(i * 13) * Math.PI * 2;
            twinkleSpeeds[i] = 0.5 + seededRandom(i * 17) * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Custom shader for twinkling stars
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
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
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
            fragmentShader: `
        varying float vOpacity;
        uniform float uTime;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          // Soft glow falloff
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vOpacity;
          
          // Slight warm/cool color variation
          vec3 color = vec3(0.95, 0.95, 1.0);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const stars = new THREE.Points(geometry, material);
        scene.add(stars);

        let time = 0;

        // Animation
        const animate = () => {
            animationRef.current = requestAnimationFrame(animate);

            if (prefersReducedMotion) {
                renderer.render(scene, camera);
                return;
            }

            time += 0.002;

            // Update twinkling
            const opacityAttr = geometry.attributes.opacity as THREE.BufferAttribute;
            const baseOpacities = opacities; // Original values

            for (let i = 0; i < starCount; i++) {
                const twinkle = Math.sin(time * twinkleSpeeds[i] + twinklePhases[i]);
                const newOpacity = baseOpacities[i] * (0.7 + twinkle * 0.3);
                (opacityAttr.array as Float32Array)[i] = newOpacity;
            }
            opacityAttr.needsUpdate = true;

            // Very slow rotation for subtle movement
            stars.rotation.y = time * 0.02;
            stars.rotation.x = Math.sin(time * 0.1) * 0.02;

            // Update shader time
            (material.uniforms.uTime as { value: number }).value = time;

            renderer.render(scene, camera);
        };

        animate();

        // Resize handler
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
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, [starCount]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                position: 'fixed',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: -1,
            }}
        />
    );
}
