/**
 * Map View
 * Interactive choropleth map of Massachusetts showing spending intensity
 */

import * as Data from '../data.js';
import { escapeHtml, normalizeMuniName } from '../utils.js';

// Helper to get CSS variable values
const getCssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

let svgElement = null;
let tooltip = null;
let entityLookup = new Map();
let activeTooltipPath = null;
let tooltipTimeout = null;
let tooltipDelay = 100;

export default {
  name: 'map',
  title: 'Map',

  async render(container, db) {
    container.innerHTML = `
            <h2 class="mb-md">Spending by Municipality</h2>
            <p class="mb-lg" style="color: var(--color-text-muted);">
                Interactive map showing how each municipality is utilizing their opioid settlement funds.
                Hover over a town to see details, click to view full profile.
            </p>
            
            <div class="map-container" id="map-container">
                <div class="map-loading">Loading map data...</div>
            </div>
            
            <div class="map-legend mb-lg">
                <span class="legend-label">% Funds Utilized:</span>
                <div class="legend-scale" id="legend-scale"></div>
            </div>
            
            <div class="map-tooltip" id="map-tooltip"></div>
        `;

    tooltip = document.getElementById('map-tooltip');

    // Build legend using CSS variables
    const legendScale = document.getElementById('legend-scale');
    const legendItems = [
      { label: '0%', cssVar: '--map-scale-0' },
      { label: '25%', cssVar: '--map-scale-25' },
      { label: '50%', cssVar: '--map-scale-50' },
      { label: '75%', cssVar: '--map-scale-75' },
      { label: '100%', cssVar: '--map-scale-100' }
    ];
    legendItems.forEach(item => {
      const div = document.createElement('div');
      div.className = 'legend-item';
      div.style.background = getCssVar(item.cssVar);
      div.textContent = item.label;
      legendScale.appendChild(div);
    });

    // Build entity lookup by normalized name
    const entities = Data.getAllEntities();
    entityLookup = new Map();
    entities.forEach(e => {
      entityLookup.set(normalizeMuniName(e.name), e);
    });

    // Load and render map
    try {
      const response = await fetch('assets/ma-towns.geojson');
      const geojson = await response.json();
      this.renderMap(geojson);
    } catch (error) {
      console.error('Failed to load map:', error);
      document.getElementById('map-container').innerHTML = `
                <p style="color: var(--color-error);">Failed to load map data: ${error.message}</p>
            `;
    }
  },

  renderMap(geojson) {
    const container = document.getElementById('map-container');

    // Calculate bounds
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    geojson.features.forEach(feature => {
      this.forEachCoord(feature.geometry, (x, y) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });
    });

    // SVG dimensions and projection
    const width = 800;
    const height = 600;
    const padding = 20;

    const scaleX = (width - 2 * padding) / (maxX - minX);
    const scaleY = (height - 2 * padding) / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding + (width - 2 * padding - (maxX - minX) * scale) / 2;
    const offsetY = padding + (height - 2 * padding - (maxY - minY) * scale) / 2;

    // Transform function (flip Y for SVG coordinates)
    const transform = (x, y) => [offsetX + (x - minX) * scale, height - (offsetY + (y - minY) * scale)];

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', 'map-svg');

    // Render each municipality
    geojson.features.forEach(feature => {
      const name = feature.properties.municipal;
      const normalizedName = normalizeMuniName(name);
      const entity = entityLookup.get(normalizedName);

      // Log warning for unmatched municipalities (helps identify data mismatches)
      if (!entity && name) {
        console.warn(`Unmatched municipality in GeoJSON: "${name}" (normalized: "${normalizedName}")`);
      }

      // Determine fill color based on spending percentage
      const fillColor = this.getSpendingColor(entity);

      // Create path(s) for this feature
      const paths = this.geometryToPath(feature.geometry, transform);

      paths.forEach(pathD => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('fill', fillColor);
        path.setAttribute('stroke', getCssVar('--map-stroke'));
        path.setAttribute('stroke-width', '0.5');
        // Apply map-town-active class only for municipalities with data
        path.setAttribute('class', entity ? 'map-town map-town-active' : 'map-town');
        path.dataset.name = name;
        path.dataset.recordId = entity?.record_id || '';

        // Accessibility attributes
        path.setAttribute('tabindex', '0');
        path.setAttribute('role', 'button');
        const utilization = entity ? `${parseFloat(entity.pct_spent) || 0}% utilized` : 'No data';
        path.setAttribute('aria-label', `${name} - ${utilization}`);

        // Event handlers
        path.addEventListener('mouseenter', e => this.showTooltip(e, name, entity));
        path.addEventListener('mousemove', e => this.moveTooltip(e));
        path.addEventListener('mouseleave', () => this.hideTooltip());
        path.addEventListener('click', () => {
          if (entity) {
            window.dashboardNavigate('detail', { id: entity.record_id });
          }
        });

        // Keyboard navigation
        path.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (entity) {
              window.dashboardNavigate('detail', { id: entity.record_id });
            }
          }
        });

        // Show tooltip on focus for keyboard users
        path.addEventListener('focus', e => this.showTooltip(e, name, entity));
        path.addEventListener('blur', () => this.hideTooltip());

        // Mobile tap support for tooltips
        path.addEventListener(
          'touchstart',
          e => {
            e.preventDefault();
            // If tapping the same path, navigate (if entity exists)
            if (activeTooltipPath === path && entity) {
              window.dashboardNavigate('detail', { id: entity.record_id });
              return;
            }
            // Otherwise show tooltip and track this path
            activeTooltipPath = path;
            this.showTooltip(e.touches[0], name, entity);
          },
          { passive: false }
        );

        svg.appendChild(path);
      });
    });

    container.innerHTML = '';
    container.appendChild(svg);
    svgElement = svg;

    document.addEventListener('scroll', () => {
      this.hideTooltip();
    }, { passive: true });

    document.addEventListener('touchstart', (e) => {
      if (!e.target.closest('.map-town')) {
        activeTooltipPath = null;
        this.hideTooltip();
      }
    }, { passive: true });
  },



  forEachCoord(geometry, callback) {
    const processCoords = coords => {
      if (typeof coords[0] === 'number') {
        callback(coords[0], coords[1]);
      } else {
        coords.forEach(c => processCoords(c));
      }
    };
    processCoords(geometry.coordinates);
  },

  geometryToPath(geometry, transform) {
    const paths = [];

    const ringToPath = ring =>
      `${ring
        .map((coord, i) => {
          const [x, y] = transform(coord[0], coord[1]);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join('')}Z`;

    if (geometry.type === 'Polygon') {
      // Outer ring + holes
      paths.push(geometry.coordinates.map(ring => ringToPath(ring)).join(''));
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon => {
        paths.push(polygon.map(ring => ringToPath(ring)).join(''));
      });
    }

    return paths;
  },

  getSpendingColor(entity) {
    if (!entity) {
      return getCssVar('--map-no-data');
    } // No data - gray

    const pct = parseFloat(entity.pct_spent) || 0;

    // Green gradient based on percentage (using CSS variables)
    if (pct >= 75) {
      return getCssVar('--map-scale-100');
    } // Dark green
    if (pct >= 50) {
      return getCssVar('--map-scale-75');
    } // Medium-dark green
    if (pct >= 25) {
      return getCssVar('--map-scale-50');
    } // Medium green
    if (pct > 0) {
      return getCssVar('--map-scale-25');
    } // Light green
    return getCssVar('--map-scale-0'); // Very light green (0%)
  },

  showTooltip(event, name, entity) {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }

    tooltipTimeout = setTimeout(() => {
      if (!entity) {
        tooltip.innerHTML = `<strong>${escapeHtml(name)}</strong><br><span style="color: #999;">No data available</span>`;
      } else {
        const utilized = parseFloat(entity.pct_spent) || 0;
        tooltip.innerHTML = `
                  <strong>${escapeHtml(name)}</strong><br>
                  Disbursed: $${Data.formatCurrency(entity.fy25_disbursement)}<br>
                  Expended: $${Data.formatCurrency(entity.total_expended)}<br>
                  Encumbered: $${Data.formatCurrency(entity.total_encumbered)}<br>
                  <span style="font-weight: 600; color: ${utilized >= 50 ? '#2E7D32' : '#666'};">
                      ${utilized}% utilized
                  </span>
              `;
      }
      tooltip.style.display = 'block';
      this.moveTooltip(event);
    }, tooltipDelay);
  },

  moveTooltip(event) {
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width || 200;
    const tooltipHeight = tooltipRect.height || 100;

    let x = event.clientX + 15;
    let y = event.clientY + 15;

    if (x + tooltipWidth > window.innerWidth - 10) {
      x = event.clientX - tooltipWidth - 15;
    }

    if (y + tooltipHeight > window.innerHeight - 10) {
      y = event.clientY - tooltipHeight - 15;
    }

    if (x < 10) x = 10;

    if (y < 10) y = 10;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  },

  hideTooltip() {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }
    tooltip.style.display = 'none';
  },

  destroy() {
    svgElement = null;
    tooltip = null;
    entityLookup = new Map();
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }
  }
};
