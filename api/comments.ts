import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTopComments } from '../src/reddit-api';

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

  const { subreddit, postId, limit = '5' } = req.query;

  if (!subreddit || typeof subreddit !== 'string') {
    return res.status(400).json({ error: 'Subreddit parameter is required' });
  }

  if (!postId || typeof postId !== 'string') {
    return res.status(400).json({ error: 'Post ID parameter is required' });
  }

  try {
    const comments = await getTopComments(subreddit, postId, parseInt(limit as string, 10));
    res.status(200).json({ comments });
  } catch (error) {
    console.error('Error fetching top comments:', error);
    res.status(500).json({ error: 'Failed to fetch top comments.' });
  }
}