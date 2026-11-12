# Tax Provision

A self-contained **corporate tax provision** workpaper for **Singapore**: it turns accounting profit into a chargeable-income computation, current tax payable, **deferred tax** on temporary differences, an **effective-tax-rate reconciliation**, a **provision movement** roll-forward and draft **disclosure notes**.

It is a companion to the [Fixed Asset Register (FAR)](../FAR/) — import a FAR JSON backup and its accounting depreciation, capital allowances and the accelerated-allowance temporary difference flow straight into the provision.

Like FAR, it is a single static web app — no server, no build step, no dependencies. All data is stored in your browser's `localStorage`, and it deploys to GitHub Pages automatically.

---

## What it does

| Tab | Details |
|-----|---------|
| **Dashboard** | KPIs — profit before tax, chargeable income, current tax, deferred tax charge/credit, total tax expense and effective tax rate — plus the tax charge to P&L and the FAR link status |
| **Trial Balance** | Full GL sorted by account number (opening · debit · credit · closing), with an **audit-adjustment column** and adjusted closing. Add/import CSV/export, filter. Add-backs and deductions **link to a TB account** and pull its adjusted closing balance |
| **Audit Adjustments** | Post debit/credit adjustments against TB accounts; the net per account shows on the Trial Balance and flows into any linked computation line. **Import Stat Adjustment CSV** loads a multi-entity transfer-pricing / statutory-adjustment file, filtered to the entity code, as balanced audit adjustments. Dr = Cr check |
| **Medical** | Insurance premium breakdown (attach CSV; attach invoice PDF as source), split **Life** (non-deductible) vs **Medical**. Medical-expense capping: deductible medical limited to a % (1%, or 2% portable) of employee remuneration; the excess and life premiums feed Current Tax as computed permanent add-backs |
| **Leases** | IFRS 16 / FRS 116 adjustment, fully derived from the lease GL accounts: reverse ROU depreciation (670150) + lease interest (680120), deduct rent; the net feeds Current Tax and the ROU-vs-lease-liability temporary difference feeds Deferred Tax |
| **Current Tax** | Computation: net profit before tax → add-backs → deductions & capital allowances → adjusted profit → losses & exemption → chargeable income → tax → **current tax payable**. Lines are **non-editable and linked** to the trial balance (adjusted closing / opening / debit columns) or computed sources (Medical); manually-added lines stay editable. Each is tagged **permanent** or **temporary** |
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

## AUS135 — AXI Services (Cyprus) Limited

Select **AUS135** in the header entity switcher. It loads two years, and **Data & Settings → Load AUS135** reloads them.

**FY25 (3 Jun 2024 – 30 Jun 2025) is as filed and locked.** It reproduces BDO's corporation tax computation in the signed FS:

| | US$ |
|---|---|
| Profit before tax | 233,711 |
| Add-backs | 393,554 |
| Deductions | (73,431) |
| Chargeable income | 553,834 |
| Tax at 12.5% | 69,229.25 |
| 10% additional charge | 6,922.93 |
| **Tax payable** | **76,152.18** |

The tax payable ties to AJE 5. The TB is the Sage FY25 TB plus BDO's 12 adjusting entries, mapped to Sage accounts (NEW15→660120, NEW16→300100, BDO2→700100, BDO3→260100). No deferred tax was recognised, so none is recognised here.

**FY26 (1 Jul 2025 – 30 Jun 2026) is the current year, with the true-ups.**
- **TB:** the FY26 audit TB, with opening balances agreed to the FY25 signed accounts. Its 7 post-TB journals are audit adjustments, and PBT (385,873) links to the TB.
- **Rate:** Cyprus taxes calendar years and the corporate rate rose to 15% from tax year 2026. FY26 is apportioned 50/50 (BDO's FY25 method), giving 13.75%.
- **Deferred tax rate:** 15%, the rate enacted for reversal.
- **Additional charge:** the 10% charge is kept.
- **Wear and tear:** comes from the FAR at statutory rates, applied from FY25.
- **Entertainment:** only the excess over the statutory cap is added back (9,120.36).
- **FY25 recomputed (`aus135FY25Recompute`):** BDO's computation is corrected and the difference is trued up in FY26 through the CT-FY25 journal. Two corrections:
  - entertainment of 12,106 is deductible because it is within the cap;
  - wear and tear is 4,230.40 at statutory rates, not book depreciation of 1,148.
  The corrected tax is 74,063.77 against 76,152.18 booked, a 2,088.41 over-provision. The Tax note shows the reconciliation.
- **Reseeding:** bump `AUS135_BUNDLE_VERSION` when the bundled data changes. Stored copies are then reseeded once.
- **FX:** exempt both ways.
- **Leases:** ROU depreciation is added back and lease principal deducted.
- **Prior-year true-up:** the deferred tax BDO did not book at 30 Jun 2025 (IFRS 16 lease, net of the exempt FX on the lease liability) comes in as a **prior-year deferred movement**. FY25 itself is unchanged.

New settings, all neutral by default so the other entities are unchanged:
- **2nd tax-year rate** and **% of income in 2nd tax year**, for a financial year that straddles a rate change;
- **Deferred tax rate**, the enacted rate if it differs from the current-tax rate;
- **Additional charge %** on tax payable.

## FAR link

Two ways to pull the register in, both under **Data & Settings → FAR link**:

- **Pull from FAR (this browser)** — on the deployed site the FAR app (`/FAR/`) and this app (`/TaxProvision/`) share the same `github.io` origin, so they share `localStorage`. This button reads FAR's saved register directly — no file needed.
- **Import FAR backup (JSON)** — load a FAR JSON export (works locally too, where the two apps don't share storage).

Either way, using a faithful port of FAR's depreciation/capital-allowance engine (`far-import.js`), it re-derives as at the register's reporting date:

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
