import { distance } from "fastest-levenshtein";

interface ValidationOptions {
  tolerance?: number; // Maximum allowed Levenshtein distance
  ignoreCase?: boolean;
  trim?: boolean;
}

/**
 * Checks if the user answer matches the correct answer(s) with optional fuzzy matching.
 * @param userAnswer The user's input.
 * @param correctAnswer The correct answer or array of correct answers.
 * @param options Validation options (tolerance, case sensitivity, etc.).
 * @returns boolean indicating if the answer is accepted.
 */
export const isAnswerCorrect = (
  userAnswer: string,
  correctAnswer: string | string[],
  options: ValidationOptions = { tolerance: 0, ignoreCase: true, trim: true },
): boolean => {
  const { tolerance = 0, ignoreCase = true, trim = true } = options;

  const normalize = (s: string) => {
    let res = s;
    if (trim) res = res.trim();
    if (ignoreCase) res = res.toLowerCase();
    return res;
  };

  const normalizedUser = normalize(userAnswer);

  const checkSingle = (correct: string) => {
    const normalizedCorrect = normalize(correct);
    if (tolerance === 0) {
      return normalizedUser === normalizedCorrect;
    }
    return distance(normalizedUser, normalizedCorrect) <= tolerance;
  };

  if (Array.isArray(correctAnswer)) {
    return correctAnswer.some(checkSingle);
  } else {
    return checkSingle(correctAnswer);
  }
};
