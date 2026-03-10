"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Upipay({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState("apps");
  const appset = (_a: string) => setStep("scan");
  const txn = `UPI${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const ref = Math.floor(100000000000 + Math.random() * 900000000000);

  function complete() {
    setStep("processing");
    setTimeout(() => setStep("receipt"), 2000 + Math.random() * 2000);
  }

  if (step === "receipt") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-[380px] animate-in zoom-in overflow-hidden rounded-3xl bg-white shadow-xl duration-300">
          <div className="bg-green-600 py-4 text-center font-semibold text-white">Payment Successful</div>
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={26} />
            </div>
            <div className="text-3xl font-black">Rs 500</div>
            <div className="mt-1 text-sm text-slate-500">Paid to Montessori Prime School</div>
            <div className="mt-6 text-xs text-slate-400">UPI Transaction ID</div>
            <div className="font-mono text-xs">{txn}</div>
            <div className="mt-3 text-xs text-slate-400">Bank Reference</div>
            <div className="font-mono text-xs">{ref}</div>
            <div className="mt-3 text-xs text-slate-400">Payment Method</div>
            <div className="text-xs">UPI</div>
            <Button className="mt-6 w-full" onClick={onFinish}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-[360px] animate-in zoom-in rounded-3xl bg-white p-8 text-center shadow-xl duration-300">
          <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600" />
          <div className="text-lg font-semibold">Processing payment</div>
          <div className="text-sm text-slate-500">Contacting bank...</div>
        </div>
      </div>
    );
  }

  if (step === "scan") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-[360px] animate-in zoom-in rounded-3xl bg-white p-6 text-center shadow-xl duration-300">
          <div className="mb-2 text-lg font-bold">Scan and Pay</div>
          <div className="mb-4 text-sm text-slate-500">Montessori Prime School</div>

          <div className="relative mx-auto w-[220px] overflow-hidden rounded-lg">
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=MontessoriPrime@upi&pn=MontessoriPrimeSchool&am=500"
              alt="Payment QR"
            />
            <div className="absolute left-0 right-0 h-[3px] animate-[scan_2s_linear_infinite] bg-green-500" />
          </div>

          <style jsx>{`
            @keyframes scan {
              0% { top: 0; }
              100% { top: 100%; }
            }
          `}</style>

          <div className="mt-4 text-3xl font-black">Rs 500</div>
          <Button className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700" onClick={complete}>
            I have paid
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-[360px] animate-in zoom-in rounded-3xl bg-white p-6 shadow-xl duration-300">
        <div className="mb-6 text-center text-lg font-bold">Choose UPI App</div>
        <div className="space-y-4">
          <button onClick={() => appset("gpay")} className="flex w-full items-center justify-between rounded-xl border p-4 transition-colors hover:bg-slate-50">
            <span className="font-semibold text-slate-700">Google Pay</span>
            <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600">Recommended</span>
          </button>
          <button onClick={() => appset("phonepe")} className="flex w-full items-center justify-between rounded-xl border p-4 transition-colors hover:bg-slate-50">
            <span className="font-semibold text-slate-700">PhonePe</span>
          </button>
          <button onClick={() => appset("paytm")} className="flex w-full items-center justify-between rounded-xl border p-4 transition-colors hover:bg-slate-50">
            <span className="font-semibold text-slate-700">Paytm</span>
          </button>
        </div>
      </div>
    </div>
  );
}