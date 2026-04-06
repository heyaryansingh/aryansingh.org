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
}

export default function RandomPhoto({ photos, defaultCaption = "random photo of me" }: Props) {
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

    const maxWidth = 280;
    const maxHeight = 380;

    let width = maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }

    const caption = photos[currentIndex]?.caption || defaultCaption;

    return (
        <figure className="random-photo" onClick={handleClick} title="Click for another photo">
            <div
                className="random-photo__frame"
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
                        className="random-photo__img"
                        style={{ opacity: isLoading ? 0 : 1 }}
                    />
                )}

                {/* Tap hint */}
                {!isLoading && (
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
    background: #111114;
    border: 1px solid #2A2A30;
    transition:
        width 0.5s cubic-bezier(0.16, 1, 0.3, 1),
        height 0.5s cubic-bezier(0.16, 1, 0.3, 1),
        transform 0.3s ease,
        box-shadow 0.3s ease;
}

.random-photo__frame--empty {
    width: 280px;
    height: 350px;
}

.random-photo:hover .random-photo__frame {
    transform: scale(1.015);
    box-shadow: 0 8px 32px rgba(74, 95, 189, 0.15);
}

.random-photo__skeleton {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #111114 0%, #1A1A1E 50%, #111114 100%);
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

.random-photo__hint {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.65rem;
    color: #5A5A64;
    opacity: 0.4;
    transition: opacity 0.4s ease;
    pointer-events: none;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    letter-spacing: 0.05em;
}

.random-photo:hover .random-photo__hint {
    opacity: 0.7;
}

.random-photo__caption {
    margin-top: 12px;
    font-size: 0.875rem;
    color: #5A5A64;
    text-align: center;
    font-style: italic;
    transition: color 0.3s ease;
}

.random-photo:hover .random-photo__caption {
    color: #9898A0;
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
