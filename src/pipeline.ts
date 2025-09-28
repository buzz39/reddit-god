// --- Type Definitions ---

export interface RedditPost {
  post_title: string;
  upvotes: number;
}

export interface Subreddit {
  name: string;
  title: string;
  description: string;
  subscribers: number;
  active_user_count: number;
  over18: boolean;
  score: number;
  reasons: string[];
  preview_samples: RedditPost[];
}

export interface CopilotOptions {
  limit?: number;
  nsfw?: "include" | "exclude" | "only";
  min_subscribers?: number;
  locale?: string;
  sort?: "relevance" | "subscribers" | "activity" | "hybrid";
  time_window?: "day" | "week" | "month" | "year" | "all";
  allow_small?: boolean;
  expand_from_seeds?: number;
}

export interface CopilotInput {
  interests: string[];
  options?: CopilotOptions;
}

export interface CopilotOutput {
  interests: string[];
  results: Subreddit[];
  meta: {
    limit: number;
    filters: { nsfw: string; min_subscribers: number };
    sort: string;
    time_window: string;
    query_latency_ms: number;
    sources: string[];
    error?: string;
  };
}

// --- Pipeline Steps ---

export function normalizeInterests(interests: string[]): string[] {
  const normalized = interests.map(interest => {
    let processed = interest.toLowerCase().trim();
    // Simple alias mapping
    if (processed === 'js') processed = 'javascript';
    if (processed === 'py') processed = 'python';
    return processed;
  });
  return [...new Set(normalized)]; // Remove duplicates
}

import { searchSubreddits, autocompleteSubreddits, getRecommendations } from './reddit-api';

// A raw subreddit object from the Reddit API
export interface RawSubreddit {
  display_name: string;
  title: string;
  public_description: string;
  subscribers: number;
  accounts_active: number;
  over18: boolean;
  [key: string]: any; // Allow other properties
}

export async function discoverSeeds(
  interest: string,
  nsfw: boolean
): Promise<RawSubreddit[]> {
  const seeds: RawSubreddit[] = [];
  const seenNames = new Set<string>();

  const searchResults = await searchSubreddits(interest, 15, 'relevance', nsfw);
  if (searchResults?.data?.children) {
    for (const child of searchResults.data.children) {
      const sr = child.data as RawSubreddit;
      if (sr.display_name && !seenNames.has(sr.display_name.toLowerCase())) {
        seeds.push(sr);
        seenNames.add(sr.display_name.toLowerCase());
      }
    }
  }

  const autocompleteResults = await autocompleteSubreddits(interest, 10);
  if (autocompleteResults?.subreddits) {
    for (const sr of autocompleteResults.subreddits) {
      if (sr.name && !seenNames.has(sr.name.toLowerCase())) {
        // Autocomplete has a different structure, so we normalize it
        const normalizedSr: RawSubreddit = {
          display_name: sr.name,
          title: sr.name,
          public_description: '',
          subscribers: sr.subscriber_count,
          accounts_active: 0, // Not available in autocomplete
          over18: sr.over_18,
        };
        seeds.push(normalizedSr);
        seenNames.add(sr.name.toLowerCase());
      }
    }
  }

  return seeds;
}

function calculateSeedScore(seed: RawSubreddit, interest: string): number {
  const subscriberWeight = Math.log10(seed.subscribers + 1);
  const activityWeight = seed.accounts_active ? Math.log10(seed.accounts_active + 1) : 0;

  const title = seed.title.toLowerCase();
  const description = seed.public_description.toLowerCase();
  const name = seed.display_name.toLowerCase();

  let textMatch = 0;
  if (title.includes(interest)) textMatch += 0.5;
  if (name.includes(interest)) textMatch += 0.3;
  if (description.includes(interest)) textMatch += 0.2;

  // Simple BM25-lite: bonus for exact phrase match
  if (title.split(/\s+/).includes(interest)) textMatch += 0.2;
  if (name === interest) textMatch += 0.5;

  const score =
    0.5 * textMatch +
    0.3 * subscriberWeight +
    0.2 * activityWeight;

  return score;
}

export function selectTopSeeds(
  seeds: RawSubreddit[],
  interest: string,
  options: CopilotOptions
): RawSubreddit[] {
  const minSubscribers = options.min_subscribers ?? 1000;
  const allowSmall = options.allow_small ?? false;
  const expandFromSeeds = options.expand_from_seeds ?? 8;

  const scoredSeeds = seeds.map(seed => ({
    ...seed,
    score: calculateSeedScore(seed, interest),
  }));

  const filteredSeeds = scoredSeeds.filter(seed => {
    if (!allowSmall && seed.subscribers < minSubscribers) {
      return false;
    }
    if (options.nsfw === 'exclude' && seed.over18) {
      return false;
    }
    if (options.nsfw === 'only' && !seed.over18) {
      return false;
    }
    return true;
  });

  filteredSeeds.sort((a, b) => b.score - a.score);

  return filteredSeeds.slice(0, expandFromSeeds);
}

export async function expandRecommendations(
  seeds: RawSubreddit[]
): Promise<RawSubreddit[]> {
  if (seeds.length === 0) {
    return [];
  }

  const seedNames = seeds.map(seed => seed.display_name).join(',');
  const recommendations = await getRecommendations(seedNames);

  const recommendedSubs: RawSubreddit[] = [];
  if (recommendations?.sr_names) {
    for (const name of recommendations.sr_names) {
      // Recommendations only provide names, so we create partial objects
      const partialSr: RawSubreddit = {
        display_name: name,
        title: name,
        public_description: '',
        subscribers: 0,
        accounts_active: 0,
        over18: false, // Cannot determine from this endpoint
      };
      recommendedSubs.push(partialSr);
    }
  }

  return recommendedSubs;
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

export function rankAndFormatResults(
  pool: RawSubreddit[],
  interests: string[],
  options: CopilotOptions
): Subreddit[] {
  const limit = options.limit ?? 30;
  const seenNames = new Set<string>();
  const uniquePool: RawSubreddit[] = [];

  for (const sr of pool) {
    if (!seenNames.has(sr.display_name.toLowerCase())) {
      uniquePool.push(sr);
      seenNames.add(sr.display_name.toLowerCase());
    }
  }

  const ranked = uniquePool.map(sr => {
    const baseScore = calculateSeedScore(sr, interests.join(' '));
    let similarityBoost = 0;
    for (const interest of interests) {
      if (sr.display_name.toLowerCase().includes(interest) || sr.title.toLowerCase().includes(interest)) {
        similarityBoost += 0.1;
      }
    }

    // Simplified diversity penalty
    let diversityPenalty = 0;
    const srTokens = new Set(sr.title.toLowerCase().split(/\s+/));
    for (const otherSr of uniquePool) {
      if (sr.display_name !== otherSr.display_name) {
        const otherSrTokens = new Set(otherSr.title.toLowerCase().split(/\s+/));
        const similarity = jaccardSimilarity(srTokens, otherSrTokens);
        if (similarity > 0.5) {
          diversityPenalty += (similarity - 0.5);
        }
      }
    }

    const finalScore = baseScore + similarityBoost - 0.05 * diversityPenalty;

    return {
      ...sr,
      score: Math.max(0, Math.min(1, finalScore)), // Clamp score between 0 and 1
    };
  });

  ranked.sort((a, b) => b.score - a.score);

  return ranked.slice(0, limit).map(sr => ({
    name: sr.display_name,
    title: sr.title,
    description: (sr.public_description || '').substring(0, 200),
    subscribers: sr.subscribers || 0,
    active_user_count: sr.accounts_active || 0,
    over18: sr.over18,
    score: sr.score,
    reasons: [`matched keyword '${interests[0]}'`, `score: ${sr.score.toFixed(2)}`],
    preview_samples: [],
  }));
}
