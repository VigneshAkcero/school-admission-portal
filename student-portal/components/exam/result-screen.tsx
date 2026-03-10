"use client"

import { CheckCircle2, Award } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { ExamResult } from "@/lib/exam-types"

interface ResultScreenProps {
  result: ExamResult
}

export function ResultScreen({ result }: ResultScreenProps) {
  const percentage = Math.round(
    (result.totalCorrect / result.totalQuestions) * 100
  )

  const getGrade = () => {
    if (percentage >= 90) return { label: "Excellent", color: "text-[oklch(0.627_0.194_149.214)]" }
    if (percentage >= 75) return { label: "Very Good", color: "text-primary" }
    if (percentage >= 60) return { label: "Good", color: "text-[oklch(0.705_0.213_47.604)]" }
    if (percentage >= 40) return { label: "Needs Improvement", color: "text-[oklch(0.705_0.213_47.604)]" }
    return { label: "Needs More Practice", color: "text-destructive" }
  }

  const gradeInfo = getGrade()

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[oklch(0.627_0.194_149.214)]/10 mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-[oklch(0.627_0.194_149.214)]" />
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground">
            Test Submitted!
          </CardTitle>
          <p className="text-muted-foreground">
            Thank you for completing the admission test
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Student Info */}
          <div className="text-center py-4 rounded-lg bg-muted">
            <p className="text-lg font-semibold text-foreground">
              {result.studentName}
            </p>
            <p className="text-sm text-muted-foreground">
              Grade {result.grade} Admission Test
            </p>
          </div>

          {/* Overall Score */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-full border-4 border-primary mb-3">
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {result.totalCorrect}
                </p>
                <p className="text-sm text-muted-foreground">
                  / {result.totalQuestions}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Award className={`w-5 h-5 ${gradeInfo.color}`} />
              <span className={`font-semibold ${gradeInfo.color}`}>
                {gradeInfo.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {percentage}% Score
            </p>
          </div>

          {/* Subject-wise Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">
              Subject-wise Performance
            </h3>
            {result.subjectScores.map((subject) => {
              const subjectPercentage = Math.round(
                (subject.correct / subject.total) * 100
              )
              return (
                <div key={subject.subject} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{subject.subject}</span>
                    <span className="text-muted-foreground">
                      {subject.correct}/{subject.total}
                    </span>
                  </div>
                  <Progress value={subjectPercentage} className="h-2" />
                </div>
              )
            })}
          </div>

          {/* Footer Message */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Your results have been recorded. The school will contact you
              regarding the next steps.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
