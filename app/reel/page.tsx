"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getPlayers } from "@/lib/pulse";
import { useStreamInsights } from "@/lib/useStreamInsights";

export default function ReelPage() {
  const stream = useStreamInsights();
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  useEffect(() => {
    getPlayers("NFL").then((ps) => {
      const map: Record<string, string> = {};
      ps.forEach((p) => (map[p.id] = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.id));
      setNameMap(map);
    }).catch(() => setNameMap({}));
  }, []);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Insight Reel (last 60s)</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stream.recentAlerts.map((a, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base truncate">{nameMap[a.id.split(":")[0]] ?? a.id.split(":")[0]}</CardTitle>
              <Badge variant="secondary">{Math.round(a.confidence)}%</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">{a.insight}</div>
              <div className="text-xs text-muted-foreground mt-1">{new Date(a.ts).toLocaleTimeString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


