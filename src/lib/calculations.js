export const TARIFF_PRESETS = {
  MA: {
    currency: "MAD",
    tiers: [
      { upTo: 100, price: 0.9010 },
      { upTo: 150, price: 1.0740 },
      { upTo: 200, price: 1.0740 },
      { upTo: 300, price: 1.2827 },
      { upTo: 500, price: 1.4915 },
      { upTo: Infinity, price: 1.6994 },
    ],
  },
  FR: { currency: "EUR", tiers: [{ upTo: Infinity, price: 0.25 }] },
  US: { currency: "USD", tiers: [{ upTo: Infinity, price: 0.18 }] },
};

export function calculateBill(kwh, tariffs) {
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

export function getMonthBoundaries(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end, daysInMonth: end.getDate(), daysSoFar: date.getDate() };
}

// Trend-based daily kWh using this month's entries.
// We take per-interval rates (delta kWh / delta days) and compute a recency-weighted average.
// Fallback: raw average since first in-month reading.
export function computeTrendDailyKwh(readings, now = new Date()) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const { start, daysInMonth, daysSoFar } = getMonthBoundaries(now);

  if (!Array.isArray(readings) || readings.length === 0) {
    return {
      currentUsage: 0,
      rawAvgDaily: 0,
      trendDaily: 0,
      predictedUsage: 0,
      daysInMonth,
      daysSoFar,
      daysLeft: Math.max(daysInMonth - daysSoFar, 0),
    };
  }

  // Sort readings by date
  const sorted = [...readings].sort((a, b) => new Date(a.date) - new Date(b.date));
  const monthReadings = sorted.filter(r => new Date(r.date) >= start);

  const firstInMonth = monthReadings[0] || sorted[0];
  const lastReading = sorted[sorted.length - 1];

  const firstVal = firstInMonth?.value ?? 0;
  const lastVal = lastReading?.value ?? firstVal;

  const currentUsage = Math.max(0, lastVal - firstVal);

  const firstDate = new Date(firstInMonth?.date || now);
  const elapsedDays = Math.max(1, (now - firstDate) / MS_PER_DAY);
  const rawAvgDaily = currentUsage / elapsedDays;

  // Build interval rates only within this month
  const intervals = [];
  for (let i = 1; i < monthReadings.length; i++) {
    const prev = monthReadings[i - 1];
    const curr = monthReadings[i];
    const dKwh = curr.value - prev.value;
    const dDays = Math.max( (new Date(curr.date) - new Date(prev.date)) / MS_PER_DAY, 0 );
    if (dKwh >= 0 && dDays > 0) {
      intervals.push(dKwh / dDays);
    }
  }

  let trendDaily;
  if (intervals.length === 0) {
    trendDaily = rawAvgDaily; // fallback
  } else {
    // Recency-weighted average: newer intervals weigh more
    let wsum = 0, wtotal = 0;
    for (let i = 0; i < intervals.length; i++) {
      const w = i + 1;
      wsum += w * intervals[i];
      wtotal += w;
    }
    trendDaily = wsum / wtotal;
  }

  const daysLeft = Math.max(daysInMonth - daysSoFar, 0);
  const predictedUsage = currentUsage + trendDaily * daysLeft;

  return {
    currentUsage,
    rawAvgDaily,
    trendDaily,
    predictedUsage,
    daysInMonth,
    daysSoFar,
    daysLeft,
  };
}

// How many kWh remain until the next price tier boundary (based on monthly kWh)
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

// kWh allowed for a given budget with the provided tariffs (binary search)
export function kwhForBudget(budget, tariffs) {
  if (!budget || !tariffs) return 0;
  let lo = 0, hi = 100000; // upper bound for month
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const { bill } = calculateBill(mid, tariffs);
    if (parseFloat(bill) > budget) hi = mid; else lo = mid;
  }
  return lo;
}

// Daily target for the remainder of the month to stay under budget
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

// Simple forecast band (±10% by default). Replace with variance-based band later if you want.
export function forecastBand(predictedUsage, tariffs, band = 0.10) {
  const lowUsage = Math.max(0, predictedUsage * (1 - band));
  const highUsage = Math.max(0, predictedUsage * (1 + band));
  const { bill: low } = calculateBill(lowUsage, tariffs);
  const { bill: high } = calculateBill(highUsage, tariffs);
  return { low, high };
}
