"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import ControlsBar from "@/components/ControlsBar";
import InsightCard from "@/components/InsightCard";
import Calibration from "@/components/Calibration";
import WhatIf from "@/components/WhatIf";
import TopPicks from "@/components/TopPicks";
import ActivePicks from "@/components/ActivePicks";
import SlipBuilder from "@/components/SlipBuilder";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BacktestPanel from "@/components/BacktestPanel";
import { useEffect, useState } from "react";
import { getPlayers } from "@/lib/pulse";
import { useStreamInsights } from "@/lib/useStreamInsights";

export default function Home() {
  const [players, setPlayers] = useState<{ id: string; first_name?: string; last_name?: string }[]>([]);
  const stream = useStreamInsights();
  const [healthOk, setHealthOk] = useState<boolean>(true);

  useEffect(() => {
    getPlayers("NFL").then(setPlayers).catch(() => setPlayers([]));
  }, []);

  useEffect(() => {
    fetch("/api/pulse/health")
      .then(async (r) => {
        try {
          const j = await r.json();
          setHealthOk(j?.status === "healthy");
        } catch {
          setHealthOk(false);
        }
      })
      .catch(() => setHealthOk(false));
  }, []);

  return (
    <div className="min-h-screen w-full p-6 sm:p-8">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Pulse</span>
          <Badge variant="secondary">MVP</Badge>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <button className="text-sm underline">Reel</button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Recent Alerts</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 max-h-[70vh] overflow-auto">
              {stream.recentAlerts.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent alerts yet.</div>
              ) : (
                stream.recentAlerts.slice(0, 20).map((a, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate mr-2">{a.id}</span>
                      <span className="text-xs text-muted-foreground">{Math.round(a.confidence)}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{a.insight}</div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <Tabs defaultValue="live" className="w-full">
        <TabsList>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <Separator className="my-4" />

        <TabsContent value="live" className="mt-0">
          {!healthOk ? (
            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm">
              Pulse Mock server unreachable. Start it on http://localhost:1339 then refresh.
            </div>
          ) : null}
          <div className="mb-4">
            <ControlsBar />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <Calibration total={stream.calibration.total} hits={stream.calibration.hits} />
            <WhatIf projection={26.5} />
            <TopPicks />
            <BacktestPanel />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <SlipBuilder />
            <ActivePicks />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.slice(0, 6).map((p) => {
              const data = stream.latest[`${p.id}:points`];
              const series = stream.series[`${p.id}:points`] ?? [];
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
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Historical explorer (TBD)</div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
