import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory storage for demo (in production, use a real database)
const userPreferences: Record<string, any> = {};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get user preferences
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
      
    } else if (req.method === 'POST' || req.method === 'PUT') {
      // Save user preferences
      const { preferences } = req.body;
      
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
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Error handling user preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}