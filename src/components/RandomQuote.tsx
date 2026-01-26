/**
 * RandomQuote.tsx
 * 
 * Displays a random quote - no left border/line, centered text
 */

import { useState, useEffect } from 'react';
import quotesData from '../data/random-quotes.json';

interface Quote {
  text: string;
  author: string;
}

export default function RandomQuote() {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    const quotes = quotesData.quotes as Quote[];
    if (quotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setQuote(quotes[randomIndex]);
    }
  }, []);

  if (!quote) {
    return (
      <blockquote className="random-quote random-quote--loading">
        <span className="random-quote__skeleton" />
      </blockquote>
    );
  }

  return (
    <blockquote className="random-quote">
      <p className="random-quote__text">"{quote.text}"</p>
      <cite className="random-quote__author">- {quote.author}</cite>

      <style>{`
        .random-quote {
          position: relative;
          padding: 0 0 0 1.5rem;
          margin: 0;
          max-width: 380px;
          border: none;
        }

        /* Override global blockquote::before - add gap between line and text */
        .random-quote::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--color-section-accent, var(--color-accent-primary));
        }

        .random-quote__text {
          font-family: var(--font-serif, 'EB Garamond', Georgia, serif);
          font-size: clamp(1rem, 2.5vw, 1.125rem);
          line-height: 1.6;
          color: var(--color-text-secondary, #9898A0);
          margin: 0 0 0.5rem 0;
          font-style: italic;
          text-align: left;
        }

        .random-quote__author {
          display: block;
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          color: var(--color-text-tertiary, #5A5A64);
          font-style: normal;
          text-align: left;
        }

        .random-quote__skeleton {
          display: block;
          height: 60px;
          background: linear-gradient(
            90deg,
            var(--color-bg-secondary, #111114) 0%,
            var(--color-bg-tertiary, #1A1A1E) 50%,
            var(--color-bg-secondary, #111114) 100%
          );
          border-radius: 4px;
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </blockquote>
  );
}
