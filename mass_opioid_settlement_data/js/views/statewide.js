/**
 * Statewide Summary View
 * Landing page with hero stats, category donut, and top spenders bar chart
 */

import * as Data from '../data.js';

export default {
  name: 'statewide',
  title: 'Overview',

  async render(container, db) {
    const summary = Data.getStatewideSummary();
    const topSpenders = Data.getTopSpenders(10);
    const categoryData = Data.getSpendingByCategory();
    const stateSummary = Data.getStateSummary();

    container.innerHTML = `
            <section class="hero-stats">
                <div class="stat-card">
                    <div class="stat-value">${Data.formatCurrency(summary.totalDistributed)}</div>
                    <div class="stat-label">FY25 Distributed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Data.formatCurrency(summary.totalExpended)}</div>
                    <div class="stat-label">Total Expended</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Data.formatCurrency(summary.totalEncumbered)}</div>
                    <div class="stat-label">Encumbered</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${summary.totalEntities}</div>
                    <div class="stat-label">Reporting Entities</div>
                </div>
            </section>

            <div class="chart-grid">
                <div class="chart-card">
                    <h3 class="chart-title">Spending by Category</h3>
                    <div class="category-bars" id="category-chart"></div>
                </div>
                <div class="chart-card">
                    <h3 class="chart-title">Top 10 Spenders</h3>
                    <div class="bar-chart" id="top-spenders-chart"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Quick Overview</h3>
                    <a href="#explorer" class="btn btn-primary">View All Municipalities →</a>
                </div>
                <p style="color: var(--color-text-muted);">
                    Massachusetts municipalities are reporting how they spend opioid settlement funds
                    to address the opioid crisis. This dashboard provides transparency into expenditures
                    across ${summary.totalEntities} reporting entities.
                </p>
            </div>

            <div class="card" style="background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg) 100%); border-left: 4px solid var(--color-primary);">
                <div class="card-header">
                    <h3 class="card-title">State Agency Spending</h3>
                    <a href="#state-spending" class="btn btn-secondary">View Details →</a>
                </div>
                <div style="display: flex; gap: var(--space-xl); flex-wrap: wrap; margin-top: var(--space-sm);">
                    <div>
                        <div style="font-size: var(--font-size-2xl); font-weight: 600; color: var(--color-text-primary);">${Data.formatCurrency(stateSummary.total)}</div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">from CTHRU (FY25)</div>
                    </div>
                    <div>
                        <div style="font-size: var(--font-size-2xl); font-weight: 600; color: var(--color-text-primary);">${stateSummary.uniqueVendors}</div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Vendors Paid</div>
                    </div>
                    <div>
                        <div style="font-size: var(--font-size-2xl); font-weight: 600; color: var(--color-text-primary);">${stateSummary.recordCount.toLocaleString()}</div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Transactions</div>
                    </div>
                </div>
                <p style="color: var(--color-text-muted); margin-top: var(--space-md); margin-bottom: 0; font-size: var(--font-size-sm);">
                    Actual payments from the Opioid Recovery and Remediation Fund by state agencies (DPH, EPS),
                    separate from municipal self-reported spending.
                </p>
            </div>
        `;

    // Render category horizontal bars
    this.renderCategoryBars(categoryData);

    // Render top spenders
    this.renderTopSpenders(topSpenders);
  },

  renderCategoryBars(categories) {
    const container = document.getElementById('category-chart');
    const maxTotal = Math.max(...categories.map(c => c.total));

    const chartColors = [
      'var(--chart-1)',
      'var(--chart-2)',
      'var(--chart-3)',
      'var(--chart-4)',
      'var(--chart-5)',
      'var(--chart-6)'
    ];

    container.innerHTML = categories
      .map((cat, i) => {
        const pct = maxTotal > 0 ? (cat.total / maxTotal) * 100 : 0;
        return `
                <div class="category-bar-row" style="margin-bottom: var(--space-md);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-xs);">
                        <span style="font-weight: 500;">${cat.name}</span>
                        <span style="color: var(--color-text-muted);">${Data.formatCurrency(cat.total)}</span>
                    </div>
                    <div style="background: var(--color-bg-secondary); border-radius: var(--border-radius-sm); height: 24px; overflow: hidden;">
                        <div style="
                            width: ${pct}%;
                            height: 100%;
                            background: ${chartColors[i % chartColors.length]};
                            border-radius: var(--border-radius-sm);
                            transition: width 0.5s ease;
                        "></div>
                    </div>
                </div>
            `;
      })
      .join('');
  },

  renderTopSpenders(spenders) {
    const container = document.getElementById('top-spenders-chart');
    const maxSpent = Math.max(...spenders.map(s => s.total_expended + s.total_encumbered));

    container.innerHTML = spenders
      .map((entity, i) => {
        const total = entity.total_expended + entity.total_encumbered;
        const pct = maxSpent > 0 ? (total / maxSpent) * 100 : 0;
        const expPct = total > 0 ? (entity.total_expended / total) * 100 : 0;

        return `
                <div class="spender-bar-row" style="margin-bottom: var(--space-sm); cursor: pointer;"
                     data-record-id="${entity.record_id}"
                     tabindex="0"
                     role="button"
                     aria-label="View ${entity.displayName || entity.name} details">
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-xs);">
                        <span style="font-weight: 500; font-size: var(--font-size-sm);">${i + 1}. ${entity.displayName || entity.name}</span>
                        <span style="color: var(--color-text-muted); font-size: var(--font-size-sm);">${Data.formatCurrency(total)}</span>
                    </div>
                    <div style="background: var(--color-bg-secondary); border-radius: var(--border-radius-sm); height: 20px; overflow: hidden; display: flex;">
                        <div style="width: ${(pct * expPct) / 100}%; height: 100%; background: var(--color-success);"
                             title="Expended: ${Data.formatCurrency(entity.total_expended)}"></div>
                        <div style="width: ${(pct * (100 - expPct)) / 100}%; height: 100%; background: var(--color-warning);"
                             title="Encumbered: ${Data.formatCurrency(entity.total_encumbered)}"></div>
                    </div>
                </div>
            `;
      })
      .join('');

    // Event delegation for spender clicks
    container.addEventListener('click', e => {
      const row = e.target.closest('[data-record-id]');
      if (row) {
        window.dashboardNavigate('detail', { id: row.dataset.recordId });
      }
    });

    // Keyboard navigation for spenders
    container.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const row = e.target.closest('[data-record-id]');
        if (row) {
          e.preventDefault();
          window.dashboardNavigate('detail', { id: row.dataset.recordId });
        }
      }
    });

    // Legend
    container.innerHTML += `
            <div style="display: flex; gap: var(--space-md); margin-top: var(--space-md); font-size: var(--font-size-xs);">
                <span><span style="display: inline-block; width: 12px; height: 12px; background: var(--color-success); border-radius: 2px;"></span> Expended</span>
                <span><span style="display: inline-block; width: 12px; height: 12px; background: var(--color-warning); border-radius: 2px;"></span> Encumbered</span>
            </div>
        `;
  },

  destroy() {
    // Cleanup if needed
  }
};
