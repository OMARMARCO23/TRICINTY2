import { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import {
  calculateBillByMode,
  computeTrendDailyKwh,
  kwhToNextTier,
  dailyTargetForBudget,
  forecastBand,
  detectSpike,
  dailyIncrements,
  predictedUsageWhatIf,
  estimateTierCrossDay
} from '../lib/calculations.js';
import MeterScanner from '../components/MeterScanner.jsx';
import { tFactory } from '../i18n/index.js';

// Inline API base
const IS_NATIVE =
  typeof window !== 'undefined' &&
  window.location &&
  window.location.protocol === 'capacitor:';
const API_BASE = IS_NATIVE ? 'https://tricinty-2.vercel.app' : '';

// ... keep the rest of your Dashboard.jsx exactly as you have it now ...
