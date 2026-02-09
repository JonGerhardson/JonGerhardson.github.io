/**
 * Municipality Detail View
 * Deep-dive into a single municipality's expenditures, projects, and info
 */

import * as Data from '../data.js';
import { escapeHtml } from '../utils.js';

export default {
  name: 'detail',
  title: 'Detail',
  showInNav: false, // Don't show in main nav, accessed via explorer

  async render(container, db, params) {
    const recordId = params.id;

    if (!recordId) {
      container.innerHTML = `
                <div class="card">
                    <h2>No Municipality Selected</h2>
                    <p>Please select a municipality from the <a href="#explorer">explorer</a>.</p>
                </div>
            `;
      return;
    }

    const entity = Data.getEntityById(recordId);

    if (!entity) {
      container.innerHTML = `
                <div class="card">
                    <h2>Municipality Not Found</h2>
                    <p>Could not find data for record ID: ${recordId}</p>
                    <a href="#explorer" class="btn btn-primary">← Back to Explorer</a>
                </div>
            `;
      return;
    }

    const municipalityName = entity.municipality_csv;
    const availableYears = Data.getFiscalYears(municipalityName);
    const defaultYear = availableYears[0] || 2025; // Newest year first

    // Store current fiscal year for event handling
    this.currentFiscalYear = defaultYear;
    this.municipalityName = municipalityName;
    this.entity = entity;
    this.recordId = recordId;

    container.innerHTML = `
            <div class="mb-lg">
                <a href="#explorer" class="btn btn-secondary">← Back to Explorer</a>
            </div>
            
            <div class="entity-header">
                <h1 class="mb-sm">
                    ${escapeHtml(municipalityName)}
                    <span class="debug-info">record_id: ${recordId}</span>
                </h1>
                
                ${availableYears.length > 1 ? `
                    <div class="fiscal-year-selector">
                        <label for="fy-select" class="sr-only">Fiscal Year</label>
                        <select id="fy-select" class="fy-dropdown">
                            ${availableYears.map(year => `
                                <option value="${year}" ${year === defaultYear ? 'selected' : ''}>FY${year}</option>
                            `).join('')}
                        </select>
                    </div>
                ` : `
                    <span class="fy-badge fy${defaultYear}">FY${defaultYear}</span>
                `}
            </div>
            
            ${entity.contact_first || entity.contact_email ? `
                <div class="poc-info mb-lg">
                    <span class="poc-label">Point of Contact:</span>
                    ${entity.contact_first || entity.contact_last ? `
                        <span class="poc-name">${escapeHtml(`${entity.contact_first || ''  } ${  entity.contact_last || ''}`).trim()}</span>
                    ` : ''}
                    ${entity.contact_email ? `
                        <a href="mailto:${escapeHtml(entity.contact_email)}" class="poc-email">${escapeHtml(entity.contact_email)}</a>
                    ` : ''}
                    <span class="debug-info">contact_first, contact_last, contact_email</span>
                </div>
            ` : ''}
            
            <div id="fy-content">
                ${this.renderFiscalYearContent(defaultYear)}
            </div>
        `;

    // Trigger post-render actions (async loading)
    await this.postRenderFiscalYear(container, defaultYear);

    // Fiscal year dropdown change handler
    const fySelect = container.querySelector('#fy-select');
    if (fySelect) {
      fySelect.addEventListener('change', async (e) => {
        this.currentFiscalYear = parseInt(e.target.value);
        const fyContent = container.querySelector('#fy-content');
        fyContent.innerHTML = this.renderFiscalYearContent(this.currentFiscalYear);
        await this.postRenderFiscalYear(container, this.currentFiscalYear);
        this.attachTabListeners(container);
      });
    }

    this.attachTabListeners(container);
  },

  /**
     * Render content for a specific fiscal year (Synchronous part)
     */
  renderFiscalYearContent(fiscalYear) {
    const heroData = Data.getHeroData(this.municipalityName, fiscalYear);

    if (!heroData) {
      return `
                <div class="card">
                    <h3>No Data Available for FY${fiscalYear}</h3>
                    <p style="color: var(--color-text-muted);">Data for this fiscal year is not available.</p>
                </div>
            `;
    }

    // FY2023 status banner
    const fy23Banner = fiscalYear === 2023 && heroData.reportingStatus ? `
            <div class="fy23-status-banner mb-lg">
                <span class="status-badge">${escapeHtml(heroData.reportingStatus)}</span>
                <span class="status-note">Note: Detailed survey data was not collected in FY2023</span>
                <span class="debug-info">reporting_status from ${heroData.sourceFile}</span>
            </div>
        ` : '';

    // Hero cards
    const heroCards = this.renderHeroCards(heroData);

    // Detailed content placeholder or static content
    let detailedContent = '';
    if (fiscalYear === 2025) {
      detailedContent = this.renderFy25DetailedContent();
    } else if (fiscalYear === 2024 && heroData.surveyPath) {
      // Placeholder for async load
      detailedContent = `
                <div id="fy24-survey-container" class="fy24-survey-wrapper">
                    <div class="fy24-header mb-lg">
                        <span class="fy-badge fy2024">FY2024</span>
                        <h2 style="display: inline; margin-left: 0.5rem;">Full Expenditure Report</h2>
                    </div>
                    <div id="fy24-json-content" class="survey-content">
                        <div class="loading-skeleton" style="height: 200px;"></div>
                        <p style="color: var(--color-text-muted); text-align: center; margin-top: 1rem;">Loading FY2024 Report...</p>
                    </div>
                </div>
            `;
    } else if (fiscalYear === 2023) {
      detailedContent = `
                <div class="card">
                    <h3>FY2023 Data Summary</h3>
                    <p style="color: var(--color-text-muted);">
                        FY2023 was the first year of the opioid settlement fund distribution. 
                        Detailed expenditure reporting was not required for most municipalities.
                    </p>
                    <p>
                        <strong>Source:</strong> ${heroData.sourceFile}
                        ${heroData.sourceRow ? `, Row ${heroData.sourceRow}` : ''}
                    </p>
                </div>
            `;
    }

    return `
            ${fy23Banner}
            ${heroCards}
            ${detailedContent}
        `;
  },

  /**
     * Async actions after rendering fiscal year content
     */
  async postRenderFiscalYear(container, fiscalYear) {
    if (fiscalYear === 2024) {
      const heroData = Data.getHeroData(this.municipalityName, fiscalYear);
      if (heroData && heroData.surveyPath) {
        const surveyContainer = container.querySelector('#fy24-json-content');
        if (surveyContainer) {
          await this.renderFy24SurveySection(surveyContainer, this.municipalityName);
        }
      }
    }
  },

  renderHeroCards(heroData) {
    if (!heroData) {return '';}

    return `
            <div class="hero-stats mb-lg">
                <div class="card stat-card">
                    <h3>${escapeHtml(heroData.disbursement.label)}</h3>
                    <div class="stat-value">$${Data.formatCurrency(heroData.disbursement.value)}</div>
                    ${heroData.disbursement.source ? `<div class="debug-info">${heroData.disbursement.source}</div>` : ''}
                </div>
                
                ${heroData.carryover.value !== null ? `
                    <div class="card stat-card">
                        <h3>${escapeHtml(heroData.carryover.label)}</h3>
                        <div class="stat-value">$${Data.formatCurrency(heroData.carryover.value)}</div>
                        ${heroData.carryover.source ? `<div class="debug-info">${heroData.carryover.source}</div>` : ''}
                    </div>
                ` : ''}

                ${heroData.mosaic ? `
                    <div class="card stat-card">
                        <h3>${escapeHtml(heroData.mosaic.label)}</h3>
                        <div class="stat-value">$${Data.formatCurrency(heroData.mosaic.value)}</div>
                        ${heroData.mosaic.source ? `<div class="debug-info">${heroData.mosaic.source}</div>` : ''}
                    </div>
                ` : ''}

                ${heroData.rize ? `
                    <div class="card stat-card rize-funding">
                        <h3>${escapeHtml(heroData.rize.label)}</h3>
                        <div class="stat-value">$${Data.formatCurrency(heroData.rize.value)}</div>
                        <div class="stat-subtitle">${heroData.rize.count} grant${heroData.rize.count > 1 ? 's' : ''}</div>
                        ${heroData.rize.source ? `<div class="debug-info">${heroData.rize.source}</div>` : ''}
                    </div>
                ` : ''}

                <div class="card stat-card">
                    <h3>${escapeHtml(heroData.expended.label)}</h3>
                    <div class="stat-value">$${Data.formatCurrency(heroData.expended.value)}</div>
                    ${heroData.expended.source ? `<div class="debug-info">${heroData.expended.source}</div>` : ''}
                </div>

                <div class="card stat-card">
                    <h3>${escapeHtml(heroData.utilized.label)}</h3>
                    <div class="stat-value">${heroData.utilized.value}%</div>
                    <div class="progress-bar mt-sm">
                        <div class="progress-fill" style="width: ${Math.min(parseFloat(heroData.utilized.value), 100)}%;"></div>
                    </div>
                    ${heroData.utilized.source ? `<div class="debug-info">${heroData.utilized.source}</div>` : ''}
                </div>
            </div>
        `;
  },

  renderFy25DetailedContent() {
    if (!this.entity) {return '';}

    const expenditures = Data.normalizeExpenditures(this.entity);
    const projects = Data.getProjects(this.entity);
    const reconciliation = Data.getExpenditureReconciliation(this.entity);

    let html = '';

    if (this.entity.annual_municipal_expenditure_report_2_complete == 0) {
      html += `
                <div class="card mb-lg" style="border-left: 4px solid #dc2626; background-color: #fef2f2;">
                    <div style="display: flex; gap: 1rem; align-items: start;">
                        <span style="font-size: 1.5rem;">⚠️</span>
                        <div>
                            <h3 style="margin-top: 0; margin-bottom: 0.5rem; color: #dc2626;">
                                Report Incomplete
                                <span class="debug-info">annual_municipal_expenditure_report_2_complete = 0</span>
                            </h3>
                            <p style="margin-bottom: 0;">
                                The data provided by the Massachusetts Department of Public Health indicates that this report is incomplete. 
                                We don't know anything more than that, sorry. 
                                If you have questions, you should contact the city or the Department of Public Health for more information.
                            </p>
                        </div>
                    </div>
                </div>
            `;
    }

    if (this.entity.is_collaborative) {
      html += this.renderCollaborativeInfo(this.entity);
    }

    if (projects.length > 0) {
      html += this.renderProjects(projects);
    }

    html += this.renderExpenditures(expenditures, reconciliation);
    html += this.renderNarratives(this.entity);

    // Render RIZE Municipal Matching grants if any
    const rizeGrants = Data.getRizeGrants(this.municipalityName);
    if (rizeGrants.length > 0) {
      html += this.renderRizeGrants(rizeGrants);
    }

    return html;

    return html;
  },

  attachTabListeners(container) {
    // Placeholder for future tab functionality
  },

  /**
     * Render FY2024 survey from JSON data + Template
     */
  async renderFy24SurveySection(contentDiv, municipalityName) {
    try {
      // Load Template and Data in parallel
      const [templateRes, dataRes] = await Promise.all([
        fetch('js/fy24_survey_template.json'),
        fetch(`fy24_answers_json/${encodeURIComponent(municipalityName)}.json`)
      ]);

      if (!templateRes.ok) {throw new Error('Failed to load template');}

      if (!dataRes.ok) {
        if (dataRes.status === 404) {
          contentDiv.innerHTML = `<p>No FY2024 report found for ${escapeHtml(municipalityName)}.</p>`;
          return;
        }
        throw new Error('Failed to load data');
      }

      const template = await templateRes.json();
      const data = await dataRes.json();

      this.renderSurveyForm(contentDiv, template, data);

    } catch (e) {
      console.error('FY24 Load Error:', e);
      contentDiv.innerHTML = `<p class="error">Error loading report: ${e.message}</p>`;
    }
  },

  /**
     * Build the HTML for the survey based on template and data
     */
  /**
     * Build the HTML for the survey based on template and data
     */
  renderSurveyForm(container, template, data) {
    let html = '';

    // Added: Download link for original filing
    if (data.submission_url) {
      html += `
                <div class="mb-lg" style="text-align: right;">
                    <a href="${escapeHtml(data.submission_url)}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <span style="margin-right: 0.5rem;">📄</span> Download original filing from mosiac.rizema.org
                    </a>
                </div>
            `;
    }

    // Helper to get nested value
    const getValue = (path, obj) => path.split('.').reduce((prev, curr) => prev ? prev[curr] : null, obj);

    template.sections.forEach(section => {
      html += this.renderSection(section, data, getValue);
    });

    container.innerHTML = html;
  },

  renderSection(section, data, getValue) {
    let html = '<div class="survey-section mb-xl">';

    // Section Title
    if (section.title) {
      html += `<h3 class="survey-section-title mb-lg" style="border-bottom: 2px solid var(--color-border); padding-bottom: 0.5rem;">${escapeHtml(section.title)}</h3>`;
    }

    // Standard Fields
    if (section.fields) {
      html += this.renderFields(section.fields, data, getValue);
    }

    // Subsections (e.g. Commitments)
    if (section.subsections) {
      section.subsections.forEach(sub => {
        html += '<div class="survey-subsection mb-xl">';
        html += `<h4 class="survey-subsection-title mb-md" style="color: var(--color-primary);">${escapeHtml(sub.title)}</h4>`;
        html += this.renderFields(sub.fields, data, getValue);
        html += '</div>';
      });
    }

    // Groups (Strategies)
    if (section.groups) {
      html += this.renderStrategies(section.groups, data, getValue);
    }

    html += '</div>';
    return html;
  },

  renderFields(fields, data, getValue) {
    let html = '';

    fields.forEach(field => {
      const val = getValue(field.key, data);

      if (field.type === 'grid') {
        html += '<div class="mb-lg">';
        html += `<h5 class="mb-sm font-bold">${escapeHtml(field.label)}</h5>`;
        html += this.renderGridTable(val, field.key);
        html += '</div>';
        return;
      }
      if (field.type === 'list') {
        html += '<div class="mb-lg">';
        html += `<h5 class="mb-sm font-bold">${escapeHtml(field.label)}</h5>`;
        html += this.renderList(val);
        html += '</div>';
        return;
      }

      // Standard Field
      if (val !== null && val !== undefined && val !== '') {
        html += '<div class="survey-field mb-md p-md bg-white rounded border-sm">';
        html += `<div class="field-label text-sm text-muted mb-xs">${escapeHtml(field.label)}</div>`;
        html += `<div class="field-value font-medium">${this.formatValue(val, field.format)}</div>`;
        html += '</div>';
      }
    });

    return html;
  },

  formatValue(val, type) {
    if (val === null || val === undefined) {return '<span class="text-muted">No response</span>';}
    if (val === true) {return 'Yes';}
    if (val === false) {return 'No';}
    if (type === 'currency') {return `$${  Data.formatCurrency(val)}`;}
    return escapeHtml(String(val));
  },

  renderGridTable(gridData, fieldKey) {
    if (!gridData || Object.keys(gridData).length === 0) {return '<p class="text-muted">No data available</p>';}

    const entries = Object.entries(gridData).filter(([k]) => !k.startsWith('_'));
    // NOTE: We do NOT return early if entries is empty, because we might want to show the empty table structure if we have a schema

    // Define Schemas
    const schemas = {
      'commitments.engagement_grid': {
        columns: [
          { key: 'forum', label: 'Forum/Listening Session' },
          { key: 'survey', label: 'Survey' },
          { key: 'interviews', label: 'Interviews' },
          { key: 'focus_groups', label: 'Focus Groups/Meetings' },
          { key: 'other', label: 'Other' },
          { key: 'not_engaged', label: 'N/A Did not engage' }
        ],
        rowHeader: 'Population'
      },
      'commitments.disparities_assessment': {
        columns: [
          { key: 'admin_data', label: 'Administrative Data source' },
          { key: 'survey', label: 'Survey' },
          { key: 'interviews', label: 'Interviews' },
          { key: 'groups_meetings', label: 'Groups/meetings' },
          { key: 'other', label: 'Other' },
          { key: 'not_assessed', label: 'N/A did not assess' }
        ],
        rowHeader: 'Need / Gap'
      },
      'commitments.behavioral_health_assessment': {
        columns: [
          { key: 'admin_data', label: 'Administrative Data source' },
          { key: 'opioid_overdose', label: 'Opioid overdose' }, // Wait, keys must match
          { key: 'survey', label: 'Survey' },
          { key: 'interviews', label: 'Interviews' },
          { key: 'groups_meetings', label: 'Groups/meetings' },
          { key: 'other', label: 'Other' },
          { key: 'not_assessed', label: 'N/A did not assess' }
        ],
        rowHeader: 'Condition / Topic'
      }
    };

    const schema = schemas[fieldKey];

    // If no schema, fall back to dynamic (existing logic)
    if (!schema) {
      const allValues = new Set();
      entries.forEach(([_, cols]) => {
        if (Array.isArray(cols)) {cols.forEach(c => allValues.add(c));}
      });
      if (allValues.size === 0) {return '<p class="text-muted">No data selected</p>';}

      // Simple fallback
      let html = '<div class="table-responsive"><table class="table table-bordered table-sm bg-white" style="width:100%"><thead><tr><th>Category</th><th>Selected</th></tr></thead><tbody>';
      entries.forEach(([rowKey, cols]) => {
        const rowLabel = rowKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        html += `<tr><td>${escapeHtml(rowLabel)}</td><td>${escapeHtml(Array.isArray(cols) ? cols.join(', ') : cols)}</td></tr>`;
      });
      html += '</tbody></table></div>';
      return html;
    }

    let html = '<div class="table-responsive"><table class="table table-bordered table-sm bg-white" style="width:100%">';

    // Header
    html += `<thead class="bg-light"><tr><th style="width: 25%;">${escapeHtml(schema.rowHeader)}</th>`;
    schema.columns.forEach(col => {
      html += `<th class="text-center" style="font-size: 0.8rem;">${escapeHtml(col.label)}</th>`;
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody>';
    entries.forEach(([rowKey, cols]) => {
      const rowLabel = rowKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      html += `<tr><td>${escapeHtml(rowLabel)}</td>`;

      schema.columns.forEach(col => {
        // Check for value match. 
        // Data might be ["forum", "other"] or just "forum" (string)
        let isChecked = false;
        if (Array.isArray(cols)) {
          isChecked = cols.includes(col.key);
        } else if (typeof cols === 'string') {
          isChecked = cols === col.key;
        }

        html += `<td class="text-center">${isChecked ? '<span style="font-weight:bold; font-size: 1.2em;">✕</span>' : ''}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    return html;
  },

  renderList(listData) {
    if (!listData || listData.length === 0) {return '<span class="text-muted">None listed</span>';}

    // If it's a simple string array
    if (typeof listData[0] === 'string') {
      return `<ul class="dashed-list">
                ${listData.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
             </ul>`;
    }

    // If it's objects (e.g. programs)
    let html = '<ul class="program-list">';
    listData.forEach(item => {
      html += '<li class="mb-sm">';
      if (item.name) {
        html += `<strong>${escapeHtml(item.name)}</strong>`;
      }
      const sources = item.sources || item.methods;
      if (sources && sources.length > 0) {
        html += `<br><span class="text-muted text-sm">Source: ${escapeHtml(sources.join(', '))}</span>`;
      }
      html += '</li>';
    });
    html += '</ul>';
    return html;
  },

  renderStrategies(groups, data, getValue) {
    let html = '<div class="strategies-container">';

    groups.forEach(group => {
      const stratData = getValue(`strategies.${  group.id}`, data);
      if (!stratData) {return;}

      // Determine if active
      const isNoWork = stratData.progress === 'No work in this area';
      const borderClass = isNoWork ? 'border-l-gray' : 'border-l-green';
      const opacityClass = isNoWork ? 'opacity-75' : '';

      html += `<div class="strategy-card card mb-md p-md ${borderClass} ${opacityClass}" style="border-left: 5px solid ${isNoWork ? '#ccc' : 'var(--color-success)'};">`;

      // Header
      html += '<div class="d-flex justify-content-between align-items-start mb-sm">';
      html += `<h4 class="m-0">${escapeHtml(group.title)}</h4>`;
      html += '</div>';

      // Content
      html += '<div class="strategy-details">';

      // Progress
      html += `<div class="mb-xs"><strong>Progress:</strong> ${escapeHtml(stratData.progress || 'Not Answered')}</div>`;

      // Administrative fields
      if (group.id === 'administrative') {
        if (stratData.job_title) {
          html += `<div class="mb-xs"><strong>Job Title:</strong> ${escapeHtml(stratData.job_title)}</div>`;
        }
        if (stratData.fte) {
          html += `<div class="mb-xs"><strong>FTE:</strong> ${escapeHtml(stratData.fte)}</div>`;
        }
      }

      // Expended
      const expended = stratData.expended !== undefined ? stratData.expended : stratData.amount_expended;
      if (expended !== undefined && expended !== null) {
        html += `<div class="mb-sm"><strong>Expended:</strong> $${Data.formatCurrency(expended)}</div>`;
      }

      // How Spent
      if (stratData.how_spent && stratData.how_spent.length > 0) {
        html += '<div class="mt-sm"><strong>How Spent:</strong>';
        html += '<ul class="dashed-list mt-xs ml-md">';
        stratData.how_spent.forEach(item => {
          html += `<li>${escapeHtml(item)}</li>`;
        });
        html += '</ul></div>';
      }

      // Barriers
      const barriers = stratData.barriers || stratData.challenges_barriers;
      if (barriers && barriers !== '0' && barriers !== '') {
        html += `<div class="mt-sm text-muted"><strong>Barriers:</strong> ${escapeHtml(barriers)}</div>`;
      }

      html += '</div></div>'; // Close card
    });

    html += '</div>';
    return html;
  },


  renderCollaborativeInfo(entity) {
    const collabName = Data.COLLABORATIVES[entity.collaborative_name] || 'Unknown Collaborative';
    const isLead = entity.lead_muni === 1;

    return `
            <div class="card mb-lg" style="border-left-color: var(--color-warning);">
                <h3>Opioid Abatement Collaborative</h3>
                <p>
                    <strong>${collabName}</strong><br>
                    <span class="badge ${isLead ? 'badge-expended' : 'badge-encumbered'}">
                        ${isLead ? 'Lead Municipality' : 'Member'}
                    </span>
                </p>
                ${entity.amt_pooled ? `<p>Contributed to collaborative: <strong>$${Data.formatCurrency(entity.amt_pooled)}</strong></p>` : ''}
            </div>
        `;
  },

  renderProjects(projects) {
    return `
            <div class="card mb-lg">
                <h3 class="mb-md">Projects</h3>
                <div class="project-list">
                    ${projects.map(proj => `
                        <div style="padding: 1rem; background: var(--color-bg-primary); border-radius: 8px; margin-bottom: 0.75rem;">
                            <strong>${escapeHtml(proj.name)}</strong>
                            ${proj.sourceKeys ? `<span class="debug-info">${proj.sourceKeys.name}</span>` : ''}
                            <span class="badge" style="margin-left: 0.5rem; background: var(--color-bg-secondary);">${proj.source}</span>
                            
                            ${proj.description ? `
                                <div style="margin-top: 0.5rem; color: var(--color-text-muted); font-size: 0.875rem;">
                                    ${escapeHtml(proj.description)}
                                    ${proj.sourceKeys ? `<span class="debug-info">${proj.sourceKeys.description}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
  },

  renderExpenditures(expenditures, reconciliation) {
    const discrepancyHtml = reconciliation && reconciliation.hasDiscrepancy ? `
            <p style="color: #2563eb; font-size: 0.875rem; margin-bottom: 1rem;">
                <strong>Note:</strong> Line items total 
                $${Data.formatCurrency(reconciliation.lineItemExpended)} expended / 
                $${Data.formatCurrency(reconciliation.lineItemEncumbered)} encumbered
                (reported: $${Data.formatCurrency(reconciliation.reportedExpended)} / 
                $${Data.formatCurrency(reconciliation.reportedEncumbered)})
            </p>
        ` : '';

    return `
            <div class="card mb-lg">
                <h3 class="mb-md">Expenditures</h3>
                ${discrepancyHtml}
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Project</th>
                                <th class="text-right">Amount</th>
                                <th class="text-center">Status</th>
                                <th>Description / Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expenditures.map(exp => `
                                <tr>
                                    <td>
                                        <strong>${escapeHtml(exp.name)}</strong>
                                        ${exp.sourceKeys ? `<span class="debug-info">${exp.sourceKeys.name}</span>` : ''}
                                    </td>
                                    <td>
                                        ${exp.category}
                                    </td>
                                    <td>
                                        ${exp.project ? `
                                            <span class="badge" style="background: var(--color-bg-secondary); color: var(--color-text-primary); font-weight: normal;">
                                                ${escapeHtml(exp.project)}
                                            </span>
                                        ` : '<span style="color: var(--color-text-muted);">-</span>'}
                                    </td>
                                    <td class="text-right">
                                        $${Data.formatCurrency(exp.amount - exp.offset)}
                                        ${exp.sourceKeys ? `<span class="debug-info">${exp.sourceKeys.amount}</span>` : ''}
                                    </td>
                                    <td class="text-center">
                                        <span class="badge ${exp.status === 'Expended' ? 'badge-expended' : 'badge-encumbered'}">
                                            ${exp.status}
                                        </span>
                                    </td>
                                    <td style="max-width: 300px; font-size: 0.875rem;">
                                        <div style="margin-bottom: 0.25rem;">
                                            ${escapeHtml(exp.description)}
                                            ${exp.sourceKeys ? `<span class="debug-info">${exp.sourceKeys.description}</span>` : ''}
                                        </div>
                                        ${exp.notes ? `
                                            <div style="color: var(--color-text-muted); font-style: italic; border-top: 1px dashed var(--color-border); padding-top: 0.25rem; margin-top: 0.25rem;">
                                                Note: ${escapeHtml(exp.notes)}
                                            </div>
                                        ` : ''}
                                        ${exp.offset > 0 ? `
                                            <div style="color: var(--color-text-muted); font-size: 0.75rem; margin-top: 0.25rem;">
                                                Offset: -$${Data.formatCurrency(exp.offset)} 
                                                ${exp.offsetVendor ? `(${escapeHtml(exp.offsetVendor)})` : ''}
                                            </div>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
  },


  renderNarratives(entity) {
    const narratives = Data.getNarratives(entity);
    const pdfAttachments = Data.getPdfAttachments(entity.record_id);

    if (!narratives.hasNarratives && pdfAttachments.length === 0) {
      return `
                <div class="card">
                    <h3>No Narrative Data</h3>
                    <p style="color: var(--color-text-muted);">This entity typically provides data via structured fields.</p>
                </div>
            `;
    }

    return `
            <div class="narrative-card">
                <div class="pwlle-badge">
                    <div class="pwlle-level">${narratives.pwlle.level}</div>
                    <div>
                        <div class="pwlle-label">
                            Community Engagement Level
                            <span class="debug-info">${narratives.pwlle.source.level}</span>
                        </div>
                        <div style="font-weight: 600;">${narratives.pwlle.levelLabel}</div>
                    </div>
                </div>

                ${narratives.pwlle.description ? `
                    <div class="narrative-section">
                        <div class="narrative-header">
                            <h3 class="narrative-title">
                                Community Engagement Strategy
                                <span class="debug-info">${narratives.pwlle.source.description}</span>
                            </h3>
                        </div>
                        <div class="narrative-text">${escapeHtml(narratives.pwlle.description)}</div>
                    </div>
                ` : ''}

                ${narratives.highlights.text ? `
                    <div class="narrative-section">
                        <div class="narrative-header">
                            <h3 class="narrative-title">
                                Highlights & Success Stories
                                <span class="debug-info">${narratives.highlights.source.text}</span>
                            </h3>
                        </div>
                        <div class="narrative-text">${escapeHtml(narratives.highlights.text)}</div>
                    </div>
                ` : ''}

                ${pdfAttachments.length > 0 ? `
                    <div class="narrative-section">
                        <div class="narrative-header">
                            <h3 class="narrative-title">
                                Attachments
                                <span class="debug-info">pdf_attachments</span>
                            </h3>
                        </div>
                        <div class="pdf-attachments-list">
                            ${pdfAttachments.map(pdf => `
                                <div class="pdf-attachment-item">
                                    <a href="${pdf.file_path}" target="_blank" class="pdf-link">
                                        <span class="pdf-icon">📄</span>
                                        <span class="pdf-name">${escapeHtml(pdf.normalized_filename)}</span>
                                    </a>
                                    <span class="pdf-meta">
                                        ${pdf.page_count ? `${pdf.page_count} page${pdf.page_count > 1 ? 's' : ''}` : ''}
                                        ${pdf.file_size_bytes ? ` · ${this.formatFileSize(pdf.file_size_bytes)}` : ''}
                                    </span>
                                    <span class="debug-info">${pdf.field_name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${narratives.futurePlans ? `
                    <div class="narrative-section">
                        <div class="narrative-header">
                            <h3 class="narrative-title">
                                Future Spending Plans
                                <span class="debug-info">${narratives.futurePlansSource}</span>
                            </h3>
                        </div>
                        <div class="narrative-text">${escapeHtml(narratives.futurePlans)}</div>
                    </div>
                ` : ''}

                ${narratives.noExpenseWork ? `
                    <div class="narrative-section">
                        <div class="narrative-header">
                            <h3 class="narrative-title">
                                Progress Without Expenditures
                                <span class="debug-info">${narratives.noExpenseWorkSource}</span>
                            </h3>
                        </div>
                        <div class="narrative-text">${escapeHtml(narratives.noExpenseWork)}</div>
                    </div>
                ` : ''}
            </div>
        `;
  },

  formatFileSize(bytes) {
    if (!bytes) {return '';}
    if (bytes < 1024) {return `${bytes  } B`;}
    if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)  } KB`;}
    return `${(bytes / (1024 * 1024)).toFixed(1)  } MB`;
  },

  /**
     * Render RIZE Municipal Matching grants section
     * @param {Array} grants - Array of RIZE grant objects
     * @returns {string} HTML string
     */
  renderRizeGrants(grants) {
    if (!grants || grants.length === 0) {return '';}

    // Map focus area to color class
    const focusAreaColors = {
      'Recovery Supports': 'focus-yellow',
      'Prevention': 'focus-purple',
      'Harm Reduction': 'focus-blue',
      'Connections to Care': 'focus-green',
      'Trauma & Grieving Families': 'focus-pink'
    };

    return `
            <div class="card mb-lg rize-grants-section">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0;">
                        <span class="rize-badge">RIZE</span>
                        Municipal Matching Grants
                    </h3>
                    <span class="badge">${grants.length} grant${grants.length > 1 ? 's' : ''}</span>
                </div>

                <div class="rize-grants-list">
                    ${grants.map(grant => `
                        <div class="rize-grant-item">
                            <div class="grant-header">
                                <strong>${escapeHtml(grant.awardee)}</strong>
                                ${grant.website ? `
                                    <a href="${escapeHtml(grant.website)}" target="_blank" rel="noopener" class="grant-link">
                                        Visit Website ↗
                                    </a>
                                ` : ''}
                            </div>

                            <div class="grant-meta">
                                <span class="grant-amount">$${Data.formatCurrency(grant.amount)}</span>
                                <span class="grant-period">${escapeHtml(grant.period || '2025-2026')}</span>
                                <span class="badge ${grant.relationshipType === 'direct' ? 'badge-expended' : 'badge-encumbered'}">
                                    ${grant.relationshipType === 'direct' ? 'Direct Grantee' : grant.relationshipType === 'collaborative' ? 'Collaborative' : 'Partner'}
                                </span>
                            </div>

                            <div class="grant-focus-areas">
                                ${grant.focusAreas.map(area => {
    const colorClass = focusAreaColors[area] || 'focus-gray';
    return `<span class="focus-area-tag ${colorClass}">${escapeHtml(area)}</span>`;
  }).join('')}
                            </div>

                            ${grant.geography ? `
                                <div class="grant-geography">
                                    <span class="geography-label">County:</span> ${escapeHtml(grant.geography)}
                                </div>
                            ` : ''}

                            ${grant.mission ? `
                                <div class="grant-mission">
                                    ${escapeHtml(grant.mission)}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
  },

  renderRegionalGrants(municipalityName) {
    const { core, familyResilience, statewide } = Data.getRegionalGrants(municipalityName);
    const county = Data.getCounty(municipalityName);

    if (core.length === 0 && familyResilience.length === 0 && statewide.length === 0) {return '';}

    let html = '';

    // Regional Grants Section (County-based)
    if (core.length > 0 || familyResilience.length > 0) {
      html += `
                <div class="card mb-lg regional-grants-section">
                    <div class="card-header">
                        <div>
                            <h3 class="mb-xs"><span class="mosaic-badge">MOSAIC</span> Regional Grants</h3>
                            <div class="text-muted">Serving <span class="font-bold">${county} County</span></div>
                        </div>
                    </div>

                    ${core.length > 0 ? this.renderCoreGrants(core) : ''}
                    ${familyResilience.length > 0 ? this.renderFamilyResilienceGrants(familyResilience) : ''}
                </div>
            `;
    }

    // Statewide Grants Section
    if (statewide.length > 0) {
      html += `
                <div class="card mb-lg regional-grants-section">
                    <div class="card-header">
                         <div>
                            <h3 class="mb-xs"><span class="mosaic-badge">MOSAIC</span> Statewide Programs</h3>
                            <div class="text-muted">Available to all Massachusetts municipalities</div>
                        </div>
                    </div>
                    ${this.renderFamilyResilienceGrants(statewide, true)}
                </div>
            `;
    }

    return html;
  },

  renderCoreGrants(grants) {
    return `
            <div class="mb-lg">
                <h4 class="mb-md" style="color: #00897B; border-bottom: 2px solid #E0F2F1; padding-bottom: 0.5rem;">
                    Mosaic CORE Grants 
                    <span class="text-sm font-normal text-muted">(${grants.length})</span>
                </h4>
                <div class="rize-grant-list">
                    ${grants.map(grant => this.renderGrantItem(grant, 'CORE')).join('')}
                </div>
            </div>
        `;
  },

  renderFamilyResilienceGrants(grants, isStatewide = false) {
    return `
            <div class="mb-lg">
                <h4 class="mb-md" style="color: #00897B; border-bottom: 2px solid #E0F2F1; padding-bottom: 0.5rem;">
                    Family Resilience Grants
                    ${isStatewide ? '<span class="badge" style="background:#B2DFDB; color:#00695C; margin-left:0.5rem;">Statewide</span>' : ''}
                </h4>
                <div class="rize-grant-list">
                    ${grants.map(grant => this.renderGrantItem(grant, 'Family Resilience')).join('')}
                </div>
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

    // Handle potential array or string for focus areas
    const focusAreas = Array.isArray(grant.focusAreas) ? grant.focusAreas : [grant.focusAreas];

    return `
            <div class="rize-grant-item">
                <div class="d-flex justify-content-between align-items-start mb-sm">
                    <div>
                        <h4 class="m-0">${escapeHtml(grant.awardee)}</h4>
                        ${grant.website ? `<a href="${escapeHtml(grant.website)}" target="_blank" class="text-sm">Visit Website ↗</a>` : ''}
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-lg">$${Data.formatCurrency(grant.amount)}</div>
                        <div class="text-sm text-muted">${escapeHtml(grant.period)}</div>
                    </div>
                </div>
                
                <div class="mb-sm">
                    <span class="badge" style="background:#E0F2F1; color:#00695C;">${typeLabel}</span>
                    ${focusAreas.map(area =>
    `<span class="badge ${getFocusClass(area)}">${escapeHtml(area)}</span>`
  ).join(' ')}
                </div>
                
                <div class="text-sm">
                    <p>${escapeHtml(grant.mission)}</p>
                </div>
            </div>
        `;
  },

  destroy() {
    // Cleanup if needed
  }
};
