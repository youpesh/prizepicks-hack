// Minimal analytics worker: EWMA, rolling mean/std, z-score, simple CUSUM, confidence

export type Event = {
  ts: number;
  player_id: string;
  stat: string;
  value: number;
  projection: number;
};

export type InsightMsg = {
  id: string;
  insight: string;
  confidence: number; // 0..100
  status: "normal" | "warning" | "alert";
  z: number;
  ewma: number;
  value: number;
  reasons?: { feature: string; direction: "up" | "down"; magnitude?: number }[];
  projection: number;
};

type SeriesState = {
  count: number;
  mean: number;
  m2: number; // for variance (Welford)
  ewma: number;
  cusum: number;
};

const states = new Map<string, SeriesState>();

function updateState(key: string, x: number): SeriesState {
  const prev: SeriesState = states.get(key) ?? { count: 0, mean: 0, m2: 0, ewma: x, cusum: 0 };
  const count = prev.count + 1;
  const delta = x - prev.mean;
  const mean = prev.mean + delta / count;
  const m2 = prev.m2 + delta * (x - mean);
  const alpha = 0.3; // EWMA smoothing
  const ewma = prev.count === 0 ? x : alpha * x + (1 - alpha) * prev.ewma;
  // one-sided positive CUSUM for surges
  const k = 0.3; // drift
  const h = 3.0; // threshold
  const s = Math.max(0, prev.cusum + (x - mean - k));
  const cusum = s > h ? 0 : s; // reset on detection
  const next = { count, mean, m2, ewma, cusum };
  states.set(key, next);
  return next;
}

function stdFrom(state: SeriesState): number {
  const variance = state.count > 1 ? state.m2 / (state.count - 1) : 0;
  return Math.max(Math.sqrt(Math.max(variance, 1e-3)), 1e-2);
}

function buildInsight(key: string, x: number, projection: number, state: SeriesState): InsightMsg {
  const std = stdFrom(state);
  const z = (x - state.mean) / std;
  // simple confidence: higher when |x - projection| is small and volatility low
  const disagreement = Math.abs(x - projection);
  const volatility = std;
  const base = 100 * Math.exp(-0.5 * (disagreement / 5)) * Math.exp(-0.2 * volatility);
  const confidence = Math.max(0, Math.min(100, base));
  let status: InsightMsg["status"] = "normal";
  if (z > 2 || confidence > 70) status = "alert";
  else if (z > 1 || confidence > 40) status = "warning";
  const insight = z > 1.8 ? "Momentum surge detected" : z < -1.8 ? "Momentum drop detected" : confidence > 60 ? "Stable edge" : "Stable";
  const reasons = [
    { feature: "z_score", direction: z >= 0 ? "up" : "down", magnitude: Math.abs(z) },
    { feature: "ewma_delta", direction: x - state.ewma >= 0 ? "up" : "down", magnitude: Math.abs(x - state.ewma) },
  ];
  return { id: key, insight, confidence, status, z, ewma: state.ewma, value: x, reasons, projection };
}

self.onmessage = (e: MessageEvent<Event>) => {
  const evt = e.data;
  const key = `${evt.player_id}:${evt.stat}`;
  const st = updateState(key, evt.value);
  const msg = buildInsight(key, evt.value, evt.projection, st);
  (self as unknown as Worker).postMessage(msg);
};


