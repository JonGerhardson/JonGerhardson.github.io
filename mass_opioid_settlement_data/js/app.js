/**
 * ORRF Dashboard - Main Application
 * Handles routing, view management, and navigation
 */

import * as Data from './data.js';
import { escapeHtml } from './utils.js';

// View registry - modular views register themselves here
const views = new Map();
let currentView = null;
let db = null;

// DOM Elements
const appContainer = document.getElementById('app');
const loadingEl = document.getElementById('loading');
const navEl = document.getElementById('main-nav');
const searchTrigger = document.getElementById('search-trigger');

/**
 * Register a view module
 * @param {Object} viewModule - View module with name, title, render, destroy
 */
export function registerView(viewModule) {
  views.set(viewModule.name, viewModule);
}

/**
 * Navigate to a specific view
 * @param {string} viewName - Name of the view to navigate to
 * @param {Object} params - Optional parameters to pass to the view
 */
export async function navigate(viewName, params = {}) {
  // Cleanup current view
  if (currentView && currentView.destroy) {
    currentView.destroy();
  }

  // Get the view
  const view = views.get(viewName);
  if (!view) {
    console.error(`View not found: ${viewName}`);
    return;
  }

  // Update URL hash
  let hashParams = '';
  if (params.id) {hashParams = `/${params.id}`;}
  if (params.q) {hashParams = `?q=${encodeURIComponent(params.q)}`;}
  window.location.hash = `#${viewName}${hashParams}`;

  // Update nav active state
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.view === viewName);
  });

  // Clear app container and render view
  appContainer.innerHTML = '';
  currentView = view;

  try {
    await view.render(appContainer, db, params);
  } catch (error) {
    console.error(`Error rendering view ${viewName}:`, error);
    appContainer.innerHTML = `
            <div class="card">
                <h2>Error Loading View</h2>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
  }
}

/**
 * Build navigation from registered views
 */
function buildNavigation() {
  navEl.innerHTML = '';

  views.forEach((view, name) => {
    if (view.showInNav !== false) {
      const link = document.createElement('a');
      link.href = `#${name}`;
      link.className = 'nav-link';
      link.dataset.view = name;
      link.textContent = view.title;
      link.addEventListener('click', e => {
        e.preventDefault();
        navigate(name);
      });
      navEl.appendChild(link);
    }
  });
}

/**
 * Handle hash-based routing
 */
function handleRoute() {
  const hash = window.location.hash.slice(1) || 'statewide';

  // Parse hash for view name, id, and query params
  let viewName, id, q;

  if (hash.includes('?')) {
    const [path, queryString] = hash.split('?');
    viewName = path.split('/')[0];
    id = path.split('/')[1];
    const urlParams = new URLSearchParams(queryString);
    q = urlParams.get('q');
  } else {
    [viewName, id] = hash.split('/');
  }

  // Redirect legacy #categories URL to explorer (categories now integrated there)
  if (viewName === 'categories') {
    window.location.hash = '#explorer';
    return;
  }

  if (views.has(viewName)) {
    navigate(viewName, { id, q });
  } else {
    navigate('statewide');
  }
}

/**
 * Initialize keyboard shortcut for search
 */
function initSearchShortcut() {
  // Click search icon to go to search page
  if (searchTrigger) {
    searchTrigger.addEventListener('click', () => {
      navigate('search');
    });
  }

  // Press "/" to go to search page
  document.addEventListener('keydown', e => {
    // Don't trigger if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {return;}

    if (e.key === '/') {
      e.preventDefault();
      navigate('search');
    }
  });
}

/**
 * Initialize the application
 */
async function init() {
  try {
    // Load database
    db = await Data.initDatabase();

    // Import and register all views
    const [statewide, stateSpending, explorer, detail, search, collaboratives, map, grants, about] = await Promise.all([
      import('./views/statewide.js'),
      import('./views/state-spending.js'),
      import('./views/explorer.js'),
      import('./views/detail.js'),
      import('./views/search.js'),
      import('./views/collaboratives.js'),
      import('./views/map.js'),
      import('./views/grants.js'),
      import('./views/about.js')
    ]);

    registerView(statewide.default);
    registerView(stateSpending.default);
    registerView(explorer.default);
    registerView(detail.default);
    registerView(search.default);
    registerView(collaboratives.default);
    registerView(map.default);
    registerView(grants.default);
    registerView(about.default);

    // Build navigation
    buildNavigation();

    // Initialize search shortcut
    initSearchShortcut();

    // Hide loading, handle initial route
    loadingEl.classList.add('hidden');
    handleRoute();

    // Listen for hash changes
    window.addEventListener('hashchange', handleRoute);

    // Debug Toggle
    const debugToggle = document.getElementById('debug-toggle');
    if (debugToggle) {
      debugToggle.addEventListener('click', () => {
        document.body.classList.toggle('debug-mode');
      });
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
    loadingEl.innerHTML = `
            <div style="color: var(--color-error);">
                <h2>Failed to Load Dashboard</h2>
                <p>${escapeHtml(error.message)}</p>
                <p>Make sure the database file exists at <code>opioid_settlement.db</code></p>
            </div>
        `;
  }
}

// Export navigate for use in views
window.dashboardNavigate = navigate;

// Start app
init();
