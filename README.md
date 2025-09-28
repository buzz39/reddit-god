# Reddit Copilot

This project is a subreddit discovery tool that takes a list of interests and returns a ranked list of relevant subreddits using the Reddit API.

## Features

-   Fetches data from Reddit's API using OAuth2.
-   Discovers subreddits through search, autocomplete, and recommendations.
-   Scores and ranks results based on subscribers, activity, and text relevance.
-   Filters results by NSFW content and minimum subscriber count.
-   Provides output in both JSON and a human-readable format.

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

3.  **Run the application:**

    ```bash
    pnpm dev
    ```

    This will execute the `src/index.ts` file with a predefined example input. You can modify this file to test with different interests and options.

## Project Structure

-   `src/index.ts`: The main entry point of the application.
-   `src/reddit-api.ts`: Handles all interactions with the Reddit API, including authentication.
-   `src/pipeline.ts`: Contains the core logic for the subreddit discovery pipeline.
-   `package.json`: Defines the project's dependencies and scripts.
-   `tsconfig.json`: TypeScript compiler configuration.
-   `.env`: Stores the Reddit API credentials.
