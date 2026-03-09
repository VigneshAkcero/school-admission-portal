export interface Question {
  id: number
  subject: "english" | "mathematics" | "evs" | "science" | "telugu" | "hindi"
  question: string
  options: string[]
  passageGroup?: string
  passage?: string
}

export interface ExamData {
  testCode: string
  studentName: string
  grade: number
  duration: number // in minutes
  questions: Question[]
}

export interface QuestionState {
  answered: number | null
  visited: boolean
  markedForReview: boolean
}

export type ExamStatus = "not-started" | "in-progress" | "submitted"

export interface ExamResult {
  studentName: string
  grade: number
  totalQuestions: number
  totalCorrect: number
  subjectScores: {
    subject: string
    correct: number
    total: number
  }[]
}
