"use client"

import { useAuth } from "@/lib/auth-context"
import { useTestStore } from "@/lib/test-store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertTriangle, LogOut, User } from "lucide-react"
import { useEffect, useState } from "react"

export function Navbar() {
  const { user, logout } = useAuth()
  const { tabSwitchEvents } = useTestStore()
  const [showToast, setShowToast] = useState(false)
  const [latestEvent, setLatestEvent] = useState<string | null>(null)
  const [prevEventCount, setPrevEventCount] = useState(0)

  const hasAlerts = tabSwitchEvents.length > 0

  useEffect(() => {
    if (tabSwitchEvents.length > prevEventCount && prevEventCount > 0) {
      const latest = tabSwitchEvents[0]
      setLatestEvent(`${latest.studentName} switched tab`)
      setShowToast(true)
      
      const timer = setTimeout(() => {
        setShowToast(false)
      }, 4000)
      
      return () => clearTimeout(timer)
    }
    setPrevEventCount(tabSwitchEvents.length)
  }, [tabSwitchEvents, prevEventCount])

  return (
    <>
      {/* Toast notification */}
      <div 
        className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
          showToast ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
      >
        <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">{latestEvent}</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">S</span>
            </div>
            <span className="font-semibold text-foreground">School Admin Portal</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Alert indicator */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="relative"
                >
                  <AlertTriangle 
                    className={`h-5 w-5 transition-colors ${
                      hasAlerts ? "text-destructive animate-pulse" : "text-muted-foreground"
                    }`} 
                  />
                  {hasAlerts && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                      {tabSwitchEvents.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {tabSwitchEvents.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No tab-switch alerts
                  </div>
                ) : (
                  tabSwitchEvents.slice(0, 5).map((event) => (
                    <DropdownMenuItem key={event.id} className="flex flex-col items-start py-3">
                      <span className="font-medium text-foreground">
                        {event.studentName} switched tab
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {event.count} time{event.count > 1 ? "s" : ""} - {formatTime(event.timestamp)}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User info */}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{user?.name}</span>
            </div>
            
            {/* Logout button */}
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
    </>
  )
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}
