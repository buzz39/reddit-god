import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { CopilotInput } from './pipeline';
// @ts-ignore
import { run } from './index';
import { getTopPosts, getTopComments } from './reddit-api';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// API routes

app.post('/api/subreddits', async (req: Request, res: Response) => {
  try {
    const input: CopilotInput = req.body;
    if (!input.interests || !Array.isArray(input.interests)) {
      return res.status(400).json({ error: 'Invalid input: "interests" must be an array of strings.' });
    }
    const output = await run(input);
    res.json(output);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

app.get('/api/subreddit/:name/top', async (req: Request, res: Response) => {
  try {
    let { name } = req.params;
    const { time } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Subreddit name is required.' });
    }
    // Remove 'r/' prefix if present
    name = name.replace(/^r\//, '');
    const posts = await getTopPosts(name, 5, (time as string) || 'day');
    res.json({ subreddit: name, posts });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch top posts.' });
  }
});

app.get('/api/subreddit/:subreddit/comments/:postId', async (req: Request, res: Response) => {
  try {
    const { subreddit, postId } = req.params;
    const comments = await getTopComments(subreddit, postId, 5);
    res.json({ comments });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// For Vercel deployment
export default app;

// For local development (comment out for Vercel)
// app.listen(port, () => {
//   console.log(`Server is running at http://localhost:${port}`);
// });
