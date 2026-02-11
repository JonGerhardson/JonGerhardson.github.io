/**
 * Municipality Explorer View
 * Searchable, sortable table of all municipalities/entities
 */

import * as Data from '../data.js';
import { escapeHtml } from '../utils.js';

let sortColumn = 'total_expended';
let sortDirection = 'desc';
let filterText = '';
let entityTypeFilter = 'all'; // 'all', 'municipality', 'county', 'organization'

// Category view state
let viewMode = 'entities'; // 'entities' or 'categories'
let categoryDrilldown = null; // null or { id: number, name: string }
let categorySortColumn = 'total';
let categorySortDirection = 'desc';

// Entity type classification
function getEntityType(entity) {
  if (entity.type === 'Organization') {return 'organization';}
  if (entity.name && entity.name.endsWith('County') || entity.displayName && entity.displayName.endsWith('County')) {return 'county';}
  return 'municipality';
}

export default {
  name: 'explorer',
  title: 'Municipalities',

  async render(container, db) {
    const entities = Data.getAllEntities();
    const categoryData = Data.getSpendingByCategory();

    // Determine initial count text
    const getCountText = () => {
      if (viewMode === 'entities') {
        return `${entities.length} entities`;
      } else if (categoryDrilldown) {
        const spending = this.getMunicipalitiesInCategory(categoryDrilldown.id, entities);
        return `${spending.length} entities`;
      } else {
        return `${categoryData.length} categories`;
      }
    };

    container.innerHTML = `
            <div class="card mb-lg">
                <div class="card-header">
                    <h2 class="card-title">Entity Explorer</h2>
                    <div style="display: flex; gap: var(--space-md); align-items: center;">
                        <label for="explorer-filter" class="visually-hidden">Filter entities</label>
                        <input type="text"
                               id="explorer-filter"
                               placeholder="Filter by name..."
                               class="search-input"
                               style="width: 250px; padding: var(--space-sm) var(--space-md); border: 1px solid var(--color-border); border-radius: var(--border-radius-sm);"
                               ${viewMode === 'categories' ? 'disabled' : ''}>
                        <span style="color: var(--color-text-muted);" id="entity-count" aria-live="polite">${getCountText()}</span>
                    </div>
                </div>

                <!-- View Mode Toggle -->
                <div class="view-mode-toggle" role="radiogroup" aria-label="View mode">
                    <span class="view-mode-label">View:</span>
                    <label class="radio-pill">
                        <input type="radio" name="view-mode" value="entities" ${viewMode === 'entities' ? 'checked' : ''}>
                        <span>Entities</span>
                    </label>
                    <label class="radio-pill">
                        <input type="radio" name="view-mode" value="categories" ${viewMode === 'categories' ? 'checked' : ''}>
                        <span>By Category</span>
                    </label>
                </div>

                <!-- Entity type filter - only shown in entities view -->
                <div class="entity-type-filter" role="radiogroup" aria-label="Filter by entity type"
                     style="${viewMode === 'categories' ? 'display: none;' : ''}">
                    <label class="radio-pill">
                        <input type="radio" name="entity-type" value="all" ${entityTypeFilter === 'all' ? 'checked' : ''}>
                        <span>All</span>
                    </label>
                    <label class="radio-pill">
                        <input type="radio" name="entity-type" value="municipality" ${entityTypeFilter === 'municipality' ? 'checked' : ''}>
                        <span>Municipalities</span>
                    </label>
                    <label class="radio-pill">
                        <input type="radio" name="entity-type" value="county" ${entityTypeFilter === 'county' ? 'checked' : ''}>
                        <span>Counties</span>
                    </label>
                    <label class="radio-pill">
                        <input type="radio" name="entity-type" value="organization" ${entityTypeFilter === 'organization' ? 'checked' : ''}>
                        <span>Organizations</span>
                    </label>
                </div>
            </div>

            <!-- Content area - switches based on view mode -->
            <div id="explorer-content">
                ${viewMode === 'entities' ? this.renderEntityTableHTML() : this.renderCategoryViewHTML(categoryData, entities)}
            </div>
        `;

    // Setup view mode toggle
    document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        viewMode = e.target.value;
        categoryDrilldown = null; // Reset drilldown when switching views
        this.render(container, db);
      });
    });

    if (viewMode === 'entities') {
      // Render initial table data
      this.renderTable(entities);

      // Setup filter
      const filterInput = document.getElementById('explorer-filter');
      filterInput.addEventListener('input', (e) => {
        filterText = e.target.value.toLowerCase();
        this.renderTable(entities);
      });

      // Setup entity type filter
      document.querySelectorAll('input[name="entity-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          entityTypeFilter = e.target.value;
          this.renderTable(entities);
        });
      });

      // Setup sorting
      document.querySelectorAll('#explorer-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
          const col = th.dataset.col;
          if (sortColumn === col) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            sortColumn = col;
            sortDirection = 'asc';
          }
          this.updateSortIndicators();
          this.renderTable(entities);
        });
      });

      // Event delegation for row clicks
      const tbody = document.getElementById('explorer-tbody');
      tbody.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-record-id]');
        if (row) {
          window.dashboardNavigate('detail', { id: row.dataset.recordId });
        }
      });

      // Keyboard navigation for table rows
      tbody.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const row = e.target.closest('tr[data-record-id]');
          if (row) {
            e.preventDefault();
            window.dashboardNavigate('detail', { id: row.dataset.recordId });
          }
        }
      });
    } else {
      // Setup category view event listeners
      this.setupCategoryEventListeners(container, db, entities, categoryData);
    }
  },

  renderTable(entities) {
    const tbody = document.getElementById('explorer-tbody');
    const countEl = document.getElementById('entity-count');

    // Check if any entity has mosaic funding to decide whether to show the column
    const showMosaicColumn = entities.some(e => e.mosaic_funding > 0);

    // Filter by entity type
    let filtered = entities;
    if (entityTypeFilter !== 'all') {
      filtered = entities.filter(e => getEntityType(e) === entityTypeFilter);
    }

    // Filter by text
    if (filterText) {
      filtered = filtered.filter(e =>
        e.name && (e.name.toLowerCase().includes(filterText) || (e.displayName && e.displayName.toLowerCase().includes(filterText)))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle nulls
      if (sortColumn === 'name') {
        aVal = (a.displayName || a.name || '').toLowerCase();
        bVal = (b.displayName || b.name || '').toLowerCase();
      } else {
        if (aVal == null) {aVal = 0;}
        if (bVal == null) {bVal = 0;}
      }

      if (aVal < bVal) {return sortDirection === 'asc' ? -1 : 1;}
      if (aVal > bVal) {return sortDirection === 'asc' ? 1 : -1;}
      if (aVal > bVal) {return sortDirection === 'asc' ? 1 : -1;}
      return 0;
    });

    // Update column headers visibility
    const mosaicHeaders = document.querySelectorAll('.mosaic-col');
    mosaicHeaders.forEach(el => el.style.display = showMosaicColumn ? '' : 'none');

    // Update count
    countEl.textContent = `${filtered.length} entities`;

    // Render rows with tabindex and data attributes for accessibility
    tbody.innerHTML = filtered.map(entity => {
      const pctClass = entity.pct_spent >= 75 ? 'badge-expended' :
        entity.pct_spent >= 25 ? 'badge-encumbered' : '';
      const entityType = getEntityType(entity);
      const typeBadge = entityType === 'county' ? '<span class="badge" style="margin-left: var(--space-sm); background: var(--color-bg-secondary);">County</span>' :
        entityType === 'organization' ? '<span class="badge" style="margin-left: var(--space-sm); background: var(--color-bg-secondary);">Org</span>' : '';

      return `
                <tr class="clickable" 
                    data-record-id="${entity.record_id}" 
                    tabindex="0" 
                    role="row"
                    aria-label="View ${escapeHtml(entity.displayName || entity.name)} details">
                    <td>
                        <strong>${escapeHtml(entity.displayName || entity.name)}</strong>
                        ${typeBadge}
                        ${entity.is_collaborative === 1 ? '<span class="badge badge-encumbered" style="margin-left: var(--space-sm);">OAC</span>' : ''}
                    </td>
                    <td class="text-right">${Data.formatCurrency(entity.fy25_disbursement)}</td>
                    <td class="text-right">${Data.formatCurrency(entity.total_expended)}</td>
                    <td class="text-right">${Data.formatCurrency(entity.total_encumbered)}</td>
                    <td class="text-right">${Data.formatCurrency(entity.total_remaining)}</td>
                    <td class="text-right">
                        <span class="badge ${pctClass}">${Data.formatPercent(entity.pct_spent)}</span>
                    </td>
                    ${showMosaicColumn ? `<td class="text-right mosaic-col">${Data.formatCurrency(entity.mosaic_funding)}</td>` : ''}
                </tr>
            `;
    }).join('');
  },

  // Returns HTML structure for entity table
  renderEntityTableHTML() {
    return `
            <div class="table-container">
                <table id="explorer-table" role="grid">
                    <thead>
                        <tr>
                            <th class="sortable" data-col="name">Name</th>
                            <th class="sortable text-right" data-col="fy25_disbursement">FY25 Disbursement</th>
                            <th class="sortable text-right" data-col="total_expended">Expended${sortColumn === 'total_expended' ? (sortDirection === 'desc' ? ' ▼' : ' ▲') : ''}</th>
                            <th class="sortable text-right" data-col="total_encumbered">Encumbered${sortColumn === 'total_encumbered' ? (sortDirection === 'desc' ? ' ▼' : ' ▲') : ''}</th>
                            <th class="sortable text-right" data-col="total_remaining">Remaining${sortColumn === 'total_remaining' ? (sortDirection === 'desc' ? ' ▼' : ' ▲') : ''}</th>
                            <th class="sortable text-right" data-col="pct_spent">% Utilized${sortColumn === 'pct_spent' ? (sortDirection === 'desc' ? ' ▼' : ' ▲') : ''}</th>
                            <th class="sortable text-right mosaic-col" data-col="mosaic_funding" style="display: none;">Mosaic Funding${sortColumn === 'mosaic_funding' ? (sortDirection === 'desc' ? ' ▼' : ' ▲') : ''}</th>
                        </tr>
                    </thead>
                    <tbody id="explorer-tbody">
                    </tbody>
                </table>
            </div>
        `;
  },

  // Returns HTML for category view (table or drilldown)
  renderCategoryViewHTML(categoryData, entities) {
    if (categoryDrilldown) {
      return this.renderCategoryDrilldownHTML(categoryDrilldown, entities);
    }
    return this.renderCategoryTableHTML(categoryData);
  },

  // Returns HTML for category breakdown table
  renderCategoryTableHTML(categoryData) {
    const totalSpent = categoryData.reduce((sum, cat) => sum + cat.total, 0);

    // Sort categories
    const sorted = [...categoryData].sort((a, b) => {
      const aVal = categorySortColumn === 'name' ? a.name.toLowerCase() : a[categorySortColumn];
      const bVal = categorySortColumn === 'name' ? b.name.toLowerCase() : b[categorySortColumn];
      if (aVal < bVal) {return categorySortDirection === 'asc' ? -1 : 1;}
      if (aVal > bVal) {return categorySortDirection === 'asc' ? 1 : -1;}
      return 0;
    });

    const getSortIndicator = (col) => {
      if (categorySortColumn === col) {
        return categorySortDirection === 'desc' ? ' ▼' : ' ▲';
      }
      return '';
    };

    return `
            <div class="table-container">
                <table id="category-table" role="grid">
                    <thead>
                        <tr>
                            <th class="sortable" data-col="name">Category${getSortIndicator('name')}</th>
                            <th class="sortable text-right" data-col="expended">Expended${getSortIndicator('expended')}</th>
                            <th class="sortable text-right" data-col="encumbered">Encumbered${getSortIndicator('encumbered')}</th>
                            <th class="sortable text-right" data-col="total">Total${getSortIndicator('total')}</th>
                            <th class="text-right">% of Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sorted.map(cat => {
    const pct = totalSpent > 0 ? (cat.total / totalSpent * 100) : 0;
    return `
                                <tr class="clickable category-row"
                                    data-category-id="${cat.id}"
                                    data-category-name="${escapeHtml(cat.name)}"
                                    tabindex="0"
                                    role="row"
                                    aria-label="View municipalities spending on ${escapeHtml(cat.name)}">
                                    <td><strong>${escapeHtml(cat.name)}</strong></td>
                                    <td class="text-right">${Data.formatCurrency(cat.expended)}</td>
                                    <td class="text-right">${Data.formatCurrency(cat.encumbered)}</td>
                                    <td class="text-right">${Data.formatCurrency(cat.total)}</td>
                                    <td class="text-right">${Data.formatPercent(pct)}</td>
                                </tr>
                            `;
  }).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: var(--color-bg-secondary); font-weight: 600;">
                            <td>Total</td>
                            <td class="text-right">${Data.formatCurrency(categoryData.reduce((s, c) => s + c.expended, 0))}</td>
                            <td class="text-right">${Data.formatCurrency(categoryData.reduce((s, c) => s + c.encumbered, 0))}</td>
                            <td class="text-right">${Data.formatCurrency(totalSpent)}</td>
                            <td class="text-right">100%</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
  },

  // Returns HTML for category drilldown view
  renderCategoryDrilldownHTML(drilldown, entities) {
    const categorySpending = this.getMunicipalitiesInCategory(drilldown.id, entities);

    return `
            <div class="category-drilldown">
                <div class="drilldown-header">
                    <button class="btn btn-secondary" id="back-to-categories">
                        ← Back to Categories
                    </button>
                    <h3>Municipalities Spending on ${escapeHtml(drilldown.name)}</h3>
                    <span style="color: var(--color-text-muted);">${categorySpending.length} entities</span>
                </div>
                <div class="table-container">
                    <table role="grid">
                        <thead>
                            <tr>
                                <th>Municipality</th>
                                <th class="text-right">Amount in Category</th>
                            </tr>
                        </thead>
                        <tbody id="drilldown-tbody">
                            ${categorySpending.length > 0
    ? categorySpending.map(item => `
                                    <tr class="clickable"
                                        data-record-id="${item.recordId}"
                                        tabindex="0"
                                        role="row"
                                        aria-label="View ${escapeHtml(item.name)} details">
                                        <td>${escapeHtml(item.name)}</td>
                                        <td class="text-right">${Data.formatCurrency(item.amount)}</td>
                                    </tr>
                                `).join('')
    : '<tr><td colspan="2" style="text-align: center; color: var(--color-text-muted);">No spending in this category</td></tr>'
}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
  },

  // Get municipalities with spending in a specific category
  getMunicipalitiesInCategory(categoryId, entities) {
    const categorySpending = [];

    entities.forEach(entity => {
      const fullEntity = Data.getEntityById(entity.record_id);
      if (!fullEntity) {return;}

      const expenditures = Data.normalizeExpenditures(fullEntity);
      let categoryTotal = 0;

      expenditures.forEach(exp => {
        if (exp.categoryId === categoryId) {
          categoryTotal += (exp.amount - exp.offset);
        }
      });

      if (categoryTotal > 0) {
        categorySpending.push({
          name: entity.displayName || entity.name,
          recordId: entity.record_id,
          amount: categoryTotal
        });
      }
    });

    return categorySpending.sort((a, b) => b.amount - a.amount);
  },

  // Setup event listeners for category view
  setupCategoryEventListeners(container, db, entities, categoryData) {
    const contentEl = document.getElementById('explorer-content');

    // Category row clicks (drill down)
    contentEl.addEventListener('click', (e) => {
      const categoryRow = e.target.closest('.category-row');
      if (categoryRow) {
        categoryDrilldown = {
          id: parseInt(categoryRow.dataset.categoryId),
          name: categoryRow.dataset.categoryName
        };
        this.render(container, db);
        return;
      }

      // Back button
      if (e.target.closest('#back-to-categories')) {
        categoryDrilldown = null;
        this.render(container, db);
        return;
      }

      // Drilldown row clicks (go to entity detail)
      const drilldownRow = e.target.closest('#drilldown-tbody tr[data-record-id]');
      if (drilldownRow) {
        window.dashboardNavigate('detail', { id: drilldownRow.dataset.recordId });
      }
    });

    // Keyboard navigation
    contentEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const categoryRow = e.target.closest('.category-row');
        if (categoryRow) {
          e.preventDefault();
          categoryDrilldown = {
            id: parseInt(categoryRow.dataset.categoryId),
            name: categoryRow.dataset.categoryName
          };
          this.render(container, db);
          return;
        }

        const drilldownRow = e.target.closest('#drilldown-tbody tr[data-record-id]');
        if (drilldownRow) {
          e.preventDefault();
          window.dashboardNavigate('detail', { id: drilldownRow.dataset.recordId });
        }
      }
    });

    // Category table sorting
    document.querySelectorAll('#category-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (categorySortColumn === col) {
          categorySortDirection = categorySortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          categorySortColumn = col;
          categorySortDirection = col === 'name' ? 'asc' : 'desc';
        }
        this.render(container, db);
      });
    });
  },

  updateSortIndicators() {
    document.querySelectorAll('#explorer-table th.sortable').forEach(th => {
      const col = th.dataset.col;
      let text = th.textContent.replace(/ [▲▼]/g, '');
      if (col === sortColumn) {
        text += sortDirection === 'asc' ? ' ▲' : ' ▼';
      }
      th.textContent = text;
    });
  },

  destroy() {
    // Reset entity view state
    sortColumn = 'total_expended';
    sortDirection = 'desc';
    filterText = '';
    entityTypeFilter = 'all';

    // Reset category view state
    viewMode = 'entities';
    categoryDrilldown = null;
    categorySortColumn = 'total';
    categorySortDirection = 'desc';
  }
};
