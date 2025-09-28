import dotenv from 'dotenv';
import {
  CopilotInput,
  CopilotOutput,
  normalizeInterests,
  discoverSeeds,
  selectTopSeeds,
  expandRecommendations,
  rankAndFormatResults,
} from './pipeline';

dotenv.config();

export async function run(input: CopilotInput): Promise<CopilotOutput> {
  const startTime = Date.now();
  const { interests, options = {} } = input;

  const normalizedInterests = normalizeInterests(interests);
  const allSeeds = [];
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

function printHumanReadable(output: CopilotOutput) {
  console.log(`\nTop picks for: ${output.interests.join(', ')}`);
  output.results.forEach(r => {
    console.log(
      `- r/${r.name} — ${r.description.split('\n')[0]} — ~${(r.subscribers / 1000).toFixed(0)}k subs`
    );
  });
}

async function main() {
  console.log('--- Reddit Copilot ---');
  const exampleInput: CopilotInput = {
    interests: ['fitness', 'javascript', 'travel'],
    options: { limit: 5, nsfw: 'exclude', min_subscribers: 5000 },
  };

  try {
    const output = await run(exampleInput);
    console.log(JSON.stringify(output, null, 2));
    printHumanReadable(output);
  } catch (error) {
    console.error('Pipeline failed:', error);
  }
}

main().catch(error => {
  console.error('An unexpected error occurred:', error);
});
