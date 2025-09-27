"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import ControlsBar from "@/components/ControlsBar";
import InsightCard from "@/components/InsightCard";
import { useEffect, useState } from "react";
import { getPlayers } from "@/lib/pulse";
import { useStreamInsights } from "@/lib/useStreamInsights";

export default function Home() {
  const [players, setPlayers] = useState<{ id: string; first_name?: string; last_name?: string }[]>([]);
  const stream = useStreamInsights();

  useEffect(() => {
    getPlayers("NFL").then(setPlayers).catch(() => setPlayers([]));
  }, []);

  return (
    <div className="min-h-screen w-full p-6 sm:p-8">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Pulse</span>
          <Badge variant="secondary">MVP</Badge>
        </div>
      </header>

      <Tabs defaultValue="live" className="w-full">
        <TabsList>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <Separator className="my-4" />

        <TabsContent value="live" className="mt-0">
          <div className="mb-4">
            <ControlsBar />
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
