"use client";

import ControlsBar from "@/components/ControlsBar";
import ConfidenceTicker from "@/components/ConfidenceTicker";
import InsightCard from "@/components/InsightCard";
import Calibration from "@/components/Calibration";
import BacktestPanel from "@/components/BacktestPanel";
import WhatIf from "@/components/WhatIf";
import { useStreamInsights } from "@/lib/useStreamInsights";
import PlayerFocus from "@/components/PlayerFocus";
import AnomalyRadar from "@/components/AnomalyRadar";
import OverlayBuilder from "@/components/OverlayBuilder";

export default function SignalDeskPage() {
  const stream = useStreamInsights();
  const latestEntries = Object.entries(stream.latest).slice(0, 6);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">SIGNALDESK — Real‑Time Confidence & Why</h1>
        <div className="flex items-center gap-3">
          <Calibration total={stream.calibration.total} hits={stream.calibration.hits} />
        </div>
      </div>

      <ControlsBar />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <ConfidenceTicker />
          <BacktestPanel />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <PlayerFocus />
          <AnomalyRadar />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WhatIf projection={latestEntries[0]?.[1]?.projection ?? 0} />
            <OverlayBuilder />
          </div>
        </div>
      </div>
    </div>
  );
}


