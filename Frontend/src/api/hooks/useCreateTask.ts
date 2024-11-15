import { useCreateBlankSpaceTask } from "./useCreateBlankSpaceTask";
import { useCreateMultipleChoiceTask } from "./useCreateMultipleChoiceTask";

interface createTaskRequest {
  language: string;
  level: string;
  taskType: "fill_in_the_blank" | "multiple_choice";
}

export function useCreateTask() {
  const { createTask: createBlankSpaceTask, reset: resetBlankSpaceTask, isLoading: isLoadingBlankSpaceTask, data: dataBlankSpaceTask, error: errorBlankSpaceTask } = useCreateBlankSpaceTask();
  const { createTask: createMultipleChoiceTask, reset: resetMultipleChoiceTask, isLoading: isLoadingMultipleChoiceTask, data: dataMultipleChoiceTask, error: errorMultipleChoiceTask } = useCreateMultipleChoiceTask();

  const createTask = async (input: createTaskRequest) => {
    resetBlankSpaceTask();
    resetMultipleChoiceTask();

    if (input.taskType === "fill_in_the_blank") {
      return createBlankSpaceTask(input);
    } else if (input.taskType === "multiple_choice") {
      return createMultipleChoiceTask(input);
    }
  };

  return {
    createTask,
    data: dataBlankSpaceTask || dataMultipleChoiceTask,
    isLoading: isLoadingBlankSpaceTask || isLoadingMultipleChoiceTask,
    error: errorBlankSpaceTask || errorMultipleChoiceTask
  };
}
