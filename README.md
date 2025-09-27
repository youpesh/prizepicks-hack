## Pulse — Why + What‑If + Early Warning

Real‑time sports insight engine powered by Pulse Mock. Explains what changed, why it changed, what happens next, and how confident we are.

### Stack
- Next.js App Router, TypeScript, Tailwind, shadcn/ui
- Recharts for sparklines
- SSE stream + Web Worker (EWMA, z‑score, simple CUSUM, confidence)
- Pulse Mock submodule for stable REST data

### Setup
```bash
git clone https://github.com/youpesh/prizepicks-hack.git
cd prizepicks-hack
git submodule update --init --recursive

# Pulse Mock server
cd pulse-mock
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt && pip install -e .
python -m pulse_mock.server --host localhost --port 1339 --debug
```

In a new terminal:
```bash
cd prizepicks-hack
npm i
npm run dev
```

### App routes
- `/` — Live dashboard: Insight Cards with sparkline, confidence, reasons, risk dial, cooldowns
- `/reel` — Insight Reel: high‑severity alerts from the last minute

### How it works
- SSE endpoint emits player stat events (seeded surges for demo)
- Worker computes rolling baselines, z/CUSUM, and confidence
- UI renders succinct insight text, reasons, and evidence sparkline
- Calibration widget shows expected vs realized accuracy live
- What‑If sliders show instant projection deltas for pace/usage

### Notes
- If Pulse Mock isn’t running, API proxy calls will fail. Start it first.
- Submodule pinned at `pulse-mock` — ensure `git submodule update --init --recursive` after cloning.
