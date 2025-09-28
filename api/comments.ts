import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// Reddit API functions (self-contained for Vercel)
const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT } = process.env;

let token: string | null = null;
let tokenExpiresAt: number = 0;

async function getAuthToken(): Promise<string> {
  if (token && Date.now() < tokenExpiresAt) {
    return token;
  }

  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
    throw new Error('Missing Reddit API credentials in .env file');
  }

  const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');

  try {
    const response = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': REDDIT_USER_AGENT || 'RedditCopilot/1.0.0',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, expires_in } = response.data;
    if (typeof access_token !== 'string') {
      throw new Error('Invalid access token received from Reddit API.');
    }
    token = access_token;
    tokenExpiresAt = Date.now() + (expires_in - 60) * 1000;
    return token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching Reddit auth token:', error.response?.data);
    } else {
      console.error('An unexpected error occurred during auth:', error);
    }
    throw new Error('Failed to authenticate with Reddit API.');
  }
}

async function makeApiRequest(endpoint: string, params: Record<string, any> = {}) {
  const token = await getAuthToken();
  const userAgent = REDDIT_USER_AGENT || 'RedditCopilot/1.0.0';

  try {
    const response = await axios.get(`https://oauth.reddit.com${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': userAgent,
      },
      params,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      console.error(`API Error for ${endpoint}:`, status, data);
      
      if (status === 403) {
        throw new Error('Access forbidden - check subreddit name and permissions');
      } else if (status === 404) {
        throw new Error('Subreddit not found');
      } else if (status === 429) {
        throw new Error('Rate limit exceeded - please try again later');
      } else {
        throw new Error(`Reddit API error: ${status} - ${data?.message || 'Unknown error'}`);
      }
    } else {
      console.error(`Unexpected error for ${endpoint}:`, error);
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

async function getTopComments(subreddit: string, postId: string, limit: number = 5) {
  const result = await makeApiRequest(`/r/${subreddit}/comments/${postId}`);
  const [_, comments] = result;
  return comments.data.children
    .sort((a: any, b: any) => b.data.score - a.data.score)
    .slice(0, limit)
    .map((comment: any) => ({
      author: comment.data.author,
      body: comment.data.body,
      upvotes: comment.data.score,
    }));
}

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