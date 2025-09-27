"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStreamInsights } from "@/lib/useStreamInsights";
import { getPlayers, type Player } from "@/lib/pulse";
import headshotManifest from "@/data/espn-headshots.json";

type InsightDatum = {
  id: string;
  insight: string;
  confidence: number;
  status: "normal" | "warning" | "alert";
  z: number;
  ewma: number;
  value: number;
  projection: number;
  risk?: number;
};

type AlertDatum = {
  id: string;
  ts: number;
  insight: string;
  confidence: number;
  value?: number;
  projection?: number;
};

type AlertTemplate = {
  id?: string;
  offsetMs: number;
  insight: string;
  confidence: number;
  value?: number;
  projection?: number;
};

type ChartPoint = {
  label: string;
  actual: number;
  forecast: number;
  baseline: number;
  anomaly?: boolean;
};

type HeadshotRecord = {
  headshot?: string;
  full_name?: string;
  espn_id?: string | null;
  confidence?: string;
};

const FALLBACK_PLAYER: InsightDatum = {
  id: "NFL_player_SyWsd7T30Oev84KlU0vKvQrU:points",
  insight: "Tempo jump after no-huddle sequence; Hurts usage ↑",
  confidence: 74,
  status: "alert",
  z: 3.1,
  ewma: 22.4,
  value: 24.1,
  projection: 27.6,
};

const ESPN_DEFAULT_HEADSHOT = "https://a.espncdn.com/i/headshots/nfl/players/full/default.png";

const FALLBACK_SERIES: ChartPoint[] = [
  { label: "t-9", actual: 15.2, baseline: 14.7, forecast: 18.5 },
  { label: "t-7", actual: 16.9, baseline: 16.1, forecast: 20.3 },
  { label: "t-5", actual: 18.4, baseline: 17.6, forecast: 22.1 },
  { label: "t-3", actual: 20.6, baseline: 19.2, forecast: 24.6 },
  { label: "t-1", actual: 22.8, baseline: 21.1, forecast: 26.2 },
  { label: "now", actual: 24.1, baseline: 22.4, forecast: 27.6, anomaly: true },
];

const FALLBACK_ALERT_TEMPLATES: AlertTemplate[] = [
  {
    offsetMs: 0,
    insight: "No-huddle drive spikes pace; Hurts involvement climbs",
    confidence: 74,
    value: 24.1,
    projection: 27.6,
  },
  {
    offsetMs: 90_000,
    insight: "Explosive 30-yard scramble closes gap",
    confidence: 64,
  },
  {
    offsetMs: 150_000,
    insight: "Defense forced takeaway • short field",
    confidence: 58,
  },
  {
    offsetMs: 210_000,
    insight: "Forecast band widened; confidence trimmed",
    confidence: 48,
  },
];

const FALLBACK_GRID: InsightDatum[] = [
  FALLBACK_PLAYER,
  {
    id: "NFL_player_3TpWfIRPwAajCDZIYbErBEEJ:points",
    insight: "Barkley picking up chunk yards after contact.",
    confidence: 68,
    status: "warning",
    z: 2.2,
    ewma: 14.5,
    value: 15.8,
    projection: 17.4,
  },
  {
    id: "NFL_player_Dja4sbHsYn0bJ0jIp3oypXRF:points",
    insight: "A.J. Brown heating up on slants; yards-after-catch spike.",
    confidence: 61,
    status: "warning",
    z: 1.9,
    ewma: 11.2,
    value: 12.6,
    projection: 14.9,
  },
];

const ANOMALY_COLORS: Record<string, string> = {
  GREEN: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
  ORANGE: "bg-amber-500/20 text-amber-300 border-amber-400/40",
  RED: "bg-rose-500/20 text-rose-200 border-rose-400/40",
};

type PlayerRecord = Player & { team?: { name?: string; market?: string; abbreviation?: string }; image_url?: string };

function resolveAnomaly(z: number) {
  if (z >= 3) return "RED" as const;
  if (z >= 1.8) return "ORANGE" as const;
  return "GREEN" as const;
}

function playerKeyFromComposite(id: string) {
  return id.includes(":") ? id.split(":")[0] ?? id : id;
}

function formatPlayerName(id: string, directory: Record<string, PlayerRecord>) {
  const canonical = playerKeyFromComposite(id);
  const meta = directory[canonical];
  if (meta) {
    const fullName = `${meta.first_name ?? ""} ${meta.last_name ?? ""}`.trim();
    if (fullName.length > 0) {
      return meta.position ? `${fullName} (${meta.position})` : fullName;
    }
  }
  const base = canonical.split("_");
  if (!base) return "Unknown Player";
  const [league, ...rest] = base;
  if (rest.length === 0) {
    const generic = `${league ?? ""} Player`.trim();
    return generic.length > 0 ? generic : canonical;
  }
  const nameParts = rest.filter((segment) => segment.toLowerCase() !== "player");
  if (nameParts.length === 0) {
    const generic = `${league ?? ""} Player`.trim();
    return generic.length > 0 ? generic : canonical;
  }
  return nameParts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function initialsFromName(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function HeadshotAvatar({
  name,
  primary,
  fallback,
  size = "sm",
}: {
  name: string;
  primary?: string;
  fallback?: string;
  size?: "sm" | "lg";
}) {
  const sizeClass = size === "lg" ? "size-16 rounded-2xl" : "size-10 rounded-xl";
  const textClass = size === "lg" ? "text-xl" : "text-sm";
  const [source, setSource] = useState<string | null>(() => primary ?? fallback ?? null);
  useEffect(() => {
    setSource(primary ?? fallback ?? null);
  }, [primary, fallback]);
  const handleError = () => {
    if (source && primary && fallback && source === primary) {
      setSource(fallback);
      return;
    }
    if (fallback && source !== fallback) {
      setSource(fallback);
      return;
    }
    setSource(null);
  };
  if (source) {
    return (
      <img
        src={source}
        alt={`${name} headshot`}
        className={`${sizeClass} border border-white/10 object-cover shadow-[0_10px_30px_-25px_rgba(14,165,233,0.8)]`}
        onError={handleError}
      />
    );
  }
  return (
    <div className={`flex ${sizeClass} items-center justify-center border border-white/10 bg-slate-900/60 font-semibold text-white ${textClass}`}>
      {initialsFromName(name)}
    </div>
  );
}

function getHeadshotFor(id: string, manifest: Record<string, HeadshotRecord>) {
  const canonical = playerKeyFromComposite(id);
  return manifest[canonical]?.headshot ?? manifest[id]?.headshot;
}

const FALLBACK_FEATURED_LIST = [
  FALLBACK_PLAYER,
  ...FALLBACK_GRID.filter(
    (entry) => playerKeyFromComposite(entry.id) !== playerKeyFromComposite(FALLBACK_PLAYER.id),
  ),
];

const FEATURED_PLAYERS = FALLBACK_FEATURED_LIST.map((entry) => ({
  canonical: playerKeyFromComposite(entry.id),
  defaultId: entry.id,
  fallback: entry,
}));

const FEATURED_CANONICAL_SET = new Set(FEATURED_PLAYERS.map((player) => player.canonical));

const FEATURED_FALLBACK_LOOKUP: Record<string, InsightDatum> = FEATURED_PLAYERS.reduce((acc, player) => {
  acc[player.canonical] = player.fallback;
  return acc;
}, {} as Record<string, InsightDatum>);

function buildFallbackAlerts(anchor: number): AlertDatum[] {
  return FALLBACK_ALERT_TEMPLATES.map((template) => ({
    id: template.id ?? FALLBACK_PLAYER.id,
    ts: Math.max(0, anchor - template.offsetMs),
    insight: template.insight,
    confidence: template.confidence,
    value: template.value,
    projection: template.projection,
  }));
}

function trendFromSeries(series?: { t: number; v: number; m: number; p: number }[]): ChartPoint[] {
  if (!series || series.length < 2) return FALLBACK_SERIES;
  const recent = series.slice(-10);
  return recent.map((point, idx) => {
    const label = idx === recent.length - 1 ? "now" : `t-${recent.length - idx - 1}`;
    return {
      label,
      actual: Number(point.v.toFixed(2)),
      baseline: Number(point.m.toFixed(2)),
      forecast: Number(point.p.toFixed(2)),
      anomaly: idx === recent.length - 1 ? Math.abs(point.v - point.m) > 2 : false,
    };
  });
}

function relativeTime(now: number, timestamp: number) {
  const deltaSec = Math.max(1, Math.floor((now - timestamp) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  return `${Math.floor(deltaSec / 3600)}h ago`;
}

function confidenceTone(confidence: number) {
  if (confidence >= 85) return "High Trust";
  if (confidence >= 60) return "Elevated";
  if (confidence >= 40) return "Guarded";
  return "Low";
}

export default function Home() {
  const stream = useStreamInsights();
  const insightsMap = stream.latest;
  const insightEntries = useMemo(() => Object.values(insightsMap) as InsightDatum[], [insightsMap]);
  const [selectedId, setSelectedId] = useState<string>(FALLBACK_PLAYER.id);
  const [players, setPlayers] = useState<Record<string, PlayerRecord>>({});
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [fallbackAnchor] = useState(() => Date.now());
  const headshots = headshotManifest as Record<string, HeadshotRecord>;

  useEffect(() => {
    getPlayers("NFL")
      .then((list) => {
        const directory: Record<string, PlayerRecord> = {};
        list.forEach((player) => {
          if (!player?.id) return;
          directory[player.id] = player as PlayerRecord;
        });
        setPlayers(directory);
      })
      .catch(() => {
        // allow fallback names when the mock service is offline
      });
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setClockNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const featuredLiveLookup = useMemo(() => {
    const map: Record<string, InsightDatum> = {};
    insightEntries.forEach((entry) => {
      const canonical = playerKeyFromComposite(entry.id);
      if (FEATURED_CANONICAL_SET.has(canonical)) {
        map[canonical] = entry;
      }
    });
    return map;
  }, [insightEntries]);

  const playerOptions = useMemo(
    () =>
      FEATURED_PLAYERS.map((player) => ({
        value: player.defaultId,
        label: formatPlayerName(player.defaultId, players),
      })),
    [players],
  );

  const activeInsight = useMemo(() => {
    const canonical = playerKeyFromComposite(selectedId);
    return featuredLiveLookup[canonical] ?? FEATURED_FALLBACK_LOOKUP[canonical] ?? FALLBACK_PLAYER;
  }, [featuredLiveLookup, selectedId]);

  const activeSeries = useMemo(() => {
    const series = stream.series[activeInsight.id];
    return trendFromSeries(series);
  }, [activeInsight.id, stream.series]);

  const fallbackAlerts = useMemo(() => buildFallbackAlerts(fallbackAnchor), [fallbackAnchor]);

  const alerts: AlertDatum[] = useMemo(() => {
    if (stream.recentAlerts.length > 0) return stream.recentAlerts as AlertDatum[];
    return fallbackAlerts;
  }, [stream.recentAlerts, fallbackAlerts]);

  const gridEntries = useMemo(
    () => FEATURED_PLAYERS.map((player) => featuredLiveLookup[player.canonical] ?? player.fallback),
    [featuredLiveLookup],
  );

  const anomalyLevel = resolveAnomaly(activeInsight.z ?? 0);
  const playerName = formatPlayerName(activeInsight.id, players);
  const activePlayerMeta = players[playerKeyFromComposite(activeInsight.id)];

  return (
    <main className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.22),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(244,114,182,0.15),_transparent_60%)] text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.4em] text-slate-400">SignalPlay</span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Real-Time Sports Insight Engine
            </h1>
          </div>
          <p className="max-w-2xl text-sm text-slate-400">
            Curated anomaly detection, live context, and forecast confidence all in one operator console.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex flex-wrap items-center gap-4">
            <FilterField
              label="Player"
              value={selectedId}
              onChange={(value) => setSelectedId(value)}
              options={playerOptions}
            />
            <FilterField
              label="Metric"
              value="points"
              options={[
                { value: "points", label: "Total Points" },
                { value: "passing", label: "Passing" },
                { value: "rushing", label: "Rushing" },
              ]}
              disabled
            />
            <FilterField
              label="Game"
              value="phi_dal"
              options={[{ value: "phi_dal", label: "PHI vs DAL (Mock)" }]}
              disabled
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <PlayerCard
            playerName={playerName}
            insight={activeInsight}
            anomalyLevel={anomalyLevel}
            chartPoints={activeSeries}
            playerMeta={activePlayerMeta}
            headshot={getHeadshotFor(activeInsight.id, headshots)}
          />
          <EventLog alerts={alerts} selectedId={activeInsight.id} nowTs={clockNow} />
        </section>

        <MultiPlayerGrid
          entries={gridEntries}
          selectedId={activeInsight.id}
          onSelect={setSelectedId}
          directory={players}
          headshots={headshots}
        />
      </div>
    </main>
  );
}

function FilterField({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</span>
      <div className="relative">
        <select
          disabled={disabled}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className="appearance-none rounded-lg border border-white/15 bg-white/10 px-4 py-2 pr-10 text-sm font-medium text-white shadow-inner shadow-white/5 transition focus:border-sky-400/70 focus:outline-none focus:ring focus:ring-sky-400/20 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-400"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-900 text-white">
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">▾</span>
      </div>
    </div>
  );
}

function PlayerCard({
  playerName,
  insight,
  anomalyLevel,
  chartPoints,
  playerMeta,
  headshot,
}: {
  playerName: string;
  insight: InsightDatum;
  anomalyLevel: "RED" | "ORANGE" | "GREEN";
  chartPoints: ChartPoint[];
  playerMeta?: PlayerRecord;
  headshot?: string;
}) {
  const confidencePercent = Math.round(insight.confidence ?? 0);
  const currentValue = Number.isFinite(insight.value) ? insight.value : 0;
  const projectionValue = Number.isFinite(insight.projection) ? insight.projection : 0;
  const zScore = Number.isFinite(insight.z) ? insight.z : 0;
  const statLabel = insight.id.split(":")[1]?.toUpperCase() ?? "POINTS";
  const teamTag = playerMeta?.team?.abbreviation ?? playerMeta?.team?.name ?? playerMeta?.team?.market;
  const metaLine = [teamTag ? `Team ${teamTag}` : "League NFL", `Stat ${statLabel}`, "Sim Clock • Q2 03:12"].join(" • ");
  const fallbackHeadshot = ESPN_DEFAULT_HEADSHOT;
  return (
    <article className="flex h-full flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-[0_40px_80px_-50px_rgba(14,165,233,0.65)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <HeadshotAvatar name={playerName} primary={headshot} fallback={fallbackHeadshot} size="lg" />
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-white">{playerName}</span>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{metaLine}</span>
          </div>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-200 transition hover:border-sky-300/60 hover:bg-sky-500/20 hover:text-white"
        >
          Refresh ↻
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="space-y-1">
            <p className="text-4xl font-bold text-white">
              <span className="text-slate-300 text-base font-medium">Current</span> {currentValue.toFixed(1)}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-slate-300 text-xs uppercase tracking-[0.18em]">Forecast</p>
            <p className="text-2xl font-semibold text-sky-300">{projectionValue.toFixed(1)}</p>
            <p className="text-xs text-slate-400">Band: {(projectionValue - 2.1).toFixed(1)} – {(projectionValue + 2.1).toFixed(1)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Confidence Meter</span>
            <span>{confidenceTone(confidencePercent)}</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500"
              style={{ width: `${Math.min(100, Math.max(0, confidencePercent))}%` }}
            />
            <span className="absolute inset-y-0 right-2 flex items-center text-[11px] font-semibold text-slate-100">
              {confidencePercent}%
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${ANOMALY_COLORS[anomalyLevel]}`}>
            <span className="text-base">◉</span>
            {anomalyLevel} · z = {zScore.toFixed(1)}
          </span>
          <button
            type="button"
            className="rounded-full bg-sky-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200 transition hover:bg-sky-500/30"
          >
            ▶ Watch Clip
          </button>
        </div>
        <p className="text-sm text-slate-300">{insight.insight}</p>
      </div>

      <TrendVisualizer points={chartPoints} />
    </article>
  );
}

function TrendVisualizer({ points }: { points: ChartPoint[] }) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
          Trend Visualizer
        </span>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <LegendPill icon="●" text="Actual" accent="text-sky-300" />
          <LegendPill icon="—" text="Forecast" accent="text-sky-100" />
          <LegendPill icon="▒" text="Forecast band" accent="text-sky-200" />
          <LegendPill icon="◉" text="Anomaly" accent="text-rose-300" />
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" strokeDasharray="4 8" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" tickLine={false} width={32} fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "rgba(15, 23, 42, 0.92)",
                borderRadius: 12,
                border: "1px solid rgba(148, 163, 184, 0.25)",
                color: "#e2e8f0",
                fontSize: 12,
              }}
            />
            <defs>
              <linearGradient id="forecastBand" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(186,230,253,0.35)" />
                <stop offset="100%" stopColor="rgba(148,163,184,0)" />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="forecast" stroke="none" fill="url(#forecastBand)" activeDot={false} />
            <Line type="monotone" dataKey="forecast" stroke="#bae6fd" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeDasharray="5 6" strokeWidth={1.6} dot={false} />
            <Line type="monotone" dataKey="actual" stroke="#38bdf8" strokeWidth={2.4} dot={{ r: 3 }} />
            {points
              .filter((pt) => pt.anomaly)
              .map((pt) => (
                <ReferenceDot key={pt.label} x={pt.label} y={pt.actual} r={6} fill="rgba(248,113,113,0.9)" stroke="rgba(248,113,113,0.4)" />
              ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendPill({ icon, text, accent }: { icon: string; text: string; accent: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
      <span className={accent}>{icon}</span>
      <span className="text-slate-300">{text}</span>
    </span>
  );
}

function EventLog({ alerts, selectedId, nowTs }: { alerts: AlertDatum[]; selectedId: string; nowTs: number }) {
  return (
    <aside className="flex h-full max-h-[60vh] flex-col gap-5 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Event Log</h2>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-slate-300">
          {alerts.length} insights
        </span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-sm">
        {alerts.map((alert, index) => {
          const active = alert.id === selectedId;
          return (
            <div
              key={`${alert.id}-${alert.ts}-${index}`}
              className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 transition ${
                active ? "border-sky-400/50 bg-sky-500/10" : "border-white/10 bg-white/5"
              }`}
              >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                <span>{relativeTime(nowTs, alert.ts)}</span>
                <span className="text-[11px] font-semibold text-slate-200">{Math.round(alert.confidence)}%</span>
              </div>
              <p className="text-sm text-slate-100">{alert.insight}</p>
              {typeof alert.value === "number" && typeof alert.projection === "number" ? (
                <p className="text-xs text-slate-400">
                  Current {alert.value.toFixed(1)} vs forecast {alert.projection.toFixed(1)}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function MultiPlayerGrid({
  entries,
  selectedId,
  onSelect,
  directory,
  headshots,
}: {
  entries: InsightDatum[];
  selectedId: string;
  onSelect: (value: string) => void;
  directory: Record<string, PlayerRecord>;
  headshots: Record<string, HeadshotRecord>;
}) {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Multi-Player Grid</h2>
        <span className="text-xs text-slate-400">Quick compare across live signals</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          const anomaly = resolveAnomaly(entry.z ?? 0);
          const name = formatPlayerName(entry.id, directory);
          const isActive = entry.id === selectedId;
          const playerMeta = directory[playerKeyFromComposite(entry.id)];
          const primaryHeadshot = getHeadshotFor(entry.id, headshots);
          const fallbackHeadshot = ESPN_DEFAULT_HEADSHOT;
          const teamTag = playerMeta?.team?.abbreviation ?? playerMeta?.team?.name ?? playerMeta?.team?.market;
          const detailLine = [entry.id.split(":")[1]?.toUpperCase(), teamTag].filter(Boolean).join(" • ");
          const currentValue = Number.isFinite(entry.value) ? entry.value : 0;
          const projectionValue = Number.isFinite(entry.projection) ? entry.projection : 0;
          return (
            <button
              key={entry.id}
              onClick={() => onSelect(entry.id)}
              className={`flex flex-col gap-3 rounded-2xl border px-5 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-300/60 ${
                isActive
                  ? "border-sky-400/60 bg-sky-500/15 shadow-[0_25px_50px_-30px_rgba(56,189,248,0.7)]"
                  : "border-white/10 bg-slate-900/40 hover:border-slate-200/40 hover:bg-slate-900/55"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <HeadshotAvatar name={name} primary={primaryHeadshot} fallback={fallbackHeadshot} size="sm" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">{name}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{detailLine}</span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${ANOMALY_COLORS[anomaly]}`}>
                  <span>◉</span>
                  {anomaly}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current</p>
                  <p className="text-xl font-semibold text-white">
                    {currentValue.toFixed(1)} <span className="text-sm text-slate-400">vs {projectionValue.toFixed(1)}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Confidence</p>
                  <p className="text-sm font-semibold text-sky-200">{Math.round(entry.confidence)}%</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2">{entry.insight}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
