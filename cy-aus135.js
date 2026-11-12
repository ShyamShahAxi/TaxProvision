/* =============================================================
   AUS135 — AXI Services (Cyprus) Limited — tax provision profile
   -----------------------------------------------------------------
   Two years, seeded the first time AUS135 is selected in the header
   entity switcher (or via Data & Settings → Load AUS135):

   FY25 (3 Jun 2024 – 30 Jun 2025) — AS FILED, LOCKED.
     Reproduces BDO's "Computation of corporation tax" in the signed FS
     (p.26) exactly: profit before tax 233,711 → chargeable income 553,834
     → 12.5% = 69,229.25 + 10% additional charge 6,922.93 = 76,152.18,
     booked by AJE 5. No deferred tax was recognised in the signed accounts,
     so none is recognised here — FY25 is not changed.

   FY26 (1 Jul 2025 – 30 Jun 2026) — CURRENT YEAR, with the true-ups.
     * TB = the FY26 audit TB (opening agreed to the FY25 signed accounts)
       plus its 7 post-TB journals as audit adjustments; PBT links to it.
     * Tax years: Cyprus taxes calendar years and the corporate rate rose
       from 12.5% to 15% from tax year 2026. FY26 is apportioned 50/50 (BDO's
       FY25 method): Jul–Dec 2025 at 12.5%, Jan–Jun 2026 at 15% → 13.75%.
     * Deferred tax at 15%, the rate enacted for reversal.
     * 10% additional charge kept as in FY25 (no provisional tax paid).
     * Wear and tear at Cyprus statutory rates from the FAR (from FY25).
     * Entertainment deductible up to the statutory cap; only the excess
       is added back.
     * Prior-year true-ups (FY25 stays as signed; corrections go through FY26):
       - current tax: BDO's computation recomputed (aus135FY25Recompute) and
         the difference to the 76,152.18 booked posted as a prior-year
         (over)/under provision (CT-FY25 journal);
       - deferred tax BDO did not recognise at 30 Jun 2025, brought in as a
         prior-year deferred movement (opening booked = nil; priorMovement =
         the 30 Jun 2025 temporary difference).
   ============================================================= */
'use strict';

/* Bump when the bundled data changes: viewers' stored AUS135 is reseeded once. */
const AUS135_BUNDLE_VERSION = '2026-11-12.4';

function aus135Settings(fy) {
  const base = Object.assign({}, defaultSettings, {
    companyName: 'AXI Services (Cyprus) Limited — AUS135',
    currency: '$', entity: 'AUS135', jurisdiction: 'cy',
    taxRate: 12.5, exemption: 'none', rebatePct: 0, rebateCap: 0,
    capRate: 0, medicalCode: '', remunCodes: '', sgdRate: 1,
    currentTaxCodes: '260100',
    glTaxExpense: '700100', glDeferredExpense: '700200', glTaxPayable: '260100',
    glDeferredBalance: '260400', glReval: '400300', glBank: '100560-EU2',
    addlChargePct: 10,
  });
  return fy === 'FY25'
    ? Object.assign(base, { ya: '2026', periodEnd: '2025-06-30', taxRate2: 0, rate2Share: 0, dtRate: 12.5 })
    : Object.assign(base, { ya: '2027', periodEnd: '2026-06-30', taxRate2: 15, rate2Share: 50, dtRate: 15 });
}

/* FY25 — BDO computation as filed. Amounts are BDO's (whole dollars) so the
   charge ties to the 76,152.18 booked; labels cite the TB accounts. */
function aus135FY25() {
  const L = (label, amount, type) => ({ id: uid(), label, amount, type, source: 'manual', account: '' });
  return Object.assign(emptyProvision(), {
    pbtLinked: false,
    profitBeforeTax: 233711,   // signed FS; the TB after AJEs gives 233,714.11 (2.93 FS rounding + AJE 5 cents)
    tb: AUS135_FY25_TB.map(a => Object.assign({ id: uid() }, a)),
    auditAdjustments: AUS135_FY25_AJE.map(e => ({ id: uid(), account: e.account, description: e.description, debit: e.debit, credit: e.credit, source: 'audit' })),
    addBacks: [
      L('Depreciation — ROU asset (670150) — per BDO', 59932, 'temporary'),
      L('Depreciation — computer equipment (670120, AJE 9) — per BDO', 1149, 'temporary'),
      L('Unrealised foreign exchange loss (400300 incl. AJE 12) — exempt', 320297, 'permanent'),
      L('Non-charitable donations (620520)', 70, 'permanent'),
      L('Other non-allowable expenses — per BDO', 12106, 'permanent'),
    ],
    deductions: [
      L('Annual wear and tear allowances — per BDO Tax FAR (book depreciation)', 1148, 'temporary'),
      L('Realised foreign exchange profit (410300) — exempt', 17488, 'permanent'),
      L('Rent payments (IFRS 16 lease) — per BDO', 54795, 'temporary'),
    ],
    deferredItems: [],         // none recognised in the signed FY25 accounts
    bdoReview: aus135FY25Recompute(),
    leaseRecon: aus135LeaseRecon(),
    priorTaxByAccount: {},
    locked: true,
  });
}

/* Entertainment cap (ITL): lower of 1% of gross income or the € limit
   (€17,086 for tax year 2025; €30,000 from tax year 2026 under the reform).
   FY26 is apportioned 50/50 → 23,543. Applied as $ (€ limit taken at par,
   conservative while the €/US$ basis is open). */
const AUS135_ENT_EXCESS = Math.round((29616.26 + 3047.10 - (17086 + 30000) / 2) * 100) / 100;

/* FY25 — BDO's computation corrected. FY25 stays as signed; the difference
   to the 76,152.18 booked is the FY26 prior-year (over)/under provision. */
function aus135FY25Recompute() {
  const r2 = v => Math.round(v * 100) / 100;
  const filed = 76152.18;
  // Line by line: BDO's figure (FS p.26), the corrected figure, status
  // (ok / fix / check) and the evidence from the audited TB.
  const lines = [
    { sec: 'Net profit per income statement' },
    { label: 'Profit before tax', bdo: 233711, cor: 233711, st: 'ok', note: 'Signed FS p.4.' },
    { sec: 'Add' },
    { label: 'Depreciation', bdo: 61081, cor: 61081, st: 'ok', note: 'ROU asset 59,932 (670150) + computer equipment 1,149 (670120, AJE 9). Book depreciation is never deductible; wear and tear replaces it.' },
    { label: 'Unrealised foreign exchange loss', bdo: 320297, cor: 320297, st: 'ok', note: 'Revaluation 400300 (incl. AJE 12, 65,489 on the EUR lease liability). FX differences are outside Cyprus tax (exempt / not deductible), so the loss in PBT is added back.' },
    { label: 'Non-charitable donations', bdo: 70, cor: 70, st: 'ok', note: '620520 — not wholly and exclusively for the business.' },
    { label: 'Other non-allowable expenses', bdo: 12106, cor: 0, st: 'fix', note: 'Not itemised by BDO. It matches lease interest 11,310.19 (680100) + irrecoverable VAT 796.00 (660120) = 12,106.19 to the dollar; entertainment (12,421.59) does not match. Lease interest is a cost of the office lease and is deductible — BDO\'s "rent payments" below is only the principal, so without it the lease is relieved on 54,795 of the 66,105 paid. Irrecoverable VAT follows the deductible expense it sits on. Confirm the breakdown with BDO.' },
    { sec: 'Less' },
    { label: 'Annual wear and tear allowances', bdo: 1148, cor: 4230.40, st: 'fix', note: 'BDO claimed the book depreciation (no % on its schedule). Statutory: computer hardware 20% × 18,173 = 3,634.60; CCTV and TV 10% × 5,958 = 595.80; full annual allowance. The Lenovo Thinkpad 59,649 (bought 30 Jun 2025, in use from 1 Jul 2025) starts in FY26. Per FAR.' },
    { label: 'Realised foreign exchange profit', bdo: 17488, cor: 17488, st: 'ok', note: 'Currency conversion 410300 — a gain of 17,487.50 that is inside PBT. FX is exempt, so the gain is taken out (deducted) just as the loss is added back; it is a removal of exempt income, not a second deduction.' },
    { label: 'Rent payments (IFRS 16 lease)', bdo: 54795, cor: 54795, st: 'ok', note: 'ROU cost 450,832.93 − liability before FX 396,038.13 = 54,794.80: paid at commencement 8,497 + principal repaid Feb – Jun 46,298 (lease schedule). With the interest now allowed, total relief = 66,104.99 = the rent actually paid. See the lease reconciliation below.' },
  ];
  const sum = k => lines.filter(l => !l.sec).reduce((s, l) => s + (/^(Annual|Realised|Rent)/.test(l.label) ? -l[k] : l[k]), 0);
  const bdoCI = r2(sum('bdo')), ci = r2(sum('cor'));
  const tax = r2(ci * 0.125), addl = r2(tax * 0.10), recomputed = r2(tax + addl);
  const bdoTax = 69229.25, bdoAddl = 6922.93;
  return { trueUpIn: 'FY26', lines, bdoCI, ci, rate: 12.5, bdoTax, tax, addlPct: 10, bdoAddl, addl, recomputed, filed, diff: r2(recomputed - filed),
    addlNote: 'Kept at 10% of the tax, as BDO. Most sources read the charge as 10% of (75% of the final tax − provisional tax paid), i.e. 7.5% of the tax when nothing was paid — to confirm.' };
}

/* FY25 IFRS 16 lease — per the lease schedule (monthly Sage postings) and the
   audited TB. Principal Feb–Jun 8,545 + 8,956 + 9,453 + 9,476 + 9,868. */
function aus135LeaseRecon() {
  const principal = 46298, closing = 396038.13, rou = 390900.56, bdoRent = 450832.93 - closing;
  return { source: 'Per the IFRS 16 lease schedule (Sage postings Jan – Jun 2025) and the audited TB. Lease from 1 Jan 2025, 48 months, 5%, payments in EUR.',
    initial: closing + principal, principal, prepaid: Math.round((bdoRent - principal) * 100) / 100, bdoRent,
    fx: 65489, dep: 59932.38, interest: 11310.19, paid: Math.round((bdoRent + 11310.19) * 100) / 100, rou,
    rateThen: 12.5, rateNow: 15, trueUpIn: 'FY26' };
}

/* FY26 — TB-linked computation with the true-ups. */
function aus135FY26() {
  const L = (label, type, account) => ({ id: uid(), label, amount: 0, type, source: 'manual', account });
  const F = (label, amount) => ({ id: uid(), label, amount, type: 'temporary', source: 'far' });
  return Object.assign(emptyProvision(), {
    tb: AUS135_FY26_TB.map(a => Object.assign({ id: uid() }, a)),
    auditAdjustments: AUS135_FY26_JNL.map(e => ({ id: uid(), account: e.account, description: e.description, debit: e.debit, credit: e.credit, source: 'audit' })),
    addBacks: [
      F('Depreciation — computer equipment (per FAR; GL 670120 after journal 1)', 40528.10),
      L('Depreciation — ROU asset (IFRS 16)', 'temporary', '670150'),
      L('Foreign exchange — currency conversion loss (exempt)', 'permanent', '410300'),
      L('Non-charitable gifts & donations', 'permanent', '620520'),
      { id: uid(), label: 'Entertainment above the statutory cap (600570 + 610180 = 32,663.36 less cap 23,543)', amount: AUS135_ENT_EXCESS, type: 'permanent', source: 'manual', account: '' },
    ],
    deductions: [
      F('Wear and tear allowances — Cyprus statutory rates (per FAR)', 33471.82),
      L('Foreign exchange — revaluation gain (exempt)', 'permanent', '400300'),
      L('Lease payments — principal repaid on the IFRS 16 liability (interest stays deducted)', 'temporary', '140340#debit'),
    ],
    deferredItems: [
      // ROU asset vs lease liability. Nothing booked at 30 Jun 2025, so the
      // opening is nil and the 30 Jun 2025 difference comes in as prior year.
      { id: uid(), label: 'IFRS 16 lease — ROU asset vs lease liability', tdAccounts: ['140300', '140310', '140340'], source: 'tb',
        openingTD: 0, priorMovement: -70626.57,
        openingNote: 'No deferred tax was booked at 30 Jun 2025 (FS). The 30 Jun 2025 difference (ROU 390,900.56 − liability 461,527.13 = −70,626.57) is recognised as a prior-year movement.' },
      // The liability carries BDO's 65,489 unrealised FX loss (AJE 12). FX is
      // exempt (permanent), so it is taken out of the lease difference.
      { id: uid(), label: 'FX on the EUR lease liability — exempt, excluded from the lease difference', openingTD: 0, closingTD: 65489, priorMovement: 65489, source: 'manual' },
      // Book NBV vs tax WDV at statutory W&T from FY25 (FAR). 30 Jun 2025:
      // NBV 82,630.99 − TWDV 79,549.67 = 3,081.32, not booked → prior year.
      // 30 Jun 2026: NBV 128,660.91 − TWDV 132,635.87 = −3,974.97.
      { id: uid(), label: 'Computer equipment — NBV vs tax WDV (per FAR)', openingTD: 0, closingTD: -3974.97, priorMovement: 3081.32, source: 'far',
        openingNote: 'No deferred tax was booked at 30 Jun 2025. At statutory wear and tear the 30 Jun 2025 difference is NBV 82,630.99 − TWDV 79,549.67 = 3,081.32, recognised as a prior-year movement.' },
    ],
    // FY25 tax booked 76,152.18 is still unpaid on 260100 at 30 Jun 2026. The
    // expected FY25 balance is the recomputed tax, so the CT-FY25 journal
    // releases the over-provision to income tax expense.
    priorTaxByAccount: { '260100': -aus135FY25Recompute().recomputed },
    priorYearTrueUp: (({ recomputed, filed, diff }) => ({ recomputed, filed, diff }))(aus135FY25Recompute()),
    priorYearProvisionCarried: 76152.18,
    priorYearAdjustment: 0,
    // Sage posting pack. Sage FY25 is locked and its 1 Jul 2025 opening is
    // pre-audit, so BDO's FY25 adjustments (incl. the FY25 tax) are posted in
    // FY26 against retained earnings, then the 7 post-TB journals; the tax
    // provision journals follow automatically on the Journals tab.
    postingJournals: aus135PostingJournals(),
    locked: false,
  });
}

function aus135PostingJournals() {
  const line = (account, name, amt) => ({ account, name, dr: amt > 0 ? amt : 0, cr: amt < 0 ? -amt : 0 });
  const js = [{
    ref: 'OB-FY25',
    narrative: 'Opening balances 1 Jul 2025 — BDO FY25 audit adjustments (AJE 1–12, incl. FY25 corporation tax 76,152.18) posted in FY26; P&L effect to retained earnings (Sage FY25 locked)',
    lines: AUS135_FY26_OB.map(o => line(o.account, o.name, o.adj)),
  }];
  const names = {}; AUS135_FY26_TB.forEach(a => { names[a.code] = a.name; });
  const by = {};
  AUS135_FY26_JNL.forEach(e => { (by[e.jnl] = by[e.jnl] || { desc: e.description.replace(/^FY26 post-TB journal \d+ — /, ''), lines: [] }).lines.push(line(e.account, names[e.account] || '', e.debit - e.credit)); });
  Object.keys(by).sort((a, b) => a - b).forEach(n => js.push({ ref: 'ADJ-' + n, narrative: 'FY26 post-TB journal ' + n + ' — ' + by[n].desc, lines: by[n].lines }));
  return js;
}

/* Entity bundle for the header switcher: FY26 active, FY25 archived. */
function aus135Bundle() {
  const s25 = aus135Settings('FY25'), s26 = aus135Settings('FY26');
  const p25 = aus135FY25(), p26 = aus135FY26();
  return {
    settings: s26, provision: p26,
    years: {
      '2026': { settings: s25, provision: p25 },
      '2027': { settings: JSON.parse(JSON.stringify(s26)), provision: JSON.parse(JSON.stringify(p26)) },
    },
  };
}
