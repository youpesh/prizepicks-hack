"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getPlayers } from "@/lib/pulse";
import { useStreamInsights } from "@/lib/useStreamInsights";

export default function VolatilityList() {
  const [players, setPlayers] = useState<{ id: string; first_name?: string; last_name?: string }[]>([]);
  const stream = useStreamInsights();

  useEffect(() => {
    getPlayers("NFL").then(setPlayers).catch(() => setPlayers([]));
  }, []);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Players · Volatility</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {players.slice(0, 12).map((p) => {
            const key = `${p.id}:points`;
            const data = stream.latest[key];
            const confidence = Math.round(data?.confidence ?? 0);
            const label = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.id;
            const status = data?.status ?? "normal";
            const color = status === "alert" ? "bg-red-500" : status === "warning" ? "bg-yellow-500" : "bg-emerald-500";
            return (
              <div key={p.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{label}</div>
                  <div className="text-[11px] text-muted-foreground">{data?.insight ?? "Awaiting signal…"}</div>
                </div>
                <div className="w-32">
                  <div className="h-2 w-full bg-muted rounded">
                    <div className={`h-2 rounded ${color}`} style={{ width: `${confidence}%` }} />
                  </div>
                </div>
                <div className="w-10 text-right text-xs tabular-nums">{confidence}%</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


