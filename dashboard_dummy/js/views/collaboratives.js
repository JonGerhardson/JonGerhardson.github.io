/**
 * Collaboratives View
 * Shows all OACs with member municipalities and pooled fund totals
 */

import * as Data from '../data.js';

export default {
  name: 'collaboratives',
  title: 'Collaboratives',

  async render(container, db) {
    // Get all entities and group by collaborative
    const entities = Data.getAllEntities();
    const collaborativeData = this.buildCollaborativeData(entities);

    container.innerHTML = `
            <h2 class="mb-md">Opioid Abatement Collaboratives</h2>
            <p class="mb-lg" style="color: var(--color-text-muted);">
                Opioid Abatement Collaboratives (OACs) are regional partnerships where municipalities 
                pool their settlement funds to implement shared strategies. Click on a collaborative 
                to see its member municipalities.
            </p>
            
            <div class="hero-stats mb-xl">
                <div class="stat-card">
                    <div class="stat-value">${collaborativeData.length}</div>
                    <div class="stat-label">Active Collaboratives</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.countTotalMembers(collaborativeData)}</div>
                    <div class="stat-label">Member Municipalities</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">$${Data.formatCurrency(this.sumPooledFunds(collaborativeData))}</div>
                    <div class="stat-label">Total Pooled Funds</div>
                </div>
            </div>
            
            <div class="collaboratives-grid" id="collaboratives-grid">
                ${collaborativeData.map(collab => this.renderCollaborativeCard(collab)).join('')}
            </div>
        `;

    // Add expand/collapse handlers
    document.querySelectorAll('.collab-card').forEach(card => {
      card.querySelector('.collab-header').addEventListener('click', () => {
        card.classList.toggle('expanded');
      });
    });
  },

  buildCollaborativeData(entities) {
    const collabMap = new Map();

    entities.forEach(entity => {
      const fullEntity = Data.getEntityById(entity.record_id);
      if (!fullEntity) {return;}

      // Check if entity is part of a collaborative
      if (fullEntity.pooled_yn !== 1) {return;}

      const collabId = fullEntity.collaborative_name;
      if (!collabId) {return;}

      const collabName = Data.COLLABORATIVES[collabId] || `Collaborative ${collabId}`;

      if (!collabMap.has(collabId)) {
        collabMap.set(collabId, {
          id: collabId,
          name: collabName,
          members: [],
          leadMunicipality: null,
          totalPooled: 0,
          totalExpended: 0,
          totalEncumbered: 0
        });
      }

      const collab = collabMap.get(collabId);

      // Add member
      collab.members.push({
        name: entity.name,
        recordId: entity.record_id,
        contribution: fullEntity.amt_pooled || 0,
        isLead: fullEntity.lead_muni === 1
      });

      // Track lead municipality
      if (fullEntity.lead_muni === 1) {
        collab.leadMunicipality = entity.name;
      }

      // Sum financials
      collab.totalPooled += (fullEntity.amt_pooled || 0);

      // If this is the lead, get their collaborative expenditures
      if (fullEntity.lead_muni === 1) {
        collab.totalExpended = fullEntity.t_exp || 0;
        collab.totalEncumbered = fullEntity.t_enc || 0;
      }
    });

    // Sort by total pooled funds descending
    return Array.from(collabMap.values())
      .filter(c => c.members.length > 0)
      .sort((a, b) => b.totalPooled - a.totalPooled);
  },

  countTotalMembers(collaboratives) {
    return collaboratives.reduce((sum, c) => sum + c.members.length, 0);
  },

  sumPooledFunds(collaboratives) {
    return collaboratives.reduce((sum, c) => sum + c.totalPooled, 0);
  },

  renderCollaborativeCard(collab) {
    const pctSpent = collab.totalPooled > 0
      ? ((collab.totalExpended + collab.totalEncumbered) / collab.totalPooled * 100).toFixed(1)
      : 0;

    // Sort members: lead first, then by contribution
    const sortedMembers = [...collab.members].sort((a, b) => {
      if (a.isLead) {return -1;}
      if (b.isLead) {return 1;}
      return b.contribution - a.contribution;
    });

    return `
            <div class="collab-card card">
                <div class="collab-header">
                    <div class="collab-title">
                        <h3>${escapeHtml(collab.name)}</h3>
                        <span class="collab-member-count">${collab.members.length} member${collab.members.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="collab-stats">
                        <div class="collab-stat">
                            <span class="collab-stat-value">$${Data.formatCurrency(collab.totalPooled)}</span>
                            <span class="collab-stat-label">Pooled</span>
                        </div>
                        <div class="collab-stat">
                            <span class="collab-stat-value">${pctSpent}%</span>
                            <span class="collab-stat-label">Utilized</span>
                        </div>
                    </div>
                    <svg class="collab-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
                
                <div class="collab-details">
                    ${collab.leadMunicipality ? `
                        <p class="collab-lead">
                            <strong>Lead:</strong> ${escapeHtml(collab.leadMunicipality)}
                        </p>
                    ` : ''}
                    
                    <div class="collab-financial-summary">
                        <div>Expended: <strong>$${Data.formatCurrency(collab.totalExpended)}</strong></div>
                        <div>Encumbered: <strong>$${Data.formatCurrency(collab.totalEncumbered)}</strong></div>
                        <div>Remaining: <strong>$${Data.formatCurrency(collab.totalPooled - collab.totalExpended - collab.totalEncumbered)}</strong></div>
                    </div>
                    
                    <h4 class="collab-members-title">Members</h4>
                    <div class="collab-members-list">
                        ${sortedMembers.map(member => `
                            <div class="collab-member" onclick="dashboardNavigate('detail', {id: '${member.recordId}'})">
                                <span class="collab-member-name">
                                    ${escapeHtml(member.name)}
                                    ${member.isLead ? '<span class="badge badge-expended">Lead</span>' : ''}
                                </span>
                                <span class="collab-member-contribution">
                                    $${Data.formatCurrency(member.contribution)}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
  },

  destroy() {
    // Cleanup if needed
  }
};

function escapeHtml(text) {
  if (!text) {return '';}
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
