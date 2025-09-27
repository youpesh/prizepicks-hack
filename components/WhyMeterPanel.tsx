"use client";

import InsightCard from "@/components/InsightCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { getPlayers } from "@/lib/pulse";
import { useStreamInsights } from "@/lib/useStreamInsights";

export default function WhyMeterPanel() {
  const [players, setPlayers] = useState<{ id: string; first_name?: string; last_name?: string }[]>([]);
  const stream = useStreamInsights();

  useEffect(() => {
    getPlayers("NFL").then(setPlayers).catch(() => setPlayers([]));
  }, []);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Why Meter</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {players.slice(0, 4).map((p) => {
            const id = `${p.id}:points`;
            const data = stream.latest[id];
            const series = stream.series[id] ?? [];
            return (
              <InsightCard
                key={p.id}
                title={`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.id}
                insight={data?.insight ?? "Awaiting signal…"}
                confidence={data?.confidence ?? 0}
                status={data?.status ?? "normal"}
                series={series}
                reasons={data?.reasons ?? []}
                risk={data?.risk ?? 0}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


