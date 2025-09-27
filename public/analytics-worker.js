// Minimal analytics worker (plain JS)

const states = new Map();

function updateState(key, x) {
  const prev = states.get(key) || { count: 0, mean: 0, m2: 0, ewma: x, cusum: 0 };
  const count = prev.count + 1;
  const delta = x - prev.mean;
  const mean = prev.mean + delta / count;
  const m2 = prev.m2 + delta * (x - mean);
  const alpha = 0.25;
  const ewma = prev.count === 0 ? x : alpha * x + (1 - alpha) * prev.ewma;
  const k = 0.25;
  const h = 3.5;
  const s = Math.max(0, prev.cusum + (x - mean - k));
  const cusum = s > h ? 0 : s;
  const next = { count, mean, m2, ewma, cusum };
  states.set(key, next);
  return next;
}

function stdFrom(state) {
  const variance = state.count > 1 ? state.m2 / (state.count - 1) : 0;
  return Math.max(Math.sqrt(Math.max(variance, 1e-3)), 1e-2);
}

function buildInsight(key, x, projection, state) {
  const std = stdFrom(state);
  const z = (x - state.mean) / std;
  const disagreement = Math.abs(x - projection);
  const volatility = std;
  const base = 100 * Math.exp(-0.5 * (disagreement / 5)) * Math.exp(-0.2 * volatility);
  const confidence = Math.max(0, Math.min(100, base));
  // early-warning risk: combine |z| and volatility and cusum magnitude
  // Softer scaling so meter doesn't peg at 100%
  const risk = Math.max(
    0,
    Math.min(100, Math.round(Math.abs(z) * 15 + volatility * 30 + Math.min(state.cusum * 8, 20)))
  );
  let status = "normal";
  if (z > 2.2 || confidence > 75 || risk > 70) status = "alert";
  else if (z > 1.2 || confidence > 45 || risk > 45) status = "warning";
  const insight = z > 1.8 ? "Momentum surge detected" : z < -1.8 ? "Momentum drop detected" : confidence > 60 ? "Stable edge" : "Stable";
  const reasons = [
    { feature: "z_score", direction: z >= 0 ? "up" : "down", magnitude: Math.abs(z) },
    { feature: "ewma_delta", direction: x - state.ewma >= 0 ? "up" : "down", magnitude: Math.abs(x - state.ewma) },
  ];
  return { id: key, insight, confidence, status, z, ewma: state.ewma, value: x, reasons, projection, risk };
}

self.onmessage = (e) => {
  const evt = e.data;
  const key = `${evt.player_id}:${evt.stat}`;
  const st = updateState(key, evt.value);
  const msg = buildInsight(key, evt.value, evt.projection, st);
  self.postMessage(msg);
};


