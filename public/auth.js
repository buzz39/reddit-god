// Initialize authentication system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Ensure correct initial state immediately
  setInitialState();
  
  // Initialize auth after a small delay to ensure DOM is ready
  setTimeout(() => {
    initializeAuth();
  }, 100);
});

let clerk = null;
let currentUser = null;
let authEnabled = false;

function setInitialState() {
  console.log('Setting initial authentication state...');
  
  // Force login gate to show and main content to hide initially
  const loginGate = document.getElementById('login-gate');
  const mainContent = document.getElementById('main-content');
  const signedOut = document.getElementById('signed-out');
  const signedIn = document.getElementById('signed-in');
  
  if (loginGate) {
    loginGate.classList.remove('hidden');
    loginGate.style.display = 'flex';
  }
  
  if (mainContent) {
    mainContent.classList.add('hidden');
    mainContent.style.display = 'none';
  }
  
  if (signedOut) signedOut.classList.remove('hidden');
  if (signedIn) signedIn.classList.add('hidden');
  
  console.log('Initial state set: login gate visible, main content hidden');
}

async function initializeAuth() {
  console.log('Initializing authentication system...');
  
  // First, try to fetch Clerk configuration
  let clerkConfig;
  try {
    console.log('Fetching Clerk configuration from API...');
    const response = await fetch('/api/clerk-config');
    clerkConfig = await response.json();
  } catch (error) {
    console.error('Failed to fetch Clerk configuration:', error);
    showMockAuthState();
    return;
  }

  // Check if Clerk is configured
  if (!clerkConfig.publishableKey) {
    console.warn('Clerk not configured:', clerkConfig.error || 'No publishable key found');
    showMockAuthState();
    return;
  }

  console.log('Clerk configuration received, initializing with key...');
  
  // Try to initialize Clerk with proper method
  try {
    await initializeClerkProperly(clerkConfig.publishableKey);
  } catch (error) {
    console.error('Failed to initialize Clerk:', error);
    showMockAuthState();
  }
}

async function initializeClerkProperly(publishableKey) {
  console.log('Initializing Clerk with publishable key...');
  
  try {
    // Load Clerk script with the publishable key set globally
    await loadClerkScript(publishableKey);
    
    console.log('Checking Clerk availability...');
    console.log('window.Clerk:', window.Clerk);
    console.log('typeof window.Clerk:', typeof window.Clerk);
    
    // Debug the Clerk object structure
    if (window.Clerk && typeof window.Clerk === 'object') {
      console.log('Clerk object properties:', Object.getOwnPropertyNames(window.Clerk));
      console.log('Clerk.user:', window.Clerk.user);
      console.log('Clerk methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.Clerk)));
    }
    
    // Check if Clerk has auto-initialized - let's be less strict about the user property
    if (window.Clerk && typeof window.Clerk === 'object') {
      console.log('Clerk auto-initialized successfully! Using existing instance.');
      clerk = window.Clerk;
      authEnabled = true;
      
      // Wait for Clerk to be fully ready
      try {
        console.log('Waiting for Clerk to be ready...');
        await clerk.load();
        console.log('Clerk load completed');
      } catch (error) {
        console.log('Clerk load error (might be already loaded):', error.message);
      }
      
      // Set up authentication state
      currentUser = clerk.user;
      console.log('Current user after load:', currentUser);
      
      if (currentUser) {
        console.log('User is signed in:', currentUser.emailAddresses?.[0]?.emailAddress || 'No email');
        showSignedInState();
      } else {
        console.log('User is not signed in');
        showSignedOutState();
      }
      
      // Listen for auth changes
      try {
        clerk.addListener(({ user }) => {
          console.log('Auth state changed:', user ? 'signed in' : 'signed out');
          currentUser = user;
          if (user) {
            showSignedInState();
          } else {
            showSignedOutState();
          }
        });
        console.log('Auth listener added successfully');
      } catch (error) {
        console.error('Error adding auth listener:', error);
      }
      
      // Set up event listeners
      setupEventListeners();
      
    } else if (window.Clerk && typeof window.Clerk === 'function') {
      console.log('Found Clerk constructor, manual initialization required');
      
      // Manual initialization
      clerk = new window.Clerk(publishableKey);
      
      console.log('Loading Clerk...');
      await clerk.load();
      
      console.log('Clerk loaded successfully!');
      authEnabled = true;
      
      // Set up authentication state
      currentUser = clerk.user;
      
      if (currentUser) {
        console.log('User is signed in:', currentUser.emailAddresses[0]?.emailAddress);
        showSignedInState();
      } else {
        console.log('User is not signed in');
        showSignedOutState();
      }
      
      // Listen for auth changes
      clerk.addListener(({ user }) => {
        console.log('Auth state changed:', user ? 'signed in' : 'signed out');
        currentUser = user;
        if (user) {
          showSignedInState();
        } else {
          showSignedOutState();
        }
      });
      
      // Set up event listeners
      setupEventListeners();
      
    } else {
      console.error('Clerk not available or in unexpected format');
      console.error('window.Clerk:', window.Clerk);
      console.error('Available window properties:', Object.keys(window).filter(key => key.toLowerCase().includes('clerk')));
      throw new Error('Clerk not available after loading');
    }
    
  } catch (error) {
    console.error('Error initializing Clerk:', error);
    throw error;
  }
}

function loadClerkScript(publishableKey) {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Clerk) {
      console.log('Clerk already loaded');
      resolve();
      return;
    }
    
    console.log('Setting up Clerk environment...');
    
    // Set the publishable key globally before loading Clerk
    // This prevents the auto-initialization error
    window.__clerk_publishable_key = publishableKey;
    
    console.log('Loading Clerk script from CDN...');
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@clerk/clerk-js@5.96.0/dist/clerk.browser.js';
    script.async = true;
    
    script.onload = () => {
      console.log('Clerk script loaded successfully');
      console.log('Available on window:', Object.keys(window).filter(key => key.toLowerCase().includes('clerk')));
      console.log('window.Clerk:', window.Clerk);
      console.log('window.ClerkJS:', window.ClerkJS);
      // Give Clerk a moment to initialize
      setTimeout(resolve, 1000);
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Clerk script:', error);
      reject(new Error('Failed to load Clerk script'));
    };
    
    document.head.appendChild(script);
  });
}



function showMockAuthState() {
  console.log('Showing mock auth state (Clerk not configured)');
  // Show sign-in buttons but disable functionality
  const signedOut = document.getElementById('signed-out');
  const signedIn = document.getElementById('signed-in');
  
  if (signedOut) signedOut.classList.remove('hidden');
  if (signedIn) signedIn.classList.add('hidden');

  // Add click handlers that show setup message
  const signInBtn = document.getElementById('sign-in-btn');
  const signUpBtn = document.getElementById('sign-up-btn');
  
  if (signInBtn) signInBtn.addEventListener('click', showSetupMessage);
  if (signUpBtn) signUpBtn.addEventListener('click', showSetupMessage);
}

function showSetupMessage() {
  alert('Authentication system is loading or not configured properly. Please check the console for more details.');
}

function setupEventListeners() {
  console.log('Setting up authentication event listeners...');
  
  // Header sign in button
  const signInBtn = document.getElementById('sign-in-btn');
  if (signInBtn) {
    // Remove existing listeners by cloning the element
    const newSignInBtn = signInBtn.cloneNode(true);
    signInBtn.parentNode.replaceChild(newSignInBtn, signInBtn);
    
    newSignInBtn.addEventListener('click', openSignIn);
  }

  // Header sign up button
  const signUpBtn = document.getElementById('sign-up-btn');
  if (signUpBtn) {
    // Remove existing listeners by cloning the element
    const newSignUpBtn = signUpBtn.cloneNode(true);
    signUpBtn.parentNode.replaceChild(newSignUpBtn, signUpBtn);
    
    document.getElementById('sign-up-btn').addEventListener('click', openSignUp);
  }

  // Login gate sign in button
  const loginGateSignIn = document.getElementById('login-gate-signin');
  if (loginGateSignIn) {
    loginGateSignIn.addEventListener('click', openSignIn);
  }

  // Login gate sign up button
  const loginGateSignUp = document.getElementById('login-gate-signup');
  if (loginGateSignUp) {
    loginGateSignUp.addEventListener('click', openSignUp);
  }

  // User button (account management)
  const userBtn = document.getElementById('user-button');
  if (userBtn) {
    userBtn.addEventListener('click', () => {
      console.log('User button clicked');
      if (clerk && authEnabled) {
        try {
          clerk.openUserProfile();
        } catch (error) {
          console.error('Error opening user profile:', error);
        }
      }
    });
  }

  // Sign out button
  const signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      console.log('Sign out button clicked');
      if (clerk && authEnabled) {
        try {
          await clerk.signOut();
          currentUser = null;
          showSignedOutState();
        } catch (error) {
          console.error('Error signing out:', error);
        }
      }
    });
  }
}

function openSignIn() {
  console.log('Sign in button clicked');
  if (clerk && authEnabled) {
    try {
      clerk.openSignIn();
    } catch (error) {
      console.error('Error opening sign in:', error);
    }
  } else {
    console.log('Clerk not ready, showing setup message');
    showSetupMessage();
  }
}

function openSignUp() {
  console.log('Sign up button clicked');
  if (clerk && authEnabled) {
    try {
      clerk.openSignUp();
    } catch (error) {
      console.error('Error opening sign up:', error);
    }
  } else {
    console.log('Clerk not ready, showing setup message');
    showSetupMessage();
  }
}

// Show signed in state
function showSignedInState() {
  console.log('Showing signed in state');
  const signedOut = document.getElementById('signed-out');
  const signedIn = document.getElementById('signed-in');
  const loginGate = document.getElementById('login-gate');
  const mainContent = document.getElementById('main-content');

  // Update auth header
  if (signedOut) signedOut.classList.add('hidden');
  if (signedIn) signedIn.classList.remove('hidden');

  // Show main content, hide login gate
  if (loginGate) {
    loginGate.classList.add('hidden');
    loginGate.style.display = 'none';
  }
  if (mainContent) {
    mainContent.classList.remove('hidden');
    mainContent.classList.add('show');
    mainContent.style.display = 'flex';
  }

  const greeting = document.getElementById('user-greeting');
  if (currentUser && greeting) {
    greeting.textContent = `Hello, ${currentUser.firstName || currentUser.emailAddresses[0].emailAddress}!`;
  }
}

// Show signed out state
function showSignedOutState() {
  console.log('Showing signed out state');
  const signedIn = document.getElementById('signed-in');
  const signedOut = document.getElementById('signed-out');
  const loginGate = document.getElementById('login-gate');
  const mainContent = document.getElementById('main-content');

  // Update auth header
  if (signedIn) signedIn.classList.add('hidden');
  if (signedOut) signedOut.classList.remove('hidden');

  // Show login gate, hide main content
  if (loginGate) {
    loginGate.classList.remove('hidden');
    loginGate.style.display = 'flex';
  }
  if (mainContent) {
    mainContent.classList.add('hidden');
    mainContent.classList.remove('show');
    mainContent.style.display = 'none';
  }
}

// Export functions for use in other scripts
window.clerkAuth = {
  getCurrentUser: () => currentUser,
  isSignedIn: () => !!currentUser,
  getUserId: () => currentUser?.id,
  getUserEmail: () => currentUser?.emailAddresses[0]?.emailAddress
};