# Clerk Authentication Setup Guide

## 1. Create a Clerk Account

1. Go to [https://clerk.com](https://clerk.com)
2. Sign up for a free account
3. Create a new application

## 2. Get Your API Keys

1. In your Clerk Dashboard, go to "API Keys"
2. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

## 3. Configure Your Application

### Option A: Update the auth.js file directly
1. Open `public/auth.js`
2. Replace `pk_test_YOUR_CLERK_PUBLISHABLE_KEY` with your actual publishable key

### Option B: Use environment variables (for production)
1. Update `.env.local` with your actual keys:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
   CLERK_SECRET_KEY=sk_test_your_actual_secret_here
   ```
2. Create an API endpoint to serve the publishable key to the frontend

## 4. Configure Clerk Dashboard

1. In your Clerk Dashboard, go to "Domains"
2. Add your development domain (e.g., `localhost:3001`)
3. Add your production domain when deploying

## 5. Test Authentication

1. Start your development server
2. Click "Sign In" or "Sign Up" buttons
3. Complete the authentication flow
4. Verify that user preferences are being saved

## Features Added

- **User Authentication**: Sign in/up with email or social providers
- **User Preferences**: Automatically save search filters and history
- **Favorite Subreddits**: Star subreddits to save them to favorites
- **Search History**: Track recent searches for signed-in users
- **Persistent Settings**: Remember user's preferred filters

## API Endpoints

- `GET /api/user-preferences?userId={userId}` - Get user preferences
- `POST /api/user-preferences?userId={userId}` - Save user preferences

## Data Stored Per User

```json
{
  "favoriteSubreddits": ["javascript", "programming"],
  "searchHistory": [
    {
      "interests": ["web development", "react"],
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ],
  "defaultFilters": {
    "nsfw": "exclude",
    "min_subscribers": 1000,
    "sort": "hybrid",
    "time": "day"
  },
  "lastUpdated": "2024-01-01T12:00:00Z"
}
```

## Next Steps

1. Replace the in-memory storage with a real database (PostgreSQL, MongoDB, etc.)
2. Add user dashboard to view favorites and search history
3. Add export functionality for user data
4. Implement user data deletion for GDPR compliance