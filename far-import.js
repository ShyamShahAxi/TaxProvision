/* =============================================================
   FAR import engine
   -----------------------------------------------------------------
   A self-contained port of the Fixed Asset Register (FAR) depreciation
   and capital-allowance engine. It re-derives, from a FAR JSON backup
   ({ settings, assets }), the figures the tax provision needs:

     - accounting net book value (NBV) and tax written-down value (TWDV)
       as at the FAR reporting date and one year earlier;
     - the temporary difference (NBV − TWDV) at each date — the base for
       deferred tax on accelerated capital allowances;
     - the current-year accounting depreciation charge (an add-back) and
       current-year capital allowances (a deduction).

   The engine reads the settings from the FAR file itself, so the numbers
   match what the FAR app shows for that backup regardless of the tax
   app's own settings. Kept deliberately faithful to FAR/app.js so the
   two stay in step; see that file for the annotated original.
   ============================================================= */

'use strict';

function createFarEngine(settings) {
  const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const parseDate = iso => { if (!iso) return null; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? null : d; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);

  const fyEndFor = date => {
    const m = settings.fyEndMonth, d = settings.fyEndDay;
    let end = new Date(date.getFullYear(), m - 1, d);
    if (date > end) end = new Date(date.getFullYear() + 1, m - 1, d);
    return end;
  };
  const fyStartFor = fyEnd => addDays(new Date(fyEnd.getFullYear() - 1, settings.fyEndMonth - 1, settings.fyEndDay), 1);
  const sameFY = (a, b) => fyEndFor(a).getTime() === fyEndFor(b).getTime();

  const acctCost = a => num(a.purchaseCost) + num(a.installationCost) + num(a.otherCost);
  const taxCost = a => (a.taxCostOverride !== '' && a.taxCostOverride != null) ? num(a.taxCostOverride) : acctCost(a);

  const hasWIP = a => !!(a && a.wipCategory && parseDate(a.inServiceDate));
  const depStartDate = a => parseDate(a.inServiceDate) || parseDate(a.acquisitionDate);
  const categoryAsAt = (a, atDate) => {
    const cat = a.category || 'Uncategorised';
    if (!hasWIP(a)) return cat;
    const svc = parseDate(a.inServiceDate);
    return (svc && atDate < svc) ? a.wipCategory : cat;
  };

  function endOfLife(startDate, method, lifeYears) {
    if (method === 'reducing-balance' || method === 'diminishing-value' || (method === 'prime-cost' && !lifeYears)) {
      return new Date(startDate.getFullYear() + 60, startDate.getMonth(), startDate.getDate());
    }
    const y = lifeYears || 0;
    const whole = Math.floor(y);
    const monthFrac = Math.round((y - whole) * 12);
    const e = new Date(startDate);
    e.setFullYear(e.getFullYear() + whole);
    e.setMonth(e.getMonth() + monthFrac);
    return e;
  }

  function buildSchedule(a, kind, asOf) {
    const acq = parseDate(a.acquisitionDate);
    if (!acq) return { rows: [] };

    const disposal = a.disposed ? parseDate(a.disposalDate) : null;
    const horizon = asOf;
    const depStart = depStartDate(a) || acq;

    let method, base, residual, lifeYears, rate, initialAllow;
    if (kind === 'acct') {
      method = a.acctMethod || 'straight-line';
      base = acctCost(a);
      residual = num(a.residualValue);
      lifeYears = num(a.usefulLife);
      rate = num(a.acctRate);
      initialAllow = 0;
    } else {
      method = a.taxMethod || 'prime-cost';
      base = taxCost(a);
      residual = 0;
      lifeYears = num(a.taxLife);
      rate = num(a.taxRate);
      initialAllow = num(a.taxInitialAllowance);
    }

    const lifeEnd = (method === 'straight-line' && lifeYears)
      ? endOfLife(depStart, 'straight-line', lifeYears)
      : (method === 'prime-cost' && lifeYears && !rate ? endOfLife(depStart, 'prime-cost', lifeYears) : null);

    const rows = [];
    let opening = 0, accumulated = 0;
    let fyEnd = fyEndFor(acq);
    let carry = base, firstFY = true, guard = 0;
    const depreciable = Math.max(0, base - residual);

    while (guard++ < 200) {
      const fyStart = fyStartFor(fyEnd);
      const winStart = acq > fyStart ? acq : fyStart;
      let winEnd = fyEnd;
      if (disposal && disposal < winEnd) winEnd = disposal;
      if (horizon < winEnd) winEnd = horizon;
      if (winEnd < winStart) break;

      const depWinStart = depStart > winStart ? depStart : winStart;
      const daysInFY = daysBetween(fyStart, fyEnd) + 1;
      const depDays = winEnd >= depWinStart ? daysBetween(depWinStart, winEnd) + 1 : 0;
      let frac = Math.min(1, depDays / daysInFY);
      const inServiceThisFY = depStart >= fyStart && depStart <= fyEnd;
      if (kind === 'tax') frac = depDays > 0 ? 1 : 0;

      opening = carry;
      const addition = firstFY ? base : 0;
      let charge = 0;

      if (opening - residual > 0.005) {
        if (method === 'straight-line' || method === 'prime-cost') {
          let annual;
          if (method === 'prime-cost' && rate) annual = base * (rate / 100);
          else if (lifeYears) annual = depreciable / lifeYears;
          else annual = 0;
          charge = annual * frac;
        } else {
          charge = opening * (rate / 100) * frac;
        }
        if (inServiceThisFY && initialAllow) charge += base * (initialAllow / 100);
        charge = Math.min(charge, opening - residual);
        if (charge < 0) charge = 0;
      }

      accumulated += charge;
      carry = opening - charge;

      let disposalRemoval = 0, disposed = false;
      if (disposal && disposal <= fyEnd && disposal >= fyStart && disposal <= horizon) {
        disposalRemoval = carry;
        disposed = true;
      }

      rows.push({ fyEnd: new Date(fyEnd), opening, addition, charge, closing: disposed ? 0 : carry, accumulated, disposalRemoval, disposed });

      if (disposed) break;
      if (lifeEnd && fyEnd >= lifeEnd) break;
      if (carry - residual <= 0.005 && (method === 'straight-line' || method === 'prime-cost')) break;
      if (fyEnd >= horizon) break;
      if (rate === 0 && method !== 'straight-line' && method !== 'prime-cost') break;

      firstFY = false;
      fyEnd = new Date(fyEnd.getFullYear() + 1, settings.fyEndMonth - 1, settings.fyEndDay);
    }

    return { rows };
  }

  function positionAt(a, kind, horizon) {
    const sched = buildSchedule(a, kind, horizon);
    const base = kind === 'acct' ? acctCost(a) : taxCost(a);
    let nbv = base, chargeThisFY = 0;

    for (const r of sched.rows) {
      if (sameFY(r.fyEnd, horizon)) {
        chargeThisFY = r.charge;
        nbv = r.disposed ? 0 : r.closing;
        break;
      }
      if (r.fyEnd < horizon) {
        nbv = r.disposed ? 0 : r.closing;
        chargeThisFY = 0;
      } else break;
    }

    const disposed = a.disposed && parseDate(a.disposalDate) && parseDate(a.disposalDate) <= horizon;
    return { nbv: disposed ? 0 : nbv, chargeThisFY };
  }

  /* Aggregate every asset's position as at `horizon` into register totals. */
  function summarize(assets, horizon) {
    let nbv = 0, twdv = 0, acctDep = 0, taxCA = 0;
    const byCat = {};
    for (const a of assets) {
      const acq = parseDate(a.acquisitionDate);
      if (acq && acq > horizon) continue; // not yet acquired
      const pa = positionAt(a, 'acct', horizon);
      const pt = positionAt(a, 'tax', horizon);
      nbv += pa.nbv; twdv += pt.nbv;
      acctDep += pa.chargeThisFY; taxCA += pt.chargeThisFY;
      const cat = categoryAsAt(a, horizon);
      (byCat[cat] = byCat[cat] || { nbv: 0, twdv: 0 });
      byCat[cat].nbv += pa.nbv; byCat[cat].twdv += pt.nbv;
    }
    return { nbv, twdv, td: nbv - twdv, acctDep, taxCA, byCat };
  }

  return { summarize, parseDate };
}

/* Public entry point: turn a FAR JSON backup into a provision-ready summary. */
function summarizeFarBackup(data) {
  if (!data || !Array.isArray(data.assets)) throw new Error('Not a FAR backup: no "assets" array found.');
  const s = Object.assign(
    { fyEndMonth: 6, fyEndDay: 30, dtRate: 17, companyName: 'Company', currency: '$', reportingDate: null },
    data.settings || {}
  );
  const assets = data.assets;
  const eng = createFarEngine(s);
  const closingDate = eng.parseDate(s.reportingDate) || new Date(new Date().toDateString());
  const openingDate = new Date(closingDate.getFullYear() - 1, closingDate.getMonth(), closingDate.getDate());

  const closing = eng.summarize(assets, closingDate);
  const opening = eng.summarize(assets, openingDate);

  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  return {
    companyName: s.companyName,
    currency: s.currency,
    rate: num_(s.dtRate),
    reportingDate: iso(closingDate),
    priorDate: iso(openingDate),
    assetCount: assets.length,
    closing, opening,
  };
  function num_(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { summarizeFarBackup, createFarEngine };
