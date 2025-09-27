## Pulse Hackathon Build Prompt (Reference)

### Project identity
**Name**: Pulse — Why + What‑If + Early Warning

**Objective**: Turn noisy, fast stat streams into high‑trust, actionable insights that explain what changed, why it changed, what happens next, and how confident we are. Not a generic dashboard; feels like a broadcast analyst plus a quant co‑pilot.

### Data source (required)
- Use Pulse Mock REST server for leagues/teams/players/games.
- Repo: [`https://github.com/myprizepicks/pulse-mock`](https://github.com/myprizepicks/pulse-mock)
- Run locally and set `PULSE_API_URL` (e.g., `http://localhost:1339`).

### Tech stack
- Next.js App Router (TypeScript, Tailwind)
- shadcn/ui for shell/components (Card, Tabs, Badge, Skeleton)
- Recharts for sparklines and small charts
- Web Worker for rolling analytics (EWMA, z‑score, CUSUM, momentum)
- Supabase for history/backtests and interaction logs (optional)

### UX pillars (what makes it novel)
- **Insight Cards**: One‑sentence, evidence‑linked explanations with confidence and a mini‑sparkline.
- **What‑If Controls**: Live sliders (pace/usage/foul proxy) showing projection deltas + confidence change.
- **Early‑Warning Meter**: Predict next 2–3 minutes’ volatility; with cool‑downs.
- **Calibration Widget**: Expected vs realized accuracy over last N calls, always visible.

### Robustness expectations
- Robust stats: EWMA + median/MAD; standard deviation floors to avoid blowups
- Cooldowns per entity, minimum sample windows, jitter‑free updates
- Latency budget: < 150 ms from event to render

### Deliverables for demo
- Live app with 6–10 players showing: Insight Cards, What‑If sliders, Early‑Warning meter, Calibration widget
- Seed 2–3 scripted “wow” scenarios for a smooth 2‑minute demo

### Implementation checklist
- Pulse Mock integration
  - Start REST server from the repo: [`https://github.com/myprizepicks/pulse-mock`](https://github.com/myprizepicks/pulse-mock)
  - Add proxy route `app/api/pulse/[...path]/route.ts` to forward requests to `PULSE_API_URL` (same‑origin for client)
  - Consume endpoints for leagues/teams/players/games; synthesize simple event stream client‑side if needed
- Analytics (Web Worker)
  - Rolling windows per entity‑stat: EWMA baseline, median/MAD
  - Rolling z‑score with std floor; one‑sided CUSUM changepoints
  - Momentum risk score 0–100 from run‑length + volatility
  - Confidence = f(volatility, sample sufficiency, projection agreement), recalibrated every minute vs realized
- UI (shadcn + Recharts)
  - Use `Card`, `Tabs`, `Badge`, `Skeleton` for layout/state
  - Recharts `LineChart` for mini‑sparklines with anomaly markers
  - A single “Risk Dial” that reweights thresholds live

### Evaluation rubric (optimize for judges)
- **Novelty**: Counterfactual What‑If + Early‑Warning + on‑screen Calibration
- **Trust**: Confidence calibration within ±10% over last N windows
- **Clarity**: Each alert has 1–2 concise, evidence‑linked reasons
- **Polish**: Sub‑150 ms updates, smooth transitions, accessible UI

### 48‑hour timebox
- T0–6h: Pulse Mock + proxy + Worker skeleton + first Insight Card with sparkline
- T6–18h: What‑If sliders, rule‑based “why”, Early‑Warning meter
- T18–30h: Calibration widget, seeded demo scenarios, styling polish
- T30–42h: Robustness (cooldowns, std floors), QA passes
- T42–48h: Stretch (clip attachment) or demo script refinement

### LLM system prompt (for generating “Why” explanations)
Use this system message in your LLM client.

```json
{
  "role": "system",
  "content": "You generate concise, evidence-grounded explanations for sports stat shifts. Output strict JSON. Never hedge. Prefer concrete, observable drivers (pace change, usage change, foul state proxy, on/off-court proxy, garbage-time). Use 1–2 reasons maximum."
}
```

### User message schema (features → explanation)
```json
{
  "entity_key": "player_id:stat",
  "ts": 1738000123456,
  "window_features": {
    "delta_vs_ewma": -3.4,
    "z_score": -2.1,
    "robust_z": -1.9,
    "cusum_flag": true,
    "pace_delta_pct": -12.3,
    "usage_delta_pct": -8.7,
    "foul_proxy": 2,
    "volatility_index": 0.62,
    "sample_count": 37,
    "projection": 27.5,
    "realized_rate": 0.9
  },
  "ui_settings": { "risk_mode": "conservative" }
}
```

### Assistant response schema (strict JSON example)
```json
{
  "entity_key": "player_id:stat",
  "ts": 1738000123456,
  "anomaly_type": "pace_drop_changepoint",
  "insight": "Pace fell 12% and usage down 9% over last 5m; rate below EWMA.",
  "confidence": 0.82,
  "reasons": [
    { "feature": "pace_delta_pct", "direction": "down", "magnitude_pct": 12.3 },
    { "feature": "usage_delta_pct", "direction": "down", "magnitude_pct": 8.7 }
  ],
  "evidence": {
    "z_score": -2.1,
    "cusum_flag": true,
    "window": "5m"
  },
  "counterfactual": {
    "if_pace_to_baseline_delta": 2.6,
    "if_usage_to_baseline_delta": 1.1
  }
}
```

### Setup notes
- Start Pulse Mock locally with deterministic seed for repeatable demo flows: [`https://github.com/myprizepicks/pulse-mock`](https://github.com/myprizepicks/pulse-mock)
- Use shadcn/ui for shell; Recharts for visuals inside `Card` components
- Add `.env.local` with `PULSE_API_URL=http://localhost:1339`

### Optional stretch
- Attach top‑1 video clip for flagged moments via a provider interface (e.g., integrate later without refactor)
- Auto “Insight Reel” page compiling the last 60s of top insights for judges


