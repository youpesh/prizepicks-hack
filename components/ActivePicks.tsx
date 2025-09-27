"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePicksStore } from "@/lib/picks";
import { useStreamInsights } from "@/lib/useStreamInsights";

export default function ActivePicks() {
  const { picks, removePick, clear } = usePicksStore();
  const stream = useStreamInsights();
  return (
    <Card>
      <CardHeader className="flex items-center justify-between flex-row">
        <CardTitle className="text-base">Active Picks</CardTitle>
        {picks.length > 0 ? <Button size="sm" variant="outline" onClick={clear}>Clear</Button> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {picks.length === 0 ? (
          <div className="text-sm text-muted-foreground">No active picks yet.</div>
        ) : (
          picks.map((p) => {
            const latest = stream.latest[`${p.playerId}:points`];
            const hedge = latest && latest.status === "warning" && latest.confidence < 40;
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 border-b last:border-b-0 pb-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.playerId}</div>
                  <div className="text-xs text-muted-foreground truncate">{latest?.insight ?? "Stable"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{p.side} {p.line}</Badge>
                  {hedge ? <Badge variant="destructive">Hedge</Badge> : null}
                  <Button size="sm" variant="ghost" onClick={() => removePick(p.id)}>Remove</Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}


