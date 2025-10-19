export type TariffTier = { upTo: number; price: number };
export type Tariffs = { currency: string; tiers: TariffTier[] };

export const TARIFF_PRESETS: Record<string, Tariffs> = {
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

export function calculateBill(kwh: number, tariffs: Tariffs) {
  let bill = 0;
  let remaining = kwh;
  let lastUpTo = 0;

  for (const tier of tariffs.tiers) {
    const range = tier.upTo - lastUpTo;
    if (remaining <= 0) break;
    const used = Math.min(remaining, range);
    bill += used * tier.price;
    remaining -= used;
    lastUpTo = tier.upTo;
  }
  return { bill: Number.isFinite(bill) ? bill.toFixed(2) : "0.00", currency: tariffs.currency };
}

export function getMonthBoundaries(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const daysInMonth = end.getDate();
  const daysSoFar = date.getDate();
  return { start, end, daysInMonth, daysSoFar };
}
