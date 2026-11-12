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
     * Wear and tear at Cyprus statutory rates from the FAR (FY25 as filed).
     * Prior-year true-up: the deferred tax BDO did not recognise at
       30 Jun 2025 is brought in as a prior-year deferred movement (opening
       booked = nil; priorMovement = the 30 Jun 2025 temporary difference).
   ============================================================= */
'use strict';

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
    priorTaxByAccount: {},
    locked: true,
  });
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
      L('Staff entertainment — disallowed (BDO FY25 treatment)', 'permanent', '600570'),
      L('Client entertainment — disallowed (BDO FY25 treatment)', 'permanent', '610180'),
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
      // Book NBV vs tax WDV — nil at 30 Jun 2025 (FY25 claimed book depreciation, as
      // filed); statutory W&T from FY26 (FAR: NBV 128,660.91 − TWDV 135,717.19).
      { id: uid(), label: 'Computer equipment — NBV vs tax WDV (per FAR)', openingTD: 0, closingTD: -7056.28, source: 'far' },
    ],
    // FY25 tax (76,152.18) is still unpaid on 260100 at 30 Jun 2026.
    priorTaxByAccount: { '260100': -76152.18 },
    priorYearProvisionCarried: 76152.18,
    priorYearAdjustment: 0,
    locked: false,
  });
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
