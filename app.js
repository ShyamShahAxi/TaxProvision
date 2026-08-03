/* =============================================================
   Tax Provision — current & deferred tax, Singapore basis
   Pure client-side app. Data persists in localStorage.
   Companion to the Fixed Asset Register (FAR): import a FAR backup
   and its depreciation / capital allowances / temporary differences
   flow straight into the computation (see far-import.js).
   ============================================================= */

'use strict';

const STORE_KEY = 'taxprov.provision.v1';
const SETTINGS_KEY = 'taxprov.settings.v1';
const PREMDOC_KEY = 'taxprov.premiumDoc.v1'; // attached insurer invoice (PDF), kept out of the JSON backup

/* ---------- Settings ---------- */
const defaultSettings = {
  companyName: 'AxiCorp Pte Ltd',
  currency: '$',
  entity: 'AUS155',        // entity code used to filter the stat-adjustment import
  ya: '2026',
  periodEnd: null,          // ISO yyyy-mm-dd basis-period end
  taxRate: 17,              // Singapore corporate tax rate %
  exemption: 'partial',     // 'partial' | 'startup' | 'none'
  rebatePct: 0,             // corporate income tax rebate %
  rebateCap: 0,             // rebate cap (0 = no cap)
  // Medical expense capping (Singapore): deductible medical is capped at
  // capRate% of total employee remuneration (1%, or 2% with portable benefits).
  capRate: 1,
  medicalCode: '600550',   // staff medical GL account
  remunCodes: '600100,600110,600140,600150,510100,600180,600210,600305,600310',
  currentTaxCodes: '130100,130200,260100,260200', // TB accounts for the net current tax payable/(receivable)
  sgdRate: 1.2854,         // S$ per US$ — converts the SGD tax-exemption thresholds to USD
  // GL accounts for the provision journals (editable — defaults match the AUS155 workpaper where known)
  glTaxExpense: '700100',       // Income tax expense — current (P&L)
  glDeferredExpense: '700200',  // Deferred tax expense (P&L)
  glTaxPayable: '250650',       // Current tax / provision for tax (balance sheet)
  glDeferredBalance: '240100',  // Deferred tax liability / (asset) (balance sheet)
  glBank: '100100',             // Bank / cash (for tax paid)
};

/* ---------- Provision (one Year of Assessment) ---------- */
const emptyProvision = () => ({
  profitBeforeTax: 0,
  tb: [],                   // trial balance: {id,code,name,opening,debit,credit,closing}
  auditAdjustments: [],     // {id,account,description,debit,credit}
  insurancePremiums: [],    // {id,policy,type:'Life'|'Medical',amount} (USD)
  addBacks: [],             // {id,label,amount,type:'permanent'|'temporary',source,account}
  deductions: [],           // {id,label,amount,type,source,account}
  lossesBroughtForward: 0,
  foreignTaxCredits: 0,
  deferredItems: [],        // {id,label,openingTD,closingTD,source}
  openingCurrentTaxPayable: 0,
  priorYearAdjustment: 0,   // (over)/under provision — under = positive
  priorYearProvisionCarried: 0, // FY-prior net tax provision still outstanding (b/f)
  taxPaid: 0,
  far: null,                // {companyName,reportingDate,priorDate,importedAt,closing,opening}
});

let settings = loadSettings();
let provision = loadProvision();

function loadSettings() {
  try { return Object.assign({}, defaultSettings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); }
  catch (e) { return Object.assign({}, defaultSettings); }
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

function loadProvision() {
  try {
    const p = JSON.parse(localStorage.getItem(STORE_KEY));
    return p ? Object.assign(emptyProvision(), p) : emptyProvision();
  } catch (e) { return emptyProvision(); }
}
function saveProvision() { localStorage.setItem(STORE_KEY, JSON.stringify(provision)); }

/* ---------- Helpers ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function uid() { return 'L' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
function num(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }
/* Display is whole-number for readability; the underlying values keep full
   precision (decimals) for every calculation and for CSV export. `exact()`
   gives the precise 2-dp figure used in hover tooltips. */
function fmt(v) {
  const n = num(v);
  return settings.currency + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function exact(v) { return settings.currency + num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
/* Accounting presentation: negatives in parentheses. */
function acc(v) { const n = num(v); return n < -0.005 ? '(' + fmt(n) + ')' : fmt(n); }
function pct(v) { return num(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%'; }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function attr(s) { return esc(s).replace(/"/g, '&quot;'); }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}
function download(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* =============================================================
   PROVISION ENGINE
   ============================================================= */
function sum(list, key) { return list.reduce((t, x) => t + num(x[key]), 0); }

/* ---------- Trial balance & audit-adjustment linkage ---------- */
function tbMap() {
  const m = {};
  provision.tb.forEach(a => { if (a.code) m[String(a.code)] = a; });
  return m;
}
/* Net audit adjustment (debit − credit) per account code. Stat rows for other
   entities are excluded — only the configured entity (and manual rows) count. */
function auditMap() {
  const m = {};
  const ent = (settings.entity || '').trim().toLowerCase();
  provision.auditAdjustments.forEach(e => {
    if (!e.account) return;
    if (e.source === 'stat' && e.entity && e.entity.trim().toLowerCase() !== ent) return;
    m[String(e.account)] = (m[String(e.account)] || 0) + num(e.debit) - num(e.credit);
  });
  return m;
}
/* Closing balance of an account after audit adjustments (signed: Dr +, Cr −). */
function adjustedClosing(code, tm, am) {
  const a = (tm || tbMap())[String(code)];
  const base = a ? num(a.closing) : 0;
  const adj = (am || auditMap())[String(code)] || 0;
  return base + adj;
}
/* ---------- Attached source document (insurer invoice PDF) ---------- */
function loadPremiumDoc() { try { return JSON.parse(localStorage.getItem(PREMDOC_KEY)); } catch (e) { return null; } }
function savePremiumDoc(d) { try { localStorage.setItem(PREMDOC_KEY, JSON.stringify(d)); return true; } catch (e) { toast('File too large to store in this browser'); return false; } }
function openDataUri(dataUri, name) {
  const comma = dataUri.indexOf(',');
  const mime = (dataUri.slice(5, comma).split(';')[0]) || 'application/pdf';
  const bin = atob(dataUri.slice(comma + 1));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: mime }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ---------- Medical expense capping & insurance ---------- */
function premiumSum(type) { return provision.insurancePremiums.reduce((s, p) => p.type === type ? s + num(p.amount) : s, 0); }
function lifeInsuranceTotal() { return premiumSum('Life'); }
function medicalInsuranceTotal() { return premiumSum('Medical'); }
function staffMedical() { const tm = tbMap(); return Math.abs(adjustedClosing(settings.medicalCode, tm, auditMap())); }
function medicalExpensesTotal() { return staffMedical() + medicalInsuranceTotal(); }
function remunerationTotal() {
  const tm = tbMap(), am = auditMap();
  return (settings.remunCodes || '').split(',').map(s => s.trim()).filter(Boolean)
    .reduce((t, c) => { const r = tm[c]; return r ? t + num(r.closing) + (am[c] || 0) : t; }, 0);
}
function medicalCap() { return remunerationTotal() * (num(settings.capRate) / 100); }
function medicalAddback() { return Math.max(0, medicalExpensesTotal() - medicalCap()); }

/* Net current tax payable/(receivable) per the TB current-tax accounts.
   Returned as a payable (liability positive): a net debit balance in the TB
   (a receivable) is therefore negative. */
function currentTaxAccounts() { return (settings.currentTaxCodes || '').split(',').map(s => s.trim()).filter(Boolean); }
function currentTaxPayableTB(which) {
  const tm = tbMap(), am = auditMap();
  const net = currentTaxAccounts().reduce((s, c) => { const rr = tm[c]; if (!rr) return s; return s + (which === 'opening' ? num(rr.opening) : num(rr.closing) + (am[c] || 0)); }, 0);
  return -net; // TB net asset (debit +) → negative payable
}
function hasCurrentTaxTB() { const tm = tbMap(); return currentTaxAccounts().some(c => tm[c]); }

/* Profit before tax per the trial balance (adjusted closing balances of P&L
   accounts 4/5/6/7). Income carries a credit closing and expenses/tax a debit,
   so profit after tax = −Σ(P&L) and PBT = PAT + tax expense. Includes audit /
   stat adjustments via adjustedClosing. */
function tbProfitBeforeTax() {
  const am = auditMap();
  let plAll = 0, taxExp = 0;
  provision.tb.forEach(a => {
    const c = String(a.code);
    if (!/^[4567]/.test(c)) return;
    const bal = num(a.closing) + (am[c] || 0);
    plAll += bal; if (/^7/.test(c)) taxExp += bal;
  });
  return -plAll + taxExp;
}
/* Is net-profit-before-tax linked to the TB? (Only when a TB with P&L exists.) */
function pbtIsLinked() { return provision.pbtLinked !== false && provision.tb.some(a => /^[4567]/.test(String(a.code))); }

/* ---------- IFRS 16 / FRS 116 leases ----------
   The whole lease tax adjustment derives from the lease GL accounts:
     - reversal (add back) = ROU depreciation (670150) + lease interest (680120)
     - the net temporary difference = ROU asset carrying (140300+140310) less the
       lease liability (140340 + make-good 250900); its year movement equals the
       net current-tax deduction (dep+interest − rent). */
const IFRS16_TD_ACCS = ['140300', '140310', '140340', '250900'];
function leaseAmt(code, which) {
  const r = tbMap()[code]; if (!r) return 0;
  return which === 'opening' ? num(r.opening) : num(r.closing) + (auditMap()[code] || 0);
}
function leaseDep() { return Math.abs(leaseAmt('670150', 'closing')); }
function leaseInterest() { return Math.abs(leaseAmt('680120', 'closing')); }
function leaseTD(which) { return IFRS16_TD_ACCS.reduce((s, c) => s + leaseAmt(c, which), 0); }
function leaseNetAdjustment() { return leaseTD('closing') - leaseTD('opening'); } // ΔTD = net deduction magnitude

/* Computed link sources for add-backs/deductions (account values starting @). */
function computedSources() {
  return {
    '@medical.life': lifeInsuranceTotal(),
    '@medical.addback': medicalAddback(),
    '@ifrs16': leaseNetAdjustment(),
  };
}

/* Temporary difference for a deferred item. Items linked to TB accounts
   (tdAccounts) sum those accounts' opening/closing balances — an asset's net
   carrying amount is a taxable difference (DTL, positive); a provision's credit
   balance is a deductible difference (DTA, negative). Otherwise use stored values. */
function defTD(x, which) {
  if (Array.isArray(x.tdAccounts) && x.tdAccounts.length) {
    // Opening may be overridden to the signed figure (e.g. prior-year WIP);
    // closing is always the TB balance.
    if (which === 'opening' && x.openingTD != null && x.openingTD !== '') return num(x.openingTD);
    return x.tdAccounts.reduce((s, c) => s + leaseAmt(c, which), 0);
  }
  if (x.source === 'ifrs16') return leaseTD(which);
  return num(which === 'opening' ? x.openingTD : x.closingTD);
}
function defLinked(x) { return (Array.isArray(x.tdAccounts) && x.tdAccounts.length) || x.source === 'ifrs16'; }
/* Prior-year movement (a separate true-up, read-only), 0 unless set in data. */
function defPriorTD(x) { return num(x.priorMovement || 0); }
function defOpeningOverridden(x) { return Array.isArray(x.tdAccounts) && x.tdAccounts.length && x.openingTD != null && x.openingTD !== ''; }

/* Effective amount of an add-back/deduction. The `account` field selects a
   source: a computed value (@…), a specific TB column (CODE#opening|debit|credit),
   the adjusted TB closing (CODE), or — when blank — the manual amount. Magnitude
   only; the section (add-back vs deduction) sets the sign. */
function lineAmt(x, tm, am) {
  const a = x.account;
  if (!a) return num(x.amount);
  if (a[0] === '@') { const v = computedSources()[a]; return v == null ? 0 : Math.abs(v); }
  const hash = a.indexOf('#');
  if (hash >= 0) { const row = (tm || tbMap())[a.slice(0, hash)]; return row ? Math.abs(num(row[a.slice(hash + 1)])) : 0; }
  return Math.abs(adjustedClosing(a, tm, am));
}
/* Human label for a line's source, for the read-only tag. */
function lineSourceTag(x) {
  if (!x.account) return '';
  if (x.account.startsWith('@medical')) return 'MED';
  if (x.account.startsWith('FAR:')) return 'FAR';
  return 'TB';
}

/* Singapore tax exemption on chargeable income. */
function exemptionAmount(ci) {
  if (ci <= 0) return 0;
  if (settings.exemption === 'startup') {
    return 0.75 * Math.min(ci, 100000) + 0.5 * Math.min(Math.max(ci - 100000, 0), 100000);
  }
  if (settings.exemption === 'partial') {
    return 0.75 * Math.min(ci, 10000) + 0.5 * Math.min(Math.max(ci - 10000, 0), 190000);
  }
  return 0;
}

function recompute() {
  const r = num(settings.taxRate) / 100;
  const p = provision;

  const addPerm = p.addBacks.filter(x => x.type !== 'temporary');
  const addTemp = p.addBacks.filter(x => x.type === 'temporary');
  const dedPerm = p.deductions.filter(x => x.type !== 'temporary');
  const dedTemp = p.deductions.filter(x => x.type === 'temporary');

  const map = tbMap(), am = auditMap();
  const tot = list => list.reduce((t, x) => t + lineAmt(x, map, am), 0);
  const addPermTotal = tot(addPerm);
  const addTempTotal = tot(addTemp);
  const dedPermTotal = tot(dedPerm);
  const dedTempTotal = tot(dedTemp);
  const addTotal = addPermTotal + addTempTotal;
  const dedTotal = dedPermTotal + dedTempTotal;

  const pbt = pbtIsLinked() ? tbProfitBeforeTax() : num(p.profitBeforeTax);
  const adjusted = pbt + addTotal - dedTotal;

  const lossesBF = num(p.lossesBroughtForward);
  const lossOffset = Math.min(Math.max(adjusted, 0), lossesBF);
  const ciBeforeExempt = Math.max(0, adjusted - lossOffset);
  const currentYearLoss = adjusted < 0 ? -adjusted : 0;
  const lossesCF = Math.max(0, lossesBF - lossOffset) + currentYearLoss;

  // The exemption thresholds are statutory SGD amounts; the computation is in
  // USD. Apply the exemption in SGD (convert CI up), then convert it back to USD.
  const fx = num(settings.sgdRate) || 1;              // S$ per US$
  const exemptionSGD = exemptionAmount(ciBeforeExempt * fx);
  const exemption = exemptionSGD / fx;                // exemption in USD
  const chargeableIncome = Math.max(0, ciBeforeExempt - exemption);

  const grossTax = chargeableIncome * r;
  const cap = num(settings.rebateCap);
  let rebate = grossTax * (num(settings.rebatePct) / 100);
  if (cap > 0) rebate = Math.min(rebate, cap);
  const netTaxOnProfit = Math.max(0, grossTax - rebate);
  const ftc = num(p.foreignTaxCredits);
  const currentTax = Math.max(0, netTaxOnProfit - ftc);

  // Deferred tax on temporary differences (carrying amount − tax base).
  const openingTD = p.deferredItems.reduce((s, x) => s + defTD(x, 'opening'), 0);
  const closingTD = p.deferredItems.reduce((s, x) => s + defTD(x, 'closing'), 0);
  const openingDT = openingTD * r;
  const closingDT = closingTD * r;
  const deferredCharge = closingDT - openingDT;   // total movement (+ = increase in liability)
  // Split the deferred movement into a prior-year component (true-ups / under-
  // over provision) and the current-year charge to P&L.
  const priorTD = p.deferredItems.reduce((s, x) => s + defPriorTD(x), 0);
  const deferredPriorYr = priorTD * r;            // prior-year deferred (under/over provision)
  const deferredCY = deferredCharge - deferredPriorYr; // current-year deferred tax to P&L

  const priorAdj = num(p.priorYearAdjustment);
  const priorYearProvision = priorAdj + deferredPriorYr;  // total prior-year (over)/under provision
  const currentTaxExpense = currentTax + priorAdj;
  const totalTaxExpense = currentTaxExpense + deferredCharge;
  const etr = pbt !== 0 ? totalTaxExpense / pbt : 0;

  // Current tax payable roll-forward
  const closingPayable = num(p.openingCurrentTaxPayable) + currentTax + priorAdj - num(p.taxPaid);

  return {
    r, pbt, addPerm, addTemp, dedPerm, dedTemp,
    addPermTotal, addTempTotal, dedPermTotal, dedTempTotal, addTotal, dedTotal,
    adjusted, lossesBF, lossOffset, ciBeforeExempt, currentYearLoss, lossesCF,
    exemption, exemptionSGD, fx, chargeableIncome, grossTax, rebate, netTaxOnProfit, ftc, currentTax,
    openingTD, closingTD, openingDT, closingDT, deferredCharge,
    priorTD, deferredPriorYr, deferredCY, priorYearProvision,
    priorAdj, currentTaxExpense, totalTaxExpense, etr, closingPayable,
  };
}

/* =============================================================
   RENDERING
   ============================================================= */
let activeTab = 'dashboard';

function renderAll() {
  $('#company-name').textContent = settings.companyName;
  $('#header-ya').textContent = 'YA ' + settings.ya + (settings.periodEnd ? ' · period end ' + settings.periodEnd : '');
  render();
}

function render() {
  const P = recompute();
  if (activeTab === 'dashboard') renderDashboard(P);
  else if (activeTab === 'tb') renderTB();
  else if (activeTab === 'audit') renderAudit();
  else if (activeTab === 'medical') renderMedical();
  else if (activeTab === 'leases') renderLeases();
  else if (activeTab === 'current') renderCurrent(P);
  else if (activeTab === 'deferred') renderDeferred(P);
  else if (activeTab === 'recon') renderRecon(P);
  else if (activeTab === 'movement') renderMovement(P);
  else if (activeTab === 'journals') renderJournals(P);
  else if (activeTab === 'notes') renderNotes(P);
  else if (activeTab === 'data') renderData();
}

/* ----- Dashboard ----- */
function renderDashboard(P) {
  const dtLabel = P.closingDT >= 0 ? 'liability' : 'asset';
  const kpis = [
    { label: 'Profit before tax', value: acc(P.pbt) },
    { label: 'Chargeable income', value: fmt(P.chargeableIncome) },
    { label: 'Current tax', value: fmt(P.currentTax), hint: 'YA ' + settings.ya },
    { label: 'Deferred tax ' + (P.deferredCY >= 0 ? 'charge' : 'credit'), value: acc(P.deferredCY), hint: 'current year' },
    { label: 'Total tax expense', value: acc(P.totalTaxExpense), accent: true },
    { label: 'Effective tax rate', value: pct(P.etr * 100), hint: 'statutory ' + pct(settings.taxRate) },
  ];
  $('#kpi-row').innerHTML = kpis.map(k =>
    `<div class="kpi${k.accent ? ' accent' : ''}"><div class="label">${esc(k.label)}</div>` +
    `<div class="value${k.value.length > 12 ? ' sm' : ''}">${k.value}</div>` +
    (k.hint ? `<div class="hint">${esc(k.hint)}</div>` : '') + `</div>`).join('');

  $('#dash-charge').innerHTML = `<table class="comp-table"><tbody>
    <tr><td class="label">Current tax — current year</td><td class="num">${acc(P.currentTax)}</td></tr>
    <tr><td class="label">Deferred tax — current year</td><td class="num">${acc(P.deferredCY)}</td></tr>
    <tr><td class="label">(Over)/under provision in respect of prior years</td><td class="num">${acc(P.priorYearProvision)}</td></tr>
    <tr class="grand"><td class="label">Income tax expense</td><td class="num">${acc(P.totalTaxExpense)}</td></tr>
  </tbody></table>
  <p class="legend">Closing deferred tax ${dtLabel}: ${fmt(Math.abs(P.closingDT))} on a temporary difference of ${acc(P.closingTD)} at ${pct(settings.taxRate)}.</p>`;

  const f = provision.far;
  $('#dash-far').innerHTML = f
    ? `<table class="comp-table"><tbody>
        <tr><td class="label">Source register</td><td class="num">${esc(f.companyName)}</td></tr>
        <tr><td class="label">As at</td><td class="num">${esc(f.reportingDate)}</td></tr>
        <tr><td class="label">Accounting NBV</td><td class="num">${fmt(f.closing.nbv)}</td></tr>
        <tr><td class="label">Tax written-down value</td><td class="num">${fmt(f.closing.twdv)}</td></tr>
        <tr class="subtotal"><td class="label">Temporary difference (NBV − TWDV)</td><td class="num">${acc(f.closing.td)}</td></tr>
      </tbody></table>
      <p class="legend">Imported ${esc((f.importedAt || '').slice(0, 10))}. Re-import from Data &amp; Settings to refresh.</p>`
    : `<p class="legend">No Fixed Asset Register imported. Go to <strong>Data &amp; Settings → FAR link</strong> to import a FAR backup and pull in depreciation, capital allowances and the deferred-tax temporary difference automatically.</p>`;
}

/* Plain number for tables: thousands separators, (parentheses) for negatives,
   muted dash for zero. No currency symbol — keeps the wide TB readable. */
function money(v) {
  const n = num(v);
  if (Math.abs(n) < 0.005) return '<span class="zero">–</span>';
  const s = Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n < 0 ? `<span class="neg">(${s})</span>` : s;
}

/* ----- Trial balance ----- */
let tbFilter = '';
let tbEdit = false;
function renderTB() {
  const body = $('#tb-body');
  const am = auditMap();
  const q = tbFilter.trim().toLowerCase();
  const eb = $('#btn-tb-edit'); if (eb) { eb.textContent = tbEdit ? 'Done' : 'Edit'; eb.classList.toggle('primary', tbEdit); }
  // Keep original indices so edits map back, but display sorted by account number.
  const rows = provision.tb.map((a, i) => ({ a, i }))
    .sort((x, y) => String(x.a.code).localeCompare(String(y.a.code), undefined, { numeric: true }))
    .filter(({ a }) => !q || String(a.code).toLowerCase().includes(q) || String(a.name).toLowerCase().includes(q));

  if (!provision.tb.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="9">No accounts. Add one, import a CSV, load the sample, or pull from FAR in Data &amp; Settings.</td></tr>`;
  } else if (!rows.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="9">No accounts match “${esc(tbFilter)}”.</td></tr>`;
  } else if (tbEdit) {
    body.innerHTML = rows.map(({ a, i }) => {
      const adjusted = num(a.closing) + (am[String(a.code)] || 0);
      return `<tr data-line="tb" data-idx="${i}">
        <td><input class="desc-in" data-key="code" value="${attr(a.code)}"></td>
        <td><input class="desc-in" data-key="name" value="${attr(a.name)}"></td>
        <td class="num"><input class="amt" type="number" step="0.01" data-key="opening" value="${a.opening}"></td>
        <td class="num"><input class="amt" type="number" step="0.01" data-key="debit" value="${a.debit}"></td>
        <td class="num"><input class="amt" type="number" step="0.01" data-key="credit" value="${a.credit}"></td>
        <td class="num"><input class="amt" type="number" step="0.01" data-key="closing" value="${a.closing}"></td>
        <td class="num">${money(am[String(a.code)] || 0)}</td>
        <td class="num">${money(adjusted)}</td>
        <td class="act"><button class="ghost sm" data-act="del-line" title="Remove">&times;</button></td>
      </tr>`;
    }).join('');
  } else {
    body.innerHTML = rows.map(({ a, i }) => {
      const adj = am[String(a.code)] || 0;
      const adjusted = num(a.closing) + adj;
      const c = (v) => `<td class="num" title="${exact(v)}">${money(v)}</td>`;
      return `<tr data-line="tb" data-idx="${i}">
        <td class="tb-code">${esc(a.code)}</td>
        <td class="tb-name" title="${attr(a.name)}">${esc(a.name)}</td>
        ${c(a.opening)}${c(a.debit)}${c(a.credit)}${c(a.closing)}${c(adj)}${c(adjusted)}
        <td class="act"></td>
      </tr>`;
    }).join('');
  }
  const t = k => sum(provision.tb, k);
  const adjTot = Object.values(am).reduce((s, v) => s + v, 0);
  const closeTot = t('closing');
  $('#tb-foot').innerHTML = `<tr>
    <td colspan="2">Total (${provision.tb.length} accounts${q ? `, ${rows.length} shown` : ''})</td>
    <td class="num">${money(t('opening'))}</td><td class="num">${money(t('debit'))}</td><td class="num">${money(t('credit'))}</td>
    <td class="num">${money(closeTot)}</td><td class="num">${money(adjTot)}</td><td class="num">${money(closeTot + adjTot)}</td><td></td></tr>`;

  // Profit per the trial balance (adjusted closing balances of P&L accounts 4/5/6/7).
  // Income carries a credit (negative) closing and expenses/tax a debit (positive),
  // so profit after tax = −Σ(P&L closing) and PBT = PAT + tax expense.
  let plAll = 0, taxExp = 0, drBal = 0, crBal = 0;
  provision.tb.forEach(a => {
    const bal = num(a.closing) + (am[String(a.code)] || 0);
    if (bal >= 0) drBal += bal; else crBal += -bal;
    const c = String(a.code);
    if (/^[4567]/.test(c)) { plAll += bal; if (/^7/.test(c)) taxExp += bal; }
  });
  const pat = -plAll, pbt = pat + taxExp;
  const pnl = `
    <div class="pnl-item accent" title="Exact: ${exact(pbt)}"><div class="lbl">Profit before tax (per TB)</div><div class="val ${pbt < 0 ? 'neg' : ''}">${acc(pbt)}</div></div>
    <div class="pnl-item" title="Exact: ${exact(-taxExp)}"><div class="lbl">Tax expense (per TB)</div><div class="val">${acc(-taxExp)}</div></div>
    <div class="pnl-item accent" title="Exact: ${exact(pat)}"><div class="lbl">Profit after tax (per TB)</div><div class="val ${pat < 0 ? 'neg' : ''}">${acc(pat)}</div></div>`;
  $('#tb-pnl-top').innerHTML = pnl;
  $('#tb-pnl-bottom').innerHTML = pnl;

  const diff = drBal - crBal;
  const balanced = Math.abs(diff) < 100;
  $('#tb-note').innerHTML =
    `Total debit balances ${money(drBal)} · total credit balances ${money(crBal)} · ` +
    (balanced ? `in balance (difference ${money(diff)} is source rounding).` : `<span class="neg">out of balance by ${money(diff)}.</span>`) +
    ` &nbsp;PBT per the trial balance is the raw accounting result; the Current Tax computation uses statutory PBT of ${fmt(provision.profitBeforeTax)} — the difference is the transfer-pricing / non-TCG consolidation adjustments.` +
    ` &nbsp;Figures display as whole numbers; full precision is retained for all calculations and exports (hover a value for the exact amount).`;
}

/* ----- Audit adjustments ----- */
function renderAudit() {
  const body = $('#audit-body');
  const tm = tbMap();
  const nameFor = code => { const a = tm[String(code)]; return a ? a.name : ''; };
  const ent = (settings.entity || '').trim().toLowerCase();
  const isVisible = e => !(e.source === 'stat' && e.entity && e.entity.trim().toLowerCase() !== ent);
  const vis = provision.auditAdjustments.map((e, i) => ({ e, i })).filter(({ e }) => isVisible(e));
  const hidden = provision.auditAdjustments.length - vis.length;
  if (!provision.auditAdjustments.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="6">No audit adjustments. Add one to post a debit/credit against a trial-balance account.</td></tr>`;
  } else if (!vis.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="6">No adjustments for entity “${esc(settings.entity)}”. ${hidden} row(s) for other entities are hidden.</td></tr>`;
  } else {
    body.innerHTML = vis.map(({ e, i }) => {
      const entity = esc(e.entity || settings.entity);
      // Imported stat adjustments are read-only (managed by re-import); only
      // manually-added rows are editable.
      if (e.source === 'stat') {
        return `<tr data-line="auditAdjustments" data-idx="${i}">
          <td class="tb-code">${entity}</td>
          <td class="tb-code">${esc(e.account)} <span class="hint-text">${esc(nameFor(e.account))}</span></td>
          <td>${esc(e.description)} <span class="src-tag">STAT</span></td>
          <td class="num" title="${exact(e.debit)}">${e.debit ? money(e.debit) : '<span class="zero">–</span>'}</td>
          <td class="num" title="${exact(e.credit)}">${e.credit ? money(e.credit) : '<span class="zero">–</span>'}</td>
          <td class="act"></td>
        </tr>`;
      }
      return `<tr data-line="auditAdjustments" data-idx="${i}">
        <td class="tb-code">${entity}</td>
        <td><select class="type-sel" data-key="account" style="min-width:200px">${tbOptions(e.account)}</select></td>
        <td><input class="desc-in" data-key="description" value="${attr(e.description)}" placeholder="Reason for adjustment"></td>
        <td class="num"><input class="amt" type="number" step="0.01" data-key="debit" value="${e.debit}"></td>
        <td class="num"><input class="amt" type="number" step="0.01" data-key="credit" value="${e.credit}"></td>
        <td class="act"><button class="ghost sm" data-act="del-line" title="Remove">&times;</button></td>
      </tr>`;
    }).join('');
  }
  const dr = vis.reduce((s, { e }) => s + num(e.debit), 0), cr = vis.reduce((s, { e }) => s + num(e.credit), 0);
  $('#audit-foot').innerHTML = `<tr><td colspan="3">Total (${vis.length}${hidden ? `, ${hidden} hidden` : ''})</td><td class="num">${fmt(dr)}</td><td class="num">${fmt(cr)}</td><td></td></tr>`;
  const diff = dr - cr;
  $('#audit-note').innerHTML =
    (Math.abs(diff) < 0.005 ? 'Audit adjustments balance (debits = credits).' : `Debits − credits = ${acc(diff)}. Audit journals should balance to nil before posting.`) +
    (hidden ? ` &nbsp;Showing only entity <strong>${esc(settings.entity)}</strong>; ${hidden} row(s) for other entities are hidden.` : '') +
    ' Net effect flows to the Trial Balance and any linked computation line.';
}

function tbOptions(selected) {
  const opts = ['<option value="">— manual —</option>'];
  provision.tb.forEach(a => opts.push(`<option value="${attr(a.code)}"${String(a.code) === String(selected) ? ' selected' : ''}>${esc(a.code)} · ${esc(a.name)}</option>`));
  return opts.join('');
}

/* ----- Medical expenses & insurance ----- */
function renderMedical() {
  const body = $('#prem-body');
  if (!provision.insurancePremiums.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="4">No premiums attached. Use “Attach insurance premiums” to import the breakdown, or add rows.</td></tr>`;
  } else {
    body.innerHTML = provision.insurancePremiums.map((p, i) => {
      // Attached/seeded premiums are read-only; only manually-added rows edit.
      if (p.source === 'manual') {
        return `<tr data-line="insurancePremiums" data-idx="${i}">
          <td><input class="desc-in" data-key="policy" value="${attr(p.policy)}" placeholder="Policy"></td>
          <td><select class="type-sel" data-key="type"><option${p.type === 'Life' ? ' selected' : ''}>Life</option><option${p.type === 'Medical' ? ' selected' : ''}>Medical</option></select></td>
          <td class="num"><input class="amt" type="number" step="0.01" data-key="amount" value="${p.amount}"></td>
          <td class="act"><button class="ghost sm" data-act="del-line" title="Remove">&times;</button></td>
        </tr>`;
      }
      return `<tr data-line="insurancePremiums" data-idx="${i}">
        <td>${esc(p.policy)}</td>
        <td><span class="pill ${p.type === 'Life' ? 'blue' : 'grey'}">${esc(p.type)}</span></td>
        <td class="num" title="${exact(p.amount)}">${fmt(p.amount)}</td>
        <td class="act"></td>
      </tr>`;
    }).join('');
  }
  const life = lifeInsuranceTotal(), med = medicalInsuranceTotal();
  $('#prem-foot').innerHTML = `<tr><td>Total (${provision.insurancePremiums.length})</td>
    <td class="num">Life ${fmt(life)}</td><td class="num" title="Medical ${exact(med)}">Medical ${fmt(med)}</td><td></td></tr>`;

  const doc = loadPremiumDoc();
  $('#prem-doc').innerHTML = doc
    ? `<span class="pill blue">PDF</span> <strong>${esc(doc.name)}</strong> &middot; <button class="link" data-act="view-pdf">View</button> &middot; <button class="link" data-act="remove-pdf">Remove</button>`
    : `<span class="hint-text">No source document attached — use “Attach invoice (PDF)”.</span>`;

  const sm = staffMedical(), A = medicalExpensesTotal(), rem = remunerationTotal(), B = medicalCap(), add = medicalAddback();
  $('#medical-calc').innerHTML = `<table class="comp-table"><tbody>
    <tr class="section"><td colspan="2">Medical expenses</td></tr>
    <tr><td class="label">Staff medical (${esc(settings.medicalCode)})</td><td class="num" title="${exact(sm)}">${fmt(sm)}</td></tr>
    <tr><td class="label">Medical insurance premiums</td><td class="num" title="${exact(med)}">${fmt(med)}</td></tr>
    <tr class="subtotal"><td class="label">Total medical expenses (A)</td><td class="num" title="${exact(A)}">${fmt(A)}</td></tr>
    <tr class="section"><td colspan="2">Cap — ${pct(settings.capRate)} of employee remuneration</td></tr>
    <tr><td class="label">Total employee remuneration</td><td class="num" title="${exact(rem)}">${fmt(rem)}</td></tr>
    <tr class="subtotal"><td class="label">Cap at ${pct(settings.capRate)} (B)</td><td class="num" title="${exact(B)}">${fmt(B)}</td></tr>
    <tr class="grand"><td class="label">Medical add-back — excess A − B (restricted)</td><td class="num" title="${exact(add)}">${fmt(add)}</td></tr>
  </tbody></table>
  <p class="legend">Deductible medical is limited to ${pct(settings.capRate)} of employee remuneration; the excess (${fmt(add)}) is added back as a permanent difference in Current Tax. Set the rate to 2% if portable medical benefits apply.</p>`;

  $('#life-calc').innerHTML = `<table class="comp-table"><tbody>
    <tr class="grand"><td class="label">Non-deductible life insurance premiums</td><td class="num" title="${exact(life)}">${fmt(life)}</td></tr>
  </tbody></table>
  <p class="legend">Group life insurance premiums are not deductible and are added back in full as a permanent difference.</p>`;

  const codes = (settings.remunCodes || '').split(',').map(s => s.trim()).filter(Boolean);
  const tm = tbMap(), am = auditMap();
  $('#remun-detail').innerHTML = `<div class="table-wrap"><table><thead><tr><th>Account</th><th>Name</th><th class="num">Amount</th></tr></thead><tbody>${
    codes.map(c => { const r = tm[c]; const v = r ? num(r.closing) + (am[c] || 0) : 0; return `<tr><td class="tb-code">${esc(c)}</td><td>${esc(r ? r.name : '—')}</td><td class="num" title="${exact(v)}">${money(v)}</td></tr>`; }).join('')
  }</tbody><tfoot><tr><td colspan="2">Total employee remuneration</td><td class="num" title="${exact(rem)}">${money(rem)}</td></tr></tfoot></table></div>`;
}

/* ----- Leases (IFRS 16 / FRS 116) ----- */
function renderLeases() {
  const r = num(settings.taxRate) / 100;
  const dep = leaseDep(), int = leaseInterest();
  const reverseDepInt = dep + int;
  const dO = leaseTD('opening'), dC = leaseTD('closing');
  const net = dC - dO;                 // net current-tax deduction (dep+interest − rent)
  const rent = reverseDepInt + net;    // implied rent paid
  const rou = leaseAmt('140300', 'closing') + leaseAmt('140310', 'closing');
  const liab = leaseAmt('140340', 'closing') + leaseAmt('250900', 'closing');

  $('#lease-sti').innerHTML = `<table class="comp-table"><tbody>
    <tr class="section"><td colspan="2">FRS 116 charges reversed (add back)</td></tr>
    <tr><td class="label">Depreciation — leasehold / ROU assets (670150)</td><td class="num" title="${exact(dep)}">${fmt(dep)}</td></tr>
    <tr><td class="label">Lease interest expense (680120)</td><td class="num" title="${exact(int)}">${fmt(int)}</td></tr>
    <tr class="subtotal"><td class="label">Reverse — FRS 116 depreciation &amp; interest</td><td class="num" title="${exact(reverseDepInt)}">${fmt(reverseDepInt)}</td></tr>
    <tr class="section"><td colspan="2">Rent deductible for tax</td></tr>
    <tr><td class="label">Reverse — rent paid (deduct)</td><td class="num" title="${exact(rent)}">${acc(-rent)}</td></tr>
    <tr class="grand"><td class="label">Net STI adjustment (deduction)</td><td class="num" title="${exact(net)}">${acc(-net)}</td></tr>
  </tbody></table>
  <p class="legend">Singapore tax follows the pre-FRS 116 treatment: the ROU depreciation and lease interest are added back and the actual rent is deducted. The net (${acc(-net)}) flows to Current Tax as a temporary deduction (<span class="src-tag">@ifrs16</span>). Rent (${fmt(rent)}) = depreciation + interest + the movement in the lease temporary difference; all figures derive from the trial balance.</p>`;

  $('#lease-dt').innerHTML = `<table class="comp-table"><tbody>
    <tr class="section"><td colspan="2">Deferred tax — DTA/(DTL)</td></tr>
    <tr><td class="label">Leasehold / ROU assets — carrying (140300 + 140310)</td><td class="num" title="${exact(rou)}">${acc(rou)}</td></tr>
    <tr><td class="label">Leasehold liability (140340 + make-good 250900)</td><td class="num" title="${exact(liab)}">${acc(liab)}</td></tr>
    <tr class="subtotal"><td class="label">Net temporary difference (closing)</td><td class="num" title="${exact(dC)}">${acc(dC)}</td></tr>
    <tr><td class="label">Net temporary difference (opening)</td><td class="num" title="${exact(dO)}">${acc(dO)}</td></tr>
    <tr class="grand"><td class="label">Deferred tax asset/(liability) @ ${pct(settings.taxRate)}</td><td class="num" title="${exact(dC * r)}">${acc(dC * r)}</td></tr>
  </tbody></table>
  <p class="legend">The ROU asset (tax base nil) is a taxable difference; the lease liability and make-good provision are deductible differences. The net (${acc(dC)}) feeds the FRS 116 line in Deferred Tax.</p>`;
}

/* ----- Current tax computation ----- */
function lineRows(list, listName) {
  if (!list.length) return `<tr><td class="indent" colspan="4"><span class="hint-text">No items.</span></td></tr>`;
  const map = tbMap(), am = auditMap();
  return list.map((x, i) => {
    const amt = lineAmt(x, map, am);
    if (x.account) {
      // Linked / computed → fully non-editable (label, amount and type locked).
      return `<tr data-line="${listName}" data-idx="${i}">
        <td class="indent">${esc(x.label)} <span class="src-tag" title="${attr(x.account)}">${lineSourceTag(x)}</span></td>
        <td class="num" title="${exact(amt)}">${fmt(amt)}</td>
        <td class="num"><span class="hint-text">${x.type === 'temporary' ? 'Temporary' : 'Permanent'}</span></td>
        <td class="act"></td>
      </tr>`;
    }
    // Manual → editable, with a link dropdown to bind it to a TB account.
    return `<tr data-line="${listName}" data-idx="${i}">
      <td class="indent">
        <input class="desc-in" data-key="label" value="${attr(x.label)}" placeholder="Description">
        <div style="margin-top:4px;display:flex;align-items:center;gap:6px"><span class="hint-text">Link:</span><select data-key="account" class="type-sel" style="font-size:0.74rem">${tbOptions(x.account)}</select></div>
      </td>
      <td class="num"><input class="amt" type="number" step="0.01" data-key="amount" value="${x.amount}"></td>
      <td class="num"><select data-key="type" class="type-sel">
        <option value="permanent"${x.type !== 'temporary' ? ' selected' : ''}>Permanent</option>
        <option value="temporary"${x.type === 'temporary' ? ' selected' : ''}>Temporary</option>
      </select></td>
      <td class="act"><button class="ghost sm" data-act="del-line" title="Remove">&times;</button></td>
    </tr>`;
  }).join('');
}

function renderCurrent(P) {
  const body = $('#current-body');
  body.innerHTML = `
    <tr class="section"><td colspan="4">Chargeable income</td></tr>
    <tr><td class="label">Net profit / (loss) before tax${pbtIsLinked() ? ' <span class="src-tag">TB</span>' : ''}</td>
        <td class="num">${pbtIsLinked()
          ? `<span id="c-pbt" title="${exact(P.pbt)}">${acc(P.pbt)}</span>`
          : `<input class="amt" type="number" step="0.01" data-scalar="profitBeforeTax" value="${provision.profitBeforeTax}">`}</td>
        <td colspan="2">${provision.tb.some(a => /^[4567]/.test(String(a.code)))
          ? `<button class="link" data-act="toggle-pbt">${pbtIsLinked() ? 'unlink from TB' : 'link to TB'}</button>` : ''}</td></tr>

    <tr class="section"><td colspan="4">Add: non-deductible / non-taxable book items</td></tr>
    ${lineRows(provision.addBacks, 'addBacks')}
    <tr><td class="indent" colspan="4"><button class="link" data-act="add-line" data-line="addBacks">+ Add add-back</button></td></tr>
    <tr class="subtotal"><td class="label">Total add-backs</td><td class="num" id="c-add-total">${fmt(P.addTotal)}</td><td colspan="2"></td></tr>

    <tr class="section"><td colspan="4">Less: deductions &amp; capital allowances</td></tr>
    ${lineRows(provision.deductions, 'deductions')}
    <tr><td class="indent" colspan="4"><button class="link" data-act="add-line" data-line="deductions">+ Add deduction</button></td></tr>
    <tr class="subtotal"><td class="label">Total deductions</td><td class="num" id="c-ded-total">${fmt(P.dedTotal)}</td><td colspan="2"></td></tr>

    <tr class="subtotal"><td class="label">Adjusted profit / (loss)</td><td class="num" id="c-adjusted">${acc(P.adjusted)}</td><td colspan="2"></td></tr>

    <tr class="section"><td colspan="4">Losses &amp; exemption</td></tr>
    <tr><td class="label">Unutilised losses / allowances brought forward</td>
        <td class="num"><input class="amt" type="number" step="0.01" data-scalar="lossesBroughtForward" value="${provision.lossesBroughtForward}"></td>
        <td colspan="2"></td></tr>
    <tr><td class="label indent">Utilised against this year's income</td><td class="num" id="c-lossoffset">${acc(-P.lossOffset)}</td><td colspan="2"></td></tr>
    <tr class="subtotal"><td class="label">Chargeable income before exemption</td><td class="num" id="c-ci-before">${fmt(P.ciBeforeExempt)}</td><td colspan="2"></td></tr>
    <tr><td class="label indent">Less: ${esc(exemptionLabel())} <span class="hint-text">(S$${money(P.exemptionSGD)} ÷ ${P.fx})</span></td><td class="num" id="c-exemption" title="${exact(P.exemption)}">${acc(-P.exemption)}</td><td colspan="2"></td></tr>
    <tr class="grand"><td class="label">Chargeable income</td><td class="num" id="c-ci">${fmt(P.chargeableIncome)}</td><td colspan="2"></td></tr>

    <tr class="section"><td colspan="4">Tax</td></tr>
    <tr><td class="label">Tax at ${pct(settings.taxRate)}</td><td class="num" id="c-gross">${fmt(P.grossTax)}</td><td colspan="2"></td></tr>
    <tr><td class="label indent">Less: corporate income tax rebate</td><td class="num" id="c-rebate">${acc(-P.rebate)}</td><td colspan="2"></td></tr>
    <tr><td class="label indent">Less: foreign tax credits</td>
        <td class="num"><input class="amt" type="number" step="0.01" data-scalar="foreignTaxCredits" value="${provision.foreignTaxCredits}"></td>
        <td colspan="2"></td></tr>
    <tr class="grand"><td class="label">Current tax payable</td><td class="num" id="c-currenttax">${fmt(P.currentTax)}</td><td colspan="2"></td></tr>
  `;
  if (P.lossesCF > 0.005) {
    body.insertAdjacentHTML('beforeend',
      `<tr><td class="label"><span class="hint-text">Unutilised losses / allowances carried forward</span></td><td class="num"><span class="hint-text">${fmt(P.lossesCF)}</span></td><td colspan="2"></td></tr>`);
  }
}

function exemptionLabel() {
  if (settings.exemption === 'startup') return 'start-up tax exemption';
  if (settings.exemption === 'partial') return 'partial tax exemption';
  return 'tax exemption (none)';
}

/* Live-update the derived cells in the current-tax table without a full re-render. */
function updateCurrentComputed() {
  const P = recompute();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('c-add-total', fmt(P.addTotal));
  set('c-ded-total', fmt(P.dedTotal));
  set('c-adjusted', acc(P.adjusted));
  set('c-lossoffset', acc(-P.lossOffset));
  set('c-ci-before', fmt(P.ciBeforeExempt));
  set('c-exemption', acc(-P.exemption));
  set('c-ci', fmt(P.chargeableIncome));
  set('c-gross', fmt(P.grossTax));
  set('c-rebate', acc(-P.rebate));
  set('c-currenttax', fmt(P.currentTax));
}

/* ----- Deferred tax ----- */
function renderDeferred(P) {
  const r = P.r;
  const body = $('#deferred-body');
  if (!provision.deferredItems.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="8">No temporary differences. Add one, or import a FAR backup.</td></tr>`;
  } else {
    body.innerHTML = provision.deferredItems.map((x, i) => {
      const op = defTD(x, 'opening'), cl = defTD(x, 'closing');
      const pr = defPriorTD(x), cy = cl - op - pr;
      const opAdj = defOpeningOverridden(x);
      const openCell = `<td class="num" title="${opAdj ? 'Opening set to the signed accounts (prior-year WIP reclassified to software development)' : exact(op)}">${acc(op)}${opAdj ? ' <span class="src-tag" style="background:var(--amber-bg);color:var(--amber)">adj</span>' : ''}</td>`;
      if (defLinked(x)) {
        // Opening (signed), prior-year and closing all read-only.
        return `<tr data-line="deferredItems" data-idx="${i}">
          <td>${esc(x.label)} <span class="src-tag">TB</span></td>
          ${openCell}
          <td class="num" title="${exact(pr)}">${acc(pr)}</td>
          <td class="num" title="${exact(cy)}">${acc(cy)}</td>
          <td class="num" title="${exact(cl)}">${acc(cl)}</td>
          <td class="num">${acc(op * r)}</td>
          <td class="num">${acc(cl * r)}</td>
          <td class="act"></td>
        </tr>`;
      }
      return `<tr data-line="deferredItems" data-idx="${i}">
        <td><input class="desc-in" data-key="label" value="${attr(x.label)}" placeholder="e.g. accelerated capital allowances">${x.source === 'far' ? '<span class="src-tag">FAR</span>' : ''}</td>
        <td class="num"><input class="amt" type="number" step="0.01" data-key="openingTD" value="${x.openingTD}"></td>
        <td class="num" title="${exact(pr)}">${acc(pr)}</td>
        <td class="num">${acc(cy)}</td>
        <td class="num"><input class="amt" type="number" step="0.01" data-key="closingTD" value="${x.closingTD}"></td>
        <td class="num">${acc(op * r)}</td>
        <td class="num">${acc(cl * r)}</td>
        <td class="act"><button class="ghost sm" data-act="del-line" title="Remove">&times;</button></td>
      </tr>`;
    }).join('');
  }
  $('#deferred-foot').innerHTML = `<tr>
    <td>Total — deferred tax ${P.closingDT >= 0 ? 'liability' : 'asset'}</td>
    <td class="num">${acc(P.openingTD)}</td>
    <td class="num">${acc(P.priorTD)}</td>
    <td class="num">${acc(P.closingTD - P.openingTD - P.priorTD)}</td>
    <td class="num">${acc(P.closingTD)}</td>
    <td class="num">${acc(P.openingDT)}</td>
    <td class="num">${acc(P.closingDT)}</td><td></td></tr>`;
  $('#deferred-note').innerHTML =
    `Opening deferred tax ${fmt(Math.abs(P.openingDT))} ${P.openingDT >= 0 ? 'liability' : 'asset'} → closing ${fmt(Math.abs(P.closingDT))} ${P.closingDT >= 0 ? 'liability' : 'asset'} at ${pct(settings.taxRate)}. ` +
    `Movement of ${acc(P.deferredCharge)} to profit or loss — prior-year ${acc(P.deferredPriorYr)} (under/over provision) and current-year ${acc(P.deferredCY)}.` +
    (provision.deferredItems.some(defOpeningOverridden) ? ` &nbsp;The opening of ${fmt(Math.abs(P.openingDT))} ${P.openingDT >= 0 ? 'liability' : 'asset'} is set to the signed accounts — the prior-year WIP (previously a deferred tax asset) has reclassified to software development and unwinds through the current-year movement. Prior-year true-ups can be entered separately.` : '');
}

/* ----- Reconciliation ----- */
function reconLines(P) {
  const r = P.r;
  const rows = [];
  rows.push({ label: 'Tax at statutory rate of ' + pct(settings.taxRate), amt: P.pbt * r });
  if (P.addPermTotal) rows.push({ label: 'Tax effect of non-deductible expenses', amt: P.addPermTotal * r });
  if (P.dedPermTotal) rows.push({ label: 'Tax effect of income not subject to tax', amt: -P.dedPermTotal * r });
  if (P.exemption) rows.push({ label: 'Benefit of ' + exemptionLabel(), amt: -P.exemption * r });
  if (P.rebate) rows.push({ label: 'Corporate income tax rebate', amt: -P.rebate });
  if (P.ftc) rows.push({ label: 'Foreign tax credits', amt: -P.ftc });
  if (P.priorYearProvision) rows.push({ label: '(Over)/under provision in respect of prior years', amt: P.priorYearProvision });
  const explained = rows.reduce((t, x) => t + x.amt, 0);
  const other = P.totalTaxExpense - explained;
  if (Math.abs(other) > 0.005) rows.push({ label: 'Deferred tax not recognised on losses / other', amt: other });
  rows.push({ label: 'Income tax expense', amt: P.totalTaxExpense, grand: true });
  return rows;
}

function renderRecon(P) {
  const rows = reconLines(P);
  $('#recon-body').innerHTML = rows.map(x =>
    `<tr class="${x.grand ? 'grand' : ''}"><td class="label">${esc(x.label)}</td>` +
    `<td class="num">${acc(x.amt)}</td>` +
    `<td class="num">${P.pbt ? pct(x.amt / P.pbt * 100) : '—'}</td></tr>`).join('');
}

/* ----- Provision movement ----- */
function renderMovement(P) {
  if (hasCurrentTaxTB()) {
    // Proof: the closing provision is the FY26 charge plus the FY25 provision
    // still outstanding (return not yet closed). FX revaluation (UFX journals,
    // part of the stat adjustment) reconciles the expected balance to the TB.
    const charge = P.currentTax;
    const priorProv = num(provision.priorYearProvisionCarried || 0);
    const expected = charge + priorProv + P.priorAdj;   // expected closing payable
    const tbClose = currentTaxPayableTB('closing');
    const fxReval = tbClose - expected;                  // balancing to TB
    $('#move-current').innerHTML = `
      <tr><td class="label">Current year tax charge (YA ${esc(settings.ya)})</td><td class="num" title="${exact(charge)}">${acc(charge)}</td></tr>
      <tr><td class="label">Prior year provision carried — FY25 return still open</td>
          <td class="num"><input class="amt" type="number" step="0.01" data-scalar="priorYearProvisionCarried" value="${provision.priorYearProvisionCarried}"></td></tr>
      <tr><td class="label">(Over)/under provision — prior years</td>
          <td class="num"><input class="amt" type="number" step="0.01" data-scalar="priorYearAdjustment" value="${provision.priorYearAdjustment}"></td></tr>
      <tr class="grand"><td class="label">Expected closing current tax payable / (receivable)</td><td class="num" title="${exact(expected)}">${acc(expected)}</td></tr>
      <tr><td class="label">FX revaluation (per stat adjustment)</td><td class="num" title="${exact(fxReval)}">${acc(fxReval)}</td></tr>
      <tr class="subtotal"><td class="label">Closing per trial balance <span class="src-tag">TB</span></td><td class="num" title="${exact(tbClose)}">${acc(tbClose)}</td></tr>
      <tr><td class="label"><span class="hint-text">Positive = payable, negative = net receivable. UFX (FX revaluation) journals form part of the transfer-pricing stat adjustment, shown here as the reconciling line to the TB.</span></td><td></td></tr>`;
  } else {
    $('#move-current').innerHTML = `
      <tr><td class="label">Opening current tax payable</td>
          <td class="num"><input class="amt" type="number" step="0.01" data-scalar="openingCurrentTaxPayable" value="${provision.openingCurrentTaxPayable}"></td></tr>
      <tr><td class="label">Current year tax charge</td><td class="num">${acc(P.currentTax)}</td></tr>
      <tr><td class="label">(Over)/under provision — prior years</td>
          <td class="num"><input class="amt" type="number" step="0.01" data-scalar="priorYearAdjustment" value="${provision.priorYearAdjustment}"></td></tr>
      <tr><td class="label">Tax paid during the year</td>
          <td class="num"><input class="amt" type="number" step="0.01" data-scalar="taxPaid" value="${provision.taxPaid}"></td></tr>
      <tr class="grand"><td class="label">Closing current tax payable</td><td class="num">${acc(P.closingPayable)}</td></tr>`;
  }

  $('#move-deferred').innerHTML = `
    <tr><td class="label">Opening deferred tax ${P.openingDT >= 0 ? '(liability)' : 'asset'}</td><td class="num">${acc(P.openingDT)}</td></tr>
    <tr><td class="label">Prior year (over)/under provision</td><td class="num">${acc(P.deferredPriorYr)}</td></tr>
    <tr><td class="label">Current year charge/(credit) to profit or loss</td><td class="num">${acc(P.deferredCY)}</td></tr>
    <tr class="grand"><td class="label">Closing deferred tax ${P.closingDT >= 0 ? '(liability)' : 'asset'}</td><td class="num">${acc(P.closingDT)}</td></tr>
    <tr><td class="label"><span class="hint-text">Underlying temporary difference</span></td><td class="num"><span class="hint-text">${acc(P.closingTD)}</span></td></tr>`;
}

/* ----- Journals ----- */
function buildJournals(P) {
  const s = settings;
  const dr = (account, name, amt) => ({ account, name, dr: amt, cr: 0 });
  const cr = (account, name, amt) => ({ account, name, dr: 0, cr: amt });
  const js = [];

  if (Math.abs(P.currentTax) > 0.005) {
    js.push({ ref: 'TAX-1', narrative: 'Current year income tax provision — YA ' + s.ya, lines: [
      dr(s.glTaxExpense, 'Income tax expense — current', P.currentTax),
      cr(s.glTaxPayable, 'Current tax payable', P.currentTax),
    ] });
  }
  if (Math.abs(P.priorAdj) > 0.005) {
    const a = Math.abs(P.priorAdj);
    const under = P.priorAdj > 0; // under-provision => additional expense
    js.push({ ref: 'TAX-2', narrative: (under ? 'Under' : 'Over') + '-provision of tax in respect of prior years', lines: under
      ? [dr(s.glTaxExpense, 'Income tax expense — prior year', a), cr(s.glTaxPayable, 'Current tax payable', a)]
      : [dr(s.glTaxPayable, 'Current tax payable', a), cr(s.glTaxExpense, 'Income tax expense — prior year', a)] });
  }
  if (Math.abs(P.deferredCharge) > 0.005) {
    const a = Math.abs(P.deferredCharge);
    const charge = P.deferredCharge > 0; // increase in net deferred tax liability
    js.push({ ref: 'TAX-3', narrative: 'Deferred tax ' + (charge ? 'charge' : 'credit') + ' — origination/reversal of temporary differences', lines: charge
      ? [dr(s.glDeferredExpense, 'Deferred tax expense', a), cr(s.glDeferredBalance, 'Deferred tax liability/(asset)', a)]
      : [dr(s.glDeferredBalance, 'Deferred tax liability/(asset)', a), cr(s.glDeferredExpense, 'Deferred tax expense', a)] });
  }
  if (Math.abs(num(provision.taxPaid)) > 0.005) {
    const a = num(provision.taxPaid);
    js.push({ ref: 'TAX-4', narrative: 'Income tax paid during the year', lines: [
      dr(s.glTaxPayable, 'Current tax payable', a),
      cr(s.glBank, 'Bank / cash', a),
    ] });
  }
  return js;
}

function renderJournals(P) {
  const js = buildJournals(P);
  if (!js.length) { $('#journals-wrap').innerHTML = `<div class="card"><p class="legend" style="margin:0">Nothing to post yet — enter the computation figures first.</p></div>`; return; }
  $('#journals-wrap').innerHTML = js.map(j => {
    const totDr = j.lines.reduce((t, l) => t + l.dr, 0);
    const totCr = j.lines.reduce((t, l) => t + l.cr, 0);
    return `<div class="card">
      <h3 style="margin:0 0 2px">${esc(j.ref)}</h3>
      <div class="note-sub" style="color:var(--muted);font-size:0.82rem;margin-bottom:10px">${esc(j.narrative)}</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Account</th><th>Description</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>
        <tbody>${j.lines.map(l => `<tr><td class="note-num">${esc(l.account)}</td><td>${esc(l.name)}</td>` +
          `<td class="num">${l.dr ? fmt(l.dr) : ''}</td><td class="num">${l.cr ? fmt(l.cr) : ''}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="2">Total</td><td class="num">${fmt(totDr)}</td><td class="num">${fmt(totCr)}</td></tr></tfoot>
      </table></div>
    </div>`;
  }).join('');
}

function exportJournalsCsv(P) {
  P = P || recompute();
  const rows = [['Provision journals', 'YA ' + settings.ya], ['Journal', 'Narrative', 'Account', 'Description', 'Debit', 'Credit']];
  buildJournals(P).forEach(j => j.lines.forEach(l =>
    rows.push([j.ref, j.narrative, l.account, l.name, l.dr ? round2(l.dr) : '', l.cr ? round2(l.cr) : ''])));
  download(`tax-journals-ya${settings.ya}.csv`, toCsv(rows), 'text/csv');
}

/* ----- Notes ----- */
function renderNotes(P) {
  const cur = settings.currency;
  const recon = reconLines(P);
  const dtRows = provision.deferredItems.map(x =>
    `<tr><td>${esc(x.label || '—')}</td><td class="num note-num">${acc(num(x.openingTD) * P.r)}</td>` +
    `<td class="num note-num">${acc((num(x.closingTD) - num(x.openingTD)) * P.r)}</td>` +
    `<td class="num note-num">${acc(num(x.closingTD) * P.r)}</td></tr>`).join('');

  $('#notes-wrap').innerHTML = `
  <div class="note-block">
    <h3>Income tax expense</h3>
    <div class="note-sub">For YA ${esc(settings.ya)} — amounts in ${esc(cur)}</div>
    <div class="table-wrap"><table class="comp-table"><tbody>
      <tr class="section"><td colspan="2">Current tax</td></tr>
      <tr><td class="label">Current year</td><td class="num">${acc(P.currentTax)}</td></tr>
      <tr class="section"><td colspan="2">Deferred tax</td></tr>
      <tr><td class="label">Origination and reversal of temporary differences — current year</td><td class="num">${acc(P.deferredCY)}</td></tr>
      <tr class="section"><td colspan="2">Prior years</td></tr>
      <tr><td class="label">(Over)/under provision — current tax</td><td class="num">${acc(P.priorAdj)}</td></tr>
      <tr><td class="label">(Over)/under provision — deferred tax</td><td class="num">${acc(P.deferredPriorYr)}</td></tr>
      <tr class="subtotal"><td class="label">Total (over)/under provision — prior years</td><td class="num">${acc(P.priorYearProvision)}</td></tr>
      <tr class="grand"><td class="label">Income tax expense</td><td class="num">${acc(P.totalTaxExpense)}</td></tr>
    </tbody></table></div>
  </div>

  <div class="note-block">
    <h3>Reconciliation of effective tax rate</h3>
    <div class="note-sub">Profit before tax ${acc(P.pbt)}; effective rate ${pct(P.etr * 100)}</div>
    <div class="table-wrap"><table class="comp-table"><tbody>
      ${recon.map(x => `<tr class="${x.grand ? 'grand' : ''}"><td class="label">${esc(x.label)}</td><td class="num">${acc(x.amt)}</td></tr>`).join('')}
    </tbody></table></div>
  </div>

  <div class="note-block">
    <h3>Deferred tax</h3>
    <div class="note-sub">Movement in deferred tax ${P.closingDT >= 0 ? 'liabilities' : 'assets'} by component</div>
    <div class="table-wrap"><table>
      <thead><tr><th>Component</th><th class="num">Opening</th><th class="num">Recognised in P&amp;L</th><th class="num">Closing</th></tr></thead>
      <tbody>${dtRows || '<tr class="empty-row"><td colspan="4">No temporary differences.</td></tr>'}</tbody>
      <tfoot><tr><td>Total</td><td class="num">${acc(P.openingDT)}</td><td class="num">${acc(P.deferredCharge)}</td><td class="num">${acc(P.closingDT)}</td></tr></tfoot>
    </table></div>
  </div>`;
}

/* ----- Data & settings ----- */
function renderData() {
  $('#s-companyName').value = settings.companyName;
  $('#s-currency').value = settings.currency;
  $('#s-entity').value = settings.entity;
  $('#s-ya').value = settings.ya;
  $('#s-periodEnd').value = settings.periodEnd || '';
  $('#s-taxRate').value = settings.taxRate;
  $('#s-exemption').value = settings.exemption;
  $('#s-rebatePct').value = settings.rebatePct;
  $('#s-rebateCap').value = settings.rebateCap;
  $('#s-glTaxExpense').value = settings.glTaxExpense;
  $('#s-glDeferredExpense').value = settings.glDeferredExpense;
  $('#s-glTaxPayable').value = settings.glTaxPayable;
  $('#s-glDeferredBalance').value = settings.glDeferredBalance;
  $('#s-glBank').value = settings.glBank;
  if ($('#s-capRate')) $('#s-capRate').value = settings.capRate;
  if ($('#s-sgdRate')) $('#s-sgdRate').value = settings.sgdRate;
  if ($('#s-remunCodes')) $('#s-remunCodes').value = settings.remunCodes;
  if ($('#s-currentTaxCodes')) $('#s-currentTaxCodes').value = settings.currentTaxCodes;

  const f = provision.far;
  $('#far-status').innerHTML = f
    ? `<div class="banner info"><strong>${esc(f.companyName)}</strong> imported as at ${esc(f.reportingDate)} (${f.assetCount ?? '—'} assets).<br>
        Accounting NBV ${fmt(f.closing.nbv)} · Tax WDV ${fmt(f.closing.twdv)} · temporary difference ${acc(f.closing.td)}.<br>
        Feeds: depreciation add-back ${fmt(f.closing.acctDep)}, capital allowances ${fmt(f.closing.taxCA)}, deferred-tax difference (opening ${acc(f.opening.td)} → closing ${acc(f.closing.td)}).</div>`
    : `<div class="banner">No register imported yet.</div>`;
}

/* =============================================================
   FAR IMPORT
   ============================================================= */
function applyFarImport(data) {
  const s = summarizeFarBackup(data);
  provision.far = {
    companyName: s.companyName, reportingDate: s.reportingDate, priorDate: s.priorDate,
    assetCount: s.assetCount, closing: s.closing, opening: s.opening,
    importedAt: new Date().toISOString(),
  };
  // Replace any previously imported FAR-sourced lines.
  provision.addBacks = provision.addBacks.filter(x => x.source !== 'far');
  provision.deductions = provision.deductions.filter(x => x.source !== 'far');
  provision.deferredItems = provision.deferredItems.filter(x => x.source !== 'far');

  provision.addBacks.push({ id: uid(), label: 'Depreciation of property, plant & equipment (per FAR)', amount: round2(s.closing.acctDep), type: 'temporary', source: 'far' });
  provision.deductions.push({ id: uid(), label: 'Capital allowances (per FAR)', amount: round2(s.closing.taxCA), type: 'temporary', source: 'far' });
  provision.deferredItems.push({ id: uid(), label: 'Accelerated capital allowances (per FAR)', openingTD: round2(s.opening.td), closingTD: round2(s.closing.td), source: 'far' });

  saveProvision();
  renderAll();
  toast('FAR register imported — ' + s.assetCount + ' assets');
}
function round2(v) { return Math.round(num(v) * 100) / 100; }

/* Pull FAR data straight from this browser's localStorage. On the live site
   FAR (/FAR/) and this app (/TaxProvision/) share the github.io origin, so
   FAR's saved register is readable here without exporting a file. */
function importFarFromBrowser() {
  const raw = localStorage.getItem('far.assets.v1');
  if (!raw) { toast('No FAR data in this browser — open the FAR app and load a register first'); return; }
  let assets, s = {};
  try {
    assets = JSON.parse(raw);
    const sraw = localStorage.getItem('far.settings.v1');
    if (sraw) s = JSON.parse(sraw);
  } catch (e) { toast('Could not read FAR data'); return; }
  try { applyFarImport({ assets, settings: s }); } catch (err) { toast('Import failed: ' + err.message); }
}

/* ---------- Trial balance CSV ---------- */
function parseCsv(text) {
  const rows = [];
  text.replace(/\r\n/g, '\n').split('\n').forEach(line => {
    if (line.trim() === '') return;
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    rows.push(cells);
  });
  return rows;
}
/* Parse a number that may use commas, parentheses for negatives, or blanks/dashes. */
function cleanNum(v) {
  let s = String(v == null ? '' : v).trim().replace(/[,"\s]/g, '');
  if (s === '' || s === '-' || /^#/.test(s)) return 0;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  const n = parseFloat(s);
  return isFinite(n) ? (neg ? -n : n) : 0;
}
function looksNumeric(v) { const s = String(v == null ? '' : v).trim(); return s !== '' && /^[\(\)\-\d., "]+$/.test(s); }

/* Accepts either Code,Name,Opening,Debit,Credit,Closing (full movement TB) or
   Code,Name,Debit,Credit. Header/preamble rows (non-numeric) are skipped. */
function importTbCsv(rows) {
  if (!rows.length) { toast('Empty CSV'); return; }
  const tb = [];
  for (const r of rows) {
    if (!r.length || !r[0]) continue;
    if (/^total/i.test(String(r[0]).trim())) continue;
    if (!/\d/.test(String(r[0]))) continue;           // account codes contain digits; skips headers
    const wide = r.length >= 6 && (looksNumeric(r[5]) || looksNumeric(r[2]));
    if (wide) {
      tb.push({ id: uid(), code: String(r[0]).trim(), name: String(r[1] || '').trim(), opening: cleanNum(r[2]), debit: cleanNum(r[3]), credit: cleanNum(r[4]), closing: cleanNum(r[5]) });
    } else {
      const debit = cleanNum(r[2]), credit = cleanNum(r[3]);
      tb.push({ id: uid(), code: String(r[0]).trim(), name: String(r[1] || '').trim(), opening: 0, debit, credit, closing: debit - credit });
    }
  }
  if (!tb.length) { toast('No account rows found in CSV'); return; }
  provision.tb = tb;
  saveProvision(); renderAll(); toast(tb.length + ' accounts imported');
}
function exportTbCsv() {
  const am = auditMap();
  const rows = [['Code', 'Name', 'Opening', 'Debit', 'Credit', 'Closing', 'Audit adj', 'Adjusted closing']];
  provision.tb.slice().sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }))
    .forEach(a => { const adj = am[String(a.code)] || 0; rows.push([a.code, a.name, round2(a.opening), round2(a.debit), round2(a.credit), round2(a.closing), round2(adj), round2(num(a.closing) + adj)]); });
  download(`trial-balance-ya${settings.ya}.csv`, toCsv(rows), 'text/csv');
}
/* Import a transfer-pricing / statutory adjustment file. It is multi-entity;
   rows are filtered to settings.entity and posted as audit adjustments against
   the matching TB account (Net (USD): positive = debit, negative = credit). */
function importStatCsv(rows) {
  let h = -1; const col = {};
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].map(c => String(c).trim());
    if (r.includes('Entity') && r.includes('Account no')) { h = i; r.forEach((n, idx) => { if (n && !(n in col)) col[n] = idx; }); break; }
  }
  if (h < 0) { toast('Could not find the stat-adjustment header (needs Entity & Account no columns)'); return; }
  const iEnt = col['Entity'], iAcc = col['Account no'], iDesc = col['Description'];
  const iNet = col['Net (USD)'], iDr = col['DR (Txn)'], iCr = col['CR (Txn)'];
  const entity = (settings.entity || '').trim();
  const added = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i];
    const ent = String(r[iEnt] || '').trim();
    if (!ent) continue;
    const code = String(r[iAcc] || '').trim();
    if (!code || !/\d/.test(code)) continue;
    let net = iNet != null ? cleanNum(r[iNet]) : 0;
    if (!net && iDr != null && iCr != null) net = cleanNum(r[iDr]) - cleanNum(r[iCr]);
    if (Math.abs(net) < 0.005) continue;
    added.push({ id: uid(), account: code, description: String(r[iDesc] || 'Stat adjustment').trim(), debit: net > 0 ? round2(net) : 0, credit: net < 0 ? round2(-net) : 0, source: 'stat', entity: ent });
  }
  if (!added.length) { toast('No adjustment rows found in the file'); return; }
  // Keep the whole file but only the configured entity is shown/used.
  provision.auditAdjustments = provision.auditAdjustments.filter(e => e.source !== 'stat').concat(added);
  saveProvision(); renderAll();
  const mine = added.filter(e => e.entity.toLowerCase() === entity.toLowerCase()).length;
  const others = added.length - mine;
  toast(`${mine} adjustments for ${entity}` + (others ? ` · ${others} other-entity rows hidden` : ''));
}

/* Attach an insurance-premium breakdown. Each row: a policy label, a type cell
   containing "Life" or "Medical", and a numeric amount (the last numeric column
   is taken as the USD figure). Subtotal/header rows without a type are skipped. */
function importPremiumsCsv(rows) {
  const out = [];
  for (const r of rows) {
    if (!r || !r.length) continue;
    const typeCell = r.find(c => /^\s*(life|medical)\s*$/i.test(String(c)));
    if (!typeCell) continue;
    const type = /life/i.test(typeCell) ? 'Life' : 'Medical';
    const policy = String(r[0] || '').trim();
    let amt = 0;
    for (let i = r.length - 1; i >= 0; i--) { if (looksNumeric(r[i])) { amt = cleanNum(r[i]); break; } }
    if (Math.abs(amt) < 0.005) continue;
    out.push({ id: uid(), policy, type, amount: round2(amt) });
  }
  if (!out.length) { toast('No premium rows found (need a Life/Medical column)'); return; }
  provision.insurancePremiums = out;
  saveProvision(); renderAll();
  toast(`${out.length} premiums attached — Life ${fmt(premiumSum('Life'))}, Medical ${fmt(premiumSum('Medical'))}`);
}

function exportAuditCsv() {
  const tm = tbMap();
  const rows = [['Entity', 'Account', 'Account name', 'Description', 'Debit', 'Credit']];
  provision.auditAdjustments.forEach(e => { const a = tm[String(e.account)]; rows.push([e.entity || settings.entity, e.account, a ? a.name : '', e.description, round2(e.debit), round2(e.credit)]); });
  download(`audit-adjustments-ya${settings.ya}.csv`, toCsv(rows), 'text/csv');
}

/* =============================================================
   CSV / EXPORT
   ============================================================= */
function csvEsc(v) { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function toCsv(rows) { return rows.map(r => r.map(csvEsc).join(',')).join('\r\n'); }

function exportCurrentCsv() {
  const P = recompute();
  const rows = [['Tax computation', 'YA ' + settings.ya], ['Item', 'Amount'],
    ['Net profit/(loss) before tax', P.pbt]];
  provision.addBacks.forEach(x => rows.push(['Add-back: ' + x.label + ' (' + x.type + ')' + (x.account ? ' [TB ' + x.account + ']' : ''), round2(lineAmt(x))]));
  rows.push(['Total add-backs', P.addTotal]);
  provision.deductions.forEach(x => rows.push(['Deduction: ' + x.label + ' (' + x.type + ')' + (x.account ? ' [TB ' + x.account + ']' : ''), -round2(lineAmt(x))]));
  rows.push(['Total deductions', -P.dedTotal], ['Adjusted profit/(loss)', P.adjusted],
    ['Losses utilised', -P.lossOffset], ['Chargeable income before exemption', P.ciBeforeExempt],
    ['Tax exemption', -P.exemption], ['Chargeable income', P.chargeableIncome],
    ['Tax at ' + settings.taxRate + '%', P.grossTax], ['CIT rebate', -P.rebate],
    ['Foreign tax credits', -P.ftc], ['Current tax payable', P.currentTax]);
  download(`tax-computation-ya${settings.ya}.csv`, toCsv(rows), 'text/csv');
}

function exportReconCsv() {
  const P = recompute();
  const rows = [['Effective tax rate reconciliation', 'YA ' + settings.ya], ['Item', 'Amount', '% of PBT']];
  reconLines(P).forEach(x => rows.push([x.label, round2(x.amt), P.pbt ? round2(x.amt / P.pbt * 100) : '']));
  download(`tax-reconciliation-ya${settings.ya}.csv`, toCsv(rows), 'text/csv');
}

function copyNotes() {
  const txt = $('#notes-wrap').innerText;
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast('Notes copied')).catch(() => toast('Copy failed'));
  else toast('Clipboard unavailable');
}

/* =============================================================
   EVENTS
   ============================================================= */
function switchTab(tab) {
  activeTab = tab;
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + tab));
  render();
}

/* Delegated input handling for editable computation cells.
   'input' fires on every keystroke — used for live totals on the Current Tax
   tab (which updates derived cells in place, keeping focus). Other tabs
   re-render only on 'change' (blur) so typing doesn't steal focus. */
function onFieldInput(e) {
  const t = e.target;
  const committed = e.type === 'change';
  if (t.dataset.scalar) {
    provision[t.dataset.scalar] = t.value === '' ? 0 : num(t.value);
    saveProvision();
    if (activeTab === 'current') updateCurrentComputed();
    else if (committed) render();
    return;
  }
  const row = t.closest('[data-line]');
  if (row && t.dataset.key) {
    const list = provision[row.dataset.line];
    const item = list[+row.dataset.idx];
    if (!item) return;
    const key = t.dataset.key;
    const stringKey = key === 'label' || key === 'type' || key === 'code' || key === 'name' || key === 'account' || key === 'description' || key === 'policy';
    item[key] = stringKey ? t.value : (t.value === '' ? 0 : num(t.value));
    saveProvision();
    // 'type' and 'account' change layout/derived amounts — need a full re-render.
    const heavy = key === 'type' || key === 'account';
    if (activeTab === 'current' && !heavy) updateCurrentComputed();
    else if (committed || heavy) render();
  }
}

function onClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'view-pdf') { const d = loadPremiumDoc(); if (d) openDataUri(d.dataUri, d.name); return; }
  if (act === 'remove-pdf') { if (confirm('Remove the attached invoice?')) { localStorage.removeItem(PREMDOC_KEY); renderMedical(); toast('Invoice removed'); } return; }
  if (act === 'toggle-pbt') {
    if (pbtIsLinked()) { provision.profitBeforeTax = round2(tbProfitBeforeTax()); provision.pbtLinked = false; }
    else { provision.pbtLinked = true; }
    saveProvision(); render();
  } else if (act === 'add-line') {
    const which = btn.dataset.line;
    provision[which].push({ id: uid(), label: '', amount: 0, type: 'permanent', source: 'manual' });
    saveProvision(); render();
  } else if (act === 'del-line') {
    const row = btn.closest('[data-line]');
    provision[row.dataset.line].splice(+row.dataset.idx, 1);
    saveProvision(); render();
  }
}

function wire() {
  $$('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  document.querySelector('main').addEventListener('input', onFieldInput);
  document.querySelector('main').addEventListener('change', onFieldInput);
  document.querySelector('main').addEventListener('click', onClick);

  $('#btn-add-dt').addEventListener('click', () => {
    provision.deferredItems.push({ id: uid(), label: '', openingTD: 0, closingTD: 0, source: 'manual' });
    saveProvision(); render();
  });

  // Trial balance
  $('#btn-add-tb').addEventListener('click', () => {
    provision.tb.push({ id: uid(), code: '', name: '', opening: 0, debit: 0, credit: 0, closing: 0 });
    tbEdit = true; saveProvision(); render();
  });
  $('#tb-search').addEventListener('input', e => { tbFilter = e.target.value; renderTB(); });
  $('#btn-tb-edit').addEventListener('click', () => { tbEdit = !tbEdit; renderTB(); });
  $('#btn-import-tb').addEventListener('click', () => $('#tb-file').click());
  $('#tb-file').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { importTbCsv(parseCsv(reader.result)); e.target.value = ''; };
    reader.readAsText(file);
  });
  $('#exp-tb').addEventListener('click', exportTbCsv);

  // Audit adjustments
  $('#btn-add-audit').addEventListener('click', () => {
    provision.auditAdjustments.push({ id: uid(), account: '', description: '', debit: 0, credit: 0 });
    saveProvision(); render();
  });
  $('#btn-import-stat').addEventListener('click', () => $('#stat-file').click());
  $('#btn-clear-stat').addEventListener('click', () => {
    const n = provision.auditAdjustments.filter(e => e.source === 'stat').length;
    if (!n) { toast('No imported stat adjustments'); return; }
    if (!confirm(`Remove ${n} imported stat adjustments?`)) return;
    provision.auditAdjustments = provision.auditAdjustments.filter(e => e.source !== 'stat');
    saveProvision(); renderAll(); toast('Imported stat adjustments cleared');
  });
  $('#stat-file').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { importStatCsv(parseCsv(reader.result)); e.target.value = ''; };
    reader.readAsText(file);
  });
  $('#exp-audit').addEventListener('click', exportAuditCsv);

  // Medical — insurance premiums
  $('#btn-add-prem').addEventListener('click', () => {
    provision.insurancePremiums.push({ id: uid(), policy: '', type: 'Medical', amount: 0, source: 'manual' });
    saveProvision(); render();
  });
  $('#btn-attach-prem').addEventListener('click', () => $('#prem-file').click());
  $('#prem-file').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { importPremiumsCsv(parseCsv(reader.result)); e.target.value = ''; };
    reader.readAsText(file);
  });
  $('#btn-clear-prem').addEventListener('click', () => {
    if (!provision.insurancePremiums.length) return;
    if (!confirm('Clear all attached premiums?')) return;
    provision.insurancePremiums = []; saveProvision(); renderAll(); toast('Premiums cleared');
  });
  $('#btn-attach-pdf').addEventListener('click', () => $('#pdf-file').click());
  $('#pdf-file').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('PDF too large (max ~5 MB) for browser storage'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => { if (savePremiumDoc({ name: file.name, dataUri: reader.result })) { renderMedical(); toast('Invoice attached'); } e.target.value = ''; };
    reader.readAsDataURL(file);
  });

  // Pull FAR data from the same browser (shared origin on the live site)
  $('#btn-far-browser').addEventListener('click', importFarFromBrowser);

  $('#btn-save-settings').addEventListener('click', () => {
    settings.companyName = $('#s-companyName').value.trim() || 'Company';
    settings.currency = $('#s-currency').value.trim() || '$';
    settings.entity = $('#s-entity').value.trim();
    settings.ya = $('#s-ya').value.trim() || '';
    settings.periodEnd = $('#s-periodEnd').value || null;
    settings.taxRate = num($('#s-taxRate').value);
    settings.exemption = $('#s-exemption').value;
    settings.rebatePct = num($('#s-rebatePct').value);
    settings.rebateCap = num($('#s-rebateCap').value);
    settings.glTaxExpense = $('#s-glTaxExpense').value.trim();
    settings.glDeferredExpense = $('#s-glDeferredExpense').value.trim();
    settings.glTaxPayable = $('#s-glTaxPayable').value.trim();
    settings.glDeferredBalance = $('#s-glDeferredBalance').value.trim();
    settings.glBank = $('#s-glBank').value.trim();
    if ($('#s-capRate')) settings.capRate = num($('#s-capRate').value);
    if ($('#s-sgdRate')) settings.sgdRate = num($('#s-sgdRate').value) || 1.2854;
    if ($('#s-remunCodes')) settings.remunCodes = $('#s-remunCodes').value.trim();
    if ($('#s-currentTaxCodes')) settings.currentTaxCodes = $('#s-currentTaxCodes').value.trim();
    saveSettings(); renderAll(); toast('Settings saved');
  });

  $('#exp-current').addEventListener('click', exportCurrentCsv);
  $('#exp-recon').addEventListener('click', exportReconCsv);
  $('#exp-journals').addEventListener('click', () => exportJournalsCsv());
  $('#exp-notes').addEventListener('click', copyNotes);

  // FAR import
  $('#btn-import-far').addEventListener('click', () => $('#far-file').click());
  $('#far-file').addEventListener('change', e => readJson(e, data => {
    try { applyFarImport(data); } catch (err) { toast('Import failed: ' + err.message); }
  }));

  // Backup / restore
  $('#btn-export-json').addEventListener('click', () =>
    download(`tax-provision-ya${settings.ya}.json`, JSON.stringify({ settings, provision }, null, 2), 'application/json'));
  $('#btn-import').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', e => readJson(e, data => {
    if (data.settings) settings = Object.assign({}, defaultSettings, data.settings);
    if (data.provision) provision = Object.assign(emptyProvision(), data.provision);
    saveSettings(); saveProvision(); renderAll(); toast('Restored');
  }));

  $('#btn-sample').addEventListener('click', () => {
    if (provision.profitBeforeTax || provision.addBacks.length) {
      if (!confirm('Replace the current provision with the sample?')) return;
    }
    loadSample(); saveSettings(); saveProvision(); renderAll(); toast('Sample loaded');
  });
  $('#btn-restore').addEventListener('click', () => { restoreSampleLines(); renderAll(); toast('Automated lines restored'); });
  $('#btn-clear').addEventListener('click', () => {
    if (!confirm('Clear all provision data from this browser?')) return;
    localStorage.removeItem(STORE_KEY); localStorage.removeItem(SETTINGS_KEY); localStorage.removeItem(PREMDOC_KEY);
    localStorage.setItem(INIT_KEY, '1'); // stay cleared; don't re-seed the sample on reload
    settings = Object.assign({}, defaultSettings); provision = emptyProvision();
    renderAll(); toast('Cleared');
  });
}

function readJson(e, cb) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { try { cb(JSON.parse(reader.result)); } catch (err) { toast('Invalid JSON file'); } e.target.value = ''; };
  reader.readAsText(file);
}

/* ---------- Boot ----------
   On the very first visit (nothing saved yet) seed the AUS155 sample so the
   app opens with data instead of a blank statement. The init marker means an
   explicit "Clear all data" stays cleared and we never overwrite real work.
   DO NOT bump INIT_KEY to push sample changes — that re-seeds on next load and
   wipes the user's imported data (stat adjustments, premiums, edits). Sample
   updates are picked up only via an explicit "Load sample provision". */
const INIT_KEY = 'taxprov.init.v5';
if (!localStorage.getItem(INIT_KEY)) {
  loadSample();
  saveSettings();
  saveProvision();
  localStorage.setItem(INIT_KEY, '1');
}
/* Non-destructive self-heal: re-add any missing standard automated lines
   (premiums, add-backs/deductions, deferred items) that were deleted before
   the ✕ was removed from locked rows. Only ADDS what's missing — never removes
   imports (stat adjustments), manual entries, or edits. Runs once. */
function restoreSampleLines() {
  if (typeof sampleProvision !== 'function') return;
  const s = sampleProvision();
  const key = x => x.account || x.label;
  // Migrate: drop the old manual IFRS 16 deduction (now computed via @ifrs16).
  provision.deductions = (provision.deductions || []).filter(x => !(!x.account && /IFRS ?16|FRS ?116/i.test(x.label || '')));
  ['addBacks', 'deductions'].forEach(list => {
    const have = new Set((provision[list] || []).map(key));
    s[list].forEach(x => { if (!have.has(key(x))) provision[list].push(x); });
  });
  const havePrem = new Set((provision.insurancePremiums || []).map(p => p.policy));
  s.insurancePremiums.forEach(p => { if (!havePrem.has(p.policy)) provision.insurancePremiums.push(p); });
  // Migrate deferred items to the TB-linked versions (drop old manual / ifrs16 copies).
  const stdDefLabels = new Set(s.deferredItems.map(x => x.label));
  provision.deferredItems = (provision.deferredItems || []).filter(x => x.source !== 'ifrs16' && !stdDefLabels.has(x.label));
  const haveDef = new Set(provision.deferredItems.map(x => x.label));
  s.deferredItems.forEach(x => { if (!haveDef.has(x.label)) provision.deferredItems.push(x); });
  if (!provision.tb.length && s.tb.length) provision.tb = s.tb;
  if (provision.priorYearProvisionCarried == null) provision.priorYearProvisionCarried = s.priorYearProvisionCarried || 0;
  saveProvision();
}
const HEAL_KEY = 'taxprov.heal.v5';
if (localStorage.getItem(INIT_KEY) && !localStorage.getItem(HEAL_KEY)) {
  restoreSampleLines();  // existing sessions: top up standard lines lost to earlier ✕ deletes
}
localStorage.setItem(HEAL_KEY, '1');

wire();
renderAll();
