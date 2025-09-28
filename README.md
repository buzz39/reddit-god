# Reddit Copilot

Reddit Copilot is a web application that helps users discover relevant subreddits based on their interests and view top posts from selected subreddits with time-based filtering.

## Features

-   **Web Interface**: Clean, responsive two-panel layout for easy navigation.
-   **Subreddit Discovery** (Left Panel):
    -   Searches for subreddits based on user interests.
    -   Filters by NSFW content, minimum subscriber count, and sort options (hybrid, relevance, subscribers, activity).
    -   Displays ranked results with subscriber counts and descriptions.
-   **Top Posts Viewer** (Right Panel):
    -   Retrieves top 5 posts from any subreddit.
    -   Time filter options: past hour, day, week, month, year, or all time.
    -   Shows post titles, upvotes, authors, and direct links.
-   **Reddit API Integration**: Uses OAuth2 for secure API access.
-   **Backend Processing**: Server-side logic for API calls and data processing.

## How to Run

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Set up environment variables:**

    Create a `.env` file in the root of the project and add your Reddit API credentials:

    ```
    REDDIT_CLIENT_ID=YOUR_REDDIT_CLIENT_ID
    REDDIT_CLIENT_SECRET=YOUR_REDDIT_CLIENT_SECRET
    REDDIT_USER_AGENT=RedditCopilot/1.0.0
    ```

3.  **Start the web server:**

    ```bash
    pnpm run dev
    ```

    The server will start on `http://localhost:3000`. Open this URL in your browser to access the web interface.

## Project Structure

-   `src/server.ts`: Express server that serves the web interface and handles API requests.
-   `src/index.ts`: Legacy CLI entry point for subreddit discovery.
-   `src/reddit-api.ts`: Handles all interactions with the Reddit API, including authentication and data fetching.
-   `src/pipeline.ts`: Contains the core logic for the subreddit discovery pipeline.
-   `public/index.html`: Main web page with the two-panel interface.
-   `public/script.js`: Client-side JavaScript for handling user interactions and API calls.
-   `public/style.css`: Styles for the web interface.
-   `package.json`: Defines the project's dependencies and scripts.
-   `tsconfig.json`: TypeScript compiler configuration.
-   `.env`: Stores the Reddit API credentials.
