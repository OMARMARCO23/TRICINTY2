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

export function calculateBill(kwh, tariffs) {
  let bill = 0, remaining = kwh, lastUpTo = 0;
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
export function kwhToNextTier(currentKwh, tariffs) {
  const tiers = tariffs?.tiers || [];
  let prevUpTo = 0;
  for (const t of tiers) {
    const cap = t.upTo;
    if (!isFinite(cap)) return Infinity;
    if (currentKwh < cap) {
      return Math.max(0, cap - currentKwh);
    }
    prevUpTo = cap;
  }
  return Infinity;
}

// Binary-search kWh that matches a budget with given tariffs
export function kwhForBudget(budget, tariffs) {
  if (!budget || !tariffs) return 0;
  let lo = 0, hi = 100000; // up to 100 MWh/month upper bound
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const { bill } = calculateBill(mid, tariffs);
    if (parseFloat(bill) > budget) hi = mid; else lo = mid;
  }
  return lo;
}

// Daily target to stay under budget for remainder of month
export function dailyTargetForBudget(budget, tariffs, daysInMonth, consumedKwhSoFar, dayOfMonth) {
  const remainingDays = Math.max(daysInMonth - dayOfMonth, 0);
  const maxMonthKwh = kwhForBudget(budget, tariffs);
  const remainingKwhAllowed = Math.max(0, maxMonthKwh - consumedKwhSoFar);
  const dailyTarget = remainingDays > 0 ? (remainingKwhAllowed / remainingDays) : 0;
  return {
    dailyTarget: Number(dailyTarget.toFixed(2)),
    remainingKwhAllowed: Number(remainingKwhAllowed.toFixed(2)),
    remainingDays
  };
}

// Simple forecast band (±10%). You can replace with EMA/regression later.
export function forecastBand(predictedUsage, tariffs, band = 0.10) {
  const lowUsage = Math.max(0, predictedUsage * (1 - band));
  const highUsage = predictedUsage * (1 + band);
  const { bill: low } = calculateBill(lowUsage, tariffs);
  const { bill: high } = calculateBill(highUsage, tariffs);
  return { low, high };
}
