document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('interest-form');
  const interestsInput = document.getElementById('interests');
  const resultsContainer = document.getElementById('results-container');
  const resultsDiv = document.getElementById('results');
  const loadingDiv = document.getElementById('loading');

  const nsfwSelect = document.getElementById('nsfw');
  const minSubscribersInput = document.getElementById('min_subscribers');
  const sortSelect = document.getElementById('sort');

  const topPostsForm = document.getElementById('top-posts-form');
  const subredditInput = document.getElementById('subreddit-name');
  const timeSelect = document.getElementById('time');
  const postsContainer = document.getElementById('posts-container');
  const postsDiv = document.getElementById('posts');

  let currentSubreddit = '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const interests = interestsInput.value.split(',').map(s => s.trim()).filter(Boolean);

    if (interests.length === 0) {
      alert('Please enter at least one interest.');
      return;
    }

    const options = {
      nsfw: nsfwSelect.value,
      min_subscribers: parseInt(minSubscribersInput.value, 10),
      sort: sortSelect.value,
    };

    loadingDiv.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    resultsDiv.innerHTML = '';

    try {
      const response = await fetch('/api/subreddits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interests, options }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch results.');
      }

      const data = await response.json();
      displayResults(data.results);
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while fetching results. Please try again.');
    } finally {
      loadingDiv.classList.add('hidden');
    }
  });

  topPostsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subreddit = subredditInput.value.trim();

    if (!subreddit) {
      alert('Please enter a subreddit name.');
      return;
    }

    loadingDiv.classList.remove('hidden');
    postsContainer.classList.add('hidden');
    postsDiv.innerHTML = '';

    try {
      const time = timeSelect.value;
      const response = await fetch(`/api/top-posts?subreddit=${subreddit}&time=${time}`);

      if (!response.ok) {
        throw new Error('Failed to fetch posts.');
      }

      const data = await response.json();
      displayPosts(data.posts);
      currentSubreddit = data.subreddit;
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while fetching posts. Please try again.');
    } finally {
      loadingDiv.classList.add('hidden');
    }
  });

  function displayResults(results) {
    if (results.length === 0) {
      resultsDiv.innerHTML = '<p>No subreddits found for your interests.</p>';
    } else {
      results.forEach(sr => {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
          <h3><a href="https://www.reddit.com/r/${sr.name}" target="_blank">r/${sr.name}</a></h3>
          <p><strong>Subscribers:</strong> ${sr.subscribers.toLocaleString()}</p>
          <p>${sr.description}</p>
        `;
        resultsDiv.appendChild(item);
      });
    }
    resultsContainer.classList.remove('hidden');
  }

  function displayPosts(posts) {
    if (posts.length === 0) {
      postsDiv.innerHTML = '<p>No posts found.</p>';
    } else {
      posts.forEach(post => {
        const item = document.createElement('div');
        item.className = 'post-item';
        const postId = post.permalink.split('/')[4];
        item.innerHTML = `
          <h4><a href="${post.url}" target="_blank">${post.title}</a></h4>
          <p><strong>Upvotes:</strong> ${post.upvotes}</p>
          <p><strong>Author:</strong> u/${post.author}</p>
          <p><a href="https://www.reddit.com${post.permalink}" target="_blank">Comments</a></p>
          <button class="load-comments-btn" data-post-id="${postId}">Load Top Comments</button>
        `;
        postsDiv.appendChild(item);
      });

      // Add event listeners for load comments buttons
      document.querySelectorAll('.load-comments-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const button = e.target;
          const postId = button.dataset.postId;
          if (!postId) return;
          try {
            const response = await fetch(`/api/comments?subreddit=${currentSubreddit}&postId=${postId}`);
            if (!response.ok) throw new Error('Failed to fetch comments');
            const data = await response.json();
            const commentsDiv = document.createElement('div');
            commentsDiv.className = 'comments';
            data.comments.forEach(comment => {
              const commentDiv = document.createElement('div');
              commentDiv.className = 'comment-item';
              commentDiv.innerHTML = `
                <p><strong>u/${comment.author}:</strong> ${comment.upvotes} upvotes</p>
                <p>${comment.body}</p>
              `;
              commentsDiv.appendChild(commentDiv);
            });
            button.insertAdjacentElement('afterend', commentsDiv);
            button.style.display = 'none';
          } catch (error) {
            console.error(error);
            alert('Failed to load comments');
          }
        });
      });
    }
    postsContainer.classList.remove('hidden');
  }
});
