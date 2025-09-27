export type Line = { id: string; player_id: string; stat: string; line: number; payout: number };

// Mock lines (could be replaced with real source)
export const mockLines: Line[] = [
  { id: "L1", player_id: "NFL_player_mDuT4ISYK5cLvS7dNVhdUXmw:points".split(":")[0], stat: "points", line: 26.5, payout: 1.5 },
  { id: "L2", player_id: "NFL_player_NeBLZBYBi5Lv0CsPtij6uY8D:points".split(":")[0], stat: "points", line: 24.5, payout: 1.5 },
];

// Simple EV: confidence-weighted delta vs line times payout factor
export function computeEV(current: { projection: number; confidence: number }, line: Line) {
  const delta = current.projection - line.line; // positive favors Over
  // scale confidence to 0..1
  const c = Math.max(0, Math.min(1, current.confidence / 100));
  const evOver = delta * c * line.payout;
  const evUnder = -delta * c * line.payout;
  return { evOver, evUnder, delta, c };
}


