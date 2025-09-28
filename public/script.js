document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('interest-form');
  const interestsInput = document.getElementById('interests');
  const resultsContainer = document.getElementById('results-container');
  const resultsDiv = document.getElementById('results');
  const loadingDiv = document.getElementById('loading');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const interests = interestsInput.value.split(',').map(s => s.trim()).filter(Boolean);

    if (interests.length === 0) {
      alert('Please enter at least one interest.');
      return;
    }

    loadingDiv.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    resultsDiv.innerHTML = '';

    try {
      const response = await fetch('/api/subreddits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interests }),
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
});
