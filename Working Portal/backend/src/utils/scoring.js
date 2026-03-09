async function calculateScores(client, testSessionId) {
  const answerRows = await client.query(
    `SELECT a.question_id, a.selected_option, q.subject, q.correct_option
     FROM answers a
     JOIN questions q ON q.id = a.question_id
     WHERE a.test_session_id = $1`,
    [testSessionId],
  );

  let total = 0;
  let english = 0;
  let math = 0;
  let scienceEvs = 0;

  for (const row of answerRows.rows) {
    const correct = (row.selected_option || "").toLowerCase() === (row.correct_option || "").toLowerCase();
    if (!correct) continue;

    total += 1;
    const subject = String(row.subject || "").toLowerCase();
    if (subject.includes("eng")) english += 1;
    else if (subject.includes("math")) math += 1;
    else scienceEvs += 1;
  }

  return {
    total,
    english,
    math,
    scienceEvs,
  };
}

module.exports = { calculateScores };
