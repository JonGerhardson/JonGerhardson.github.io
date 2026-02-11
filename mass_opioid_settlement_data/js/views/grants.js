/**
 * Grants View
 * Lists all Mosaic CORE and Family Resilience grants
 */

import * as Data from '../data.js';
import { escapeHtml } from '../utils.js';

export default {
  name: 'grants',
  title: 'Grants',

  async render(container, db, params) {
    const grants = Data.getAllRegionalGrants();
    const rizeGrants = [];
    // Extract RIZE grants manually since they are keyed by municipality without a "global" list
    // Actually, Data.js caches them in `rizeGrantCache`. Let's hack a getter or just iterate.
    // Data.getAllRizeGrants() doesn't exist. I'll stick to Mosaic/Family first as requested.
    // Or I can add `getAllRizeGrants` to `data.js`. 
    // For now, let's focus on Mosaic/Family.

    container.innerHTML = `
            <div class="entity-header">
                <h1 class="mb-sm">Grants</h1>
            </div>

            <section class="mb-xl">
                 <div class="card mb-lg regional-grants-section">
                    <div class="card-header">
                         <div>
                            <h3 class="mb-xs"><span class="mosaic-badge">MOSAIC</span> Statewide Programs</h3>
                            <div class="text-muted">Available to all Massachusetts municipalities</div>
                        </div>
                    </div>
                    ${this.renderFamilyResilienceGrants(grants.statewide, true)}
                </div>
            </section>

             <section class="mb-xl">
                <div class="card mb-lg regional-grants-section">
                     <div class="card-header">
                        <div>
                            <h3 class="mb-xs"><span class="mosaic-badge">MOSAIC</span> Family Resilience Grants</h3>
                            <div class="text-muted">Regional Grants</div>
                        </div>
                    </div>
                    ${this.renderFamilyResilienceGrants(grants.familyResilience)}
                </div>
            </section>

            <section class="mb-xl">
                <div class="card mb-lg regional-grants-section">
                     <div class="card-header">
                        <div>
                            <h3 class="mb-xs"><span class="mosaic-badge">MOSAIC</span> CORE Grants</h3>
                            <div class="text-muted">Community Organization Relief & Engagement</div>
                        </div>
                    </div>
                    ${this.renderCoreGrants(grants.core)}
                </div>
            </section>
        `;
  },

  renderCoreGrants(grants) {
    if (!grants || grants.length === 0) {return '<p class="p-md text-muted">No grants found.</p>';}
    return `
            <div class="rize-grant-list">
                ${grants.map(grant => this.renderGrantItem(grant, 'CORE')).join('')}
            </div>
        `;
  },

  renderFamilyResilienceGrants(grants, isStatewide = false) {
    if (!grants || grants.length === 0) {return '<p class="p-md text-muted">No grants found.</p>';}
    return `
            <div class="rize-grant-list">
                ${grants.map(grant => this.renderGrantItem(grant, 'Family Resilience')).join('')}
            </div>
        `;
  },

  renderGrantItem(grant, typeLabel) {
    const getFocusClass = (focus) => {
      const map = {
        'Recovery Supports': 'focus-yellow',
        'Prevention': 'focus-green',
        'Harm Reduction': 'focus-pink',
        'Connections to Care': 'focus-blue',
        'Trauma & Grieving Families': 'focus-gray'
      };
      return map[focus] || 'focus-gray';
    };

    const focusAreas = Array.isArray(grant.focusAreas) ? grant.focusAreas : [grant.focusAreas];

    return `
            <div class="rize-grant-item">
                <div class="d-flex justify-content-between align-items-start mb-sm">
                    <div>
                        <h4 class="m-0">${escapeHtml(grant.awardee)}</h4>
                        ${grant.website ? `<a href="${escapeHtml(grant.website)}" target="_blank" class="text-sm">Visit Website ↗</a>` : ''}
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-lg">${Data.formatCurrency(grant.amount)}</div>
                        <div class="text-sm text-muted">${escapeHtml(grant.period)}</div>
                    </div>
                </div>
                
                <div class="mb-sm">
                    <span class="badge" style="background: var(--color-mosaic-light); color: var(--color-mosaic-dark);">${typeLabel}</span>
                    ${focusAreas.map(area =>
    `<span class="badge ${getFocusClass(area)}">${escapeHtml(area)}</span>`
  ).join(' ')}
                </div>
                
                ${grant.geography ? `
                    <div class="mb-sm text-sm">
                        <span class="font-bold">Region/County:</span> ${escapeHtml(grant.geography)}
                    </div>
                ` : ''}

                <div class="text-sm">
                    <p>${escapeHtml(grant.mission)}</p>
                </div>
            </div>
        `;
  },

  destroy() {
  }
};
