"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StudentShell({
    title,
    subtitle,
    status,
    children,
}: {
    title: string;
    subtitle?: string;
    status?: {
        label: string;
        value: string;
        icon?: React.ReactNode;
        color?: string;
    };
    children: React.ReactNode;
}) {
    const { theme, setTheme } = useTheme();

    return (
        <div className="min-h-screen animate-in bg-background p-4 md:p-8">
            <div className="mx-auto max-w-[1400px]">
                <div className="glass group rounded-[32px] p-6 md:p-10 transition-all duration-500 hover:shadow-2xl">
                    <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-1 w-8 bg-primary rounded-full" />
                                <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-slate-500">
                                    Admission Exam Portal
                                </p>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl lg:text-5xl gradient-text">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="mt-3 max-w-2xl text-base font-medium text-slate-500 leading-relaxed">
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 self-start bg-white/40 p-2 rounded-[24px] border border-white/60 shadow-inner">
                            {status && (
                                <div className="flex items-center gap-3 px-4 py-2 bg-white/60 rounded-2xl border border-white/80 shadow-sm">
                                    {status.icon || <ShieldCheck className={cn("h-4 w-4", status.color || "text-primary")} />}
                                    <div className="text-left">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">
                                            {status.label}
                                        </p>
                                        <p className="text-sm font-black text-slate-900 leading-none">
                                            {status.value}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-11 w-11 hover:bg-white"
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            >
                                {theme === "dark" ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-slate-700" />}
                            </Button>
                        </div>
                    </header>

                    <div className="relative">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
