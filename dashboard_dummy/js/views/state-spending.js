/**
 * State Agencies Spending View
 * Shows FY25 state-level spending from CTHRU (Opioid Recovery and Remediation Fund)
 */

import * as Data from '../data.js';
import { escapeHtml } from '../utils.js';

export default {
  name: 'state-spending',
  title: 'State Agencies',

  async render(container, db, params) {
    const availableYears = Data.getStateFiscalYears();
    const defaultYear = availableYears[0] || 2025;

    // Use year from params or state, default to newest
    this.currentFiscalYear = this.currentFiscalYear || defaultYear;

    const summary = Data.getStateSummary(this.currentFiscalYear);
    const deptData = Data.getStateSpendingByDepartment(this.currentFiscalYear);
    const vendorData = Data.getStateSpendingByVendor(1000, this.currentFiscalYear);
    const objectClassData = Data.getStateSpendingByObjectClass(this.currentFiscalYear);

    container.innerHTML = `
            <div class="entity-header">
                <h1 class="mb-sm">
                    State Agencies
                    <span class="debug-info">CTHRU Data</span>
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
                    <div class="stat-value">$${Data.formatCurrency(summary.total)}</div>
                    <div class="stat-label">
                        FY${this.currentFiscalYear} State Spending
                        <span class="debug-info">SUM(amount)</span>
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
                        <span class="debug-info">COUNT(DISTINCT vendor)</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">$${Data.formatCurrency(summary.recordCount > 0 ? summary.total / summary.recordCount : 0)}</div>
                    <div class="stat-label">
                        Avg Transaction
                        <span class="debug-info">AVG(amount)</span>
                    </div>
                </div>
            </section>

            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">About This Data</h3>
                </div>
                <p style="color: var(--color-text-muted); margin: 0;">
                    This shows actual payments from the Massachusetts <strong>Opioid Recovery and Remediation Fund</strong> 
                    for <strong>Fiscal Year ${this.currentFiscalYear}</strong> as recorded in 
                    <a href="https://cthruspending.mass.gov" target="_blank" rel="noopener">CTHRU</a>, 
                    the state's transparency portal. These are state agency expenditures (primarily DPH), 
                    separate from the municipal spending reported via survey.
                    <span class="debug-info">table: state_spending, year: ${this.currentFiscalYear}</span>
                </p>
            </div>

            <div class="chart-grid">
                <div class="chart-card">
                    <h3 class="chart-title">
                        Spending by Department
                        <span class="debug-info">department_code, department</span>
                    </h3>
                    <div id="dept-chart" class="category-bars"></div>
                </div>
                <div class="chart-card">
                    <h3 class="chart-title">
                        Spending by Category
                        <span class="debug-info">object_class</span>
                    </h3>
                    <div id="object-class-chart" class="category-bars"></div>
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
                                <th>Vendor <span class="debug-info">vendor</span></th>
                                <th>Location <span class="debug-info">city, state</span></th>
                                <th style="text-align: right;">Total <span class="debug-info">SUM(amount)</span></th>
                                <th style="text-align: right;"># Payments <span class="debug-info">COUNT(*)</span></th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        `;

    this.renderDeptChart(deptData);
    this.renderObjectClassChart(objectClassData);
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

    container.innerHTML = depts.map((dept, i) => {
      const pct = maxTotal > 0 ? (dept.total / maxTotal * 100) : 0;
      const safeName = dept.name || 'Unknown';
      const displayName = safeName.includes('(') ? safeName.split('(')[0].trim() : safeName;

      return `
                <div class="category-bar-row" style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span style="font-weight: 500;">${escapeHtml(dept.code || 'UNK')} - ${escapeHtml(displayName)}</span>
                        <span style="color: var(--color-text-muted);">$${Data.formatCurrency(dept.total)}</span>
                    </div>
                    <div style="background: var(--color-bg-secondary); border-radius: 4px; height: 24px; overflow: hidden;">
                        <div style="
                            width: ${pct}%; 
                            height: 100%; 
                            background: ${chartColors[i % chartColors.length]};
                            border-radius: 4px;
                            transition: width 0.5s ease;
                        "></div>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.25rem;">
                        ${dept.count.toLocaleString()} transactions
                    </div>
                </div>
            `;
    }).join('');
  },

  renderObjectClassChart(objectClasses) {
    const container = document.getElementById('object-class-chart');
    const maxTotal = Math.max(...objectClasses.map(o => o.total));

    const chartColors = [
      'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)',
      'var(--chart-5)', 'var(--chart-6)', 'var(--chart-1)'
    ];

    // Shorten object class names
    const shortNames = {
      '(AA) REGULAR EMPLOYEE COMPENSATION': 'Salaries',
      '(BB) REGULAR EMPLOYEE RELATED EXPEN': 'Benefits',
      '(CC) SPECIAL EMPLOYEES': 'Contract Staff',
      '(HH) CONSULTANT SVCS (TO DEPTS)': 'Consultants',
      '(MM) PURCHASED CLIENT/PROGRAM SVCS': 'Program Services',
      '(PP) STATE AID/POL SUBS': 'State Aid',
      '(UU) IT NON-PAYROLL EXPENSE': 'IT'
    };

    container.innerHTML = objectClasses.map((obj, i) => {
      const pct = maxTotal > 0 ? (obj.total / maxTotal * 100) : 0;
      const displayName = shortNames[obj.code] || obj.code;
      return `
                <div class="category-bar-row" style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span style="font-weight: 500;">${escapeHtml(displayName)}</span>
                        <span style="color: var(--color-text-muted);">$${Data.formatCurrency(obj.total)}</span>
                    </div>
                    <div style="background: var(--color-bg-secondary); border-radius: 4px; height: 24px; overflow: hidden;">
                        <div style="
                            width: ${pct}%; 
                            height: 100%; 
                            background: ${chartColors[i % chartColors.length]};
                            border-radius: 4px;
                            transition: width 0.5s ease;
                        "></div>
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
                <td style="color: var(--color-text-muted);">
                    ${vendor.city && vendor.state ? `${escapeHtml(vendor.city)}, ${escapeHtml(vendor.state)}` : '—'}
                </td>
                <td style="text-align: right; font-family: var(--font-mono);">$${Data.formatCurrency(vendor.total)}</td>
                <td style="text-align: right;">${vendor.count}</td>
            </tr>
        `).join('');
  },

  destroy() {
    // Cleanup if needed
  }
};
