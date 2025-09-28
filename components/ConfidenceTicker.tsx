"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Sparkline from "@/components/Sparkline";
import { useEffect, useMemo, useState } from "react";
import { useStreamInsights } from "@/lib/useStreamInsights";

type Row = {
  id: string;
  playerId: string;
  prop: string;
  confidence: number;
  delta: number;
  series: { t: number; v: number; m: number }[];
};

export default function ConfidenceTicker() {
  const stream = useStreamInsights();
  const [filter, setFilter] = useState<string>("All");

  const rows = useMemo<Row[]>(() => {
    const entries = Object.entries(stream.latest);
    const filtered = entries.filter(([key]) => {
      if (filter === "All") return true;
      if (filter === "Points") return key.endsWith(":points");
      if (filter === "Rebounds") return key.endsWith(":rebounds");
      if (filter === "Assists") return key.endsWith(":assists");
      if (filter === "3PT") return key.endsWith(":3pt");
      return true;
    });
    const items = filtered.map(([key, msg]) => {
      const playerId = key.split(":")[0];
      const prop = key.split(":")[1] ?? "points";
      const ser = (stream.series[key] ?? []).slice(-30);
      // Approx delta using last ~10 samples of value as proxy for confidence change
      const recent = ser[ser.length - 1]?.m ?? ser[ser.length - 1]?.v ?? 0;
      const past = ser[Math.max(0, ser.length - 10)]?.m ?? ser[Math.max(0, ser.length - 10)]?.v ?? recent;
      const delta = recent - past;
      return { id: key, playerId, prop, confidence: msg.confidence, delta, series: ser } as Row;
    });
    return items.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
  }, [stream.latest, stream.series, filter]);

  // naive auto-filter to Points if present
  useEffect(() => {
    if (filter === "All") setFilter("Points");
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Confidence Ticker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Filter:</span>
          {(["All", "Points", "Rebounds", "Assists", "3PT"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded ${filter === f ? "bg-primary text-primary-foreground" : "border"}`}
            >
              {f}
            </button>
          ))}
        </div>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Waiting for signals…</div>
        ) : (
          rows.map((r, i) => (
            <div key={r.id} className="grid grid-cols-12 items-center gap-2 border-b last:border-b-0 pb-2">
              <div className="col-span-1 text-xs text-muted-foreground">{i + 1}</div>
              <div className="col-span-4 truncate text-sm">{r.playerId} ({r.prop})</div>
              <div className="col-span-2 flex items-center gap-2">
                <Badge>{Math.round(r.confidence)}%</Badge>
                <span className={`text-xs ${r.delta > 0 ? "text-green-600" : r.delta < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {r.delta > 0 ? "↑" : r.delta < 0 ? "↓" : "↔"}
                </span>
              </div>
              <div className="col-span-5 min-w-0">
                <Sparkline data={r.series} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}



