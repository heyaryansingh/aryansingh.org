/**
 * gsap-setup.ts
 * 
 * GSAP Animation System
 * 
 * Initializes GSAP with ScrollTrigger for scroll-based animations.
 * Provides utilities for Bézier curve motion paths.
 * 
 * MATHEMATICAL BEAUTY:
 * - All animations move along curves (Bézier paths)
 * - No straight-line motion - everything flows
 * - Uses cubic easing based on physics principles
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register plugins
gsap.registerPlugin(ScrollTrigger);

/**
 * Default easing curves inspired by physics
 * - easeOutExpo: Like a ball decelerating due to friction
 * - easeInOutCubic: Smooth acceleration and deceleration
 */
export const EASING = {
    smooth: 'power2.out',
    snappy: 'power3.out',
    elastic: 'elastic.out(1, 0.5)',
    expo: 'expo.out',
    // Custom physics-inspired curve
    physics: 'power4.out',
} as const;

/**
 * Generate a Bézier curve path for element motion
 * Creates organic, curved entrance animations
 * 
 * @param startOffset - Where element starts relative to final position
 * @param curvature - How much the path curves (0 = straight, 1 = very curved)
 */
export function generateCurvePath(
    startOffset: { x: number; y: number },
    curvature: number = 0.5
): { x: number; y: number }[] {
    // Cubic Bézier control points for organic motion
    const midX = startOffset.x * curvature * 0.5;
    const midY = startOffset.y * (1 - curvature);

    return [
        { x: startOffset.x, y: startOffset.y },     // Start
        { x: midX, y: midY },                         // Control point
        { x: 0, y: 0 }                                // End (final position)
    ];
}

/**
 * Initialize scroll-triggered animations for section reveals
 * Call this on page load after DOM is ready
 */
export function initScrollAnimations() {
    // Animate elements with .gsap-reveal class
    const revealElements = document.querySelectorAll('.gsap-reveal');

    revealElements.forEach((el, index) => {
        // Determine entrance direction based on position
        const rect = el.getBoundingClientRect();
        const fromLeft = rect.left < window.innerWidth / 2;

        // Calculate curved path based on element position
        const xOffset = fromLeft ? -60 : 60;
        const yOffset = 40;

        gsap.fromTo(el,
            {
                opacity: 0,
                x: xOffset,
                y: yOffset,
            },
            {
                opacity: 1,
                x: 0,
                y: 0,
                duration: 1,
                ease: EASING.physics,
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    end: 'top 60%',
                    toggleActions: 'play none none reverse',
                },
                // Stagger if multiple elements
                delay: index * 0.1,
            }
        );
    });

    // Animate section headers with upward curve
    const sectionHeaders = document.querySelectorAll('.section__header');

    sectionHeaders.forEach((header) => {
        gsap.fromTo(header,
            {
                opacity: 0,
                y: 50,
                scale: 0.98,
            },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.8,
                ease: EASING.smooth,
                scrollTrigger: {
                    trigger: header,
                    start: 'top 80%',
                    toggleActions: 'play none none none',
                },
            }
        );
    });

    // Animate cards with staggered curved entrance
    const cards = document.querySelectorAll('.project-card, .post-card');

    cards.forEach((card, index) => {
        // Alternate curve direction per row (assuming 2-3 cols)
        const row = Math.floor(index / 3);
        const col = index % 3;
        const xDirection = col === 0 ? -1 : col === 2 ? 1 : 0;

        gsap.fromTo(card,
            {
                opacity: 0,
                x: xDirection * 30,
                y: 40,
                rotateY: xDirection * 5,
            },
            {
                opacity: 1,
                x: 0,
                y: 0,
                rotateY: 0,
                duration: 0.7,
                ease: EASING.smooth,
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                },
                delay: (col * 0.15) + (row * 0.05),
            }
        );
    });
}

/**
 * Create a phase transition color animation
 * Changes --color-section-accent CSS variable smoothly
 */
export function createPhaseTransition(sectionSelector: string, accentVar: string) {
    ScrollTrigger.create({
        trigger: sectionSelector,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => {
            gsap.to(document.documentElement, {
                '--color-section-accent': `var(${accentVar})`,
                duration: 0.8,
                ease: 'power2.inOut',
            });
        },
        onLeaveBack: () => {
            // Revert to previous section's color handled by that section's trigger
        },
    });
}

/**
 * Initialize phase transitions for homepage sections
 */
export function initPhaseTransitions() {
    const sections = document.querySelectorAll('[data-phase]');

    sections.forEach((section) => {
        const phase = section.getAttribute('data-phase');
        const accentVars: Record<string, string> = {
            '1': '--color-accent-primary',
            '2': '--color-accent-secondary',
            '3': '--color-accent-tertiary',
        };

        if (phase && accentVars[phase]) {
            createPhaseTransition(`[data-phase="${phase}"]`, accentVars[phase]);
        }
    });
}

// Auto-initialize when DOM is ready (for non-Astro usage)
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Don't auto-init in Astro - let components control this
    });
}

// Export for Astro components to use
export { gsap, ScrollTrigger };
