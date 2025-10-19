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

// Progressive block billing (tiered)
export function calculateBillProgressive(kwh, tariffs) {
  if (!tariffs || !tariffs.tiers) return { bill: "0.00", currency: "USD" };
  let bill = 0;
  let remaining = Math.max(0, kwh);
  let lastUpTo = 0;
  for (const tier of tariffs.tiers) {
    const range = tier.upTo - lastUpTo;
    if (remaining <= 0) break;
    const used = Math.min(remaining, range);
    bill += used * tier.price;
    remaining -= used;
    lastUpTo = tier.upTo;
  }
  return { bill: bill.toFixed(2), currency: tariffs.currency };
}

// Whole-tier billing (all kWh at the tier price where total falls)
export function calculateBillWholeTier(kwh, tariffs) {
  if (!tariffs || !tariffs.tiers) return { bill: "0.00", currency: "USD" };
  const total = Math.max(0, kwh);
  let price = tariffs.tiers[tariffs.tiers.length - 1].price;
  for (const t of tariffs.tiers) {
    if (total <= t.upTo) { price = t.price; break; }
  }
  const bill = total * price;
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

// Linear regression-based trend (kWh/day) from counter readings this month
export function computeTrendDailyKwh(readings, now = new Date()) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const { start, daysInMonth, daysSoFar } = getMonthBoundaries(now);
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
  const firstVal = first.value;
  const firstDate = new Date(first.date);
  const lastVal = sorted[sorted.length - 1].value;
  const nowVal = Math.max(0, lastVal - firstVal);

  const elapsedDays = Math.max(1e-6, (now - firstDate) / MS_PER_DAY);
  const rawAvgDaily = nowVal / elapsedDays;

  // Regression points relative to first in-month reading
  const xs = [], ys = [];
  for (const r of monthReadings) {
    const x = Math.max(0, (new Date(r.date) - firstDate) / MS_PER_DAY);
    const y = Math.max(0, r.value - firstVal);
    xs.push(x); ys.push(y);
  }

  let slope = rawAvgDaily;
  if (xs.length >= 2) {
    const n = xs.length;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const sumXX = xs.reduce((a, x) => a + x * x, 0);
    const denom = n * sumXX - sumX * sumX;
    if (denom > 1e-9) slope = (n * sumXY - sumX * sumY) / denom; // kWh/day
  }
  slope = Math.max(0, slope);

  // Predict full-month usage with trend (slope × total days)
  let predictedUsage = slope * daysInMonth;
  predictedUsage = Math.max(predictedUsage, nowVal); // never below current measured

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

// kWh until next price tier (based on current month usage)
export function kwhToNextTier(currentKwh, tariffs) {
  const tiers = tariffs?.tiers || [];
  const kwh = Math.max(0, currentKwh);
  for (const t of tiers) {
    const cap = t.upTo;
    if (!isFinite(cap)) return Infinity;
    if (kwh < cap) return Math.max(0, cap - kwh);
  }
  return Infinity;
}

// Budget helpers
export function kwhForBudget(budget, tariffs) {
  if (!budget || !tariffs) return 0;
  let lo = 0, hi = 100000;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const { bill } = calculateBillProgressive(mid, tariffs);
    if (parseFloat(bill) > budget) hi = mid; else lo = mid;
  }
  return lo;
}

export function dailyTargetForBudget(budget, tariffs, daysInMonth, consumedKwhSoFar, dayOfMonth) {
  if (!budget || !tariffs) return { dailyTarget: 0, remainingKwhAllowed: 0, remainingDays: 0 };
  const remainingDays = Math.max(daysInMonth - dayOfMonth, 0);
  const maxMonthKwh = kwhForBudget(budget, tariffs);
  const remainingKwhAllowed = Math.max(0, maxMonthKwh - Math.max(0, consumedKwhSoFar));
  const dailyTarget = remainingDays > 0 ? (remainingKwhAllowed / remainingDays) : 0;
  return {
    dailyTarget: Number(dailyTarget.toFixed(2)),
    remainingKwhAllowed: Number(remainingKwhAllowed.toFixed(2)),
    remainingDays
  };
}

// Forecast band (±10%)
export function forecastBand(predictedUsage, tariffs, mode = "progressive", band = 0.10) {
  const lowUsage = Math.max(0, predictedUsage * (1 - band));
  const highUsage = Math.max(0, predictedUsage * (1 + band));
  const lowBill = calculateBillByMode(lowUsage, tariffs, mode).bill;
  const highBill = calculateBillByMode(highUsage, tariffs, mode).bill;
  return { low: lowBill, high: highBill };
}
