import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CopilotInput } from '../src/pipeline';
import { run } from '../src/index';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
}
