/**
 * Format a test code for display.
 * Input:  "MPS260305007"
 * Output: "MPS-26-03-05-007"
 */
export function formatTestCode(code: string | null | undefined): string {
  return String(code ?? "");
}

/**
 * Format a registration code for display.
 * Input:  "MPS20260305007"
 * Output: "MPS-2026-03-05-007"
 */
export function formatRegCode(code: string | null | undefined): string {
  return String(code ?? "");
}

export const GRADE_LABELS: Record<number, string> = {
  1: "Class I",
  2: "Class II",
  3: "Class III",
  4: "Class IV",
  5: "Class V",
  6: "Class VI",
  7: "Class VII",
  8: "Class VIII",
  9: "Class IX",
};
