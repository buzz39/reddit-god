
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { CopilotInput, CopilotOutput, normalizeInterests, discoverSeeds, selectTopSeeds, expandRecommendations, rankAndFormatResults, RawSubreddit } from './pipeline';

dotenv.config();

const app = express();
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
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
