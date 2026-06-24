export type QuizQuestionForScoring = {
  id: string;
  type: string;
  options?: Array<{ id: string; isCorrect?: boolean; is_correct?: boolean }>;
};

function isOptionCorrect(option: { isCorrect?: boolean; is_correct?: boolean } | undefined): boolean {
  if (!option) return false;
  const v: unknown = option.isCorrect ?? option.is_correct;
  return v === true || v === 1 || v === "true" || v === "t";
}

export function computeQuizScore(
  questions: QuizQuestionForScoring[],
  answers: Record<string, string>,
): { score: number; totalScored: number } {
  let score = 0;
  let totalScored = 0;

  for (const q of questions) {
    const type = String(q.type ?? "").toUpperCase();
    if (type !== "MULTIPLE_CHOICE" && type !== "TRUE_FALSE") continue;
    totalScored += 1;
    const selected = answers[q.id];
    if (!selected) continue;
    const option = (q.options ?? []).find((o) => String(o.id) === String(selected));
    if (isOptionCorrect(option)) score += 1;
  }

  return { score, totalScored };
}

export function normalizeQuizSubmitTotals(
  questions: QuizQuestionForScoring[],
  score: number,
  totalScored: number,
): { score: number; totalQuestions: number; passed: boolean } {
  const totalQuestions = totalScored > 0 ? totalScored : Math.max(questions.length, 1);
  const normalizedScore = totalScored > 0 ? score : totalQuestions;
  const passed = totalQuestions > 0 && normalizedScore / totalQuestions >= 0.6;
  return { score: normalizedScore, totalQuestions, passed };
}
