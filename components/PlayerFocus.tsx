"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { useStreamInsights } from "@/lib/useStreamInsights";
import Sparkline from "@/components/Sparkline";

type Props = {
  selectedId?: string;
};

export default function PlayerFocus({ selectedId }: Props) {
  const stream = useStreamInsights();
  const id = useMemo(() => selectedId || Object.keys(stream.latest)[0] || "", [selectedId, stream.latest]);
  const msg = stream.latest[id];
  const series = (stream.series[id] ?? []).slice(-60);

  if (!id || !msg) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Player Focus</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Select a player from the ticker</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Selected: {id}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">Trend Lens (last ~10 min)</div>
        <Sparkline data={series} />
        <div className="text-xs text-muted-foreground">
          Confidence: {Math.round(msg.confidence)}% | z: {msg.z.toFixed(2)} | EWMA: {msg.ewma.toFixed(2)}
        </div>
      </CardContent>
    </Card>
  );
}


