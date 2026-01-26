/**
 * RandomPhoto.tsx
 * 
 * Displays a random photo from the curated collection.
 * Different photo each page load (or consistent within session if preferred).
 */

import { useState, useEffect } from 'react';
import photosData from '../data/random-photos.json';

interface Photo {
    src: string;
    caption?: string;
}

export default function RandomPhoto() {
    const [photo, setPhoto] = useState<Photo | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // Select random photo
        const photos = photosData.photos as Photo[];
        if (photos.length > 0) {
            const randomIndex = Math.floor(Math.random() * photos.length);
            setPhoto(photos[randomIndex]);
        }
    }, []);

    if (!photo) {
        return (
            <div className="random-photo random-photo--placeholder">
                <div className="random-photo__skeleton" />
            </div>
        );
    }

    return (
        <figure className="random-photo">
            <div className="random-photo__frame">
                <img
                    src={photo.src}
                    alt={photo.caption || 'Photo of Aryan'}
                    className={`random-photo__img ${loaded ? 'loaded' : ''}`}
                    onLoad={() => setLoaded(true)}
                    onError={(e) => {
                        // Fallback to gradient placeholder
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
                {!loaded && <div className="random-photo__skeleton" />}
            </div>
            {photo.caption && (
                <figcaption className="random-photo__caption">{photo.caption}</figcaption>
            )}

            <style>{`
        .random-photo {
          position: relative;
          width: 100%;
          max-width: 280px;
        }

        .random-photo__frame {
          position: relative;
          aspect-ratio: 4 / 5;
          border-radius: 8px;
          overflow: hidden;
          background: var(--color-bg-secondary, #111114);
          border: 1px solid var(--color-border, #2A2A30);
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
      `}</style>
        </figure>
    );
}
