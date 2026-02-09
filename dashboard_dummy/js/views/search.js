/**
 * Search View
 * Full-page search with CSV export functionality
 * Uses consolidated searchAll() from data.js
 */

import * as Data from '../data.js';
import { escapeHtml, exportToCsv } from '../utils.js';

let currentResults = [];
let currentFiscalYear = null; // null = "All Years"

export default {
  name: 'search',
  title: 'Search',

  async render(container, db, params) {
    const initialQuery = params.q || '';

    container.innerHTML = `
            <div class="card mb-lg">
                <h2 class="mb-md">Search</h2>
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                    <label for="search-page-input" class="visually-hidden">Search municipalities, expenditures, projects</label>
                    <input type="text"
                           id="search-page-input"
                           placeholder="Search municipalities, expenditures, projects..."
                           value="${escapeHtml(initialQuery)}"
                           class="search-input"
                           style="flex: 1; min-width: 200px; padding: 1rem; border: 2px solid var(--color-accent); border-radius: 8px; font-size: 1.1rem;">
                    <div class="fiscal-year-selector">
                        <label for="search-fy-select" class="sr-only">Fiscal Year</label>
                        <select id="search-fy-select" class="fy-dropdown">
                            <option value="">All Years</option>
                            <option value="2025">FY2025</option>
                            <option value="2024">FY2024</option>
                            <option value="2023">FY2023</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" id="search-btn">Search</button>
                </div>
                <p style="margin-top: 0.5rem; color: var(--color-text-muted); font-size: 0.875rem;">
                    Search across municipality names, expenditure names & descriptions, and project details.
                </p>
            </div>
            
            <div id="search-results-container" style="display: none;">
                <div class="card-header mb-md" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 id="results-count" aria-live="polite" aria-atomic="true">Results</h3>
                    <button class="btn btn-secondary" id="export-csv-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.5rem;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export CSV
                    </button>
                </div>
                
                <div class="table-container">
                    <table id="search-results-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Name</th>
                                <th>Municipality</th>
                                <th>Details</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody id="search-results-tbody">
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div id="search-empty" class="card" style="text-align: center; padding: 2rem;">
                <h3 style="margin-bottom: 1rem;">Explore Topics</h3>
                <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">Click any word to search</p>
                <div id="word-cloud" class="word-cloud"></div>
            </div>
            
            <div id="search-no-results" class="card" style="text-align: center; padding: 3rem; display: none;">
                <h3 style="color: var(--color-text-muted);">No results found</h3>
                <p style="color: var(--color-text-muted);">Try a different search term.</p>
            </div>
        `;

    const input = document.getElementById('search-page-input');
    const searchBtn = document.getElementById('search-btn');
    const exportBtn = document.getElementById('export-csv-btn');

    // Search on button click or enter
    searchBtn.addEventListener('click', () => this.performSearch(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {this.performSearch(input.value);}
    });

    // Debounced live search
    let searchTimeout;
    input.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.performSearch(e.target.value);
      }, 300);
    });

    // CSV Export
    exportBtn.addEventListener('click', () => this.exportCSV());

    // Fiscal year filter
    const fySelect = document.getElementById('search-fy-select');
    fySelect.addEventListener('change', (e) => {
      currentFiscalYear = e.target.value ? parseInt(e.target.value) : null;
      this.performSearch(input.value);
    });

    // Event delegation for row clicks (replaces inline onclick)
    const tbody = document.getElementById('search-results-tbody');
    tbody.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-record-id]');
      if (row) {
        window.dashboardNavigate('detail', { id: row.dataset.recordId });
      }
    });

    // Keyboard navigation for table rows (Enter/Space)
    tbody.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const row = e.target.closest('tr[data-record-id]');
        if (row) {
          e.preventDefault();
          window.dashboardNavigate('detail', { id: row.dataset.recordId });
        }
      }
    });

    // Focus input
    input.focus();

    // Render word cloud
    this.renderWordCloud(input);

    // If initial query provided, search immediately
    if (initialQuery) {
      this.performSearch(initialQuery);
    }
  },

  performSearch(term) {
    const resultsContainer = document.getElementById('search-results-container');
    const emptyState = document.getElementById('search-empty');
    const noResults = document.getElementById('search-no-results');
    const resultsCount = document.getElementById('results-count');
    const tbody = document.getElementById('search-results-tbody');

    if (!term || term.length < 2) {
      resultsContainer.style.display = 'none';
      emptyState.style.display = 'block';
      noResults.style.display = 'none';
      currentResults = [];
      return;
    }

    // Use consolidated search from data.js (no SQL queries, uses cache)
    const results = Data.searchAll(term, currentFiscalYear);
    currentResults = results;

    if (results.length === 0) {
      resultsContainer.style.display = 'none';
      emptyState.style.display = 'none';
      noResults.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    noResults.style.display = 'none';
    resultsContainer.style.display = 'block';
    resultsCount.textContent = `${results.length} result${results.length === 1 ? '' : 's'}`;

    tbody.innerHTML = results.map(result => `
            <tr class="clickable" 
                data-record-id="${result.recordId}" 
                tabindex="0" 
                role="row"
                aria-label="View ${escapeHtml(result.name)} details">
                <td>
                    <span class="badge ${this.getTypeBadgeClass(result.type)}">${result.type}</span>
                </td>
                <td><strong>${escapeHtml(result.name)}</strong></td>
                <td>${escapeHtml(result.municipality)}</td>
                <td style="max-width: 300px; font-size: 0.875rem; color: var(--color-text-muted);">
                    ${escapeHtml(result.details)}
                </td>
                <td class="text-right">
                    ${result.amount ? `$${  Data.formatCurrency(result.amount)}` : '-'}
                </td>
            </tr>
        `).join('');
  },

  getTypeBadgeClass(type) {
    switch (type) {
      case 'Municipality': return 'badge-expended';
      case 'Expenditure': return 'badge-encumbered';
      case 'Project': return '';
      default: return '';
    }
  },

  exportCSV() {
    if (currentResults.length === 0) {
      alert('No results to export');
      return;
    }

    const headers = ['Type', 'Name', 'Municipality', 'Details', 'Amount'];
    const rows = currentResults.map(r => [
      r.type,
      r.name,
      r.municipality,
      r.details,
      r.amount || ''
    ]);

    const filename = `orrf-search-results-${new Date().toISOString().split('T')[0]}.csv`;
    exportToCsv(headers, rows, filename);
  },

  renderWordCloud(input) {
    const wordCloudContainer = document.getElementById('word-cloud');
    if (!wordCloudContainer) {return;}

    const words = Data.getWordCloudData(80);
    if (words.length === 0) {
      wordCloudContainer.innerHTML = '<p style="color: var(--color-text-muted);">No data available</p>';
      return;
    }

    // Calculate min/max for scaling font sizes
    const counts = words.map(w => w.count);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const range = maxCount - minCount || 1;

    // Generate word elements with varied sizes
    wordCloudContainer.innerHTML = words.map(({ word, count }) => {
      // Scale font size between 0.8rem and 2.5rem based on frequency
      const normalizedSize = (count - minCount) / range;
      const fontSize = 0.8 + (normalizedSize * 1.7);
      // Higher frequency = darker color
      const opacity = 0.5 + (normalizedSize * 0.5);

      return `<span class="word-cloud-word" 
                         data-word="${escapeHtml(word)}"
                         style="font-size: ${fontSize.toFixed(2)}rem; opacity: ${opacity.toFixed(2)};"
                         tabindex="0"
                         role="button"
                         aria-label="Search for ${escapeHtml(word)}">${escapeHtml(word)}</span>`;
    }).join('');

    // Add click handler for word cloud words
    wordCloudContainer.addEventListener('click', (e) => {
      const wordEl = e.target.closest('.word-cloud-word');
      if (wordEl) {
        const word = wordEl.dataset.word;
        input.value = word;
        this.performSearch(word);
      }
    });

    // Keyboard support (Enter/Space)
    wordCloudContainer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const wordEl = e.target.closest('.word-cloud-word');
        if (wordEl) {
          e.preventDefault();
          const word = wordEl.dataset.word;
          input.value = word;
          this.performSearch(word);
        }
      }
    });
  },

  destroy() {
    currentResults = [];
    currentFiscalYear = null;
  }
};
