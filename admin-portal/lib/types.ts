export type ApplicantStatus =
  | "pending"
  | "payment_pending"
  | "paid"
  | "test_scheduled"
  | "test_started"
  | "test_completed"
  | "created"
  | "started"
  | "finished"
  | "approved"
  | "rejected";

export interface ApplicantRow {
  id: string;
  applicant_number?: number | null;
  student_name: string;
  parent_name: string;
  mobile_number: string;
  grade: number;
  status: ApplicantStatus;
  test_code?: string | null;
  registration_code?: string | null;
  source?: "receptionist" | "parent_portal" | null;
  payment_status?: "not_required" | "pending" | "paid" | "failed" | null;
  payment_amount?: number | null;
  payment_txn_id?: string | null;
  payment_at?: string | null;
  preferred_test_date?: string | null;
  preferred_test_slot?: string | null;
  email?: string | null;
  applied_at: string;
  updated_at?: string;
  test_started_at?: string | null;
  test_completed_at?: string | null;
  total_tab_switches?: number;
  start_time?: string | null;
  end_time?: string | null;
  session_status?: "created" | "started" | "finished";
  score?: number | null;
  score_english?: number | null;
  score_math?: number | null;
  score_science_evs?: number | null;
  score_telugu?: number | null;
  score_hindi?: number | null;
  english_total_questions?: number | null;
  math_total_questions?: number | null;
  science_total_questions?: number | null;
  hindi_total_questions?: number | null;
  telugu_total_questions?: number | null;
  total_questions?: number | null;
  score_percentage?: number | null;
  decision_at?: string | null;
  review_status?: "pending" | "approved" | "rejected" | null;
  reviewed_at?: string | null;
  applied_date_ist?: string | null;
  start_time_ist?: string | null;
  end_time_ist?: string | null;
}

export interface AdminDashboardSummary {
  completedOverall: number;
  activeParticipants: number;
  pendingApplicants: number;
  scheduledTests: number;
  completedPendingReview: number;
  latestStudents: Array<{
    id?: string;
    student_name: string;
    grade: number;
    test_code: string | null;
    status: ApplicantStatus;
    updated_at: string;
  }>;
}

export interface MonitorSession {
  id: string;
  test_code: string;
  student_name: string;
  parent_name: string;
  mobile_number: string;
  grade: number;
  status: "started";
  start_time: string | null;
  created_at: string;
  test_date: string;
  tab_switch_count: number;
  answered_count: number;
  visited_count: number;
  marked_count: number;
  total_questions: number;
  english_answered?: number;
  english_total?: number;
  mathematics_answered?: number;
  mathematics_total?: number;
  evs_answered?: number;
  evs_total?: number;
  science_answered?: number;
  science_total?: number;
  telugu_answered?: number;
  telugu_total?: number;
  hindi_answered?: number;
  hindi_total?: number;
}

export interface TabSwitchEvent {
  id?: string;
  test_code: string;
  student_name: string;
  grade?: number;
  switched_at: string;
  switch_count: number;
}
