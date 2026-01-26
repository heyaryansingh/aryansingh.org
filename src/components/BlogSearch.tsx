/**
 * BlogSearch.tsx
 * 
 * Client-side search component for filtering blog posts.
 * Supports filtering by title, tags, and category.
 * 
 * USAGE: Pass all posts data as prop, renders a filtered list.
 */

import { useState, useMemo } from 'react';

interface Post {
    slug: string;
    title: string;
    description: string;
    date: string;
    type: string;
    tags: string[];
    category?: string;
    readingTime: string;
}

interface BlogSearchProps {
    posts: Post[];
    allTags: string[];
    allTypes: string[];
}

export default function BlogSearch({ posts, allTags, allTypes }: BlogSearchProps) {
    const [query, setQuery] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedTag, setSelectedTag] = useState('');

    // Filter posts based on search and filters
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            // Text search
            const searchText = query.toLowerCase();
            const matchesSearch = !query ||
                post.title.toLowerCase().includes(searchText) ||
                post.description.toLowerCase().includes(searchText) ||
                post.tags.some(tag => tag.toLowerCase().includes(searchText));

            // Type filter
            const matchesType = selectedType === 'all' || post.type === selectedType;

            // Tag filter
            const matchesTag = !selectedTag ||
                post.tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase());

            return matchesSearch && matchesType && matchesTag;
        });
    }, [posts, query, selectedType, selectedTag]);

    const typeLabels: Record<string, string> = {
        'all': 'All Posts',
        'technical': 'Technical',
        'paper-summary': 'Paper Summaries',
        'monthly-update': 'Updates',
        'reflection': 'Reflections',
    };

    const typeColors: Record<string, string> = {
        'technical': 'var(--color-accent-secondary, #6B7FD4)',
        'paper-summary': 'var(--color-accent-primary, #4A5FBD)',
        'monthly-update': 'var(--color-success, #4A9F6E)',
        'reflection': 'var(--color-accent-tertiary, #3D4F9A)',
    };

    return (
        <div className="blog-search">
            {/* Search Input */}
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Search posts by title, description, or tag..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="search-input"
                />
                {query && (
                    <button
                        className="search-clear"
                        onClick={() => setQuery('')}
                        aria-label="Clear search"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="filters">
                {/* Type filters */}
                <div className="filter-group">
                    {['all', ...allTypes].map((type) => (
                        <button
                            key={type}
                            className={`filter-btn ${selectedType === type ? 'active' : ''}`}
                            onClick={() => setSelectedType(type)}
                        >
                            {typeLabels[type] || type}
                        </button>
                    ))}
                </div>

                {/* Tag filter */}
                {allTags.length > 0 && (
                    <select
                        className="tag-select"
                        value={selectedTag}
                        onChange={(e) => setSelectedTag(e.target.value)}
                    >
                        <option value="">All Tags</option>
                        {allTags.map((tag) => (
                            <option key={tag} value={tag}>{tag}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Results count */}
            <p className="results-count">
                {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''} found
            </p>

            {/* Posts list */}
            <div className="posts-list">
                {filteredPosts.length === 0 ? (
                    <p className="no-results">No posts match your search. Try different keywords.</p>
                ) : (
                    filteredPosts.map((post) => (
                        <article
                            key={post.slug}
                            className="post-item"
                            style={{ '--type-color': typeColors[post.type] || 'var(--color-text-tertiary)' } as React.CSSProperties}
                        >
                            <div className="post-item__meta">
                                <time>{post.date}</time>
                                <span className="divider">/</span>
                                <span>{post.readingTime}</span>
                            </div>

                            <h2 className="post-item__title">
                                <a href={`/blog/${post.slug}`}>{post.title}</a>
                            </h2>

                            <p className="post-item__description">{post.description}</p>

                            <div className="post-item__footer">
                                <span className="post-item__type">{typeLabels[post.type] || post.type}</span>
                                <div className="post-item__tags">
                                    {post.tags.slice(0, 3).map((tag) => (
                                        <span
                                            key={tag}
                                            className="post-item__tag"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setSelectedTag(tag);
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </div>

            <style>{`
        .blog-search {
          max-width: 800px;
          margin: 0 auto;
        }

        .search-bar {
          position: relative;
          margin-bottom: var(--space-xl, 2.5rem);
        }

        .search-input {
          width: 100%;
          padding: var(--space-md, 0.875rem) var(--space-lg, 1.5rem);
          font-size: var(--text-base, 1rem);
          font-family: inherit;
          background: var(--color-bg-secondary, #111114);
          border: 1px solid var(--color-border, #2A2A30);
          border-radius: var(--radius-lg, 6px);
          color: var(--color-text-primary, #E8E8EC);
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: var(--color-accent-primary, #4A5FBD);
        }

        .search-input::placeholder {
          color: var(--color-text-tertiary, #5A5A64);
        }

        .search-clear {
          position: absolute;
          right: var(--space-md, 0.875rem);
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--color-text-tertiary, #5A5A64);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-md, 0.875rem);
          margin-bottom: var(--space-lg, 1.5rem);
          align-items: center;
        }

        .filter-group {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-sm, 0.5rem);
        }

        .filter-btn {
          padding: var(--space-sm, 0.5rem) var(--space-md, 0.875rem);
          font-size: var(--text-sm, 0.875rem);
          font-weight: 500;
          color: var(--color-text-secondary, #9898A0);
          background: var(--color-bg-secondary, #111114);
          border: 1px solid var(--color-border, #2A2A30);
          border-radius: var(--radius-md, 4px);
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          color: var(--color-text-primary, #E8E8EC);
          border-color: var(--color-accent-primary, #4A5FBD);
        }

        .filter-btn.active {
          color: white;
          background: var(--color-accent-primary, #4A5FBD);
          border-color: var(--color-accent-primary, #4A5FBD);
        }

        .tag-select {
          padding: var(--space-sm, 0.5rem) var(--space-md, 0.875rem);
          font-size: var(--text-sm, 0.875rem);
          background: var(--color-bg-secondary, #111114);
          border: 1px solid var(--color-border, #2A2A30);
          border-radius: var(--radius-md, 4px);
          color: var(--color-text-primary, #E8E8EC);
          cursor: pointer;
        }

        .results-count {
          font-size: var(--text-sm, 0.875rem);
          color: var(--color-text-tertiary, #5A5A64);
          margin-bottom: var(--space-xl, 2.5rem);
        }

        .posts-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-xl, 2.5rem);
        }

        .no-results {
          text-align: center;
          color: var(--color-text-tertiary, #5A5A64);
          padding: var(--space-3xl, 6.5rem) 0;
        }

        .post-item {
          padding: var(--space-xl, 2.5rem);
          border-radius: var(--radius-lg, 6px);
          border: 1px solid var(--color-border, #2A2A30);
          background: var(--color-bg-secondary, #111114);
          transition: all 0.3s ease;
        }

        .post-item:hover {
          border-color: var(--type-color);
          transform: translateX(8px);
          box-shadow: -4px 0 0 var(--type-color);
        }

        .post-item__meta {
          display: flex;
          align-items: center;
          gap: var(--space-sm, 0.5rem);
          font-size: var(--text-sm, 0.875rem);
          color: var(--color-text-tertiary, #5A5A64);
          margin-bottom: var(--space-sm, 0.5rem);
        }

        .divider {
          opacity: 0.5;
        }

        .post-item__title {
          font-size: var(--text-2xl, 1.5rem);
          font-weight: 600;
          margin-bottom: var(--space-sm, 0.5rem);
          line-height: 1.3;
        }

        .post-item__title a {
          color: var(--color-text-primary, #E8E8EC);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .post-item:hover .post-item__title a {
          color: var(--type-color);
        }

        .post-item__description {
          color: var(--color-text-secondary, #9898A0);
          line-height: 1.6;
          margin-bottom: var(--space-md, 0.875rem);
        }

        .post-item__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-md, 0.875rem);
        }

        .post-item__type {
          padding: var(--space-xs, 0.25rem) var(--space-sm, 0.5rem);
          font-size: var(--text-xs, 0.75rem);
          font-weight: 500;
          text-transform: capitalize;
          color: var(--type-color);
          border: 1px solid var(--type-color);
          border-radius: var(--radius-md, 4px);
        }

        .post-item__tags {
          display: flex;
          gap: var(--space-xs, 0.25rem);
        }

        .post-item__tag {
          padding: var(--space-xs, 0.25rem) var(--space-sm, 0.5rem);
          font-size: var(--text-xs, 0.75rem);
          background: var(--color-bg-tertiary, #1A1A1E);
          border-radius: var(--radius-md, 4px);
          color: var(--color-text-secondary, #9898A0);
          cursor: pointer;
          transition: all 0.2s;
        }

        .post-item__tag:hover {
          background: var(--color-accent-primary, #4A5FBD);
          color: white;
        }
      `}</style>
        </div>
    );
}
