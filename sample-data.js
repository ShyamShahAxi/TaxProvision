/* =============================================================
   Sample provision — AxiCorp Pte Ltd (Singapore), AUS155, YA 2026
   -----------------------------------------------------------------
   Real figures transcribed from the FY26 tax computation workpaper.
   Ties to the workpaper's chargeable-income-before-exemption subtotal
   of 807,328:
       Profit before tax            317,389
       + Permanent differences       93,206
       + Temporary differences (net) 396,733
       = Chargeable income b/exempt  807,328

   Currency is USD (AxiCorp SG functional currency), shown with the "$"
   symbol to match the register.
   ============================================================= */

'use strict';

function loadSample() {
  settings = Object.assign({}, defaultSettings, {
    companyName: 'AxiCorp Pte Ltd',
    currency: '$',
    ya: '2026',
    periodEnd: '2026-06-30',
    taxRate: 17,
    exemption: 'partial',
    rebatePct: 0,
    rebateCap: 0,
  });

  // account = GL code linked to the trial balance; when set, the amount pulls
  // from the TB automatically (the manual amount is kept only as a fallback).
  const L = (label, amount, type, source, account) => ({ id: uid(), label, amount, type: type || 'permanent', source: source || 'manual', account: account || '' });
  const D = (label, openingTD, closingTD, source) => ({ id: uid(), label, openingTD, closingTD, source: source || 'manual' });
  const T = (code, name, debit, credit) => ({ id: uid(), code, name, debit: debit || 0, credit: credit || 0 });

  provision = Object.assign(emptyProvision(), {
    profitBeforeTax: 317389,

    // Trial balance — tax-relevant AUS155 FY26 GL accounts (a subset of the full TB).
    tb: [
      T('700100', 'Income Tax Expense', 45453, 0),
      T('680200', 'Insurance', 25919, 0),
      T('600550', 'Staff Medical', 67287, 0),
      T('670120', 'Depreciation — Computer Equipment', 78039, 0),
      T('670110', 'Amortisation — Development costs', 459311, 0),
      T('670130', 'Depreciation — Furniture', 0, 0),
      T('670140', 'Depreciation — Fixtures & Fittings', 0, 0),
      T('270300', 'Provision for Leave', 0, 135008),
      T('250200', 'Accrued Commissions', 0, 76832),
      T('250600', 'Superannuation Control', 0, 0),
      T('440100', 'Government grant income', 0, 0),
    ],

    addBacks: [
      // Permanent differences (Section B) — linked to the trial balance
      L('Keyman / group insurance premiums (non-deductible)', 25919, 'permanent', 'manual', '680200'),
      L('Staff medical expenses over 1% cap', 67287, 'permanent', 'manual', '600550'),
      // Temporary differences — book charges added back (Section C), linked to the TB
      L('Depreciation — Computer Equipment', 78039, 'temporary', 'manual', '670120'),
      L('Amortisation — Development costs', 459311, 'temporary', 'manual', '670110'),
      L('Leave provision — closing balance', 135008, 'temporary', 'manual', '270300'),
      L('Accrued commissions — closing balance', 76832, 'temporary', 'manual', '250200'),
    ],

    deductions: [
      // Temporary differences — tax deductions / reversals of opening provisions
      L('Capital allowances — Computer Equipment', 177802, 'temporary'),
      L('Leave provision — opening balance reversed', 147087, 'temporary'),
      L('Accrued commissions — opening balance reversed', 13134, 'temporary'),
      L('IFRS 16 lease adjustment (ROU depreciation + interest, net of payments)', 14434, 'temporary'),
    ],

    lossesBroughtForward: 0,
    foreignTaxCredits: 0,

    // Deferred tax on the temporary differences whose balances are known.
    // Convention: temporary difference = carrying amount − tax base.
    //   Positive = taxable difference (deferred tax liability);
    //   Negative = deductible difference (deferred tax asset).
    // Provisions are deductible when paid, so their balances are DTAs (negative).
    // Accelerated capital allowances / intangibles are DTLs — import the
    // matching FAR backup (Data & Settings → FAR link) to bring those in.
    deferredItems: [
      D('Leave provision', -147087, -135008),
      D('Accrued commissions', -13134, -76832),
    ],

    openingCurrentTaxPayable: 0,
    priorYearAdjustment: 0,
    taxPaid: 0,
    far: null,
  });
}
