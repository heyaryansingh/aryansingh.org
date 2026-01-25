/**
 * GitHub API Integration
 *
 * Fetches repository data from GitHub's REST API.
 * Used at build time to populate the portfolio with live repo data.
 *
 * SETUP:
 * 1. Create a GitHub personal access token at https://github.com/settings/tokens
 * 2. Add GITHUB_TOKEN and GITHUB_USERNAME to your .env file
 * 3. Repos are fetched at build time and cached until next deploy
 *
 * The token only needs public_repo scope for read-only access.
 */

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  pushed_at: string;
  created_at: string;
  updated_at: string;
  fork: boolean;
  archived: boolean;
}

export interface ProcessedRepo {
  id: number;
  name: string;
  slug: string;
  description: string;
  url: string;
  demo: string | null;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  lastUpdated: Date;
  createdAt: Date;
  isFork: boolean;
  isArchived: boolean;
}

/**
 * Fetches all public repositories for the configured user
 */
export async function fetchGitHubRepos(): Promise<ProcessedRepo[]> {
  const token = import.meta.env.GITHUB_TOKEN;
  const username = import.meta.env.GITHUB_USERNAME;

  if (!token || !username) {
    console.warn('GitHub credentials not configured. Set GITHUB_TOKEN and GITHUB_USERNAME in .env');
    return [];
  }

  try {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token}`,
    };

    // Fetch up to 100 repos (paginate if needed)
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const repos: GitHubRepo[] = await response.json();

    // Filter and process repos
    return repos
      .filter((repo) => !repo.fork && !repo.archived) // Exclude forks and archived repos
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
        slug: repo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: repo.description || 'No description provided',
        url: repo.html_url,
        demo: repo.homepage || null,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        topics: repo.topics || [],
        lastUpdated: new Date(repo.pushed_at),
        createdAt: new Date(repo.created_at),
        isFork: repo.fork,
        isArchived: repo.archived,
      }))
      .sort((a, b) => b.stars - a.stars); // Sort by stars descending
  } catch (error) {
    console.error('Failed to fetch GitHub repos:', error);
    return [];
  }
}

/**
 * Fetches a single repository by name
 */
export async function fetchGitHubRepo(repoName: string): Promise<ProcessedRepo | null> {
  const token = import.meta.env.GITHUB_TOKEN;
  const username = import.meta.env.GITHUB_USERNAME;

  if (!token || !username) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/${repoName}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const repo: GitHubRepo = await response.json();

    return {
      id: repo.id,
      name: repo.name,
      slug: repo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: repo.description || 'No description provided',
      url: repo.html_url,
      demo: repo.homepage || null,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      topics: repo.topics || [],
      lastUpdated: new Date(repo.pushed_at),
      createdAt: new Date(repo.created_at),
      isFork: repo.fork,
      isArchived: repo.archived,
    };
  } catch (error) {
    console.error(`Failed to fetch repo ${repoName}:`, error);
    return null;
  }
}

/**
 * Gets all unique languages from repos
 */
export function getLanguages(repos: ProcessedRepo[]): string[] {
  const languages = new Set<string>();
  repos.forEach((repo) => {
    if (repo.language) {
      languages.add(repo.language);
    }
  });
  return Array.from(languages).sort();
}

/**
 * Gets all unique topics from repos
 */
export function getTopics(repos: ProcessedRepo[]): string[] {
  const topics = new Set<string>();
  repos.forEach((repo) => {
    repo.topics.forEach((topic) => topics.add(topic));
  });
  return Array.from(topics).sort();
}
