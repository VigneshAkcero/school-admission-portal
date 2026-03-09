"use client";

const SESSION_KEY = "montessori_exam_session";
const RESULT_KEY = "montessori_exam_result";
const ANSWER_STATE_KEY = "montessori_exam_answers";

export interface ExamQuestion {
  id: string;
  classLevel: number;
  subject: string;
  questionType: "mcq" | "fill_blank" | "comprehension";
  passageText: string | null;
  passageGroup: string | null;
  questionText: string;
  options: { a: string; b: string; c: string; d: string };
  imageRequired: boolean;
}

export interface ActiveExamSession {
  testCode: string;
  studentName: string;
  grade: number;
  durationMinutes?: number;
  totalQuestions?: number;
  maximumMarks?: number;
  startedAt?: string | null;
  questions: ExamQuestion[];
}

export interface SubmittedResult {
  success: boolean;
  timedOut: boolean;
}

export function saveActiveSession(session: ActiveExamSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getActiveSession(): ActiveExamSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveExamSession;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearActiveSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function saveResult(result: SubmittedResult) {
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

export function clearSavedResult() {
  sessionStorage.removeItem(RESULT_KEY);
}

export function getSavedResult(): SubmittedResult | null {
  const raw = sessionStorage.getItem(RESULT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SubmittedResult;
  } catch {
    sessionStorage.removeItem(RESULT_KEY);
    return null;
  }
}

export function saveAnswerState(state: Record<string, { selectedOption: "a" | "b" | "c" | "d" | null; markedForReview: boolean; visited: boolean }>) {
  sessionStorage.setItem(ANSWER_STATE_KEY, JSON.stringify(state));
}

export function getAnswerState() {
  const raw = sessionStorage.getItem(ANSWER_STATE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<
      string,
      { selectedOption: "a" | "b" | "c" | "d" | null; markedForReview: boolean; visited: boolean }
    >;
  } catch {
    sessionStorage.removeItem(ANSWER_STATE_KEY);
    return {};
  }
}

export function clearAnswerState() {
  sessionStorage.removeItem(ANSWER_STATE_KEY);
}
