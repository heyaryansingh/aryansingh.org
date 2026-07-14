/**
 * RandomPhoto.tsx
 *
 * Displays photos with natural aspect ratios and smooth transitions.
 * Uses image.decode() to ensure images are fully ready before display.
 * Click/tap to show another random photo.
 */

import { useState, useEffect } from 'react';

interface Photo {
    src: string;
    caption?: string;
}

interface Props {
    photos: Photo[];
    defaultCaption?: string;
    circle?: boolean;
    size?: number;
}

export default function RandomPhoto({ photos, defaultCaption = "random photo of me", circle = false, size = 112 }: Props) {
    const [currentPhoto, setCurrentPhoto] = useState<{
        src: string;
        width: number;
        height: number;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Load and decode image completely before displaying
    const loadImage = async (src: string): Promise<{ src: string; width: number; height: number }> => {
        const img = new Image();
        img.src = src;

        // Wait for image to load
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
        });

        // Decode image to ensure it's ready to paint (no flash)
        if (img.decode) {
            await img.decode();
        }

        return {
            src,
            width: img.naturalWidth,
            height: img.naturalHeight
        };
    };

    // Initial load
    useEffect(() => {
        if (photos.length === 0) return;

        const randomIndex = Math.floor(Math.random() * photos.length);
        setCurrentIndex(randomIndex);

        loadImage(photos[randomIndex].src)
            .then(photo => {
                setCurrentPhoto(photo);
                setIsLoading(false);
            })
            .catch(() => {
                setIsLoading(false);
            });
    }, []);

    // Handle click to switch photos
    const handleClick = async () => {
        if (photos.length <= 1 || isLoading) return;

        // Pick different random photo
        let newIndex: number;
        do {
            newIndex = Math.floor(Math.random() * photos.length);
        } while (newIndex === currentIndex && photos.length > 1);

        setIsLoading(true);

        try {
            const newPhoto = await loadImage(photos[newIndex].src);
            setCurrentPhoto(newPhoto);
            setCurrentIndex(newIndex);
        } catch {
            // Keep current photo on error
        }

        setIsLoading(false);
    };

    // Empty state
    if (!photos || photos.length === 0) {
        return (
            <div className="random-photo">
                <div className="random-photo__frame random-photo__frame--empty">
                    <div className="random-photo__skeleton" />
                </div>
                <style>{styles}</style>
            </div>
        );
    }

    // Calculate container dimensions
    const aspectRatio = currentPhoto
        ? currentPhoto.width / currentPhoto.height
        : 4 / 5;

    let width: number;
    let height: number;
    if (circle) {
        width = size;
        height = size;
    } else {
        const maxWidth = 280;
        const maxHeight = 380;
        width = maxWidth;
        height = width / aspectRatio;
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }
    }

    const caption = photos[currentIndex]?.caption || defaultCaption;

    return (
        <figure className="random-photo" onClick={handleClick} title="Click for another photo">
            <div
                className={`random-photo__frame${circle ? " is-circle" : ""}`}
                style={{ width: `${width}px`, height: `${height}px` }}
            >
                {/* Skeleton - shown when loading */}
                <div
                    className="random-photo__skeleton"
                    style={{ opacity: isLoading ? 1 : 0 }}
                />

                {/* Photo - shown when ready */}
                {currentPhoto && (
                    <img
                        src={currentPhoto.src}
                        alt={caption}
                        className={`random-photo__img${circle ? " is-cover" : ""}`}
                        style={{ opacity: isLoading ? 0 : 1 }}
                    />
                )}

                {/* Tap hint */}
                {!isLoading && !circle && (
                    <div className="random-photo__hint">tap to switch</div>
                )}
            </div>

            <figcaption className="random-photo__caption">{caption}</figcaption>
            <style>{styles}</style>
        </figure>
    );
}

const styles = `
.random-photo {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
}

.random-photo__frame {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}

.random-photo__frame.is-circle {
    border-radius: 50%;
}

.random-photo__frame--empty {
    width: 280px;
    height: 350px;
}

.random-photo:hover .random-photo__frame {
    transform: scale(1.02);
    box-shadow: var(--shadow-md);
}

.random-photo__skeleton {
    position: absolute;
    inset: 0;
    background: var(--color-bg-tertiary);
    animation: shimmer 2s infinite;
    transition: opacity 0.3s ease;
}

@keyframes shimmer {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
}

.random-photo__img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.random-photo__img.is-cover {
    object-fit: cover;
}

.random-photo__hint {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.65rem;
    color: var(--color-text-tertiary);
    opacity: 0.5;
    transition: opacity 0.4s ease;
    pointer-events: none;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    letter-spacing: 0.05em;
    font-family: var(--font-mono);
}

.random-photo:hover .random-photo__hint {
    opacity: 0.8;
}

.random-photo__caption {
    margin-top: 10px;
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    text-align: center;
    font-family: var(--font-mono);
    transition: color 0.3s ease;
}

.random-photo:hover .random-photo__caption {
    color: var(--color-text-secondary);
}

@media (hover: none) {
    .random-photo:active .random-photo__frame {
        transform: scale(0.98);
    }
    .random-photo__hint {
        opacity: 0.5;
    }
}
`;
