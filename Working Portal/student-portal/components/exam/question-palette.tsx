"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { QuestionState } from "@/lib/exam-types"

interface QuestionPaletteProps {
  studentName: string
  grade: number
  timeRemaining: number
  questionStates: QuestionState[]
  currentQuestion: number
  onQuestionSelect: (index: number) => void
  onSubmit: () => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export function QuestionPalette({
  studentName,
  grade,
  timeRemaining,
  questionStates,
  currentQuestion,
  onQuestionSelect,
  onSubmit,
}: QuestionPaletteProps) {
  const getTimerColor = () => {
    if (timeRemaining <= 120) return "text-destructive"
    if (timeRemaining <= 300) return "text-[oklch(0.705_0.213_47.604)]"
    return "text-foreground"
  }

  const getQuestionStatus = (state: QuestionState, index: number) => {
    if (index === currentQuestion) return "current"
    if (state.markedForReview) return "review"
    if (state.answered !== null) return "answered"
    if (state.visited) return "visited"
    return "not-visited"
  }

  const statusColors = {
    current: "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
    answered: "bg-[oklch(0.627_0.194_149.214)] text-white",
    review: "bg-[oklch(0.705_0.213_47.604)] text-white",
    visited: "bg-destructive text-white",
    "not-visited": "bg-card text-foreground border border-border hover:bg-muted",
  }

  const answeredCount = questionStates.filter((s) => s.answered !== null).length
  const reviewCount = questionStates.filter((s) => s.markedForReview).length
  const visitedUnanswered = questionStates.filter(
    (s) => s.visited && s.answered === null
  ).length
  const notVisited = questionStates.filter((s) => !s.visited).length

  return (
    <Card className="h-full border-0 shadow-md flex flex-col">
      <CardHeader className="pb-3 space-y-3">
        <div className="text-center">
          <p className="font-medium text-foreground truncate">{studentName}</p>
          <p className="text-sm text-muted-foreground">Grade {grade}</p>
        </div>
        <div
          className={cn(
            "text-center py-3 rounded-lg bg-muted transition-colors",
            getTimerColor()
          )}
        >
          <p className="text-xs text-muted-foreground mb-1">Time Remaining</p>
          <p className={cn("text-3xl font-mono font-bold", getTimerColor())}>
            {formatTime(timeRemaining)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground mb-3">Question Palette</p>
          <div className="grid grid-cols-5 gap-2">
            {questionStates.map((state, index) => (
              <button
                key={index}
                onClick={() => onQuestionSelect(index)}
                className={cn(
                  "w-9 h-9 rounded-md text-sm font-medium transition-all",
                  statusColors[getQuestionStatus(state, index)]
                )}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Legend</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-card border border-border" />
                <span className="text-muted-foreground">Not Visited ({notVisited})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-destructive" />
                <span className="text-muted-foreground">Unanswered ({visitedUnanswered})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-[oklch(0.627_0.194_149.214)]" />
                <span className="text-muted-foreground">Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-[oklch(0.705_0.213_47.604)]" />
                <span className="text-muted-foreground">Review ({reviewCount})</span>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={onSubmit}
          variant="destructive"
          className="w-full mt-6 h-11"
        >
          Submit Test
        </Button>
      </CardContent>
    </Card>
  )
}
