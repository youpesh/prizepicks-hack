"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStreamInsights } from "@/lib/useStreamInsights";

export default function BacktestPanel() {
  const stream = useStreamInsights();
  const alerts = stream.recentAlerts;
  const n = alerts.length;
  const hit = alerts.filter((a) => a.value !== undefined && a.projection !== undefined && Math.abs((a.value ?? 0) - (a.projection ?? 0)) < 5).length;
  const precision = n > 0 ? Math.round((hit / n) * 100) : 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Backtest (last alerts)</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <div>Alerts: {n}</div>
        <div>Within ±5: {hit} ({precision}%)</div>
      </CardContent>
    </Card>
  );
}


