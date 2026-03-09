"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useTestStore } from "@/lib/test-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Monitor, ArrowRight, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function ActiveTestsTable() {
  const { getActiveTests, tabSwitchEvents } = useTestStore()
  const activeTests = getActiveTests()
  const [alertIds, setAlertIds] = useState<Set<string>>(new Set())

  // Watch for new tab switch events to trigger the 2-second red highlight
  useEffect(() => {
    if (tabSwitchEvents.length > 0) {
      const latest = tabSwitchEvents[0]
      const studentId = latest.testCode // Using testCode as key for highlight

      setAlertIds(prev => new Set(prev).add(studentId))

      const timer = setTimeout(() => {
        setAlertIds(prev => {
          const next = new Set(prev)
          next.delete(studentId)
          return next
        })
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [tabSwitchEvents])

  return (
    <div className="premium-card !p-0 overflow-hidden border-none shadow-2xl shadow-indigo-500/10">
      <div className="flex items-center justify-between p-6 bg-white/40 border-b border-white/60">
        <div>
          <h3 className="text-xl font-black text-slate-900">Active Participants</h3>
          <p className="text-sm font-medium text-slate-500">Live monitoring of current examination sessions</p>
        </div>
        <Link href="/session-monitor">
          <Button variant="ghost" className="rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all">
            <Monitor className="h-4 w-4 mr-2" />
            Live Monitor
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.3em] text-slate-400 bg-slate-50/50">
              <th className="px-6 py-4 font-bold">S.No</th>
              <th className="px-6 py-4 font-bold">Student Name</th>
              <th className="px-6 py-4 font-bold">Details</th>
              <th className="px-6 py-4 font-bold">Grade</th>
              <th className="px-6 py-4 font-bold">Test Code</th>
              <th className="px-6 py-4 font-bold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeTests.length === 0 ? (
              <tr>
                <td colSpan={6} className="h-40 text-center py-10">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
                    <p className="font-bold text-lg">No active sessions</p>
                    <p className="text-sm">Active tests will appear here once students start.</p>
                  </div>
                </td>
              </tr>
            ) : (
              activeTests.map((test, index) => {
                const isAlerting = alertIds.has(test.testCode)
                return (
                  <tr
                    key={test.id}
                    className={cn(
                      "transition-all duration-500",
                      isAlerting ? "bg-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]" : "hover:bg-slate-50/80",
                    )}
                  >
                    <td className="px-6 py-5 font-black text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                    <td className="px-6 py-5">
                      <p className="font-black text-slate-900">{test.studentName}</p>
                      <p className="text-xs font-bold text-primary/70">{test.testType}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-slate-700">{test.parentName}</p>
                      <p className="text-xs font-mono text-slate-400">{test.mobile}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black">
                        G-{test.grade}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <code className="text-sm font-black text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                        {test.testCode}
                      </code>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <StatusBadge status={test.status} isAlerting={isAlerting} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status, isAlerting }: { status: string, isAlerting?: boolean }) {
  if (isAlerting) {
    return (
      <Badge className="bg-red-500 text-white animate-pulse border-none px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
        Tab Switch!
      </Badge>
    )
  }

  switch (status) {
    case "Created":
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
          Waiting
        </Badge>
      )
    case "Started":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
          Live Now
        </Badge>
      )
    case "Finished":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
          Finished
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
          {status}
        </Badge>
      )
  }
}
