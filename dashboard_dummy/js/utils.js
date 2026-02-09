/**
 * ORRF Dashboard - Utility Functions
 * Shared helpers for escaping, formatting, and exporting
 */

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Raw text
 * @returns {string} HTML-safe text
 */
export function escapeHtml(text) {
  if (!text) {return '';}
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Normalize municipality name for matching
 * Handles common variations between data sources
 * @param {string} name - Municipality name
 * @returns {string} Normalized name for matching
 */
export function normalizeMuniName(name) {
  if (!name) {return '';}
  return name
    .toLowerCase()
    .replace(/-/g, ' ') // "manchester-by-the-sea" → "manchester by the sea"
    .replace(/['']/g, '') // "martha's vineyard" → "marthas vineyard"
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim();
}

/**
 * Export data to CSV and trigger download
 * @param {Array<string>} headers - Column headers
 * @param {Array<Array>} rows - Array of row arrays
 * @param {string} filename - Output filename
 */
export function exportToCsv(headers, rows, filename) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row
        .map(cell => {
          const escaped = String(cell ?? '').replace(/"/g, '""');
          return /[,"\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
        })
        .join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
