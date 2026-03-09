"use client"

import { useState } from "react"
import { GraduationCap, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ExamData } from "@/lib/exam-types"

interface TestCodeEntryProps {
  onStartExam: (examData: ExamData) => void
}

export function TestCodeEntry({ onStartExam }: TestCodeEntryProps) {
  const [testCode, setTestCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState("")
  const [examData, setExamData] = useState<ExamData | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (value.length <= 9) {
      setTestCode(value)
      setError("")
    }
  }

  const handleVerify = async () => {
    if (testCode.length < 5) {
      setError("Please enter a valid test code")
      return
    }

    setIsVerifying(true)
    setError("")

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800))

    const { mockExamData } = await import("@/lib/exam-data")
    const data = mockExamData[testCode]

    if (data) {
      setExamData(data)
      setShowConfirmDialog(true)
    } else {
      setError("Invalid test code. Please check and try again.")
    }

    setIsVerifying(false)
  }

  const handleStartExam = () => {
    if (examData) {
      onStartExam(examData)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardContent className="pt-8 pb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              School Admission Test
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter your test code to begin
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="test-code"
                className="text-sm font-medium text-foreground"
              >
                Test Code
              </label>
              <Input
                id="test-code"
                type="text"
                placeholder="e.g., EXAM12345"
                value={testCode}
                onChange={handleCodeChange}
                className="text-center text-lg font-mono tracking-widest h-14 uppercase"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerify()
                }}
              />
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>

            <Button
              onClick={handleVerify}
              disabled={isVerifying || testCode.length < 5}
              className="w-full h-12 text-base"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify Code
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Try: EXAM12345, TEST67890, or ADMN2024A
          </p>
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Welcome, {examData?.studentName}!</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="text-foreground">
                  You are taking the{" "}
                  <span className="font-semibold">Grade {examData?.grade}</span>{" "}
                  Admission Test.
                </p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-sm">
                    Duration: {examData?.duration} minutes
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-sm">
                    {examData?.questions.length} Questions
                  </span>
                </div>
                <p className="text-sm text-muted-foreground pt-1">
                  Once you start, the timer will begin. Make sure you have a
                  stable internet connection.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleStartExam} className="flex-1">
              Start Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
