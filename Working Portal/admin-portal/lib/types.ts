export type ApplicantStatus =
  | "pending"
  | "test_scheduled"
  | "test_started"
  | "test_completed"
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
  total_questions?: number | null;
  score_percentage?: number | null;
  decision_at?: string | null;
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
  avgEnglish?: number | null;
  avgMath?: number | null;
  avgScienceEvs?: number | null;
  avgTelugu?: number | null;
  avgHindi?: number | null;
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
