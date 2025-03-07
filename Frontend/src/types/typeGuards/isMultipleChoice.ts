import {
  FillInTheBlankTask,
  MultipleChoiceTask,
} from "../responses/TaskResponse";

export function isMultipleChoice(
  currentTaskData: MultipleChoiceTask | FillInTheBlankTask
): currentTaskData is MultipleChoiceTask {
  return currentTaskData.type === "multiple_choice";
}
