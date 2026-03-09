const { z } = require("zod");

const createApplicantSchema = z.object({
  studentName: z.string().trim().min(2),
  parentName: z.string().trim().min(2),
  mobile: z.string().trim().regex(/^\d{10}$/, "Mobile must be exactly 10 digits"),
  grade: z.number().int().min(1).max(9),
});

const verifyCodeSchema = z.object({
  testCode: z.string().regex(/^\d{9}$/, "Test code must be exactly 9 digits"),
});

const saveAnswerSchema = z.object({
  testCode: z.string().regex(/^\d{9}$/, "Test code must be exactly 9 digits"),
  questionId: z.string().min(1),
  selectedOption: z.enum(["a", "b", "c", "d"]).nullable().optional(),
  markedForReview: z.boolean().optional(),
  currentQuestionNumber: z.number().int().min(1).optional(),
  currentSubject: z.string().optional(),
  timeRemainingSeconds: z.number().int().min(0).optional(),
});

module.exports = {
  createApplicantSchema,
  verifyCodeSchema,
  saveAnswerSchema,
};
