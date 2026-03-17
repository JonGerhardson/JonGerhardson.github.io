/**
 * State Agencies Spending View
 * Shows FY25 state-level spending from EOHHS (Opioid Recovery and Remediation Fund)
 */

import * as Data from '../data.js';
import { escapeHtml } from '../utils.js';

export default {
  name: 'state-spending',
  title: 'State Agencies',

  async render(container, db, params) {
    const availableYears = Data.getItemizedStateFiscalYears();
    const defaultYear = availableYears[0] || 2025;

    // Use year from params or state, default to newest
    this.currentFiscalYear = this.currentFiscalYear || defaultYear;

    const summary = Data.getItemizedStateSummary(this.currentFiscalYear);
    const deptData = Data.getItemizedStateSpendingByDepartment(this.currentFiscalYear);
    const vendorData = Data.getItemizedStateSpendingByVendor(1000, this.currentFiscalYear);
    const programData = Data.getItemizedStateSpendingByProgram(this.currentFiscalYear);

    container.innerHTML = `
            <div class="entity-header">
                <h1 class="mb-sm">
                    State Agencies
                    <span class="debug-info">EOHHS Data</span>
                </h1>

                ${availableYears.length > 1 ? `
                    <div class="fiscal-year-selector">
                        <label for="state-fy-select" class="sr-only">Fiscal Year</label>
                        <select id="state-fy-select" class="fy-dropdown">
                            ${availableYears.map(year => `
                                <option value="${year}" ${year === this.currentFiscalYear ? 'selected' : ''}>FY${year}</option>
                            `).join('')}
                        </select>
                    </div>
                ` : `
                    <span class="fy-badge fy${defaultYear}">FY${defaultYear}</span>
                `}
            </div>

            <section class="hero-stats">
                <div class="stat-card">
                    <div class="stat-value">${Data.formatCurrency(summary.total)}</div>
                    <div class="stat-label">
                        FY${this.currentFiscalYear} State Spending
                        <span class="debug-info">SUM(posting_line_amount)</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${summary.recordCount.toLocaleString()}</div>
                    <div class="stat-label">
                        Transactions
                        <span class="debug-info">COUNT(*)</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${summary.uniqueVendors}</div>
                    <div class="stat-label">
                        Unique Vendors
                        <span class="debug-info">COUNT(DISTINCT legal_name)</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Data.formatCurrency(summary.recordCount > 0 ? summary.total / summary.recordCount : 0)}</div>
                    <div class="stat-label">
                        Avg Transaction
                        <span class="debug-info">AVG(posting_line_amount)</span>
                    </div>
                </div>
            </section>

            <div class="card" style="margin-bottom: var(--space-lg);">
                <div class="card-header">
                    <h3 class="card-title">About This Data</h3>
                </div>
                <p style="color: var(--color-text-muted); margin: 0;">
                    This shows actual payments from the Massachusetts <strong>Opioid Recovery and Remediation Fund</strong>
                    for <strong>Fiscal Year ${this.currentFiscalYear}</strong> as reported by
                    <strong>EOHHS</strong> (Executive Office of Health and Human Services).
                    These are state agency expenditures (primarily DPH),
                    separate from the municipal spending reported via survey.
                    Dataset covers activity through September 8, 2025; provided by EOHHS on March 17, 2026.
                    <span class="debug-info">table: itemized_state_spending, year: ${this.currentFiscalYear}</span>
                </p>
            </div>

            <div class="chart-grid">
                <div class="chart-card">
                    <h3 class="chart-title">
                        Spending by Department
                        <span class="debug-info">department</span>
                    </h3>
                    <div id="dept-chart" class="category-bars"></div>
                </div>
                <div class="chart-card">
                    <h3 class="chart-title">
                        Spending by Program
                        <span class="debug-info">orrf_program_initiative</span>
                    </h3>
                    <div id="program-chart" class="category-bars"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Top Vendors (FY${this.currentFiscalYear})</h3>
                </div>
                <div class="table-container">
                    <table class="data-table" id="vendor-table">
                        <thead>
                            <tr>
                                <th>Vendor <span class="debug-info">legal_name</span></th>
                                <th style="text-align: right;">Total <span class="debug-info">SUM(posting_line_amount)</span></th>
                                <th style="text-align: right;"># Transactions <span class="debug-info">COUNT(*)</span></th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        `;

    this.renderDeptChart(deptData);
    this.renderProgramChart(programData);
    this.renderVendorTable(vendorData);

    // Add event listener for dropdown
    const fySelect = container.querySelector('#state-fy-select');
    if (fySelect) {
      fySelect.addEventListener('change', (e) => {
        this.currentFiscalYear = parseInt(e.target.value);
        this.render(container, db, params); // Re-render with new year
      });
    }
  },

  renderDeptChart(depts) {
    const container = document.getElementById('dept-chart');
    const maxTotal = Math.max(...depts.map(d => d.total));

    const chartColors = [
      'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
      'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'
    ];

    const deptNames = {
      DPH: 'Dept. of Public Health',
      EHS: 'Executive Office of Health & Human Services',
      EPS: 'Exec. Office of Public Safety & Security'
    };

    container.innerHTML = depts.map((dept, i) => {
      const pct = maxTotal > 0 ? (dept.total / maxTotal * 100) : 0;
      const displayName = deptNames[dept.code] || dept.code;

      return `
                <div class="category-bar-row" style="margin-bottom: var(--space-md);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-xs);">
                        <span style="font-weight: 500;">${escapeHtml(dept.code)} — ${escapeHtml(displayName)}</span>
                        <span style="color: var(--color-text-muted);">${Data.formatCurrency(dept.total)}</span>
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
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: var(--space-xs);">
                        ${dept.count.toLocaleString()} transactions
                    </div>
                </div>
            `;
    }).join('');
  },

  renderProgramChart(programs) {
    const container = document.getElementById('program-chart');
    const maxTotal = Math.max(...programs.map(p => p.total));

    const chartColors = [
      'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)',
      'var(--chart-5)', 'var(--chart-6)', 'var(--chart-1)'
    ];

    container.innerHTML = programs.map((prog, i) => {
      const pct = maxTotal > 0 ? (prog.total / maxTotal * 100) : 0;
      return `
                <div class="category-bar-row" style="margin-bottom: var(--space-md);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-xs);">
                        <span style="font-weight: 500;">${escapeHtml(prog.code)}</span>
                        <span style="color: var(--color-text-muted);">${Data.formatCurrency(prog.total)}</span>
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
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: var(--space-xs);">
                        ${prog.count.toLocaleString()} transactions
                    </div>
                </div>
            `;
    }).join('');
  },

  renderVendorTable(vendors) {
    const tbody = document.querySelector('#vendor-table tbody');

    tbody.innerHTML = vendors.map(vendor => `
            <tr>
                <td style="font-weight: 500;">${escapeHtml(vendor.name)}</td>
                <td style="text-align: right; font-family: var(--font-mono);">${Data.formatCurrency(vendor.total)}</td>
                <td style="text-align: right;">${vendor.count}</td>
            </tr>
        `).join('');
  },

  destroy() {
    // Cleanup if needed
  }
};
