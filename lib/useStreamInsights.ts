"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUIStore } from "./store";

type WorkerMsg = {
  id: string;
  insight: string;
  confidence: number;
  status: "normal" | "warning" | "alert";
  z: number;
  ewma: number;
  value: number;
  projection: number;
};

export function useStreamInsights() {
  const [data, setData] = useState<Record<string, WorkerMsg>>({});
  const [series, setSeries] = useState<Record<string, { t: number; v: number; m: number; p: number }[]>>({});
  const [calibration, setCalibration] = useState<{ total: number; hits: number }>(() => ({ total: 0, hits: 0 }));
  const [recentAlerts, setRecentAlerts] = useState<{ id: string; ts: number; insight: string; confidence: number }[]>([]);
  const sourceRef = useRef<EventSource | null>(null);
  const worker = useMemo(() => {
    if (typeof window === "undefined") return null as unknown as Worker;
    return new Worker(new URL("./worker/analytics.ts", import.meta.url), { type: "module" });
  }, []);

  const risk = useUIStore((s) => s.risk);
  const cooldowns = useUIStore((s) => s.cooldowns);
  const lastFiredRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!worker) return;
    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const msg = e.data;
      if (cooldowns) {
        const now = Date.now();
        const last = lastFiredRef.current[msg.id] ?? 0;
        if (now - last < 2000) return;
        lastFiredRef.current[msg.id] = now;
      }
      const adjusted: WorkerMsg = { ...msg };
      if (risk > 60 && adjusted.status === "warning") adjusted.status = "alert";
      if (risk < 30 && adjusted.status === "warning") adjusted.status = "normal";
      setData((prev) => ({ ...prev, [adjusted.id]: adjusted }));
      setSeries((prev) => {
        const arr = prev[adjusted.id]?.slice(-59) ?? [];
        return { ...prev, [adjusted.id]: [...arr, { t: Date.now(), v: adjusted.value, m: adjusted.ewma, p: adjusted.projection }] };
      });
      // naive calibration: when status is alert/warning, treat as prediction direction and check next tick proximity to projection
      setCalibration((prev) => ({ total: prev.total + 1, hits: prev.hits + (Math.abs(adjusted.value - adjusted.projection) < 5 ? 1 : 0) }));
      if (adjusted.status === "alert") {
        setRecentAlerts((prev) => [{ id: adjusted.id, ts: Date.now(), insight: adjusted.insight, confidence: adjusted.confidence }, ...prev].slice(0, 20));
      }
    };
    return () => {
      worker?.terminate();
    };
  }, [worker, risk, cooldowns]);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    sourceRef.current = es;
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        worker?.postMessage(evt);
      } catch {
        // ignore
      }
    };
    return () => {
      es.close();
    };
  }, [worker]);

  return { latest: data, series, calibration, recentAlerts };
}


