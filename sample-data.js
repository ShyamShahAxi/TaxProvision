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

/* The sample provision object (no globals touched) — reused for the one-time
   self-heal that restores missing standard automated lines. */
function sampleProvision() {
  // account = GL code linked to the trial balance; when set, the amount pulls
  // from the TB automatically (the manual amount is kept only as a fallback).
  const L = (label, amount, type, source, account) => ({ id: uid(), label, amount, type: type || 'permanent', source: source || 'manual', account: account || '' });
  const D = (label, openingTD, closingTD, source) => ({ id: uid(), label, openingTD, closingTD, source: source || 'manual' });
  // Deferred temporary difference linked to TB accounts (opening + closing).
  const DT = (label, accounts) => ({ id: uid(), label, tdAccounts: accounts, source: 'tb' });
  const P = (policy, type, amount) => ({ id: uid(), policy, type, amount });
  return {
    profitBeforeTax: 317389,

    // Full AUS155 FY26 trial balance (from tb-aus155.js), sorted by account number.
    tb: (typeof AUS155_TB !== 'undefined' ? AUS155_TB : []).map(a => Object.assign({ id: uid() }, a)),

    // Insurance premium breakdown (USD), split Life vs Medical. Life total
    // 25,919 (non-deductible); Medical total feeds the 1% medical-expense cap.
    insurancePremiums: [
      P('GTLB — Group Term Life', 'Life', 8967),
      P('GADD — Group Personal Accident', 'Life', 2776),
      P('GCCE — Group Critical Illness', 'Life', 14176),
      P('GHSB — Group Hospital & Surgical', 'Medical', 105365.89),
      P('GEMM — Group Major Medical', 'Medical', 2562),
      P('GOSP — Group Outpatient', 'Medical', 13070),
      P('PGIH — Group Inpatient', 'Medical', 10703),
      P('GDEN — Group Dental', 'Medical', 9035),
    ],

    addBacks: [
      // Permanent differences (Section B) — computed on the Medical tab
      L('Group life insurance premiums (non-deductible)', 25919, 'permanent', 'manual', '@medical.life'),
      L('Medical expenses over 1% cap (restricted)', 67287, 'permanent', 'manual', '@medical.addback'),
      // Temporary differences — book charges, linked to the TB
      L('Depreciation — Computer Equipment', 78099, 'temporary', 'manual', '670120'),
      L('Amortisation — Development costs', 459311, 'temporary', 'manual', '670100'),
      L('Leave provision — closing balance', 135008, 'temporary', 'manual', '270300'),
      L('Accrued commissions — closing balance', 76832, 'temporary', 'manual', '250200'),
    ],

    deductions: [
      // Temporary differences — linked to TB columns; capital allowances = cost additions (100% write-off)
      L('Capital allowances — Computer Equipment', 177802, 'temporary', 'manual', '140100#debit'),
      L('Leave provision — opening balance reversed', 147087, 'temporary', 'manual', '270300#opening'),
      L('Accrued commissions — opening balance reversed', 13134, 'temporary', 'manual', '250200#opening'),
      L('IFRS 16 / FRS 116 lease adjustment (net)', 14494, 'temporary', 'manual', '@ifrs16'),
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
    // Deferred tax temporary differences — all derived from TB balances.
    // Provisions (credit balances) are DTAs (negative); accelerated capital
    // allowances leave the asset's net carrying amount as a DTL (positive).
    deferredItems: [
      DT('Leave provision', ['270300']),
      DT('Accrued commissions', ['250200']),
      DT('Computer equipment — accelerated capital allowances', ['140100', '140110']),
      DT('Development costs (software) — accelerated capital allowances', ['150100', '150110']),
      DT('FRS 116 leases (ROU vs lease liability)', ['140300', '140310', '140340', '250900']),
    ],

    openingCurrentTaxPayable: 0,
    priorYearAdjustment: 0,
    taxPaid: 0,
    far: null,
  };
}

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
  provision = Object.assign(emptyProvision(), sampleProvision());
}
