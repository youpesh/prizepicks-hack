"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMemo, useRef, useState } from "react";
import { useStreamInsights } from "@/lib/useStreamInsights";

function buildSVG(title: string, subtitle: string, signal: number, reason: string, theme: "dark" | "light") {
  const bg = theme === "dark" ? "#0B0B0F" : "#FFFFFF";
  const fg = theme === "dark" ? "#FFFFFF" : "#0B0B0F";
  const accent = "#22c55e";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="220" viewBox="0 0 900 220">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="28" y="60" font-family="Inter, system-ui" font-size="28" font-weight="700" fill="${fg}">${title}</text>
  <text x="28" y="92" font-family="Inter, system-ui" font-size="16" fill="${fg}" opacity="0.8">${subtitle}</text>
  <g transform="translate(28, 120)">
    <rect rx="6" ry="6" width="170" height="60" fill="${accent}"/>
    <text x="16" y="38" font-family="Inter, system-ui" font-size="24" font-weight="700" fill="#02160a">SIGNAL ${Math.round(signal)}</text>
  </g>
  <text x="220" y="160" font-family="Inter, system-ui" font-size="16" fill="${fg}">WHY: ${reason}</text>
</svg>`;
  return svg;
}

export default function OverlayBuilder() {
  const stream = useStreamInsights();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const first = useMemo(() => Object.entries(stream.latest)[0]?.[1], [stream.latest]);
  const id = useMemo(() => Object.keys(stream.latest)[0] ?? "", [stream.latest]);
  const reason = first?.insight ?? "Stable";
  const ref = useRef<HTMLDivElement>(null);

  const svg = useMemo(() => buildSVG(id || "PLAYER • PROP", "Signal Badge", first?.confidence ?? 0, reason, theme), [id, first?.confidence, reason, theme]);

  async function copySVG() {
    try {
      await navigator.clipboard.writeText(svg);
      alert("SVG copied to clipboard");
    } catch {}
  }

  async function downloadPNG() {
    try {
      const img = new Image();
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 900; canvas.height = 220;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((png) => {
          if (!png) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(png);
          a.download = "signal-badge.png";
          a.click();
        });
      };
      img.src = url;
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Overlay Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <span>Theme:</span>
          <button className={`px-2 py-0.5 rounded ${theme === "dark" ? "bg-primary text-primary-foreground" : "border"}`} onClick={() => setTheme("dark")}>
            Dark
          </button>
          <button className={`px-2 py-0.5 rounded ${theme === "light" ? "bg-primary text-primary-foreground" : "border"}`} onClick={() => setTheme("light")}>
            Light
          </button>
        </div>
        <div ref={ref} className="rounded border overflow-hidden bg-background">
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={copySVG}>Copy SVG</Button>
          <Button size="sm" variant="outline" onClick={downloadPNG}>Download PNG</Button>
        </div>
      </CardContent>
    </Card>
  );
}


