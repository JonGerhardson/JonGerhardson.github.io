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

                <p>This dashboard tracks how Massachusetts municipalities and state agencies are spending funds
                from <a href="https://www.mass.gov/info-details/learn-about-the-ags-statewide-opioid-settlements-with-opioid-industry-defendants" target="_blank" rel="noopener">statewide opioid settlements</a>
                with opioid industry defendants. Settlement funds are deposited into the Opioid Recovery and
                Remediation Fund (ORRF) and distributed to municipalities and state agencies for opioid
                abatement activities.</p>

                <h2 class="mt-xl mb-md">Key Terms</h2>

                <dl style="line-height: 1.6;">
                    <dt><strong>Disbursement</strong></dt>
                    <dd style="margin-bottom: var(--space-md);">The amount of settlement money distributed to a municipality in a given fiscal year by the Attorney General's Office.</dd>

                    <dt><strong>Carryover Funds</strong></dt>
                    <dd style="margin-bottom: var(--space-md);">Unspent funds from prior fiscal years that roll forward into the current year. A municipality's total available funds equals its current-year disbursement plus any carryover.</dd>

                    <dt><strong>Expended</strong></dt>
                    <dd style="margin-bottom: var(--space-md);">Money that has actually been spent (payment made).</dd>

                    <dt><strong>Encumbered</strong></dt>
                    <dd style="margin-bottom: var(--space-md);">Money that has been committed or reserved for a specific purpose but not yet paid out. For example, a signed contract for services that will be billed over time. The funds are set aside and cannot be used for other purposes.</dd>

                    <dt><strong>Utilized</strong></dt>
                    <dd style="margin-bottom: var(--space-md);">Expended + Encumbered as a percentage of total available funds. Represents how much of a municipality's allocation has been spent or committed.
                        <div style="background: var(--color-bg-secondary); padding: var(--space-md); border-radius: var(--border-radius-sm); margin-top: var(--space-sm); font-size: var(--font-size-sm);">
                            Example: $100,000 available, $40,000 expended, $20,000 encumbered &rarr; <strong>60% Utilized</strong>
                        </div>
                    </dd>

                    <dt><strong>OAC (Opioid Abatement Collaborative)</strong></dt>
                    <dd style="margin-bottom: var(--space-md);">A regional partnership where multiple municipalities pool their settlement funds to implement shared strategies. Each collaborative has a lead municipality that administers the pooled funds.</dd>

                    <dt><strong>Pooled Funds</strong></dt>
                    <dd style="margin-bottom: var(--space-md);">Settlement funds that a municipality contributes to its OAC rather than spending independently. Pooled funds are managed by the collaborative's lead municipality.</dd>

                    <dt><strong>RIZE Municipal Matching</strong></dt>
                    <dd style="margin-bottom: var(--space-md);">Grants from the <a href="https://rizema.org" target="_blank" rel="noopener">RIZE Foundation</a> that match municipal opioid settlement spending for eligible programs.</dd>

                    <dt><strong>Mosaic Funding</strong></dt>
                    <dd style="margin-bottom: var(--space-md);">Additional funding provided through the Mosaic program to support municipal opioid abatement efforts.</dd>

                    <dt><strong>PWLLE</strong></dt>
                    <dd style="margin-bottom: var(--space-md);">People With Lived/Living Experience. Refers to individuals who have personal experience with substance use disorder and whose perspectives inform how settlement funds are used.</dd>
                </dl>

                <h2 class="mt-xl mb-md">Data Sources</h2>

                <h3>Municipal Spending Data</h3>
                <p>Municipal expenditure data is collected by the Massachusetts Department of Public Health (DPH)
                via the ORRF Annual Municipal Expenditure Report survey. Municipalities self-report how they have
                spent or committed their settlement funds. The data shown in this dashboard reflects FY2023, FY2024,
                and FY2025 reporting cycles. Data is current to June 2025 and was accessed in January 2026.</p>

                <h3>Data Dictionary</h3>
                <p>The Department of Public Health's detailed code book describing the fields in the FY2025 municipal expenditure dataset
                is available for download.</p>
                <p style="margin-top: var(--space-sm);">
                    <a href="data_dictionary.pdf"
                       target="_blank"
                       rel="noopener"
                       class="btn btn-secondary"
                       style="display: inline-flex; align-items: center; gap: var(--space-sm);">
                        Data Dictionary (FY2025, PDF)
                    </a>
                </p>

                <h3 class="mt-lg">State Agency Spending Data</h3>
                <p>State-level spending data comes from the Massachusetts Comptroller's
                <a href="https://cthruspending.mass.gov" target="_blank" rel="noopener">CTHRU</a>
                transparency portal, filtered to actual payments from the Opioid Recovery and Remediation Fund
                by state agencies (primarily the Department of Public Health and Executive Office of Public Safety).</p>
                <p style="margin-top: var(--space-sm);">
                    <a href="https://cthru.data.socrata.com/resource/pegc-naaa.json?%24where=budget_fiscal_year+%3D+%272025%27+AND+upper%28fund%29+like+upper%28%27%25opioid%25%27%29"
                       target="_blank"
                       rel="noopener"
                       class="btn btn-secondary"
                       style="display: inline-flex; align-items: center; gap: var(--space-sm);">
                        Download State Spending JSON (FY2025)
                    </a>
                </p>

                <h2 class="mt-xl mb-md">ORRF Advisory Council</h2>
                <p>The Opioid Recovery and Remediation Fund Advisory Council advises the Attorney General
                on the distribution and use of opioid settlement funds. The council includes representatives
                from state agencies, municipalities, public health organizations, and individuals with lived
                experience of the opioid crisis. Meeting materials, agendas, and minutes are publicly available.</p>
                <p style="margin-top: var(--space-sm);">
                    <a href="https://www.mass.gov/info-details/opioid-recovery-and-remediation-fund-advisory-council-meeting-materials"
                       target="_blank"
                       rel="noopener"
                       class="btn btn-secondary"
                       style="display: inline-flex; align-items: center; gap: var(--space-sm);">
                        ORRF Advisory Council Meeting Materials
                    </a>
                </p>

                <h2 class="mt-xl mb-md">Settlement Background</h2>
                <p>Massachusetts has secured settlements with multiple opioid industry defendants, including
                manufacturers, distributors, and pharmacies. These settlements are designed to provide funding
                for opioid abatement, treatment, recovery, and prevention efforts across the Commonwealth.</p>
                <p style="margin-top: var(--space-sm);">
                    <a href="https://www.mass.gov/info-details/learn-about-the-ags-statewide-opioid-settlements-with-opioid-industry-defendants"
                       target="_blank"
                       rel="noopener"
                       class="btn btn-secondary"
                       style="display: inline-flex; align-items: center; gap: var(--space-sm);">
                        Learn About the AG's Opioid Settlements
                    </a>
                </p>

                <h2 class="mt-xl mb-md">Citing This Dashboard</h2>
                <p>This compiled dataset is released under a
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">Creative Commons Attribution 4.0 International</a>
                (CC BY 4.0) license with the
                <a href="https://commonsclause.com/" target="_blank" rel="noopener">Common Clause</a>
                restriction. You are free to share, adapt, and build upon this work for non-commercial purposes,
                provided you give appropriate credit. The Common Clause prohibits selling this work or
                a product derived substantially from it.</p>

                <p> Please email jon.gerhardson@proton.me with questions, comments, or issues. </p>



                <hr style="margin: var(--space-xl) 0; border: none; border-top: 1px solid var(--color-border);">
                <p style="color: var(--color-text-muted); font-size: var(--font-size-sm);">
                    Supported by a grant from the
                    <a href="https://datadrivenreporting.medill.northwestern.edu/2025-awardees" target="_blank" rel="noopener">Data-Driven Reporting Project</a>
                    (DDRP) at Northwestern University's Medill School of Journalism.
                </p>
            </div>
        `;
  },

  destroy() {
    // Cleanup if needed
  }
};
