import express from 'express';
import cors from 'cors';
import { CopilotInput } from './pipeline';
// @ts-ignore
import { run } from './index';
import { getTopPosts } from './reddit-api';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/subreddits', async (req, res) => {
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

app.get('/api/subreddit/:name/top', async (req, res) => {
  try {
    let { name } = req.params;
    if (!name) {
      return res.status(400).json({ error: 'Subreddit name is required.' });
    }
    // Remove 'r/' prefix if present
    name = name.replace(/^r\//, '');
    const posts = await getTopPosts(name, 5);
    res.json({ subreddit: name, posts });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch top posts.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
