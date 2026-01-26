/**
 * RandomPhoto.tsx
 *
 * Displays a random photo. Click to show another random photo.
 * Pass photos as prop from Astro page (auto-discovered from folder).
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
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // Select random photo on mount
        if (photos.length > 0) {
            const randomIndex = Math.floor(Math.random() * photos.length);
            setCurrentIndex(randomIndex);
        }
    }, []);

    const handleClick = () => {
        if (photos.length <= 1) return;
        // Pick a different random photo
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * photos.length);
        } while (newIndex === currentIndex && photos.length > 1);
        setCurrentIndex(newIndex);
        setLoaded(false);
    };

    if (!photos || photos.length === 0) {
        return (
            <div className="random-photo random-photo--placeholder">
                <div className="random-photo__skeleton" />
                <style>{styles}</style>
            </div>
        );
    }

    const photo = photos[currentIndex];
    const caption = photo?.caption || defaultCaption;

    return (
        <figure className="random-photo" onClick={handleClick} title="Click for another photo">
            <div className="random-photo__frame">
                <img
                    src={photo.src}
                    alt={caption}
                    className={`random-photo__img ${loaded ? 'loaded' : ''}`}
                    onLoad={() => setLoaded(true)}
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
                {!loaded && <div className="random-photo__skeleton" />}
            </div>
            {caption && (
                <figcaption className="random-photo__caption">{caption}</figcaption>
            )}
            <style>{styles}</style>
        </figure>
    );
}

const styles = `
    .random-photo {
        position: relative;
        width: 100%;
        max-width: 280px;
        cursor: pointer;
    }

    .random-photo__frame {
        position: relative;
        aspect-ratio: 4 / 5;
        border-radius: 8px;
        overflow: hidden;
        background: var(--color-bg-secondary, #111114);
        border: 1px solid var(--color-border, #2A2A30);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .random-photo:hover .random-photo__frame {
        transform: scale(1.02);
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .random-photo__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.6s ease;
    }

    .random-photo__img.loaded {
        opacity: 1;
    }

    .random-photo__skeleton {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            135deg,
            var(--color-bg-secondary, #111114) 0%,
            var(--color-bg-tertiary, #1A1A1E) 50%,
            var(--color-bg-secondary, #111114) 100%
        );
        animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
        0% { opacity: 0.5; }
        50% { opacity: 1; }
        100% { opacity: 0.5; }
    }

    .random-photo__caption {
        margin-top: 8px;
        font-size: 0.875rem;
        color: var(--color-text-tertiary, #5A5A64);
        text-align: center;
        font-style: italic;
    }
`;
