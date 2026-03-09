import type { ExamData, Question } from "./exam-types"

const englishQuestions: Question[] = [
  {
    id: 1,
    subject: "english",
    passageGroup: "passage-1",
    passage:
      "The sun rose slowly over the mountains, casting long shadows across the valley below. Birds began their morning songs, filling the air with melody. A gentle breeze rustled through the leaves of the ancient oak trees that lined the winding path leading to the village.",
    question: "What time of day is described in the passage?",
    options: ["Evening", "Morning", "Afternoon", "Night"],
  },
  {
    id: 2,
    subject: "english",
    passageGroup: "passage-1",
    question: "What was happening to the birds?",
    options: [
      "They were sleeping",
      "They were singing",
      "They were flying south",
      "They were building nests",
    ],
  },
  {
    id: 3,
    subject: "english",
    question: 'Choose the correct synonym for "enormous":',
    options: ["Tiny", "Huge", "Average", "Narrow"],
  },
  {
    id: 4,
    subject: "english",
    question: "Which sentence is grammatically correct?",
    options: [
      "She don't like apples.",
      "She doesn't likes apples.",
      "She doesn't like apples.",
      "She not like apples.",
    ],
  },
  {
    id: 5,
    subject: "english",
    question: 'Identify the part of speech of the word "quickly" in: "She ran quickly."',
    options: ["Noun", "Verb", "Adjective", "Adverb"],
  },
]

const mathQuestions: Question[] = [
  {
    id: 6,
    subject: "mathematics",
    question: "What is 15 × 12?",
    options: ["170", "180", "190", "200"],
  },
  {
    id: 7,
    subject: "mathematics",
    question: "If a rectangle has length 8 cm and width 5 cm, what is its area?",
    options: ["13 cm²", "26 cm²", "40 cm²", "45 cm²"],
  },
  {
    id: 8,
    subject: "mathematics",
    question: "What is the value of x in: 3x + 7 = 22?",
    options: ["3", "4", "5", "6"],
  },
  {
    id: 9,
    subject: "mathematics",
    question: "What fraction is equivalent to 0.75?",
    options: ["1/2", "2/3", "3/4", "4/5"],
  },
  {
    id: 10,
    subject: "mathematics",
    question: "What is the perimeter of a square with side 9 cm?",
    options: ["18 cm", "27 cm", "36 cm", "81 cm"],
  },
]

const evsQuestions: Question[] = [
  {
    id: 11,
    subject: "evs",
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
  },
  {
    id: 12,
    subject: "evs",
    question: "What is the primary source of energy for the Earth?",
    options: ["Moon", "Stars", "Sun", "Wind"],
  },
  {
    id: 13,
    subject: "evs",
    question: "Which gas do plants absorb during photosynthesis?",
    options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
  },
  {
    id: 14,
    subject: "evs",
    question: "What is the largest organ in the human body?",
    options: ["Heart", "Liver", "Brain", "Skin"],
  },
  {
    id: 15,
    subject: "evs",
    question: "Which of the following is a renewable source of energy?",
    options: ["Coal", "Natural Gas", "Solar Energy", "Petroleum"],
  },
]

export const mockExamData: Record<string, ExamData> = {
  "EXAM12345": {
    testCode: "EXAM12345",
    studentName: "Rahul Sharma",
    grade: 6,
    duration: 45,
    questions: [...englishQuestions, ...mathQuestions, ...evsQuestions],
  },
  "TEST67890": {
    testCode: "TEST67890",
    studentName: "Priya Patel",
    grade: 7,
    duration: 45,
    questions: [...englishQuestions, ...mathQuestions, ...evsQuestions],
  },
  "ADMN2024A": {
    testCode: "ADMN2024A",
    studentName: "Arjun Kumar",
    grade: 8,
    duration: 45,
    questions: [...englishQuestions, ...mathQuestions, ...evsQuestions],
  },
}

export const correctAnswers: Record<number, number> = {
  1: 1, // Morning
  2: 1, // They were singing
  3: 1, // Huge
  4: 2, // She doesn't like apples
  5: 3, // Adverb
  6: 1, // 180
  7: 2, // 40 cm²
  8: 2, // 5
  9: 2, // 3/4
  10: 2, // 36 cm
  11: 1, // Mars
  12: 2, // Sun
  13: 2, // Carbon Dioxide
  14: 3, // Skin
  15: 2, // Solar Energy
}
