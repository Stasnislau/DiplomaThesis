import { distance } from "fastest-levenshtein";

interface ValidationOptions {
  tolerance?: number;
  ignoreCase?: boolean;
  trim?: boolean;
}

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
