const QUESTION_MAXES = {
  1: { English: 8, Mathematics: 9, EVS: 8, Telugu: 5, Hindi: 9 },
  2: { English: 8, Mathematics: 9, EVS: 8, Telugu: 5, Hindi: 10 },
  3: { English: 8, Mathematics: 9, EVS: 7, Telugu: 5, Hindi: 10 },
  4: { English: 8, Mathematics: 9, EVS: 7, Telugu: 15, Hindi: 8 },
  5: { English: 8, Mathematics: 9, EVS: 7, Telugu: 14, Hindi: 11 },
  6: { English: 8, Mathematics: 9, EVS: 7, Telugu: 13, Hindi: 10 },
  7: { English: 8, Mathematics: 8, Science: 8, Telugu: 7, Hindi: 10 },
  8: { English: 8, Mathematics: 8, Science: 9, Telugu: 7, Hindi: 8 },
  9: { English: 8, Mathematics: 8, Science: 9, Telugu: 7, Hindi: 11 },
};

function getTotalMax(grade) {
  const maxes = QUESTION_MAXES[grade];
  if (!maxes) return 0;
  return Object.values(maxes).reduce((sum, value) => sum + value, 0);
}

function getSubjectMax(grade, subject) {
  return QUESTION_MAXES[grade]?.[subject] ?? 0;
}

module.exports = { QUESTION_MAXES, getTotalMax, getSubjectMax };
