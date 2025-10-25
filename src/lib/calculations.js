// Tariff presets (example values; adjust as needed)
export const TARIFF_PRESETS = {
  MA: {
    currency: "MAD",
    tiers: [
      { upTo: 100, price: 0.9010 },
      { upTo: 150, price: 1.0740 },
      { upTo: 200, price: 1.0740 },
      { upTo: 300, price: 1.2827 },
      { upTo: 500, price: 1.4915 },
      { upTo: Infinity, price: 1.6994 }
    ]
  },
  FR: { currency: "EUR", tiers: [{ upTo: Infinity, price: 0.25 }] },
  US: { currency: "USD", tiers: [{ upTo: Infinity, price: 0.18 }] }
};

// Progressive block billing
export function calculateBillProgressive(kwh, tariffs) {
  const safeKwh = Number.isFinite(kwh) ? Math.max(0, kwh) : 0;
  if (!tariffs || !tariffs.tiers) return { bill: "0.00", currency: "USD" };
  let bill = 0;
  let remaining = safeKwh;
  let lastUpTo = 0;
  for (const tier of tariffs.tiers) {
    const range = tier.upTo - lastUpTo;
    if (!(range > 0)) continue;
    if (!(remaining > 0)) break;
    const used = Math.min(remaining, range);
    bill += used * tier.price;
    remaining -= used;
    lastUpTo = tier.upTo;
  }
  bill = Math.max(0, bill);
  return { bill: bill.toFixed(2), currency: tariffs.currency };
}

// Whole-tier billing (all kWh at the reached tier price)
export function calculateBillWholeTier(kwh, tariffs) {
  const safeKwh = Number.isFinite(kwh) ? Math.max(0, kwh) : 0;
  if (!tariffs || !tariffs.tiers) return { bill: "0.00", currency: "USD" };
  let price = tariffs.tiers[tariffs.tiers.length - 1].price;
  for (const t of tariffs.tiers) {
    if (safeKwh <= t.upTo) { price = t.price; break; }
  }
  const bill = Math.max(0, safeKwh * price);
  return { bill: bill.toFixed(2), currency: tariffs.currency };
}

export function calculateBillByMode(kwh, tariffs, mode = "progressive") {
  return mode === "whole-tier"
    ? calculateBillWholeTier(kwh, tariffs)
    : calculateBillProgressive(kwh, tariffs);
}

export function getMonthBoundaries(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end, daysInMonth: end.getDate(), daysSoFar: date.getDate() };
}

// Trend/forecast from counter readings this month (linear regression)
export function computeTrendDailyKwh(readings, now = new Date()) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const { start, end, daysInMonth, daysSoFar } = getMonthBoundaries(now);
  const daysLeft = Math.max(daysInMonth - daysSoFar, 0);

  if (!Array.isArray(readings) || readings.length === 0) {
    return { currentUsage: 0, rawAvgDaily: 0, trendDaily: 0, predictedUsage: 0, daysInMonth, daysSoFar, daysLeft };
  }

  const sorted = [...readings].sort((a, b) => new Date(a.date) - new Date(b.date));
  const monthReadings = sorted.filter(r => new Date(r.date) >= start);
  if (monthReadings.length === 0) {
    return { currentUsage: 0, rawAvgDaily: 0, trendDaily: 0, predictedUsage: 0, daysInMonth, daysSoFar, daysLeft };
  }

  const first = monthReadings[0];
  const firstVal = Number(first.value) || 0;
  const firstDate = new Date(first.date);
  const lastInMonth = monthReadings[monthReadings.length - 1];
  const lastVal = Number(lastInMonth.value) || firstVal;

  const nowVal = Math.max(0, lastVal - firstVal);
  const spanToNowDays = Math.max(1e-6, (now - firstDate) / MS_PER_DAY);
  const rawAvgDaily = nowVal / spanToNowDays;

  // Regression relative to first in-month reading
  const xs = [], ys = [];
  for (const r of monthReadings) {
    const x = Math.max(0, (new Date(r.date) - firstDate) / MS_PER_DAY);
    const y = Math.max(0, (Number(r.value) || 0) - firstVal);
    xs.push(x); ys.push(y);
  }

  let slope = Math.max(0, rawAvgDaily);
  if (xs.length >= 2) {
    const n = xs.length;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const sumXX = xs.reduce((a, x) => a + x * x, 0);
    const denom = n * sumXX - sumX * sumX;
    if (denom > 1e-9) slope = Math.max(0, (n * sumXY - sumX * sumY) / denom);
  }

  // Forecast to month end
  const predictedUsage = Math.max(nowVal + slope * daysLeft, nowVal);

  return {
    currentUsage: nowVal,
    rawAvgDaily,
    trendDaily: slope,
    predictedUsage,
    daysInMonth,
    daysSoFar,
    daysLeft
  };
}

// kWh remaining to next tier
export function kwhToNextTier(currentKwh, tariffs) {
  const tiers = tariffs?.tiers || [];
  const kwh = Number.isFinite(currentKwh) ? Math.max(0, currentKwh) : 0;
  for (const t of tiers) {
    const cap = t.upTo;
    if (!isFinite(cap)) return Infinity;
    if (kwh < cap) return Math.max(0, cap - kwh);
  }
  return Infinity;
}

// Budget helpers
export function kwhForBudget(budget, tariffs) {
  const b = Number.isFinite(budget) ? budget : 0;
  if (!b || !tariffs) return 0;
  let lo = 0, hi = 100000;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const { bill } = calculateBillProgressive(mid, tariffs);
    if (parseFloat(bill) > b) hi = mid; else lo = mid;
  }
  return lo;
}

export function dailyTargetForBudget(budget, tariffs, daysInMonth, consumedKwhSoFar, dayOfMonth) {
  const b = Number.isFinite(budget) ? budget : 0;
  if (!b || !tariffs) return { dailyTarget: 0, remainingKwhAllowed: 0, remainingDays: 0 };
  const remainingDays = Math.max(daysInMonth - dayOfMonth, 0);
  const maxMonthKwh = kwhForBudget(b, tariffs);
  const remainingKwhAllowed = Math.max(0, maxMonthKwh - Math.max(0, consumedKwhSoFar));
  const dailyTarget = remainingDays > 0 ? (remainingKwhAllowed / remainingDays) : 0;
  return {
    dailyTarget: Number(dailyTarget.toFixed(2)),
    remainingKwhAllowed: Number(remainingKwhAllowed.toFixed(2)),
    remainingDays
  };
}

// What‑If: reduce remaining-days trend by X%
export function predictedUsageWhatIf(currentUsage, trendDaily, daysLeft, reducePct = 0) {
  const r = Math.max(0, Math.min(100, reducePct));
  const factor = 1 - r / 100;
  return Math.max(0, currentUsage + trendDaily * daysLeft * factor);
}

// Estimate the day-of-month you’ll cross next tier (null if not this month)
export function estimateTierCrossDay(currentUsage, trendDaily, kwhToNext, daysSoFar, daysInMonth) {
  if (!(trendDaily > 0) || !Number.isFinite(kwhToNext) || kwhToNext === Infinity) return null;
  const daysUntil = kwhToNext / trendDaily;
  const day = Math.ceil(daysSoFar + daysUntil);
  if (day > daysInMonth) return null;
  return Math.max(daysSoFar, Math.min(daysInMonth, day));
}

// Forecast band (±10%) using selected tariff mode
export function forecastBand(predictedUsage, tariffs, mode = "progressive", band = 0.10) {
  const pu = Number.isFinite(predictedUsage) ? Math.max(0, predictedUsage) : 0;
  const lowUsage = Math.max(0, pu * (1 - band));
  const highUsage = Math.max(0, pu * (1 + band));
  const low = calculateBillByMode(lowUsage, tariffs, mode).bill;
  const high = calculateBillByMode(highUsage, tariffs, mode).bill;
  return { low, high };
}

// Daily increments within the month (for spike detection)
export function dailyIncrements(readings) {
  const { start } = getMonthBoundaries(new Date());
  const monthReadings = [...(readings || [])]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .filter(r => new Date(r.date) >= start);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const out = [];
  for (let i = 1; i < monthReadings.length; i++) {
    const prev = monthReadings[i - 1];
    const curr = monthReadings[i];
    const dKwh = Math.max(0, (Number(curr.value) || 0) - (Number(prev.value) || 0));
    const dDays = Math.max(1e-6, (new Date(curr.date) - new Date(prev.date)) / MS_PER_DAY);
    out.push({
      date: new Date(curr.date),
      deltaKwh: dKwh,
      days: dDays,
      rate: dKwh / dDays
    });
  }
  return out;
}

// Spike detection: compare last interval vs recent baseline
export function detectSpike(readings) {
  const inc = dailyIncrements(readings);
  const n = inc.length;
  if (n === 0) return { isSpike: false, lastRate: 0, baselineRate: 0, changePct: 0 };
  const lastRate = inc[n - 1].rate;
  const prevRates = inc.slice(Math.max(0, n - 4), n - 1).map(x => x.rate);
  const baseline = prevRates.length ? prevRates.reduce((a, b) => a + b, 0) / prevRates.length : lastRate;
  const changePct = baseline > 0 ? ((lastRate - baseline) / baseline) * 100 : (lastRate > 0 ? 100 : 0);
  return {
    isSpike: changePct >= 25,
    lastRate,
    baselineRate: baseline,
    changePct
  };
}
