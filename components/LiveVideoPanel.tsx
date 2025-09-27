"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useStreamInsights } from "@/lib/useStreamInsights";
import { insightBus, type InsightEvent } from "@/lib/bus";

type LiveVideoPanelProps = {
  title?: string;
};

export default function LiveVideoPanel({ title = "Live" }: LiveVideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState<boolean>(true);
  const [playing, setPlaying] = useState<boolean>(false);
  const [src, setSrc] = useState<string>("/videoplayback.mp4");
  const stream = useStreamInsights();

  // Very lightweight overlay feed: take last 3 alerts
  const overlay = useMemo(() => stream.recentAlerts.slice(0, 3), [stream.recentAlerts]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
  }, [muted]);

  useEffect(() => {
    // Check clip provider and notify once on mount
    fetch("/api/clip?check=1")
      .then((r) => r.json())
      .then((j) => {
        if (j?.provider === "twelvelabs") toast.success("TwelveLabs connected");
        else toast("Using local demo clip");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Prefer user's video if present; fallback to sample
    fetch("/videoplayback.mp4", { method: "HEAD" })
      .then((r) => {
        if (r.ok) setSrc("/videoplayback.mp4");
        else setSrc("/sample.mp4");
      })
      .catch(() => setSrc("/sample.mp4"));
  }, []);

  useEffect(() => {
    // Subscribe to unified insight events for optional auto-seek
    const unsub = insightBus.subscribe((evt: InsightEvent) => {
      if (!videoRef.current) return;
      // When an alert arrives with a highlight window, seek into it
      if (evt.status !== "normal" && evt.highlight?.start_sec != null) {
        try {
          videoRef.current.currentTime = Math.max(0, evt.highlight.start_sec);
        } catch {}
      }
    });
    return unsub;
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const back10 = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, v.currentTime - 10);
  };

  return (
    <Card className="relative w-full h-full">
      <CardHeader className="py-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black">
          <video ref={videoRef} className="h-full w-full" src={src} controls={false} loop playsInline />

          {/* Right overlay: AI Broadcast Buddy feed */}
          <div className="pointer-events-none absolute right-2 top-2 z-10 w-[40%] max-w-sm space-y-2">
            {overlay.map((a, i) => (
              <div key={i} className="rounded-md bg-black/60 text-white p-2 text-xs shadow">
                <div className="flex items-center justify-between">
                  <span className="truncate mr-2">{a.insight}</span>
                  <span className="opacity-80">{Math.round(a.confidence)}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Controls bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={togglePlay}>{playing ? "Pause" : "Play"}</Button>
            <Button size="sm" variant="secondary" onClick={back10}>Back 10s</Button>
            <Button size="sm" variant="secondary" onClick={async () => {
              try {
                const r = await fetch(`/api/clip?q=momentum`);
                const j = await r.json();
                const v = videoRef.current;
                if (v && j?.url) {
                  v.src = j.url;
                  await v.play();
                  setPlaying(true);
                }
              } catch {
                // ignore
              }
            }}>Clip Highlights</Button>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setMuted((m) => !m)}>{muted ? "Unmute" : "Mute"}</Button>
              <Button size="sm" variant="secondary">Fullscreen</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


