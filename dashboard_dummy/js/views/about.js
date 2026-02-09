/**
 * About the Data View
 * Static information page explaining data terminology
 */

export default {
  name: 'about',
  title: 'About the Data',

  async render(container, db) {
    container.innerHTML = `
            <div class="card" style="max-width: 800px;">
                <h1 class="mb-lg">About the Data</h1>
                
                <p>TKTKTKTKTKTKTKTKT TKTKTKTKTKTKTKT</p>
                
                <p><strong>Encumbered</strong> = Money that has been committed/reserved for a specific purpose but not yet spent. For example, a signed contract for a program that will be paid out over time. The funds are "set aside" and can't be used for anything else, but the check hasn't been written yet.</p>
                
                <p><strong>Expended</strong> = Money that has actually been spent (check written, payment made).</p>
                
                <p><strong>Utilized</strong> (as shown in the dashboard) = Expended + Encumbered as a percentage of total available funds. It represents how much of their allocation they've either spent or committed to spend.</p>
                
                <p>So if a municipality has:</p>
                <ul>
                    <li>$100,000 available</li>
                    <li>$40,000 expended</li>
                    <li>$20,000 encumbered</li>
                    <li>→ <strong>60% Utilized</strong> ($60k committed out of $100k)</li>
                </ul>

                <h2 class="mt-xl mb-md">Data Sources</h2>
                
                <h3>Municipal Spending Data</h3>
                <p>Municipal expenditure data is self-reported by municipalities via the ORRF Annual Municipal Expenditure Report survey conducted by the Massachusetts Attorney General's Office.</p>
                
                <h3>State Agency Spending Data</h3>
                <p>State-level spending data comes from the Massachusetts Comptroller's <a href="https://cthruspending.mass.gov" target="_blank" rel="noopener">CTHRU transparency portal</a>, filtered to the Opioid Recovery and Remediation Fund.</p>
                <p style="margin-top: 0.5rem;">
                    <a href="https://cthru.data.socrata.com/resource/pegc-naaa.json?%24where=budget_fiscal_year+%3D+%272025%27+AND+upper%28fund%29+like+upper%28%27%25opioid%25%27%29" 
                       target="_blank" 
                       rel="noopener"
                       class="btn btn-secondary" 
                       style="display: inline-flex; align-items: center; gap: 0.5rem;">
                        📥 Download State Spending JSON (FY2025)
                    </a>
                </p>
            </div>
        `;
  },

  destroy() {
    // Cleanup if needed
  }
};
