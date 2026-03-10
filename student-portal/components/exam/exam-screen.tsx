"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Flag, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { QuestionPalette } from "./question-palette"
import type { ExamData, QuestionState, ExamResult } from "@/lib/exam-types"
import { cn } from "@/lib/utils"

interface ExamScreenProps {
  examData: ExamData
  onSubmit: (result: ExamResult) => void
}

const subjectLabels = {
  english: "English",
  mathematics: "Mathematics",
  evs: "EVS / Science",
}

export function ExamScreen({ examData, onSubmit }: ExamScreenProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questionStates, setQuestionStates] = useState<QuestionState[]>(
    examData.questions.map(() => ({
      answered: null,
      visited: false,
      markedForReview: false,
    }))
  )
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(examData.duration * 60)
  const [activeSubject, setActiveSubject] = useState<"english" | "mathematics" | "evs">("english")
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)

  const currentQuestion = examData.questions[currentQuestionIndex]
  const subjectQuestions = examData.questions.filter((q) => q.subject === activeSubject)
  const subjectQuestionIndex = subjectQuestions.findIndex((q) => q.id === currentQuestion.id)

  // Mark current question as visited
  useEffect(() => {
    setQuestionStates((prev) => {
      const newStates = [...prev]
      newStates[currentQuestionIndex] = {
        ...newStates[currentQuestionIndex],
        visited: true,
      }
      return newStates
    })
    setSelectedOption(questionStates[currentQuestionIndex]?.answered ?? null)
  }, [currentQuestionIndex])

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const calculateResult = useCallback((): ExamResult => {
    const { correctAnswers } = require("@/lib/exam-data")
    
    const subjectScores = (["english", "mathematics", "evs"] as const).map((subject) => {
      const subjectQs = examData.questions.filter((q) => q.subject === subject)
      const correct = subjectQs.filter((q) => {
        const qIndex = examData.questions.findIndex((eq) => eq.id === q.id)
        return questionStates[qIndex]?.answered === correctAnswers[q.id]
      }).length
      return {
        subject: subjectLabels[subject],
        correct,
        total: subjectQs.length,
      }
    })

    const totalCorrect = subjectScores.reduce((sum, s) => sum + s.correct, 0)

    return {
      studentName: examData.studentName,
      grade: examData.grade,
      totalQuestions: examData.questions.length,
      totalCorrect,
      subjectScores,
    }
  }, [examData, questionStates])

  const handleSubmit = useCallback(() => {
    const result = calculateResult()
    onSubmit(result)
  }, [calculateResult, onSubmit])

  const handleOptionSelect = (optionIndex: number) => {
    setSelectedOption(optionIndex)
  }

  const handleSaveAndNext = () => {
    setQuestionStates((prev) => {
      const newStates = [...prev]
      newStates[currentQuestionIndex] = {
        ...newStates[currentQuestionIndex],
        answered: selectedOption,
      }
      return newStates
    })

    if (currentQuestionIndex < examData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      // Save current answer before moving
      setQuestionStates((prev) => {
        const newStates = [...prev]
        newStates[currentQuestionIndex] = {
          ...newStates[currentQuestionIndex],
          answered: selectedOption,
        }
        return newStates
      })
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleMarkForReview = () => {
    setQuestionStates((prev) => {
      const newStates = [...prev]
      newStates[currentQuestionIndex] = {
        ...newStates[currentQuestionIndex],
        markedForReview: !newStates[currentQuestionIndex].markedForReview,
      }
      return newStates
    })
  }

  const handleClear = () => {
    setSelectedOption(null)
    setQuestionStates((prev) => {
      const newStates = [...prev]
      newStates[currentQuestionIndex] = {
        ...newStates[currentQuestionIndex],
        answered: null,
      }
      return newStates
    })
  }

  const handleSubjectChange = (subject: "english" | "mathematics" | "evs") => {
    // Save current answer before switching
    setQuestionStates((prev) => {
      const newStates = [...prev]
      newStates[currentQuestionIndex] = {
        ...newStates[currentQuestionIndex],
        answered: selectedOption,
      }
      return newStates
    })

    setActiveSubject(subject)
    const firstQuestionOfSubject = examData.questions.findIndex(
      (q) => q.subject === subject
    )
    if (firstQuestionOfSubject !== -1) {
      setCurrentQuestionIndex(firstQuestionOfSubject)
    }
  }

  const handleQuestionSelect = (index: number) => {
    // Save current answer before switching
    setQuestionStates((prev) => {
      const newStates = [...prev]
      newStates[currentQuestionIndex] = {
        ...newStates[currentQuestionIndex],
        answered: selectedOption,
      }
      return newStates
    })
    setCurrentQuestionIndex(index)
    setActiveSubject(examData.questions[index].subject)
  }

  const progress =
    (questionStates.filter((s) => s.answered !== null).length /
      examData.questions.length) *
    100

  // Find passage for current question
  const passage = currentQuestion.passage || 
    (currentQuestion.passageGroup && 
      examData.questions.find(
        (q) => q.passageGroup === currentQuestion.passageGroup && q.passage
      )?.passage)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <Progress value={progress} className="h-1 rounded-none" />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Main Question Area */}
        <div className="flex-1 flex flex-col p-4 lg:p-6">
          {/* Subject Tabs */}
          <div className="flex gap-1 mb-4 bg-muted p-1 rounded-lg w-fit">
            {(["english", "mathematics", "evs"] as const).map((subject) => (
              <button
                key={subject}
                onClick={() => handleSubjectChange(subject)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  activeSubject === subject
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {subjectLabels[subject]}
              </button>
            ))}
          </div>

          {/* Question Card */}
          <Card className="flex-1 border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  Question {subjectQuestionIndex + 1} of {subjectQuestions.length}
                </span>
                {questionStates[currentQuestionIndex]?.markedForReview && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[oklch(0.705_0.213_47.604)] text-white">
                    <Flag className="w-3 h-3" />
                    Marked for Review
                  </span>
                )}
              </div>

              {/* Passage (if exists) */}
              {passage && (
                <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Read the passage below
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">
                    {passage}
                  </p>
                </div>
              )}

              {/* Question */}
              <p className="text-lg font-medium text-foreground mb-6 leading-relaxed">
                {currentQuestion.question}
              </p>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(index)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left",
                      selectedOption === index
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                        selectedOption === index
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="text-foreground">{option}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={handleMarkForReview}
                className={cn(
                  questionStates[currentQuestionIndex]?.markedForReview &&
                    "bg-[oklch(0.705_0.213_47.604)] text-white border-[oklch(0.705_0.213_47.604)] hover:bg-[oklch(0.65_0.213_47.604)] hover:text-white"
                )}
              >
                <Flag className="w-4 h-4 mr-1" />
                {questionStates[currentQuestionIndex]?.markedForReview
                  ? "Marked"
                  : "Mark for Review"}
              </Button>
              <Button variant="outline" onClick={handleClear}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
            <Button onClick={handleSaveAndNext}>
              Save & Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Question Palette Sidebar */}
        <div className="w-full lg:w-80 p-4 lg:p-6 lg:pl-0">
          <QuestionPalette
            studentName={examData.studentName}
            grade={examData.grade}
            timeRemaining={timeRemaining}
            questionStates={questionStates}
            currentQuestion={currentQuestionIndex}
            onQuestionSelect={handleQuestionSelect}
            onSubmit={() => setShowSubmitDialog(true)}
          />
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to submit your test?</p>
                <div className="flex gap-4 text-sm">
                  <span>
                    Answered:{" "}
                    <strong>
                      {questionStates.filter((s) => s.answered !== null).length}
                    </strong>
                  </span>
                  <span>
                    Unanswered:{" "}
                    <strong>
                      {questionStates.filter((s) => s.answered === null).length}
                    </strong>
                  </span>
                </div>
                <p className="text-destructive font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Test</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Submit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
