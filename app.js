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

/* ---------- Settings ---------- */
const defaultSettings = {
  companyName: 'AxiCorp Pte Ltd',
  currency: '$',
  ya: '2026',
  periodEnd: null,          // ISO yyyy-mm-dd basis-period end
  taxRate: 17,              // Singapore corporate tax rate %
  exemption: 'partial',     // 'partial' | 'startup' | 'none'
  rebatePct: 0,             // corporate income tax rebate %
  rebateCap: 0,             // rebate cap (0 = no cap)
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
  addBacks: [],             // {id,label,amount,type:'permanent'|'temporary',source}
  deductions: [],           // {id,label,amount,type,source}
  lossesBroughtForward: 0,
  foreignTaxCredits: 0,
  deferredItems: [],        // {id,label,openingTD,closingTD,source}
  openingCurrentTaxPayable: 0,
  priorYearAdjustment: 0,   // (over)/under provision — under = positive
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
function fmt(v) {
  const n = num(v);
  return settings.currency + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
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

  const addPermTotal = sum(addPerm, 'amount');
  const addTempTotal = sum(addTemp, 'amount');
  const dedPermTotal = sum(dedPerm, 'amount');
  const dedTempTotal = sum(dedTemp, 'amount');
  const addTotal = addPermTotal + addTempTotal;
  const dedTotal = dedPermTotal + dedTempTotal;

  const pbt = num(p.profitBeforeTax);
  const adjusted = pbt + addTotal - dedTotal;

  const lossesBF = num(p.lossesBroughtForward);
  const lossOffset = Math.min(Math.max(adjusted, 0), lossesBF);
  const ciBeforeExempt = Math.max(0, adjusted - lossOffset);
  const currentYearLoss = adjusted < 0 ? -adjusted : 0;
  const lossesCF = Math.max(0, lossesBF - lossOffset) + currentYearLoss;

  const exemption = exemptionAmount(ciBeforeExempt);
  const chargeableIncome = Math.max(0, ciBeforeExempt - exemption);

  const grossTax = chargeableIncome * r;
  const cap = num(settings.rebateCap);
  let rebate = grossTax * (num(settings.rebatePct) / 100);
  if (cap > 0) rebate = Math.min(rebate, cap);
  const netTaxOnProfit = Math.max(0, grossTax - rebate);
  const ftc = num(p.foreignTaxCredits);
  const currentTax = Math.max(0, netTaxOnProfit - ftc);

  // Deferred tax on temporary differences (carrying amount − tax base).
  const openingTD = sum(p.deferredItems, 'openingTD');
  const closingTD = sum(p.deferredItems, 'closingTD');
  const openingDT = openingTD * r;
  const closingDT = closingTD * r;
  const deferredCharge = closingDT - openingDT;   // + = expense (increase in liability)

  const priorAdj = num(p.priorYearAdjustment);
  const currentTaxExpense = currentTax + priorAdj;
  const totalTaxExpense = currentTaxExpense + deferredCharge;
  const etr = pbt !== 0 ? totalTaxExpense / pbt : 0;

  // Current tax payable roll-forward
  const closingPayable = num(p.openingCurrentTaxPayable) + currentTax + priorAdj - num(p.taxPaid);

  return {
    r, pbt, addPerm, addTemp, dedPerm, dedTemp,
    addPermTotal, addTempTotal, dedPermTotal, dedTempTotal, addTotal, dedTotal,
    adjusted, lossesBF, lossOffset, ciBeforeExempt, currentYearLoss, lossesCF,
    exemption, chargeableIncome, grossTax, rebate, netTaxOnProfit, ftc, currentTax,
    openingTD, closingTD, openingDT, closingDT, deferredCharge,
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
    { label: 'Deferred tax ' + (P.deferredCharge >= 0 ? 'charge' : 'credit'), value: acc(P.deferredCharge) },
    { label: 'Total tax expense', value: acc(P.totalTaxExpense), accent: true },
    { label: 'Effective tax rate', value: pct(P.etr * 100), hint: 'statutory ' + pct(settings.taxRate) },
  ];
  $('#kpi-row').innerHTML = kpis.map(k =>
    `<div class="kpi${k.accent ? ' accent' : ''}"><div class="label">${esc(k.label)}</div>` +
    `<div class="value${k.value.length > 12 ? ' sm' : ''}">${k.value}</div>` +
    (k.hint ? `<div class="hint">${esc(k.hint)}</div>` : '') + `</div>`).join('');

  $('#dash-charge').innerHTML = `<table class="comp-table"><tbody>
    <tr><td class="label">Current tax — current year</td><td class="num">${acc(P.currentTax)}</td></tr>
    <tr><td class="label">Current tax — prior year (over)/under provision</td><td class="num">${acc(P.priorAdj)}</td></tr>
    <tr><td class="label">Deferred tax — origination/(reversal) of temporary differences</td><td class="num">${acc(P.deferredCharge)}</td></tr>
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

/* ----- Current tax computation ----- */
function lineRows(list, listName) {
  if (!list.length) return `<tr><td class="indent" colspan="4"><span class="hint-text">No items.</span></td></tr>`;
  return list.map((x, i) => `<tr data-line="${listName}" data-idx="${i}">
    <td class="indent"><input class="desc-in" data-key="label" value="${attr(x.label)}" placeholder="Description">${x.source === 'far' ? '<span class="src-tag">FAR</span>' : ''}</td>
    <td class="num"><input class="amt" type="number" step="0.01" data-key="amount" value="${x.amount}"></td>
    <td class="num"><select data-key="type" class="type-sel">
      <option value="permanent"${x.type !== 'temporary' ? ' selected' : ''}>Permanent</option>
      <option value="temporary"${x.type === 'temporary' ? ' selected' : ''}>Temporary</option>
    </select></td>
    <td class="act"><button class="ghost sm" data-act="del-line" title="Remove">&times;</button></td>
  </tr>`).join('');
}

function renderCurrent(P) {
  const body = $('#current-body');
  body.innerHTML = `
    <tr class="section"><td colspan="4">Chargeable income</td></tr>
    <tr><td class="label">Net profit / (loss) before tax</td>
        <td class="num"><input class="amt" type="number" step="0.01" data-scalar="profitBeforeTax" value="${provision.profitBeforeTax}"></td>
        <td colspan="2"></td></tr>

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
    <tr><td class="label indent">Less: ${esc(exemptionLabel())}</td><td class="num" id="c-exemption">${acc(-P.exemption)}</td><td colspan="2"></td></tr>
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
    body.innerHTML = `<tr class="empty-row"><td colspan="6">No temporary differences. Add one, or import a FAR backup.</td></tr>`;
  } else {
    body.innerHTML = provision.deferredItems.map((x, i) => {
      const mv = (num(x.closingTD) - num(x.openingTD));
      return `<tr data-line="deferredItems" data-idx="${i}">
        <td><input class="desc-in" data-key="label" value="${attr(x.label)}" placeholder="e.g. accelerated capital allowances">${x.source === 'far' ? '<span class="src-tag">FAR</span>' : ''}</td>
        <td class="num"><input class="amt" type="number" step="0.01" data-key="openingTD" value="${x.openingTD}"></td>
        <td class="num"><input class="amt" type="number" step="0.01" data-key="closingTD" value="${x.closingTD}"></td>
        <td class="num">${acc(mv)}</td>
        <td class="num">${acc(num(x.closingTD) * r)}</td>
        <td class="act"><button class="ghost sm" data-act="del-line" title="Remove">&times;</button></td>
      </tr>`;
    }).join('');
  }
  $('#deferred-foot').innerHTML = `<tr>
    <td>Total — deferred tax ${P.closingDT >= 0 ? 'liability' : 'asset'}</td>
    <td class="num">${acc(P.openingTD)}</td>
    <td class="num">${acc(P.closingTD)}</td>
    <td class="num">${acc(P.closingTD - P.openingTD)}</td>
    <td class="num">${acc(P.closingDT)}</td><td></td></tr>`;
  $('#deferred-note').innerHTML =
    `Opening deferred tax ${fmt(Math.abs(P.openingDT))} → closing ${fmt(Math.abs(P.closingDT))} at ${pct(settings.taxRate)}. ` +
    `Movement of ${acc(P.deferredCharge)} is ${P.deferredCharge >= 0 ? 'charged to' : 'credited to'} profit or loss.`;
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
  if (P.priorAdj) rows.push({ label: '(Over)/under provision in respect of prior years', amt: P.priorAdj });
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
  $('#move-current').innerHTML = `
    <tr><td class="label">Opening current tax payable</td>
        <td class="num"><input class="amt" type="number" step="0.01" data-scalar="openingCurrentTaxPayable" value="${provision.openingCurrentTaxPayable}"></td></tr>
    <tr><td class="label">Current year tax charge</td><td class="num">${acc(P.currentTax)}</td></tr>
    <tr><td class="label">(Over)/under provision — prior years</td>
        <td class="num"><input class="amt" type="number" step="0.01" data-scalar="priorYearAdjustment" value="${provision.priorYearAdjustment}"></td></tr>
    <tr><td class="label">Tax paid during the year</td>
        <td class="num"><input class="amt" type="number" step="0.01" data-scalar="taxPaid" value="${provision.taxPaid}"></td></tr>
    <tr class="grand"><td class="label">Closing current tax payable</td><td class="num">${acc(P.closingPayable)}</td></tr>`;

  $('#move-deferred').innerHTML = `
    <tr><td class="label">Opening deferred tax ${P.openingDT >= 0 ? '(liability)' : 'asset'}</td><td class="num">${acc(P.openingDT)}</td></tr>
    <tr><td class="label">Charge/(credit) to profit or loss</td><td class="num">${acc(P.deferredCharge)}</td></tr>
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
      <tr><td class="label">(Over)/under provision in respect of prior years</td><td class="num">${acc(P.priorAdj)}</td></tr>
      <tr class="subtotal"><td class="label">Total current tax</td><td class="num">${acc(P.currentTaxExpense)}</td></tr>
      <tr class="section"><td colspan="2">Deferred tax</td></tr>
      <tr><td class="label">Origination and reversal of temporary differences</td><td class="num">${acc(P.deferredCharge)}</td></tr>
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

/* =============================================================
   CSV / EXPORT
   ============================================================= */
function csvEsc(v) { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function toCsv(rows) { return rows.map(r => r.map(csvEsc).join(',')).join('\r\n'); }

function exportCurrentCsv() {
  const P = recompute();
  const rows = [['Tax computation', 'YA ' + settings.ya], ['Item', 'Amount'],
    ['Net profit/(loss) before tax', P.pbt]];
  provision.addBacks.forEach(x => rows.push(['Add-back: ' + x.label + ' (' + x.type + ')', num(x.amount)]));
  rows.push(['Total add-backs', P.addTotal]);
  provision.deductions.forEach(x => rows.push(['Deduction: ' + x.label + ' (' + x.type + ')', -num(x.amount)]));
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
    item[key] = (key === 'label' || key === 'type') ? t.value : (t.value === '' ? 0 : num(t.value));
    saveProvision();
    if (activeTab === 'current' && key !== 'type') updateCurrentComputed();
    else if (committed) render();
  }
}

function onClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'add-line') {
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

  $('#btn-save-settings').addEventListener('click', () => {
    settings.companyName = $('#s-companyName').value.trim() || 'Company';
    settings.currency = $('#s-currency').value.trim() || '$';
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
  $('#btn-clear').addEventListener('click', () => {
    if (!confirm('Clear all provision data from this browser?')) return;
    localStorage.removeItem(STORE_KEY); localStorage.removeItem(SETTINGS_KEY);
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
   explicit "Clear all data" stays cleared and we never overwrite real work. */
const INIT_KEY = 'taxprov.init.v1';
if (!localStorage.getItem(INIT_KEY)) {
  loadSample();
  saveSettings();
  saveProvision();
  localStorage.setItem(INIT_KEY, '1');
}
wire();
renderAll();
