/**
 * Centralized Copy Management
 *
 * This file contains all user-facing text in the dashboard.
 * Edit values here to update copy across the application.
 *
 * Usage:
 *   import { copy } from './copy.js';
 *   copy.navigation.overview // returns "Overview"
 */

export const copy = {
  // ============================================================================
  // NAVIGATION
  // ============================================================================

  navigation: {
    overview: 'Overview', // Changed from "Statewide"
    municipalities: 'Municipalities',
    stateAgencies: 'State Agencies',
    map: 'Map',
    collaboratives: 'Collaboratives',
    grants: 'Grants',
    search: 'Search',
    about: 'About the Data',
    detail: 'Detail' // Hidden from nav
  },

  // ============================================================================
  // LABELS - Common terms used throughout
  // ============================================================================

  labels: {
    // Financial terms
    expended: 'Expended',
    encumbered: 'Encumbered',
    remaining: 'Remaining',
    utilized: 'Utilized',
    pooled: 'Pooled',

    // Fiscal years
    fiscalYear: 'Fiscal Year',
    fy25: 'FY25',
    fy2025: 'FY2025',
    fy2024: 'FY2024',
    fy2023: 'FY2023',
    allYears: 'All Years',

    // Entity types
    municipality: 'Municipality',
    county: 'County',
    organization: 'Organization',
    all: 'All',

    // Status
    complete: 'Complete',
    incomplete: 'Incomplete',
    lead: 'Lead',
    member: 'Member',

    // Common UI
    entities: 'entities',
    results: 'results',
    loading: 'Loading...',
    error: 'Error',
    back: 'Back',
    search: 'Search',
    filter: 'Filter',
    view: 'View'
  },

  // ============================================================================
  // BUTTONS
  // ============================================================================

  buttons: {
    // Navigation
    backToExplorer: '← Back to Explorer',
    backToCategories: '← Back to Categories',
    viewAll: 'View All Municipalities →',
    viewDetails: 'View Details →',

    // Actions
    search: 'Search',
    exportCsv: 'Export CSV',
    visitWebsite: 'Visit Website ↗',
    downloadFiling: '📄 Download original filing',

    // Accordion controls (future feature)
    expandAll: 'Expand All',
    collapseAll: 'Collapse All',

    // Debug
    toggleDebug: 'Toggle Debug Mode'
  },

  // ============================================================================
  // PLACEHOLDERS
  // ============================================================================

  placeholders: {
    filterByName: 'Filter by name...',
    searchAll: 'Search municipalities, expenditures, projects...'
  },

  // ============================================================================
  // PAGE: OVERVIEW (formerly Statewide)
  // ============================================================================

  overview: {
    // Stat labels
    stats: {
      fy25Distributed: 'FY25 Distributed',
      totalExpended: 'Total Expended',
      encumbered: 'Encumbered',
      reportingEntities: 'Reporting Entities',
      vendorsPaid: 'Vendors Paid',
      transactions: 'Transactions'
    },

    // Section titles
    sections: {
      spendingByCategory: 'Spending by Category',
      topSpenders: 'Top 10 Spenders',
      quickOverview: 'Quick Overview',
      stateAgencySpending: 'State Agency Spending'
    },

    // Micro labels
    microLabels: {
      fromCthru: 'from CTHRU (FY25)'
    },

    // Descriptions
    description:
      'Massachusetts municipalities are reporting how they spend opioid settlement funds to address the opioid crisis. This dashboard provides transparency into expenditures across {count} reporting entities.',

    stateSpendingNote:
      'Actual payments from the Opioid Recovery and Remediation Fund by state agencies (DPH, EPS), separate from municipal self-reported spending.',

    // Chart legend
    legend: {
      expended: 'Expended',
      encumbered: 'Encumbered'
    }
  },

  // ============================================================================
  // PAGE: MUNICIPALITIES (Explorer)
  // ============================================================================

  municipalities: {
    title: 'Entity Explorer',

    // Filter options
    filters: {
      placeholder: 'Filter by name...',
      viewLabel: 'View:',
      entities: 'Entities',
      byCategory: 'By Category',
      entityTypes: {
        all: 'All',
        municipalities: 'Municipalities',
        counties: 'Counties',
        organizations: 'Organizations'
      }
    },

    // Count display: "{count} entities"
    countTemplate: '{count} entities',

    // Table headers
    tableHeaders: {
      name: 'Name',
      fy25Disbursement: 'FY25 Disbursement',
      expended: 'Expended',
      encumbered: 'Encumbered',
      remaining: 'Remaining',
      percentUtilized: '% Utilized',
      mosaicFunding: 'Mosaic Funding'
    },

    // Badges
    badges: {
      county: 'County',
      org: 'Org',
      oac: 'OAC' // Opioid Abatement Collaborative
    },

    // Empty states
    noSpendingInCategory: 'No spending in this category'
  },

  // ============================================================================
  // PAGE: STATE AGENCIES
  // ============================================================================

  stateAgencies: {
    title: 'State Agencies',

    // Stats
    stats: {
      fySpending: 'FY{year} State Spending',
      transactions: 'Transactions',
      uniqueVendors: 'Unique Vendors',
      avgTransaction: 'Avg Transaction'
    },

    // Sections
    sections: {
      aboutData: 'About This Data',
      spendingByDepartment: 'Spending by Department',
      spendingByCategory: 'Spending by Category',
      topVendors: 'Top Vendors (FY{year})'
    },

    // Description
    description:
      "This shows actual payments from the Massachusetts Opioid Recovery and Remediation Fund for Fiscal Year {year} as recorded in CTHRU, the state's transparency portal. These are state agency expenditures (primarily DPH), separate from the municipal spending reported via survey.",

    // Table headers
    tableHeaders: {
      vendor: 'Vendor',
      location: 'Location',
      total: 'Total',
      numPayments: '# Payments'
    },

    // Chart labels (Object Class short names)
    objectClasses: {
      salaries: 'Salaries',
      benefits: 'Benefits',
      contractStaff: 'Contract Staff',
      consultants: 'Consultants',
      programServices: 'Program Services',
      stateAid: 'State Aid',
      it: 'IT'
    }
  },

  // ============================================================================
  // PAGE: DETAIL
  // ============================================================================

  detail: {
    // Navigation
    backToExplorer: '← Back to Explorer',

    // Error states
    errors: {
      noMunicipalitySelected: {
        title: 'No Municipality Selected',
        message: 'Please select a municipality from the {link}.'
      },
      notFound: {
        title: 'Municipality Not Found',
        message: 'Could not find data for record ID: {id}'
      }
    },

    // Labels
    labels: {
      fiscalYear: 'Fiscal Year',
      pointOfContact: 'Point of Contact:'
    },

    // Empty states
    emptyStates: {
      fy2023: {
        title: 'FY2023 Data Summary',
        description:
          'FY2023 was the first year of the opioid settlement fund distribution. Detailed expenditure reporting was not required for most municipalities.'
      },
      noDataForYear: {
        title: 'No Data Available for FY{year}',
        description: 'Data for this fiscal year is not available.'
      },
      noNarrativeData: {
        title: 'No Narrative Data',
        description: 'This entity typically provides data via structured fields.'
      }
    },

    // Warning banner
    warning: {
      incompleteReport: {
        title: 'Report Incomplete',
        message:
          "The data provided by the Massachusetts Department of Public Health indicates that this report is incomplete. We don't know anything more than that, sorry. If you have questions, you should contact the city or the Department of Public Health for more information."
      },
      fy2023Note: 'Note: Detailed survey data was not collected in FY2023'
    },

    // Sections
    sections: {
      projects: 'Projects',
      expenditures: 'Expenditures',
      collaborativeInfo: 'Opioid Abatement Collaborative',
      narratives: 'Narratives & Attachments',
      futurePlans: 'Future Spending Plans',
      progressWithoutExpenditures: 'Progress Without Expenditures'
    },

    // Narratives
    narratives: {
      communityEngagementLevel: 'Community Engagement Level',
      communityEngagementStrategy: 'Community Engagement Strategy',
      highlightsSuccessStories: 'Highlights & Success Stories',
      attachments: 'Attachments'
    },

    // Expenditure table
    expenditureTable: {
      headers: {
        name: 'Name',
        category: 'Category',
        project: 'Project',
        amount: 'Amount',
        status: 'Status',
        description: 'Description / Notes'
      },
      status: {
        expended: 'Expended',
        encumbered: 'Encumbered'
      },
      labels: {
        note: 'Note:',
        offset: 'Offset:'
      }
    },

    // Collaborative
    collaborative: {
      contributed: 'Contributed to collaborative:',
      badges: {
        lead: 'Lead Municipality',
        member: 'Member'
      }
    },

    // Grants
    grants: {
      rize: {
        title: 'RIZE Municipal Matching Grants',
        badges: {
          rize: 'RIZE',
          directGrantee: 'Direct Grantee',
          collaborative: 'Collaborative',
          partner: 'Partner'
        }
      },
      mosaic: {
        regionalTitle: 'MOSAIC Regional Grants',
        servingCounty: 'Serving {county} County',
        statewideTitle: 'MOSAIC Statewide Programs',
        statewideSubtitle: 'Available to all Massachusetts municipalities',
        coreGrants: 'Mosaic CORE Grants',
        familyResilience: 'Family Resilience Grants'
      }
    },

    // Attachments
    attachments: {
      icon: '📄',
      page: 'page',
      pages: 'pages',
      units: {
        bytes: 'B',
        kilobytes: 'KB',
        megabytes: 'MB'
      }
    },

    // Survey labels
    survey: {
      yes: 'Yes',
      no: 'No',
      noData: 'No data available',
      noDataSelected: 'No data selected',
      noneListed: 'None listed',
      progress: 'Progress:',
      jobTitle: 'Job Title:',
      fte: 'FTE:',
      expended: 'Expended:',
      howSpent: 'How Spent:',
      barriers: 'Barriers:'
    },

    // Focus areas (repeated across multiple sections)
    focusAreas: {
      recoverySupports: 'Recovery Supports',
      prevention: 'Prevention',
      harmReduction: 'Harm Reduction',
      connectionsToCare: 'Connections to Care',
      traumaGrievingFamilies: 'Trauma & Grieving Families'
    }
  },

  // ============================================================================
  // PAGE: SEARCH
  // ============================================================================

  search: {
    title: 'Search',

    placeholder: 'Search municipalities, expenditures, projects...',

    helperText: 'Search across municipality names, expenditure names & descriptions, and project details.',

    // Fiscal year options
    fiscalYears: {
      all: 'All Years',
      fy2025: 'FY2025',
      fy2024: 'FY2024',
      fy2023: 'FY2023'
    },

    // Empty states
    emptyStates: {
      exploreTopics: {
        title: 'Explore Topics',
        description: 'Click any word to search'
      },
      noResults: {
        title: 'No results found',
        description: 'Try a different search term.'
      }
    },

    // Results template: "{count} result(s)"
    resultsTemplate: '{count} {count, plural, one {result} other {results}}',

    // Table headers
    tableHeaders: {
      type: 'Type',
      name: 'Name',
      municipality: 'Municipality',
      details: 'Details',
      amount: 'Amount'
    },

    // Errors
    errors: {
      noResultsToExport: 'No results to export',
      noDataAvailable: 'No data available'
    }
  },

  // ============================================================================
  // PAGE: MAP
  // ============================================================================

  map: {
    title: 'Spending by Municipality',

    description:
      'Interactive map showing how each municipality is utilizing their opioid settlement funds. Hover over a town to see details, click to view full profile.',

    loading: 'Loading map data...',

    error: 'Failed to load map data: {error}',

    legend: {
      label: '% Funds Utilized:',
      items: ['0%', '25%', '50%', '75%', '100%']
    },

    tooltip: {
      noData: 'No data available',
      labels: {
        disbursed: 'Disbursed:',
        expended: 'Expended:',
        encumbered: 'Encumbered:',
        utilized: 'utilized'
      }
    }
  },

  // ============================================================================
  // PAGE: COLLABORATIVES
  // ============================================================================

  collaboratives: {
    title: 'Opioid Abatement Collaboratives',

    description:
      'Opioid Abatement Collaboratives (OACs) are regional partnerships where municipalities pool their settlement funds to implement shared strategies. Click on a collaborative to see its member municipalities.',

    // Stats
    stats: {
      activeCollaboratives: 'Active Collaboratives',
      memberMunicipalities: 'Member Municipalities',
      totalPooledFunds: 'Total Pooled Funds'
    },

    // Card labels
    labels: {
      memberCount: '{count} member{count, plural, one {} other {s}}',
      lead: 'Lead:',
      expended: 'Expended:',
      encumbered: 'Encumbered:',
      remaining: 'Remaining:',
      members: 'Members',
      leadBadge: 'Lead',
      pooled: 'Pooled',
      utilized: 'Utilized'
    }
  },

  // ============================================================================
  // PAGE: GRANTS
  // ============================================================================

  grants: {
    title: 'Grants',

    sections: {
      mosaicStatewide: {
        title: 'MOSAIC Statewide Programs',
        subtitle: 'Available to all Massachusetts municipalities'
      },
      mosaicFamilyResilience: {
        title: 'MOSAIC Family Resilience Grants',
        subtitle: 'Regional Grants'
      },
      mosaicCore: {
        title: 'MOSAIC CORE Grants',
        subtitle: 'Community Organization Relief & Engagement'
      }
    },

    emptyState: 'No grants found.',

    labels: {
      visitWebsite: 'Visit Website ↗',
      regionCounty: 'Region/County:',
      types: {
        core: 'CORE',
        familyResilience: 'Family Resilience'
      }
    }
  },

  // ============================================================================
  // PAGE: ABOUT
  // ============================================================================

  about: {
    title: 'About the Data',

    // Terminology definitions
    terminology: {
      encumbered: {
        term: 'Encumbered',
        definition:
          'Money that has been committed/reserved for a specific purpose but not yet spent. For example, a signed contract for a program that will be paid out over time. The funds are "set aside" and can\'t be used for anything else, but the check hasn\'t been written yet.'
      },
      expended: {
        term: 'Expended',
        definition: 'Money that has actually been spent (check written, payment made).'
      },
      utilized: {
        term: 'Utilized',
        definition:
          "Expended + Encumbered as a percentage of total available funds. It represents how much of their allocation they've either spent or committed to spend.",
        example: {
          intro: 'So if a municipality has:',
          available: '$100,000 available',
          expended: '$40,000 expended',
          encumbered: '$20,000 encumbered',
          result: '→ 60% Utilized ($60k committed out of $100k)'
        }
      }
    },

    // Data sources
    dataSources: {
      title: 'Data Sources',
      municipal: {
        title: 'Municipal Spending Data',
        description:
          "Municipal expenditure data is self-reported by municipalities via the ORRF Annual Municipal Expenditure Report survey conducted by the Massachusetts Attorney General's Office."
      },
      state: {
        title: 'State Agency Spending Data',
        description:
          "State-level spending data comes from the Massachusetts Comptroller's CTHRU transparency portal, filtered to the Opioid Recovery and Remediation Fund."
      }
    },

    // Download button
    downloadButton: '📥 Download State Spending JSON (FY2025)'
  },

  // ============================================================================
  // SHELL / CHROME (index.html)
  // ============================================================================

  shell: {
    // Meta
    pageTitle: 'MA Opioid Settlement Fund Dashboard',
    metaDescription:
      'Massachusetts Opioid Settlement Fund Expenditure Dashboard - Transparency in how municipalities spend opioid settlement funds',

    // UI Elements
    logo: 'MA Opioid Settlement Funds',
    skipLink: 'Skip to main content',
    search: {
      title: 'Search (press /)',
      ariaLabel: 'Open search'
    },
    loading: 'Loading dashboard data...',
    footer: "Data source: Massachusetts Attorney General's Office ORRF Municipal Expenditure Reports",
    debugButton: 'Toggle Debug Mode'
  },

  // ============================================================================
  // ERRORS & MESSAGES
  // ============================================================================

  messages: {
    errors: {
      viewError: 'Error Loading View',
      initError: 'Failed to Load Dashboard',
      dbHint: 'Make sure the database file exists at opioid_settlement.db'
    },
    loading: {
      dashboard: 'Loading dashboard data...',
      map: 'Loading map data...',
      report: 'Loading FY2024 Report...'
    }
  },

  // ============================================================================
  // ACCESSIBILITY LABELS (ARIA)
  // ============================================================================

  aria: {
    // Navigation
    mainNavigation: 'Main navigation',
    openSearch: 'Open search',

    // Filters
    filterEntities: 'Filter entities',
    viewMode: 'View mode',
    filterByEntityType: 'Filter by entity type',
    fiscalYear: 'Fiscal Year',

    // Tables
    viewDetails: name => `View ${name} details`,
    viewCategory: category => `View municipalities spending on ${category}`,
    searchFor: word => `Search for ${word}`,

    // Map
    mapUtilization: (name, pct) => `${name} - ${pct}% utilized`
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simple pluralization helper
 * Usage: pluralize(5, 'entity', 'entities') → 'entities'
 */
export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}

/**
 * Template helper for parameterized strings
 * Usage: template(copy.search.resultsTemplate, { count: 5 })
 * Note: This is a simple implementation. For complex pluralization, use IntlMessageFormat
 */
export function template(str, params) {
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

/**
 * Format entity count: "5 entities"
 */
export function entityCount(count) {
  return `${count} ${pluralize(count, 'entity', 'entities')}`;
}

/**
 * Format result count: "5 results"
 */
export function resultCount(count) {
  return `${count} ${pluralize(count, 'result', 'results')}`;
}

/**
 * Get focus area label by key
 */
export function getFocusAreaLabel(key) {
  const labels = {
    'Recovery Supports': copy.detail.focusAreas.recoverySupports,
    Prevention: copy.detail.focusAreas.prevention,
    'Harm Reduction': copy.detail.focusAreas.harmReduction,
    'Connections to Care': copy.detail.focusAreas.connectionsToCare,
    'Trauma & Grieving Families': copy.detail.focusAreas.traumaGrievingFamilies
  };
  return labels[key] || key;
}

// Default export for convenience
export default copy;
