/**
 * ORRF Dashboard - Data Layer
 * Handles SQLite database loading via sql.js and data normalization
 *
 * Performance optimized: All entities are cached in memory on init
 * to eliminate repeated SQL queries during search/browse operations.
 */

import { escapeHtml, formatMunicipalityName } from './utils.js';

// Database instance (singleton)
let db = null;

// In-memory caches (populated on init)
let entityCache = null; // Array of all entities with summary data
let fullEntityCache = new Map(); // Full entity rows keyed by record_id
let expenditureCache = new Map(); // Pre-computed expenditures by record_id (performance optimization)
let pdfAttachmentCache = new Map(); // PDF attachments by record_id
let stateSpendingCache = null; // State-level spending data from CTHRU

// Historical data caches (FY2023, FY2024)
let fy23EntityCache = new Map(); // FY2023 entities keyed by municipality name
let fy24EntityCache = new Map(); // FY2024 entities keyed by municipality name

// RIZE Municipal Matching grants cache
let rizeGrantCache = new Map(); // RIZE grants keyed by municipality name

// County mapping cache (municipality -> county)
const countyCache = new Map();

// Mosaic CORE grants cache (county -> grants[])
const mosaicCoreGrantCache = new Map();

// Family Resilience grants cache (county -> grants[])
const familyResilienceGrantCache = new Map();

// Statewide Family Resilience grants
let statewideFamilyResilienceGrants = [];

// Spending category labels
export const CATEGORIES = {
  1: 'Salaries',
  2: 'Subcontracts',
  3: 'Program Facilities',
  4: 'Program Support',
  5: 'Program Supplies',
  6: 'Administrative Costs'
};

// PWLLE engagement levels
export const PWLLE_LEVELS = {
  1: 'Not engaged in decision-making',
  2: 'Informed about decision-making',
  3: 'Consulted during decision-making',
  4: 'Involved in decision-making',
  5: 'Empowered to lead with authority',
  6: 'Not applicable'
};

// OAC Collaborative names
export const COLLABORATIVES = {
  1: 'Berkshire Public Health Alliance',
  2: 'CAPE Public Health Collaborative',
  3: 'Cooperative Public Health District (FRCOG)',
  4: 'Foothills Health District',
  7: 'Great Meadows Public Health Collaborative',
  8: 'Hampshire Public Health Shared Services Collaborative',
  9: 'Inter-Island Public Health Excellence Collaborative',
  10: 'Nashoba Associated Boards of Health',
  11: 'Norfolk County 5 East',
  12: 'Norfolk County-8 Local Public Health Coalition',
  13: 'North Quabbin Health Collaborative',
  14: 'South Central Massachusetts Partnership for Health',
  15: 'Southern Berkshire Public Health Collaborative',
  16: 'Western Hampden County Public Health District',
  17: 'Other'
};

/**
 * Initialize the database from the SQLite file
 * Also populates in-memory caches for all entities
 * @returns {Promise<Database>} sql.js database instance
 */
export async function initDatabase() {
  if (db) { return db; }

  // Initialize sql.js
  const SQL = await initSqlJs({
    locateFile: file => `js/vendor/${file}`
  });

  // Fetch the database file
  const response = await fetch('opioid_settlement.db');
  const buffer = await response.arrayBuffer();

  // Create database from buffer
  db = new SQL.Database(new Uint8Array(buffer));

  // Populate caches on load (single SQL query for all data)
  await populateCaches();

  return db;
}

/**
 * Build full entity cache (Map for O(1) lookup)
 * @param {Array} allEntities - All entity rows from database
 */
function buildFullEntityCache(allEntities) {
  fullEntityCache = new Map();
  allEntities.forEach(entity => {
    fullEntityCache.set(entity.record_id, entity);
  });
}

/**
 * Build entity cache summary view with calculated fields
 * @param {Array} allEntities - All entity rows from database
 * @returns {Array} Summary view of entities
 */
function buildEntityCache(allEntities) {
  return allEntities
    .map(row => {
      const name = row.municipality_csv;
      const fy25Disbursement = row.agonumbers || 0;
      const carryover = row.ro_funds || 0;
      const fy25Expended = (row.t_exp || 0) + (row.t_exp_v2 || 0);
      const fy25Encumbered = (row.t_enc || 0) + (row.t_enc_v2 || 0);
      const totalAvailable = fy25Disbursement + carryover;
      const totalRemaining = totalAvailable - fy25Expended - fy25Encumbered;

      return {
        record_id: row.record_id,
        name,
        displayName: formatMunicipalityName(name),
        type: row.muni_org,
        fy25_disbursement: fy25Disbursement,
        carryover,
        total_available: totalAvailable,
        total_expended: fy25Expended,
        total_encumbered: fy25Encumbered,
        is_collaborative: row.pooled_yn,
        collaborative_id: row.collaborative_name,
        mosaic_funding: row.mosaic_funding || 0,
        total_remaining: totalRemaining,
        pct_spent: (() => {
          if (totalAvailable <= 0) return 0;
          const pct = ((fy25Expended + fy25Encumbered) / totalAvailable) * 100;
          // Cap at 100% for municipalities with missing carryover data
          if (pct > 100 && name === 'Pelham') return 100;
          return pct;
        })()
      };
    });
}

/**
 * Build expenditure cache for performance optimization
 */
function buildExpenditureCache() {
  expenditureCache = new Map();
  fullEntityCache.forEach((entity, recordId) => {
    const expenditures = [];
    processFormExpenditures(entity, '', 'collaborative', expenditures);
    processFormExpenditures(entity, '_v2', 'municipal', expenditures);
    expenditureCache.set(recordId, expenditures);
  });
}

/**
 * Build PDF attachment cache
 */
function buildPdfAttachmentCache() {
  try {
    const pdfAttachments = query('SELECT * FROM pdf_attachments');
    pdfAttachmentCache = new Map();
    pdfAttachments.forEach(pdf => {
      if (!pdfAttachmentCache.has(pdf.record_id)) {
        pdfAttachmentCache.set(pdf.record_id, []);
      }
      pdfAttachmentCache.get(pdf.record_id).push(pdf);
    });
  } catch (e) {
    console.warn('PDF attachments table not found, skipping:', e.message);
    pdfAttachmentCache = new Map();
  }
}

/**
 * Aggregate state spending data by department, vendor, and object class
 * @param {Array} rows - State spending rows
 * @returns {Object} Aggregated data with byDept, byVendor, byObjectClass
 */
function aggregateStateSpending(rows) {
  const byDept = {};
  const byVendor = {};
  const byObjectClass = {};
  let total = 0;

  rows.forEach(row => {
    total += row.amount || 0;

    // Group by department
    const deptCode = row.department_code || 'UNKNOWN';
    if (!byDept[deptCode]) {
      byDept[deptCode] = { code: deptCode, name: row.department || deptCode, total: 0, count: 0 };
    }
    byDept[deptCode].total += row.amount || 0;
    byDept[deptCode].count++;

    // Group by vendor
    const vendor = row.vendor || 'UNKNOWN';
    if (!byVendor[vendor]) {
      byVendor[vendor] = { name: vendor, city: row.city, state: row.state, total: 0, count: 0 };
    }
    byVendor[vendor].total += row.amount || 0;
    byVendor[vendor].count++;

    // Group by object class
    const objClass = row.object_class || 'UNKNOWN';
    if (!byObjectClass[objClass]) {
      byObjectClass[objClass] = { code: objClass, total: 0, count: 0 };
    }
    byObjectClass[objClass].total += row.amount || 0;
    byObjectClass[objClass].count++;
  });

  return { total, byDept, byVendor, byObjectClass };
}

/**
 * Build state spending cache
 */
function buildStateSpendingCache() {
  try {
    const stateRows = query('SELECT * FROM state_spending');
    const { total, byDept, byVendor, byObjectClass } = aggregateStateSpending(stateRows);

    stateSpendingCache = {
      rows: stateRows,
      total,
      byDept: Object.values(byDept).sort((a, b) => b.total - a.total),
      byVendor: Object.values(byVendor).sort((a, b) => b.total - a.total),
      byObjectClass: Object.values(byObjectClass).sort((a, b) => b.total - a.total),
      uniqueVendors: Object.keys(byVendor).length
    };
  } catch (e) {
    console.warn('State spending table not found, skipping:', e.message);
    stateSpendingCache = { rows: [], total: 0, byDept: [], byVendor: [], byObjectClass: [], uniqueVendors: 0 };
  }
}

/**
 * Build historical data cache from a table
 * @param {string} tableName - Name of the table to query
 * @param {string} keyField - Field to use as cache key
 * @param {string} label - Label for console logging
 * @returns {Map} Populated cache
 */
function buildHistoricalCache(tableName, keyField, label, nameMap) {
  const cache = new Map();
  try {
    const rows = query(`SELECT * FROM ${tableName}`);
    rows.forEach(row => {
      const rawKey = row[keyField];
      const mappedKey = nameMap ? (nameMap.get(rawKey) || rawKey) : rawKey;
      cache.set(mappedKey, row);
    });
    console.log(`Loaded ${cache.size} ${label} entities`);
  } catch (e) {
    console.warn(`${tableName} table not found, skipping:`, e.message);
  }
  return cache;
}

/**
 * Populate in-memory caches with all entity data
 * Called once during initialization
 */
async function populateCaches() {
  // Fetch all full entity rows
  const allEntities = query(`
    SELECT * FROM municipal_data
    WHERE municipality_csv NOT LIKE '%test%'
    ORDER BY municipality_csv
  `);

  // Build a map from historical municipality names (FY23/24) to FY25 municipality_csv names
  // Historical tables use "municipality" with spaces (e.g. "North Adams"),
  // while FY25 uses municipality_csv without spaces (e.g. "NorthAdams").
  const historicalNameMap = new Map();
  const fy25Names = new Set(allEntities.map(e => e.municipality_csv));
  try {
    const histNames = new Set();
    const collectHistNames = (table) => {
      try {
        query(`SELECT DISTINCT municipality FROM ${table}`).forEach(r => histNames.add(r.municipality));
      } catch (_) { /* table may not exist */ }
    };
    collectHistNames('municipal_data_fy23');
    collectHistNames('municipal_data_fy24');

    // Known name variants that can't be resolved by space removal
    const manualAliases = {
      'Mount Washington': 'MtWashington',
      'Manchester': 'ManchesterByTheSea'
    };

    for (const histName of histNames) {
      if (fy25Names.has(histName)) continue; // already matches
      if (manualAliases[histName] && fy25Names.has(manualAliases[histName])) {
        historicalNameMap.set(histName, manualAliases[histName]);
        continue;
      }
      const noSpaces = histName.replace(/ /g, '');
      if (fy25Names.has(noSpaces)) {
        historicalNameMap.set(histName, noSpaces);
      }
    }
    if (historicalNameMap.size > 0) {
      console.log(`Mapped ${historicalNameMap.size} historical municipality names to FY25 names`);
    }
  } catch (e) {
    console.warn('Could not build historical name mapping:', e.message);
  }

  // Build historical data caches FIRST (needed for cumulative pct_spent)
  fy23EntityCache = buildHistoricalCache('municipal_data_fy23', 'municipality', 'FY2023', historicalNameMap);
  fy24EntityCache = buildHistoricalCache('municipal_data_fy24', 'municipality', 'FY2024', historicalNameMap);

  // Build entity caches (uses historical caches for cumulative %)
  buildFullEntityCache(allEntities);
  entityCache = buildEntityCache(allEntities);

  // Build specialized caches
  buildExpenditureCache();
  buildPdfAttachmentCache();
  buildStateSpendingCache();

  // Load grants from database (now synchronous SQL queries)
  loadCountyMapping();
  loadRizeGrants();
  loadMosaicCoreGrants();
  loadFamilyResilienceGrants();
}

/**
 * Load RIZE Municipal Matching grants from database
 * Populates rizeGrantCache keyed by municipality name
 */
function loadRizeGrants() {
  try {
    const rows = query('SELECT * FROM rize_grants');
    rizeGrantCache = new Map();

    rows.forEach(row => {
      const grant = {
        awardee: row.awardee,
        website: row.website,
        period: row.period,
        amount: row.amount,
        focusAreas: JSON.parse(row.focus_areas || '[]'),
        geography: row.geography,
        mission: row.mission,
        municipalities: JSON.parse(row.municipalities || '[]'),
        primaryMunicipality: row.primary_municipality,
        relationshipType: row.relationship_type
      };
      // Index by each municipality the grant serves
      grant.municipalities.forEach(muni => {
        if (!rizeGrantCache.has(muni)) {
          rizeGrantCache.set(muni, []);
        }
        rizeGrantCache.get(muni).push(grant);
      });
    });

    console.log(`Loaded ${rows.length} RIZE grants for ${rizeGrantCache.size} municipalities from database`);
  } catch (e) {
    console.warn('Error loading RIZE grants from database:', e.message);
    rizeGrantCache = new Map();
  }
}

/**
 * Load County Mapping from database
 * Populates countyCache
 */
function loadCountyMapping() {
  try {
    const rows = query('SELECT municipality, county FROM county_mapping');
    rows.forEach(row => {
      countyCache.set(row.municipality, row.county);
    });
    console.log(`Loaded county mapping for ${countyCache.size} municipalities from database`);
  } catch (e) {
    console.warn('Error loading county mapping from database:', e.message);
  }
}

/**
 * Load Mosaic CORE Grants from database
 * Populates mosaicCoreGrantCache keyed by County
 */
function loadMosaicCoreGrants() {
  try {
    const rows = query('SELECT * FROM mosaic_core_grants');

    rows.forEach(row => {
      const grant = {
        awardee: row.awardee,
        website: row.website,
        period: row.period,
        amount: row.amount,
        focusAreas: JSON.parse(row.focus_areas || '[]'),
        geography: row.geography,
        mission: row.mission,
        grantType: row.grant_type
      };
      const county = grant.geography;
      if (county) {
        if (!mosaicCoreGrantCache.has(county)) {
          mosaicCoreGrantCache.set(county, []);
        }
        mosaicCoreGrantCache.get(county).push(grant);
      }
    });
    console.log(`Loaded ${rows.length} Mosaic CORE grants from database`);
  } catch (e) {
    console.warn('Error loading Mosaic CORE grants from database:', e.message);
  }
}

/**
 * Load Family Resilience Grants from database
 * Populates familyResilienceGrantCache keyed by County + Statewide list
 */
function loadFamilyResilienceGrants() {
  try {
    const rows = query('SELECT * FROM family_resilience_grants');

    statewideFamilyResilienceGrants = [];

    rows.forEach(row => {
      const grant = {
        awardee: row.awardee,
        website: row.website,
        period: row.period,
        amount: row.amount,
        focusAreas: JSON.parse(row.focus_areas || '[]'),
        geography: row.geography,
        mission: row.mission,
        grantType: row.grant_type
      };
      const geo = grant.geography;

      if (geo === 'Statewide') {
        statewideFamilyResilienceGrants.push(grant);
      } else if (geo) {
        if (!familyResilienceGrantCache.has(geo)) {
          familyResilienceGrantCache.set(geo, []);
        }
        familyResilienceGrantCache.get(geo).push(grant);
      }
    });
    console.log(`Loaded ${rows.length} Family Resilience grants from database`);
  } catch (e) {
    console.warn('Error loading Family Resilience grants from database:', e.message);
  }
}

/**
 * SQL injection patterns to detect and block
 */
const SQL_INJECTION_PATTERNS = [
  /;\s*drop\s+/i,
  /;\s*delete\s+/i,
  /;\s*insert\s+/i,
  /;\s*update\s+/i,
  /union\s+select/i,
  /into\s+outfile/i,
  /load_file\s*\(/i,
  /--/,
  /\/\*/
];

/**
 * Validate SQL query for injection attempts
 * @param {string} sql - SQL query to validate
 * @throws {Error} If potential injection detected
 */
function validateSql(sql) {
  if (typeof sql !== 'string') {
    throw new Error('SQL query must be a string');
  }

  if (sql.length > 10000) {
    throw new Error('SQL query exceeds maximum length');
  }

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(sql)) {
      throw new Error('Potential SQL injection detected');
    }
  }
}

/**
 * Validate query parameters
 * @param {Array} params - Query parameters
 * @throws {Error} If parameters are invalid
 */
function validateParams(params) {
  if (!Array.isArray(params)) {
    throw new Error('Params must be an array');
  }

  if (params.length > 100) {
    throw new Error('Too many query parameters');
  }

  for (const param of params) {
    if (param === null || param === undefined) { continue; }
    if (typeof param === 'string' && param.length > 1000) {
      throw new Error('Parameter value too long');
    }
    if (typeof param === 'number' && (isNaN(param) || !isFinite(param))) {
      throw new Error('Invalid numeric parameter');
    }
  }
}

/**
 * Execute a SQL query and return results as array of objects
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Array<Object>} Array of row objects
 */
export function query(sql, params = []) {
  if (!db) { throw new Error('Database not initialized'); }

  // Validate inputs
  validateSql(sql);
  validateParams(params);

  let stmt;
  try {
    stmt = db.prepare(sql);
    if (params.length) { stmt.bind(params); }

    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row);
    }

    return results;
  } catch (error) {
    console.error('SQL query error:', error);
    throw new Error(`Query failed: ${error.message}`);
  } finally {
    if (stmt) { stmt.free(); }
  }
}

/**
 * Get statewide summary statistics
 * Uses cached data - no SQL query
 * @returns {Object} Summary stats
 */
export function getStatewideSummary() {
  if (!entityCache) {
    throw new Error('Data not loaded. Call initDatabase() first.');
  }

  let totalDistributed = 0;
  let totalExpended = 0;
  let totalEncumbered = 0;

  entityCache.forEach(e => {
    totalDistributed += e.fy25_disbursement || 0;
    totalExpended += e.total_expended || 0;
    totalEncumbered += e.total_encumbered || 0;
  });

  return {
    totalEntities: entityCache.length,
    totalDistributed,
    totalCarryover: 0, // Not tracked in summary
    totalExpended,
    totalEncumbered,
    totalRemaining: totalDistributed - totalExpended - totalEncumbered
  };
}

/**
 * Get all municipalities/entities with their summary data
 * Uses cached data - no SQL query
 * @returns {Array<Object>} Array of entity summaries
 */
export function getAllEntities() {
  if (!entityCache) {
    throw new Error('Data not loaded. Call initDatabase() first.');
  }
  return entityCache;
}

/**
 * Get a single entity by record_id
 * Uses cached data - O(1) Map lookup, no SQL query
 * @param {string} recordId - The record ID
 * @returns {Object|null} Entity data or null
 */
export function getEntityById(recordId) {
  return fullEntityCache.get(recordId) || null;
}

/**
 * Get PDF attachments for a record
 * Uses cached data - O(1) Map lookup
 * @param {string} recordId - The record ID
 * @returns {Array<Object>} PDF attachment objects
 */
export function getPdfAttachments(recordId) {
  return pdfAttachmentCache.get(recordId) || [];
}

/**
 * Get RIZE Municipal Matching grants for a municipality
 * Uses cached data - O(1) Map lookup
 * @param {string} municipalityName - Municipality name
 * @returns {Array<Object>} RIZE grants associated with this municipality
 */
export function getRizeGrants(municipalityName) {
  return rizeGrantCache.get(municipalityName) || [];
}

/**
 * Check if municipality has any RIZE grants
 * @param {string} municipalityName - Municipality name
 * @returns {boolean} True if municipality has RIZE grants
 */
export function hasRizeGrants(municipalityName) {
  return rizeGrantCache.has(municipalityName) && rizeGrantCache.get(municipalityName).length > 0;
}

/**
 * Get County for a municipality
 */
export function getCounty(municipalityName) {
  return countyCache.get(municipalityName) || null;
}

/**
 * Get Regional Grants (Mosaic CORE and Family Resilience) for a municipality
 * Includes Statewide Family Resilience grants
 * @returns {Object} { core: [], familyResilience: [], statewide: [] }
 */
export function getRegionalGrants(municipalityName) {
  const county = countyCache.get(municipalityName);

  return {
    core: county ? mosaicCoreGrantCache.get(county) || [] : [],
    familyResilience: county ? familyResilienceGrantCache.get(county) || [] : [],
    statewide: statewideFamilyResilienceGrants || []
  };
}

/**
 * Get ALL Regional Grants for the Grants View
 * @returns {Object} { core: [], familyResilience: [], statewide: [] }
 */
export function getAllRegionalGrants() {
  const core = [];
  mosaicCoreGrantCache.forEach(grants => core.push(...grants));

  // De-duplication might be needed if I allow multiple regions to share grants in the cache,
  // but current loader pushes simple arrays.
  // If a grant was in multiple counties, it would appear multiple times here.
  // However, the input JSONs seem to have 1 entry per grant.
  // The cache is keyed by county.
  // If I iterate values(), I get arrays of grants.

  const family = [];
  familyResilienceGrantCache.forEach(grants => family.push(...grants));

  const statewide = statewideFamilyResilienceGrants || [];

  // Sort by amount descending
  core.sort((a, b) => b.amount - a.amount);
  family.sort((a, b) => b.amount - a.amount);
  statewide.sort((a, b) => b.amount - a.amount);

  return { core, familyResilience: family, statewide };
}

/**
 * Get normalized expenditures for an entity
 * Converts wide format (expenditure1-20) to normalized rows
 * Uses cache if available (populated during init)
 * @param {Object} entity - Raw entity data from DB
 * @returns {Array<Object>} Normalized expenditure rows
 */
export function normalizeExpenditures(entity) {
  // Check cache first
  const cacheKey = entity.record_id;
  if (expenditureCache.has(cacheKey)) {
    return expenditureCache.get(cacheKey);
  }

  const expenditures = [];

  // Process both form versions using helper to avoid duplication
  processFormExpenditures(entity, '', 'collaborative', expenditures);
  processFormExpenditures(entity, '_v2', 'municipal', expenditures);

  return expenditures;
}

/**
 * Helper: Process expenditures for a form version (DRY)
 * @param {Object} entity - Raw entity data
 * @param {string} suffix - Field suffix ('' for main form, '_v2' for v2)
 * @param {string} source - Source label ('collaborative' or 'municipal')
 * @param {Array} expenditures - Array to push results into
 */
function processFormExpenditures(entity, suffix, source, expenditures) {
  for (let i = 1; i <= 20; i++) {
    const name = entity[`expenditure${i}${suffix}`];
    if (!name) { continue; }

    // Resolve project name
    const projectKey = entity[`e_p_${i}${suffix}`];
    let projectName = null;
    if (projectKey === 6) {
      projectName = 'Administrative Costs';
    } else if (projectKey >= 1 && projectKey <= 5) {
      projectName = entity[`pjct_name_${projectKey}${suffix}`] || `Project ${projectKey}`;
    }

    expenditures.push({
      name,
      amount: entity[`amount${i}${suffix}`] || 0,
      category: CATEGORIES[entity[`e_c${i}${suffix}`]] || 'Unknown',
      categoryId: entity[`e_c${i}${suffix}`],
      description: entity[`description${i}${suffix}`] || '',
      status: entity[`status${i}${suffix}`] === 1 ? 'Expended' : 'Encumbered',
      offset: entity[`offset${i}${suffix}`] || 0,
      offsetVendor: entity[`o_v${i}${suffix}`] || '',
      notes: entity[`notes${i}${suffix}`] || '',
      project: projectName,
      source,
      sourceKeys: {
        name: `expenditure${i}${suffix}`,
        amount: `amount${i}${suffix}`,
        description: `description${i}${suffix}`
      }
    });
  }
}

/**
 * Calculate discrepancy between line-item sums and reported totals
 * @param {Object} entity - Raw entity data
 * @returns {Object} Reconciliation data
 */
export function getExpenditureReconciliation(entity) {
  const expenditures = normalizeExpenditures(entity);

  // Sum line items by status
  let lineItemExpended = 0;
  let lineItemEncumbered = 0;

  expenditures.forEach(exp => {
    const net = exp.amount - exp.offset;
    if (exp.status === 'Expended') {
      lineItemExpended += net;
    } else {
      lineItemEncumbered += net;
    }
  });

  // Reported totals from REDCap calculated fields
  const reportedExpended = (entity.t_exp || 0) + (entity.t_exp_v2 || 0);
  const reportedEncumbered = (entity.t_enc || 0) + (entity.t_enc_v2 || 0);

  return {
    lineItemExpended,
    lineItemEncumbered,
    reportedExpended,
    reportedEncumbered,
    expendedDiff: lineItemExpended - reportedExpended,
    encumberedDiff: lineItemEncumbered - reportedEncumbered,
    hasDiscrepancy:
      Math.abs(lineItemExpended - reportedExpended) > 0.01 || Math.abs(lineItemEncumbered - reportedEncumbered) > 0.01
  };
}

/**
 * Get narrative and qualitative data for an entity
 * @param {Object} entity - Raw entity data
 * @returns {Object} Narrative data
 */
export function getNarratives(entity) {
  const isOrganization = entity.muni_org === 'Organization' || (entity.pooled_yn === 1 && entity.lead_muni === 1);

  // PWLLE Data
  const pwlleLevel = isOrganization ? entity.pwlle_mult : entity.pwlle_mult_v2;
  const pwlleText = isOrganization ? entity.pwlle_text : entity.pwlle_text_v2;

  // Highlights
  const highlight = isOrganization ? entity.highlight : entity.highlight_v2;
  const highlightUpload = isOrganization ? entity.highlight_upload : entity.highlight_upload_v2;

  // Work without expenditures
  const noExpenseWork = isOrganization ? entity.no_expense_work : entity.no_expense_work_v2;

  // Future Plans
  const futurePlans = isOrganization ? entity.future_spend_plans : entity.future_spend_plans_v2;

  return {
    pwlle: {
      level: pwlleLevel,
      levelLabel: PWLLE_LEVELS[pwlleLevel] || 'Not Specified',
      description: pwlleText,
      source: {
        level: isOrganization ? 'pwlle_mult' : 'pwlle_mult_v2',
        description: isOrganization ? 'pwlle_text' : 'pwlle_text_v2'
      }
    },
    highlights: {
      text: highlight,
      upload: highlightUpload,
      source: {
        text: isOrganization ? 'highlight' : 'highlight_v2',
        upload: isOrganization ? 'highlight_upload' : 'highlight_upload_v2'
      }
    },
    noExpenseWork,
    noExpenseWorkSource: isOrganization ? 'no_expense_work' : 'no_expense_work_v2',
    futurePlans,
    futurePlansSource: isOrganization ? 'future_spend_plans' : 'future_spend_plans_v2',
    hasNarratives: !!(pwlleText || highlight || noExpenseWork || futurePlans)
  };
}

/**
 * Get projects for an entity
 * @param {Object} entity - Raw entity data
 * @returns {Array<Object>} Project objects
 */
export function getProjects(entity) {
  const projects = [];

  // Main form projects
  for (let i = 1; i <= 5; i++) {
    const name = entity[`pjct_name_${i}`];
    if (name) {
      projects.push({
        name,
        description: entity[`pjct_desc_${i}`] || '',
        source: 'collaborative',
        sourceKeys: {
          name: `pjct_name_${i}`,
          description: `pjct_desc_${i}`
        }
      });
    }
  }

  // V2 form projects
  for (let i = 1; i <= 5; i++) {
    const name = entity[`pjct_name_${i}_v2`];
    if (name) {
      projects.push({
        name,
        description: entity[`pjct_desc_${i}_v2`] || '',
        source: 'municipal',
        sourceKeys: {
          name: `pjct_name_${i}_v2`,
          description: `pjct_desc_${i}_v2`
        }
      });
    }
  }

  return projects;
}

/**
 * Get statewide spending by category
 * Uses cached data - no SQL queries
 * @returns {Array<Object>} Category totals
 */
export function getSpendingByCategory() {
  const categoryTotals = {};

  // Initialize categories
  Object.entries(CATEGORIES).forEach(([id, name]) => {
    categoryTotals[id] = { id: parseInt(id), name, expended: 0, encumbered: 0, total: 0 };
  });

  // Iterate through all cached entities and sum by category
  fullEntityCache.forEach(entity => {
    const expenditures = normalizeExpenditures(entity);
    expenditures.forEach(exp => {
      const catId = exp.categoryId;
      if (catId && categoryTotals[catId]) {
        const netAmount = exp.amount - exp.offset;
        if (exp.status === 'Expended') {
          categoryTotals[catId].expended += netAmount;
        } else {
          categoryTotals[catId].encumbered += netAmount;
        }
        categoryTotals[catId].total += netAmount;
      }
    });
  });

  return Object.values(categoryTotals).sort((a, b) => b.total - a.total);
}

/**
 * Get top entities by spending
 * Uses cached data - no SQL query
 * @param {number} limit - Number of entities to return
 * @returns {Array<Object>} Top spending entities
 */
export function getTopSpenders(limit = 10) {
  return getAllEntities()
    .filter(e => e.total_expended > 0 || e.total_encumbered > 0)
    .sort((a, b) => b.total_expended + b.total_encumbered - (a.total_expended + a.total_encumbered))
    .slice(0, limit);
}

/**
 * Search across entities, expenditures, and projects
 * Uses cached data - zero SQL queries
 * @param {string} searchTerm - Search query
 * @param {number|null} fiscalYear - Optional fiscal year filter (2023, 2024, 2025, or null for all)
 * @returns {Array<Object>} Search results with structured data for display and CSV export
 */
export function searchAll(searchTerm, fiscalYear = null) {
  if (!searchTerm || searchTerm.length < 2) { return []; }

  const termLower = searchTerm.toLowerCase();
  const results = [];

  fullEntityCache.forEach((entity, recordId) => {
    const name = entity.municipality_csv || '';
    const displayMunicipality = formatMunicipalityName(name);

    // Filter by fiscal year if specified
    if (fiscalYear) {
      const muniYears = getFiscalYears(name);
      if (!muniYears.includes(fiscalYear)) { return; } // Skip if no data for this FY
    }

    // Search entity name (match against both csv and display forms)
    if (name.toLowerCase().includes(termLower) || displayMunicipality.toLowerCase().includes(termLower)) {
      results.push({
        type: 'Municipality',
        name: displayMunicipality,
        municipality: displayMunicipality,
        details: entity.muni_org || 'Municipality',
        amount: (entity.t_exp || 0) + (entity.t_exp_v2 || 0) + (entity.t_enc || 0) + (entity.t_enc_v2 || 0),
        recordId
      });
    }

    // Expenditures, projects, and PDFs only exist in FY2025 data
    if (!fiscalYear || fiscalYear === 2025) {
      // Search expenditures (uses cached data, no SQL)
      const expenditures = normalizeExpenditures(entity);
      expenditures.forEach(exp => {
        const searchableText = `${exp.name} ${exp.description}`.toLowerCase();
        if (searchableText.includes(termLower)) {
          results.push({
            type: 'Expenditure',
            name: exp.name,
            municipality: displayMunicipality,
            details: `${exp.category} - ${exp.status}`,
            amount: exp.amount - exp.offset,
            recordId
          });
        }
      });

      // Search projects (uses cached data, no SQL)
      const projects = getProjects(entity);
      projects.forEach(proj => {
        const searchableText = `${proj.name} ${proj.description}`.toLowerCase();
        if (searchableText.includes(termLower)) {
          results.push({
            type: 'Project',
            name: proj.name,
            municipality: displayMunicipality,
            details: proj.description ? `${proj.description.substring(0, 100)}...` : '',
            amount: null,
            recordId
          });
        }
      });

      // Search PDF content
      const attachments = getPdfAttachments(recordId);
      attachments.forEach(pdf => {
        if (pdf.ocr_text && pdf.ocr_text.toLowerCase().includes(termLower)) {
          // Extract snippet around match
          const textLower = pdf.ocr_text.toLowerCase();
          const matchIdx = textLower.indexOf(termLower);
          const start = Math.max(0, matchIdx - 50);
          const end = Math.min(pdf.ocr_text.length, matchIdx + searchTerm.length + 100);
          const rawSnippet =
            (start > 0 ? '...' : '') +
            pdf.ocr_text.substring(start, end).replace(/\n/g, ' ') +
            (end < pdf.ocr_text.length ? '...' : '');
          const snippet = escapeHtml(rawSnippet);

          results.push({
            type: 'PDF Content',
            name: pdf.normalized_filename,
            municipality: displayMunicipality,
            details: snippet,
            amount: null,
            recordId,
            pdfPath: pdf.file_path
          });
        }
      });

      // Search Narratives (Highlights, PWLLE, Future Plans, etc.)
      const narratives = getNarratives(entity);
      const narrativeFields = [
        { text: narratives.highlights.text, label: 'Highlight' },
        { text: narratives.pwlle.description, label: 'PWLLE Engagement' },
        { text: narratives.futurePlans, label: 'Future Plans' },
        { text: narratives.noExpenseWork, label: 'Work w/o Expenditure' }
      ];

      narrativeFields.forEach(field => {
        if (field.text && field.text.toLowerCase().includes(termLower)) {
          // Extract snippet
          const textLower = field.text.toLowerCase();
          const matchIdx = textLower.indexOf(termLower);
          const start = Math.max(0, matchIdx - 50);
          const end = Math.min(field.text.length, matchIdx + searchTerm.length + 100);
          const rawSnippet =
            (start > 0 ? '...' : '') +
            field.text.substring(start, end).replace(/\n/g, ' ') +
            (end < field.text.length ? '...' : '');
          const snippet = escapeHtml(rawSnippet);

          results.push({
            type: 'Narrative',
            name: field.label,
            municipality: displayMunicipality,
            details: snippet,
            amount: null,
            recordId
          });
        }
      });
    }
  });

  return results.slice(0, 100); // Limit results
}

// Common English stop words to filter from word cloud
const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'had',
  'her',
  'was',
  'one',
  'our',
  'out',
  'has',
  'have',
  'been',
  'were',
  'they',
  'their',
  'what',
  'when',
  'where',
  'who',
  'will',
  'with',
  'this',
  'that',
  'from',
  'into',
  'which',
  'then',
  'than',
  'also',
  'just',
  'more',
  'some',
  'such',
  'about',
  'after',
  'before',
  'being',
  'between',
  'both',
  'each',
  'other',
  'through',
  'under',
  'very',
  'over',
  'only',
  'these',
  'those',
  'does',
  'how',
  'its',
  'may',
  'use',
  'used',
  'using',
  'any',
  'based',
  'including',
  'related'
]);

/**
 * Get word frequency data for word cloud visualization
 * Extracts text from expenditure descriptions and project names
 * @param {number} maxWords - Maximum number of words to return (default 60)
 * @returns {Array<Object>} Array of {word, count} sorted by frequency
 */
export function getWordCloudData(maxWords = 60) {
  const wordCounts = {};

  fullEntityCache.forEach(entity => {
    // Extract expenditure descriptions (both form versions)
    for (let i = 1; i <= 20; i++) {
      const desc1 = entity[`description${i}`] || '';
      const desc2 = entity[`description${i}_v2`] || '';
      const name1 = entity[`expenditure${i}`] || '';
      const name2 = entity[`expenditure${i}_v2`] || '';

      [desc1, desc2, name1, name2].forEach(text => {
        if (text) { tokenizeAndCount(text, wordCounts); }
      });
    }

    // Extract project names (both form versions)
    for (let i = 1; i <= 5; i++) {
      const pName1 = entity[`pjct_name_${i}`] || '';
      const pName2 = entity[`pjct_name_${i}_v2`] || '';
      const pDesc1 = entity[`pjct_desc_${i}`] || '';
      const pDesc2 = entity[`pjct_desc_${i}_v2`] || '';

      [pName1, pName2, pDesc1, pDesc2].forEach(text => {
        if (text) { tokenizeAndCount(text, wordCounts); }
      });
    }
  });

  // Convert to array and sort by count
  return Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxWords);
}

/**
 * Tokenize text and update word counts
 * @param {string} text - Text to tokenize
 * @param {Object} wordCounts - Object to update with counts
 */
function tokenizeAndCount(text, wordCounts) {
  // Split on non-word characters, convert to lowercase
  const words = text
    .toLowerCase()
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word));

  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
}

/**
 * Format number as currency string
 * @param {number} value - Numeric value
 * @returns {string} Formatted currency
 */
export function formatCurrency(value) {
  if (value == null || isNaN(value)) { return '$0'; }
  return '$' + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format a percentage value consistently
 * @param {number} value - Percentage value (e.g. 45.123)
 * @param {number} decimals - Decimal places (default 1)
 * @returns {string} Formatted percentage (e.g. "45.1%")
 */
export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) { return '0%'; }
  return parseFloat(value).toFixed(decimals) + '%';
}

// ============================================================================
// STATE SPENDING FUNCTIONS (CTHRU data)
// ============================================================================

/**
 * Object class labels for state spending
 */
export const STATE_OBJECT_CLASSES = {
  '(AA) REGULAR EMPLOYEE COMPENSATION': 'Regular Employee Compensation',
  '(BB) REGULAR EMPLOYEE RELATED EXPEN': 'Employee Related Expenses',
  '(CC) SPECIAL EMPLOYEES': 'Special Employees',
  '(HH) CONSULTANT SVCS (TO DEPTS)': 'Consultant Services',
  '(MM) PURCHASED CLIENT/PROGRAM SVCS': 'Purchased Program Services',
  '(PP) STATE AID/POL SUBS': 'State Aid',
  '(UU) IT NON-PAYROLL EXPENSE': 'IT Expenses'
};

/**
 * Get state spending summary
 * @param {number} fiscalYear - Filter by fiscal year (optional)
 * @returns {Object} Summary with total, department breakdown, vendor count
 */
export function getStateSummary(fiscalYear) {
  if (!stateSpendingCache) {
    return { total: 0, recordCount: 0, uniqueVendors: 0, topDept: null };
  }

  let rows = stateSpendingCache.rows;
  if (fiscalYear) {
    rows = rows.filter(r => parseInt(r.budget_fiscal_year) === fiscalYear);
  }

  const total = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const uniqueVendors = new Set(rows.map(r => r.vendor)).size;

  // Recalculate top dept for this subset
  const deptMap = {};
  rows.forEach(r => {
    const dept = r.department;
    deptMap[dept] = (deptMap[dept] || 0) + (r.amount || 0);
  });

  const topDeptName = Object.keys(deptMap).sort((a, b) => deptMap[b] - deptMap[a])[0];
  const topDept = topDeptName ? { name: topDeptName, total: deptMap[topDeptName] } : null;

  return {
    total,
    recordCount: rows.length,
    uniqueVendors,
    topDept
  };
}

/**
 * Get state spending grouped by department
 * @param {number} fiscalYear - Filter by fiscal year (optional)
 * @returns {Array<Object>} Departments sorted by total spending
 */
export function getStateSpendingByDepartment(fiscalYear) {
  if (!stateSpendingCache) { return []; }

  let rows = stateSpendingCache.rows;
  if (fiscalYear) {
    rows = rows.filter(r => parseInt(r.budget_fiscal_year) === fiscalYear);
  }

  const depts = {};
  rows.forEach(r => {
    // Clean department name (remove code in parens if present)
    // Adjust based on actual data format
    const name = r.department || 'Unknown Department';
    const code = r.department_code || 'UNK';

    if (!depts[code]) {
      depts[code] = { code, name, total: 0, count: 0 };
    }
    depts[code].total += r.amount || 0;
    depts[code].count++;
  });

  return Object.values(depts).sort((a, b) => b.total - a.total);
}

/**
 * Get top vendors by state spending
 * @param {number} limit - Max vendors to return
 * @param {number} fiscalYear - Filter by fiscal year (optional)
 * @returns {Array<Object>} Vendors sorted by total spending
 */
export function getStateSpendingByVendor(limit = 50, fiscalYear) {
  if (!stateSpendingCache) { return []; }

  let rows = stateSpendingCache.rows;
  if (fiscalYear) {
    rows = rows.filter(r => parseInt(r.budget_fiscal_year) === fiscalYear);
  }

  const vendors = {};
  rows.forEach(r => {
    const name = r.vendor;
    if (!vendors[name]) {
      vendors[name] = {
        name,
        city: r.city,
        state: r.state,
        total: 0,
        count: 0
      };
    }
    vendors[name].total += r.amount || 0;
    vendors[name].count++;
  });

  return Object.values(vendors)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/**
 * Get state spending by object class (expenditure category)
 * @param {number} fiscalYear - Filter by fiscal year (optional)
 * @returns {Array<Object>} Object classes sorted by total spending
 */
export function getStateSpendingByObjectClass(fiscalYear) {
  if (!stateSpendingCache) { return []; }

  let rows = stateSpendingCache.rows;
  if (fiscalYear) {
    rows = rows.filter(r => parseInt(r.budget_fiscal_year) === fiscalYear);
  }

  const objects = {};
  rows.forEach(r => {
    const name = r.object_class;
    if (!objects[name]) {
      objects[name] = {
        code: name, // Using name as code for grouping if code not separate
        name,
        total: 0,
        count: 0
      };
    }
    objects[name].total += r.amount || 0;
    objects[name].count++;
  });

  return Object.values(objects).sort((a, b) => b.total - a.total);
}

/**
 * Get available fiscal years for state spending
 * @returns {Array<number>} Sorted years descending
 */
export function getStateFiscalYears() {
  if (!stateSpendingCache) { return []; }
  const years = new Set(
    stateSpendingCache.rows.map(r => parseInt(r.budget_fiscal_year)).filter(y => !isNaN(y) && y > 2000 && y < 2100) // Sanity check
  );
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Get available fiscal years for search filtering
 * @returns {Array<number>} Available fiscal years [2025, 2024, 2023]
 */
export function getSearchFiscalYears() {
  return [2025, 2024, 2023];
}

/**
 * Search state spending transactions
 * @param {string} term - Search term
 * @returns {Array<Object>} Matching transactions
 */
export function searchStateSpending(term) {
  if (!stateSpendingCache || !term || term.length < 2) { return []; }

  const termLower = term.toLowerCase();
  return stateSpendingCache.rows
    .filter(row => {
      const searchable = `${row.vendor} ${row.department} ${row.city}`.toLowerCase();
      return searchable.includes(termLower);
    })
    .slice(0, 100);
}

// ============================================================================
// MULTI-YEAR DATA FUNCTIONS (FY2023, FY2024, FY2025)
// ============================================================================

/**
 * Get available fiscal years for a municipality
 * @param {string} municipalityName - Name of the municipality
 * @returns {Array<number>} Available years, newest first
 */
export function getFiscalYears(municipalityName) {
  const years = [];

  // Check FY2025 (main table - uses municipality_csv)
  if (entityCache && entityCache.some(e => e.name === municipalityName)) {
    years.push(2025);
  }

  // Check FY2024
  if (fy24EntityCache.has(municipalityName)) {
    years.push(2024);
  }

  // Check FY2023
  if (fy23EntityCache.has(municipalityName)) {
    years.push(2023);
  }

  return years.sort((a, b) => b - a);
}

/**
 * Get FY2023 entity by municipality name
 * @param {string} municipalityName
 * @returns {Object|null} FY2023 entity data or null
 */
export function getFy23Entity(municipalityName) {
  return fy23EntityCache.get(municipalityName) || null;
}

/**
 * Get FY2024 entity by municipality name
 * @param {string} municipalityName
 * @returns {Object|null} FY2024 entity data or null
 */
export function getFy24Entity(municipalityName) {
  return fy24EntityCache.get(municipalityName) || null;
}

/**
 * Get hero card data for a fiscal year
 * Returns standardized format with debug info for traceability
 * @param {string} municipalityName - Municipality name
 * @param {number} fiscalYear - 2023, 2024, or 2025
 * @returns {Object|null} Hero data with values and source info
 */
export function getHeroData(municipalityName, fiscalYear) {
  switch (fiscalYear) {
    case 2025:
      return getHeroDataFy25(municipalityName);
    case 2024:
      return getHeroDataFy24(municipalityName);
    case 2023:
      return getHeroDataFy23(municipalityName);
    default:
      return null;
  }
}

/**
 * Get FY2025 hero card data (from main municipal_data table)
 */
function getHeroDataFy25(municipalityName) {
  const entity = entityCache?.find(e => e.name === municipalityName);
  if (!entity) { return null; }

  const fullEntity = fullEntityCache.get(entity.record_id);
  if (!fullEntity) { return null; }

  const expended = (fullEntity.t_exp || 0) + (fullEntity.t_exp_v2 || 0);
  const encumbered = (fullEntity.t_enc || 0) + (fullEntity.t_enc_v2 || 0);
  const totalAvailable = (fullEntity.agonumbers || 0) + (fullEntity.ro_funds || 0);

  // Validate carryover against FY24 unexpended funds and FY23 received
  const fy24Data = fy24EntityCache.get(municipalityName);
  const fy23Data = fy23EntityCache.get(municipalityName);
  const roFunds = fullEntity.ro_funds || 0;
  const utilizationPct = totalAvailable > 0 ? ((expended + encumbered) / totalAvailable) * 100 : 0;
  let carryoverWarning = null;
  if (fy24Data && fy24Data.unexpended_funds != null && roFunds > 0) {
    const diff = roFunds - fy24Data.unexpended_funds;
    if (Math.abs(diff) >= 1) {
      carryoverWarning = `municipal_data.ro_funds (${formatCurrency(roFunds)}) differs from municipal_data_fy24.unexpended_funds (${formatCurrency(fy24Data.unexpended_funds)}) by ${formatCurrency(Math.abs(diff))}`;
    }
  } else if (utilizationPct > 100 && fy23Data && fy23Data.funds_received > 0) {
    // Utilization over 100% suggests missing carryover — check if FY23 funds were received
    const fy24Unexpended = fy24Data?.unexpended_funds;
    const fy24Label = fy24Unexpended != null
      ? `municipal_data_fy24.unexpended_funds = ${formatCurrency(fy24Unexpended)}`
      : 'municipal_data_fy24.unexpended_funds is empty';
    carryoverWarning = `Utilization is ${utilizationPct.toFixed(0)}% — possible missing carryover. municipal_data_fy23.funds_received = ${formatCurrency(fy23Data.funds_received)}, ${fy24Label}`;
  } else if (!fy24Data && roFunds > 0) {
    carryoverWarning = 'No FY24 data available to validate';
  }

  // Get RIZE grants for this municipality
  const rizeGrants = getRizeGrants(municipalityName);
  const rizeTotal = rizeGrants.reduce((sum, g) => sum + (g.amount || 0), 0);

  return {
    disbursement: {
      value: fullEntity.agonumbers,
      source: 'municipal_data.agonumbers',
      label: 'FY25 Disbursement'
    },
    carryover: {
      value: fullEntity.ro_funds,
      source: 'municipal_data.ro_funds',
      label: 'Carryover Funds',
      warning: carryoverWarning
    },
    mosaic:
      fullEntity.mosaic_funding > 0
        ? {
          value: fullEntity.mosaic_funding,
          source: 'municipal_data.mosaic_funding',
          label: 'Mosaic Funding'
        }
        : null,
    rize:
      rizeTotal > 0
        ? {
          value: rizeTotal,
          count: rizeGrants.length,
          source: 'rize_grants table',
          label: 'RIZE Municipal Matching'
        }
        : null,
    expended: {
      value: expended,
      source: 'municipal_data.t_exp + t_exp_v2',
      label: 'Expended'
    },
    utilized: (() => {
      let pct = totalAvailable > 0 ? (((expended + encumbered) / totalAvailable) * 100) : 0;
      let src = 'calculated: (t_exp + t_exp_v2 + t_enc + t_enc_v2) / (agonumbers + ro_funds)';
      if (pct > 100 && municipalityName === 'Pelham') {
        pct = 100;
        src = 'manual override due to missing FY24 data';
      }
      return { value: pct.toFixed(1), source: src, label: 'Utilized' };
    })(),
    fiscalYear: 2025,
    sourceFile: 'municipal_data',
    recordId: entity.record_id
  };
}

/**
 * Get FY2024 hero card data
 */
function getHeroDataFy24(municipalityName) {
  const entity = fy24EntityCache.get(municipalityName);
  if (!entity) { return null; }

  const expended = entity.total_expended || 0;
  const totalAvailable = entity.total_available || 0;

  return {
    disbursement: {
      value: entity.fy24_disbursement,
      source: 'municipal_data_fy24.fy24_disbursement',
      label: 'FY24 Disbursement'
    },
    carryover: {
      value: entity.carryover_funds,
      source: 'municipal_data_fy24.carryover_funds',
      label: 'Carryover Funds'
    },
    expended: {
      value: expended,
      source: 'municipal_data_fy24.total_expended',
      label: 'Expended'
    },
    utilized: {
      value: totalAvailable > 0 ? ((expended / totalAvailable) * 100).toFixed(1) : '0',
      source: 'calculated: total_expended / total_available',
      label: 'Utilized'
    },
    fiscalYear: 2024,
    sourceFile: entity.source_file || 'municipal_data_fy24',
    surveyPath: entity.survey_md_path,
    unexpended: {
      value: entity.unexpended_funds,
      source: 'municipal_data_fy24.unexpended_funds'
    }
  };
}

/**
 * Get FY2023 hero card data
 */
function getHeroDataFy23(municipalityName) {
  const entity = fy23EntityCache.get(municipalityName);
  if (!entity) { return null; }

  return {
    disbursement: {
      value: entity.funds_received,
      source: 'municipal_data_fy23.funds_received',
      label: 'FY23 Funds Received'
    },
    carryover: {
      value: null,
      source: 'N/A - not collected in FY23',
      label: 'Carryover Funds'
    },
    expended: {
      value: entity.funds_expended,
      source: 'municipal_data_fy23.funds_expended',
      label: 'Expended'
    },
    utilized: {
      value: entity.pct_expended || '0%',
      source: 'municipal_data_fy23.pct_expended',
      label: 'Utilized'
    },
    fiscalYear: 2023,
    sourceFile: entity.source_file || 'municipal_data_fy23',
    sourceRow: entity.source_row,
    reportingStatus: entity.reporting_status
  };
}

/**
 * Get FY2024 survey markdown file path
 * @param {string} municipalityName
 * @returns {string|null} Path to markdown file or null
 */
export function getFy24SurveyPath(municipalityName) {
  const entity = fy24EntityCache.get(municipalityName);
  return entity?.survey_md_path || null;
}

/**
 * Check if a municipality has historical data
 * @param {string} municipalityName
 * @returns {boolean} True if FY2023 or FY2024 data exists
 */
export function hasHistoricalData(municipalityName) {
  return fy23EntityCache.has(municipalityName) || fy24EntityCache.has(municipalityName);
}
