import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

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
    tokenExpiresAt = Date.now() + (expires_in - 60) * 1000; // Refresh 1 minute before expiry
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

const OAUTH_HOST = 'https://oauth.reddit.com';

async function makeApiRequest(endpoint: string, params: Record<string, any> = {}) {
  const token = await getAuthToken();
  const userAgent = REDDIT_USER_AGENT || 'RedditCopilot/1.0.0';

  try {
    const response = await axios.get(`${OAUTH_HOST}${endpoint}`, {
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

export async function searchSubreddits(query: string, limit: number, sort: string, nsfw: boolean) {
  return makeApiRequest('/subreddits/search', {
    q: query,
    limit,
    sort,
    include_over_18: nsfw,
  });
}

export async function autocompleteSubreddits(query: string, limit: number) {
  return makeApiRequest('/api/subreddit_autocomplete_v2', {
    query,
    limit,
    include_profiles: false,
  });
}

export async function getRecommendations(srnames: string) {
  return makeApiRequest(`/api/recommend/sr/${srnames}`);
}

export async function getTopPosts(subreddit: string, limit: number = 5, time: string = 'day') {
  try {
    const result = await makeApiRequest(`/r/${subreddit}/top`, {
      limit,
      t: time,
      sort: 'top',
    });
    
    if (!result || !result.data || !result.data.children) {
      throw new Error('Invalid response format from Reddit API');
    }
    
    return result.data.children.map((child: any) => ({
      title: child.data.title,
      upvotes: child.data.score,
      url: child.data.url,
      permalink: child.data.permalink,
      author: child.data.author,
    }));
  } catch (error) {
    console.error(`Error fetching top posts for r/${subreddit}:`, error);
    throw error;
  }
}

export async function getTopComments(subreddit: string, postId: string, limit: number = 5) {
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
