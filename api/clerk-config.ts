import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the publishable key from environment variables
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return res.status(200).json({ 
      publishableKey: null,
      error: 'Clerk publishable key not configured. Check your environment variables.' 
    });
  }

  // Only send the publishable key (safe to expose to frontend)
  res.status(200).json({ 
    publishableKey,
    configured: true 
  });
}