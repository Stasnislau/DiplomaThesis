import type { ListeningQuestion } from "@/types/responses/ListeningResponse";
import MultipleChoiceRenderer from "./MultipleChoiceRenderer";
import FillInTheBlankRenderer from "./FillInTheBlankRenderer";
import DictationRenderer from "./DictationRenderer";
import TrueFalseNotGivenRenderer from "./TrueFalseNotGivenRenderer";
import SentenceCompletionRenderer from "./SentenceCompletionRenderer";
import MultiSpeakerMatchingRenderer from "./MultiSpeakerMatchingRenderer";
import type { ListeningAnswerValue, ListeningRendererProps } from "./types";

export type { ListeningAnswerValue, ListeningRendererProps };
export { gradeListeningQuestion } from "./gradeListeningQuestion";

interface DispatcherProps {
  question: ListeningQuestion;
  answer: ListeningAnswerValue | undefined;
  onChange: (answer: ListeningAnswerValue) => void;
  revealed: boolean;
}

const ListeningQuestionRenderer = ({
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
    case "fill_in_the_blank":
      return (
        <FillInTheBlankRenderer
          question={question}
          answer={answer}
          onChange={onChange}
          revealed={revealed}
        />
      );
    case "dictation":
      return (
        <DictationRenderer
          question={question}
          answer={answer}
          onChange={onChange}
          revealed={revealed}
        />
      );
    case "true_false_not_given":
      return (
        <TrueFalseNotGivenRenderer
          question={question}
          answer={answer}
          onChange={onChange}
          revealed={revealed}
        />
      );
    case "sentence_completion":
      return (
        <SentenceCompletionRenderer
          question={question}
          answer={answer}
          onChange={onChange}
          revealed={revealed}
        />
      );
    case "multi_speaker_matching":
      return (
        <MultiSpeakerMatchingRenderer
          question={question}
          answer={answer}
          onChange={onChange}
          revealed={revealed}
        />
      );
  }
};

export default ListeningQuestionRenderer;
