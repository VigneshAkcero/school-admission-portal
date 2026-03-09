async function calculateScores(client, testSessionId) {
  const answerRows = await client.query(
    `SELECT a.question_id, a.selected_option, a.answer_status, q.subject, q.correct_option
     FROM answers a
     JOIN questions q ON q.id = a.question_id
     WHERE a.test_session_id = $1`,
    [testSessionId],
  );

  let total = 0;
  let english = 0;
  let math = 0;
  let scienceEvs = 0;
  let telugu = 0;
  let hindi = 0;

  for (const row of answerRows.rows) {
    if (!["ANSWERED", "ANSWERED_MARKED"].includes(row.answer_status)) continue;
    const correct = (row.selected_option || "").toLowerCase() === (row.correct_option || "").toLowerCase();
    if (!correct) continue;

    switch (String(row.subject || "").toLowerCase()) {
      case "english":
        english += 1;
        break;
      case "mathematics":
        math += 1;
        break;
      case "science":
      case "evs":
        scienceEvs += 1;
        break;
      case "telugu":
        telugu += 1;
        break;
      case "hindi":
        hindi += 1;
        break;
      default:
        break;
    }
  }

  total = english + math + scienceEvs + telugu + hindi;

  return {
    total,
    english,
    math,
    scienceEvs,
    telugu,
    hindi,
  };
}

module.exports = { calculateScores };
