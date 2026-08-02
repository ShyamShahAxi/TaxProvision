# Tax Provision

A self-contained **corporate tax provision** workpaper for **Singapore**: it turns accounting profit into a chargeable-income computation, current tax payable, **deferred tax** on temporary differences, an **effective-tax-rate reconciliation**, a **provision movement** roll-forward and draft **disclosure notes**.

It is a companion to the [Fixed Asset Register (FAR)](../FAR/) — import a FAR JSON backup and its accounting depreciation, capital allowances and the accelerated-allowance temporary difference flow straight into the provision.

Like FAR, it is a single static web app — no server, no build step, no dependencies. All data is stored in your browser's `localStorage`, and it deploys to GitHub Pages automatically.

---

## What it does

| Tab | Details |
|-----|---------|
| **Dashboard** | KPIs — profit before tax, chargeable income, current tax, deferred tax charge/credit, total tax expense and effective tax rate — plus the tax charge to P&L and the FAR link status |
| **Current Tax** | Editable computation: net profit before tax → add-backs → deductions & capital allowances → adjusted profit → losses & exemption → chargeable income → tax → **current tax payable**. Every add-back/deduction is tagged **permanent** or **temporary** |
| **Deferred Tax** | Temporary differences (carrying amount − tax base) × rate. Positive difference = liability, negative = asset. Opening and closing balances give the movement charged/credited to P&L |
| **Tax Reconciliation** | Reconciles tax at the statutory rate to total income-tax expense; temporary differences net to nil and drop out, permanent items, exemption, rebate, FTC and prior-year adjustments remain |
| **Provision Movement** | Roll-forward of current tax payable (opening → charge → prior-year adjustment → payments → closing) and of the deferred tax balance |
| **Journals** | Double-entry posting journals — current tax, prior-year (over)/under provision, deferred tax movement and tax paid — with **editable GL account codes**, so accounting journals can be booked straight from the provision |
| **Notes** | Draft financial-statement notes: income tax expense, ETR reconciliation, and deferred tax movement by component |
| **Data & Settings** | Company, YA, rate, exemption scheme and CIT rebate; **import FAR backup**; JSON backup/restore; sample data; clear |

## How the computation works

- **Chargeable income** = profit before tax **+** non-deductible / book add-backs **−** deductions and capital allowances **−** utilised losses brought forward.
- **Permanent vs temporary.** Each adjustment is classified. **Temporary** differences (depreciation vs capital allowances, provisions, IFRS 16 lease adjustments) reverse over time and drive **deferred tax**; **permanent** differences (fines, private expenses, exempt income) never reverse and are the items that move the **effective tax rate** away from the statutory rate.
- **Tax exemption.** Singapore's **partial tax exemption** (75% of the first $10,000 of chargeable income + 50% of the next $190,000) or the **start-up tax exemption** (75% of the first $100,000 + 50% of the next $100,000, first three YAs) is applied automatically. Choose the scheme in Data & Settings.
- **Tax** = chargeable income × **17%**, less the **corporate income tax rebate** (set the rate and cap for the YA — it is a Budget measure that changes each year) and any **foreign tax credits**.
- **Deferred tax** = closing temporary difference × rate, with the movement from opening to closing charged/credited to profit or loss. Deductible differences (provisions) are deferred tax **assets**; accelerated capital allowances are **liabilities**.
- **Effective tax rate reconciliation** ties tax-at-17% to the income-tax expense. Because temporary differences produce equal and opposite current-tax and deferred-tax effects, they cancel and only permanent items, the exemption, rebate, FTC and prior-year true-ups appear; a residual line absorbs deferred tax not recognised (e.g. on losses) and rounding.

> The bundled sample is the real **AxiCorp Pte Ltd (Singapore), AUS155, YA 2026** computation transcribed from the FY26 workpaper: profit before tax **317,389**, permanent differences **93,206**, net temporary differences **396,733**, tying to chargeable income before exemption of **807,328**. Confirm every treatment against current Singapore tax legislation before relying on the figures.

## FAR link

**Data & Settings → FAR link → Import FAR backup (JSON)** reads a Fixed Asset Register export and, using a faithful port of FAR's depreciation/capital-allowance engine (`far-import.js`), re-derives as at the register's reporting date:

- **accounting depreciation** for the year → a temporary **add-back**;
- **capital allowances** for the year → a temporary **deduction**;
- the **accelerated capital allowances** temporary difference (accounting NBV − tax WDV), opening and closing → a **deferred tax** component.

Re-importing refreshes these FAR-sourced lines (tagged **FAR**) without touching lines you entered manually.

## Usage

1. Open the site (or `index.html` locally in a browser).
2. **Data & Settings** → set company, YA, rate, exemption scheme and CIT rebate.
3. Click **Load sample provision** to explore the AUS155 figures, and/or **Import FAR backup** to pull in capital allowances.
4. Edit the **Current Tax** computation — type into any amount; totals recompute live.
5. Review **Deferred Tax**, **Tax Reconciliation**, **Provision Movement** and **Notes**; export CSV / copy notes for your workpapers.
6. Use **Backup (JSON)** regularly — data lives only in this browser.

## Project structure

```
index.html       App shell, tabs and layout
styles.css       Styling
app.js           Data model, provision engine, rendering, import/export
far-import.js    Ported FAR depreciation/capital-allowance engine for the FAR JSON import
sample-data.js   Bundled AUS155 (Singapore) YA 2026 sample provision
.github/workflows/deploy-pages.yml   Publishes the repo root to the gh-pages branch
```

## Development

No tooling required — edit the files and open `index.html`. The engine functions (`recompute`, `exemptionAmount` in `app.js`; `summarizeFarBackup` in `far-import.js`) are plain functions and can be unit-tested with any JavaScript runtime by stubbing `localStorage`/`document`.

> **Note:** the rules modelled here are Singapore-specific and general-purpose. Confirm rates, exemptions, the current-year CIT rebate and each adjustment's treatment against the tax legislation applicable before relying on the figures.
