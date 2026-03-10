"use client";

import { AlertTriangle } from "lucide-react";
import { useAlerts } from "@/lib/alerts-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DangerIcon() {
  const { events, badgeCount, clearAll } = useAlerts();
  const hasAlerts = badgeCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <AlertTriangle
            className={`h-5 w-5 ${
              hasAlerts
                ? "text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                : "text-slate-400"
            }`}
          />
          {hasAlerts ? (
            <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white">
              {badgeCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Tab Switch Alerts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-auto">
          {events.length === 0 ? <p className="p-3 text-sm text-slate-500">No alerts</p> : null}
          {events.map((event) => (
            <div key={event.id} className="border-b border-slate-100 px-3 py-2 text-sm last:border-0">
              <p className="font-medium text-slate-900">{event.studentName}</p>
              <p className="text-slate-600">
                {`${event.testCode} | ${new Date(event.switchedAt).toLocaleTimeString()} | ${event.count} switches`}
              </p>
            </div>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button className="w-full" size="sm" variant="outline" onClick={clearAll}>
            Clear all
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
