import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTopPosts } from '../src/reddit-api';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { subreddit, time = 'day', limit = '5' } = req.query;

  if (!subreddit || typeof subreddit !== 'string') {
    return res.status(400).json({ error: 'Subreddit parameter is required' });
  }

  try {
    console.log(`Fetching top posts for r/${subreddit}, time: ${time}, limit: ${limit}`);
    const posts = await getTopPosts(subreddit, parseInt(limit as string, 10), time as string);
    console.log(`Successfully fetched ${posts.length} posts`);
    res.status(200).json({ posts, subreddit });
  } catch (error) {
    console.error('Error fetching top posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch top posts.';
    res.status(500).json({ error: errorMessage });
  }
}