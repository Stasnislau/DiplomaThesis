import { FillInTheBlankTask, MultipleChoiceTask } from "../../src/types/responses/TaskResponse";

export const PLACEMENT_MOCK_POLISH_A1: MultipleChoiceTask = {
  id: "mock_pol_a1_1",
  type: "multiple_choice",
  question: "W formularzu piszę: _______ w Warszawie.",
  description: "Wypełnij poprawną formę czasownika",
  options: ["Mieszkam", "Mieszkasz", "Mieszka", "Mieszkają"],
  correctAnswer: ["Mieszkam"]
};

export const PLACEMENT_MOCK_ENGLISH_B2: FillInTheBlankTask = {
  id: "mock_eng_b2_1",
  type: "fill_in_the_blank",
  question: "The team agreed to _______ (go ahead) with the new policy despite some concerns.",
  description: "Fill in the correct phrasal verb",
  correctAnswer: ["proceed", "go ahead", "continue"]
};

export const PLACEMENT_MOCK_ENGLISH_B2_MULTIPLE: MultipleChoiceTask = {
  id: "mock_eng_b2_2",
  type: "multiple_choice",
  question: "After ________ the documents carefully, the analyst submitted the final report.",
  description: "Choose the correct verbal form",
  options: ["reviewing", "having reviewed", "to review", "reviewed"],
  correctAnswer: ["reviewing", "having reviewed"]
};

export const MOCK_API_RESPONSE = (payload: any) => ({
  success: true,
  payload
});

export const MOCK_EXPLAIN_ANSWER_SUCCESS = {
  success: true,
  payload: {
    isCorrect: true,
    explanation: "You successfully used the locative case, which is perfect for describing locations in Polish.",
    topicsToReview: []
  }
};

export const MOCK_EXPLAIN_ANSWER_FAIL = {
  success: true,
  payload: {
    isCorrect: false,
    explanation: "The correct form is 'Mieszkam' because it is in the first-person singular (I live). 'Mieszka' means 'he/she lives'.",
    topicsToReview: ["Present tense conjugation", "First-person verbs"]
  }
};
