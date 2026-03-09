"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { getWsUrl } from "@/lib/api";

export interface TabAlertEvent {
  id: string;
  studentName: string;
  testCode: string;
  count: number;
  switchedAt: string;
}

interface AlertContextValue {
  events: TabAlertEvent[];
  badgeCount: number;
  clearAll: () => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

interface ToastItem {
  id: string;
  text: string;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [events, setEvents] = useState<TabAlertEvent[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const clearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!token || !user || user.role !== "admin") return;
    const ws = new WebSocket(getWsUrl("admin"));

    ws.onmessage = (event) => {
      let parsed: { type?: string; payload?: Record<string, unknown> } | null = null;
      try {
        parsed = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (parsed?.type !== "TAB_SWITCH") return;
      const payload = parsed.payload || {};
      const eventItem: TabAlertEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        studentName: String(payload.studentName || ""),
        testCode: String(payload.testCode || ""),
        count: Number(payload.count || 0),
        switchedAt: String(payload.switchedAt || new Date().toISOString()),
      };

      setEvents((prev) => [eventItem, ...prev]);

      const toast: ToastItem = {
        id: eventItem.id,
        text: `${eventItem.studentName} switched tabs (${eventItem.count} times total)`,
      };
      setToasts((prev) => [toast, ...prev].slice(0, 3));
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, 5000);
      clearTimers.current.set(toast.id, timer);
    };

    return () => {
      ws.close();
      for (const timer of clearTimers.current.values()) clearTimeout(timer);
      clearTimers.current.clear();
    };
  }, [token, user]);

  function clearAll() {
    setEvents([]);
  }

  const value = useMemo(
    () => ({
      events,
      badgeCount: events.length,
      clearAll,
    }),
    [events],
  );

  return (
    <AlertContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-lg transition-all duration-300 animate-in slide-in-from-right-6"
          >
            {toast.text}
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) throw new Error("useAlerts must be used within AlertProvider");
  return context;
}
