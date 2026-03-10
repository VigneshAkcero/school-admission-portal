"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { DangerIcon } from "@/components/danger-icon";

export function AdminHeader({
  title,
  backHref,
  rightSlot,
}: {
  title: string;
  backHref?: string;
  rightSlot?: ReactNode;
}) {
  const { logout } = useAuth();

  return (
    <header className="border-b border-slate-300 bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {backHref ? (
            <Link href={backHref}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          ) : null}
          <div className="font-semibold text-slate-900">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          {rightSlot}
          <DangerIcon />
          <Button size="sm" variant="ghost" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
