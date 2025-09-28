import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { CopilotInput, CopilotOutput, normalizeInterests, discoverSeeds, selectTopSeeds, expandRecommendations, rankAndFormatResults, RawSubreddit } from './pipeline';
import { getTopPosts, getTopComments } from './reddit-api';

dotenv.config();

const app = express();
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Get top posts for a subreddit (new endpoint matching frontend)
app.get('/api/top-posts', async (req, res) => {
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
});

// Get top comments for a post (new endpoint matching frontend)
app.get('/api/comments', async (req, res) => {
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch top comments.';
    res.status(500).json({ error: errorMessage });
  }
});

// User preferences storage (in-memory for demo)
const userPreferences: Record<string, any> = {};

// Clerk configuration endpoint
app.get('/api/clerk-config', (req, res) => {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    return res.status(200).json({ 
      publishableKey: null,
      error: 'Clerk publishable key not configured. Check your environment variables.' 
    });
  }
  
  res.status(200).json({ 
    publishableKey,
    configured: true 
  });
});

// User preferences endpoint
app.get('/api/user-preferences', (req, res) => {
  const { userId } = req.query;
  
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  const preferences = userPreferences[userId] || {
    favoriteSubreddits: [],
    searchHistory: [],
    defaultFilters: {
      nsfw: 'exclude',
      min_subscribers: 1000,
      sort: 'hybrid',
      time: 'day'
    }
  };
  
  res.status(200).json({ preferences });
});

app.post('/api/user-preferences', (req, res) => {
  const { userId } = req.query;
  const { preferences } = req.body;
  
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  if (!preferences) {
    return res.status(400).json({ error: 'Preferences data is required' });
  }
  
  // Merge with existing preferences
  const existingPrefs = userPreferences[userId] || {};
  userPreferences[userId] = {
    ...existingPrefs,
    ...preferences,
    lastUpdated: new Date().toISOString()
  };
  
  res.status(200).json({ 
    message: 'Preferences saved successfully',
    preferences: userPreferences[userId]
  });
});

app.post('/api/subreddits', async (req, res) => {
  try {
    const input: CopilotInput = req.body;
    if (!input.interests || !Array.isArray(input.interests)) {
      return res.status(400).json({ error: 'Invalid input: "interests" must be an array of strings.' });
    }
    const output = await run(input);
    res.status(200).json(output);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});


const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Express server listening on port ${port}`);
  });
}

export default app;

export async function run(input: CopilotInput): Promise<CopilotOutput> {
  const startTime = Date.now();
  const { interests, options = {} } = input;

  const normalizedInterests = normalizeInterests(interests);
  const allSeeds: RawSubreddit[] = [];
  const sources: string[] = [];

  for (const interest of normalizedInterests) {
    const seeds = await discoverSeeds(interest, options.nsfw !== 'exclude');
    allSeeds.push(...seeds);
  }
  sources.push('subreddit_search', 'autocomplete');

  const topSeeds = selectTopSeeds(allSeeds, normalizedInterests.join(' '), options);

  const recommendations = await expandRecommendations(topSeeds);
  if (recommendations.length > 0) {
    sources.push('recommendations');
  }

  const finalPool = [...allSeeds, ...recommendations];
  const results = rankAndFormatResults(finalPool, normalizedInterests, options);

  const endTime = Date.now();

  return {
    interests: normalizedInterests,
    results,
    meta: {
      limit: options.limit ?? 30,
      filters: {
        nsfw: options.nsfw ?? 'exclude',
        min_subscribers: options.min_subscribers ?? 1000,
      },
      sort: options.sort ?? 'hybrid',
      time_window: options.time_window ?? 'all',
      query_latency_ms: endTime - startTime,
      sources: [...new Set(sources)],
    },
  };
}
