"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { computeEV } from "@/lib/ev";
import { useStreamInsights } from "@/lib/useStreamInsights";
import { useEffect, useMemo, useState } from "react";
import { getPlayers } from "@/lib/pulse";
import { usePicksStore } from "@/lib/picks";

export default function TopPicks() {
  const stream = useStreamInsights();
  const addPick = usePicksStore((s) => s.addPick);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  useEffect(() => {
    getPlayers("NFL").then((ps) => {
      const map: Record<string, string> = {};
      ps.forEach((p) => (map[p.id] = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.id));
      setNameMap(map);
    }).catch(() => setNameMap({}));
  }, []);

  const rows = useMemo(() => {
    // prefer static lines when available
    let staticLines: { player_id: string; stat: string; line: number; payout: number }[] = [];
    try {
      // Note: public assets are fetched from /lines.json at runtime
      // This useMemo won't await; we optimistically read from a cached window var set below
      // @ts-ignore
      staticLines = (typeof window !== "undefined" && (window.__LINES__ as any)) || [];
    } catch {}

    const base = staticLines.length > 0
      ? staticLines
          .map((ln) => {
            const latest = stream.latest[`${ln.player_id}:points`];
            if (!latest) return null as any;
            const ev = computeEV({ projection: latest.projection, confidence: latest.confidence }, { ...ln, id: ln.player_id });
            const side = ev.evOver >= ev.evUnder ? "Over" : "Under";
            const value = Math.max(ev.evOver, ev.evUnder);
            return { id: ln.player_id, playerId: ln.player_id, side, value, line: ln.line, confidence: latest.confidence, reason: latest.insight };
          })
          .filter(Boolean)
      : Object.entries(stream.latest)
      .filter(([k, v]) => k.endsWith(":points") && v)
      .slice(0, 20)
      .map(([key, latest]) => {
        const playerId = key.split(":")[0];
        const proj = latest.projection;
        const hash = Array.from(playerId).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
        const offset = ((hash % 9) - 4) * 0.5; // -2.0 .. +2.0 in 0.5 steps
        const raw = proj + offset;
        const line = Math.round(raw * 2) / 2; // nearest 0.5
        const ev = computeEV({ projection: proj, confidence: latest.confidence }, { id: key, player_id: playerId, stat: "points", line, payout: 1.5 });
        const side = ev.evOver >= ev.evUnder ? "Over" : "Under";
        const value = Math.max(ev.evOver, ev.evUnder);
        return { id: key, playerId, side, value, line, confidence: latest.confidence, reason: latest.insight };
      });
    const items = (base as any[]).sort((a, b) => b.value - a.value).slice(0, 3);
    return items as { id: string; playerId: string; side: string; value: number; line: number; confidence: number; reason: string }[];
  }, [stream.latest]);

  // lazy load static lines once
  useEffect(() => {
    if (typeof window === "undefined") return;
    // @ts-ignore
    if (window.__LINES__) return;
    fetch("/lines.json")
      .then((r) => r.json())
      .then((j) => {
        // @ts-ignore
        window.__LINES__ = j;
      })
      .catch(() => {});
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Picks Now</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Waiting for signals…</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 border-b last:border-b-0 pb-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{nameMap[r.playerId] ?? r.playerId}</div>
                <div className="text-xs text-muted-foreground truncate">{r.reason}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.side === "Over" ? "secondary" : "outline"}>{r.side} {r.line}</Badge>
                <Badge>{Math.round(r.confidence)}%</Badge>
                <Button size="sm" onClick={() => {
                  addPick({ id: `${r.id}-${Date.now()}`, playerId: r.playerId, side: r.side as any, line: r.line, addedAt: Date.now() });
                }}>Add</Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}


