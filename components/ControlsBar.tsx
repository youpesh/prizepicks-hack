"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUIStore } from "@/lib/store";

type ControlsBarProps = {
  onRiskChange?: (value: number) => void; // 0..100
};

export function ControlsBar({ onRiskChange }: ControlsBarProps) {
  const risk = useUIStore((s) => s.risk);
  const setRisk = useUIStore((s) => s.setRisk);
  const cooldowns = useUIStore((s) => s.cooldowns);
  const setCooldowns = useUIStore((s) => s.setCooldowns);
  return (
    <div className="w-full rounded-md border p-3 md:p-4 grid gap-4 md:grid-cols-3 items-center">
      <div className="space-y-2">
        <Label>Sport</Label>
        <Select defaultValue="NFL">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select sport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="MLB">MLB</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="risk">Risk dial</Label>
          <span className="text-xs text-muted-foreground">Conservative ↔ Aggressive</span>
        </div>
        <Slider id="risk" value={[risk]} step={1} min={0} max={100} onValueChange={(v) => { setRisk(v[0]); onRiskChange?.(v[0]); }} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="cooldowns">Cooldowns</Label>
        <Switch id="cooldowns" checked={cooldowns} onCheckedChange={setCooldowns} />
      </div>
    </div>
  );
}

export default ControlsBar;


