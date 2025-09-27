"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { useStreamInsights } from "@/lib/useStreamInsights";

type RadarItem = {
  id: string;
  label: string;
  significance: number; // 0..1
  dwellSec: number;
  dwell: boolean;
};

export default function AnomalyRadar() {
  const stream = useStreamInsights();

  const items = useMemo<RadarItem[]>(() => {
    // Heuristic: use z and EWMA delta to synthesize a significance score, dwell from recent cadence
    return Object.entries(stream.latest)
      .map(([id, msg]) => {
        const ser = (stream.series[id] ?? []).slice(-30);
        const dv = ser.length >= 2 ? Math.abs((ser[ser.length - 1]?.m ?? 0) - (ser[0]?.m ?? 0)) : 0;
        const significance = Math.max(0, Math.min(1, (Math.abs(msg.z) / 3 + dv / 5) / 2));
        const dwellSec = Math.min(60, Math.max(0, (ser.length * 0.3)));
        const dwell = dwellSec >= 10; // minimal dwell
        const label = Math.abs(msg.z) > 1.8 ? (msg.z > 0 ? "Momentum surge" : "Momentum drop") : "Stability shift";
        return { id, label, significance, dwellSec, dwell } as RadarItem;
      })
      .sort((a, b) => b.significance - a.significance)
      .slice(0, 4);
  }, [stream.latest, stream.series]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Anomaly Radar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No anomalies yet…</div>
        ) : (
          items.map((it, i) => (
            <div key={it.id} className="flex items-center justify-between gap-3 border-b last:border-b-0 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground">{i + 1}</span>
                <span className="text-sm truncate">{it.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-muted h-2 rounded">
                  <div className="h-2 bg-primary rounded" style={{ width: `${Math.round(it.significance * 100)}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">Sig {it.significance.toFixed(2)}</span>
                <span className="text-xs">Dwell {it.dwell ? "✓" : "☐"}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}


