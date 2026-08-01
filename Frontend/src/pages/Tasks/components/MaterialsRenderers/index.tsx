import type { QuizQuestion } from "@/api/mutations/generateQuiz";
import MultipleChoiceRenderer from "./MultipleChoiceRenderer";
import OpenRenderer from "./OpenRenderer";
import FillInTheBlankRenderer from "./FillInTheBlankRenderer";
import TrueFalseRenderer from "./TrueFalseRenderer";
import MatchingRenderer from "./MatchingRenderer";
import MultiSelectRenderer from "./MultiSelectRenderer";
import ClozePassageRenderer from "./ClozePassageRenderer";
import type { QuestionRendererProps, UserAnswerValue } from "./types";

export type { UserAnswerValue, QuestionRendererProps };
export { gradeQuestion } from "./gradeQuestion";

interface DispatcherProps {
  question: QuizQuestion;
  answer: UserAnswerValue | undefined;
  onChange: (answer: UserAnswerValue) => void;
  revealed: boolean;
}

const QuestionRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: DispatcherProps) => {
  switch (question.type) {
    case "multiple_choice":
      return (
        <MultipleChoiceRenderer
          question={question}
          answer={answer}
          onChange={onChange}
          revealed={revealed}
        />
      );
    case "open":
      return (
        <OpenRenderer
          question={question}
          answer={answer}
          onChange={onChange}
          revealed={revealed}
        />
      );
    case "fill_in_the_blank":
    case "gap_fill_grammar":
    case "gap_fill_vocab":
      return (
        <FillInTheBlankRenderer
          question={question}
          answer={answer}
          onChange={onChange}
          revealed={revealed}
        />
      );
    case "true_false":
      return (
        <TrueFalseRenderer
          question={question}
          answer={answer}
          onChange={onChange}
          revealed={revealed}
        />
      );
    case "matching":
      return (
        <MatchingRenderer
          question={question}
          answer={answer}
          onChange={onChange}
          revealed={revealed}
        />
      );
    case "multi_select_mc":
      return (
        <MultiSelectRenderer
          question={question}
          answer={answer}
          onChange={onChange}
          revealed={revealed}
        />
      );
    case "cloze_passage":
      return (
        <ClozePassageRenderer
          question={question}
          answer={answer}
          onChange={onChange}
          revealed={revealed}
        />
      );
  }
};

export default QuestionRenderer;
