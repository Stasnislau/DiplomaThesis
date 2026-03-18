import { useMutation, useQueryClient } from "@tanstack/react-query";

import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

interface CompleteLessonInput {
  lessonId: string;
  language: string;
  level: string;
}

interface CompleteLessonResult {
  completedLessonId: string;
  moduleCompleted: boolean;
  nextLessonUnlocked: string | null;
}

async function completeLesson(
  input: CompleteLessonInput,
): Promise<CompleteLessonResult> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/learning-path/complete`,
    {
      method: "POST",
      body: JSON.stringify({
        lessonId: input.lessonId,
        language: input.language,
        level: input.level,
      }),
    },
  );
  const data = await response.json();
  if (!data.success) throw new Error("Failed to complete lesson");
  return data.payload as CompleteLessonResult;
}

export function useCompleteLesson() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    CompleteLessonResult,
    Error,
    CompleteLessonInput
  >({
    mutationFn: completeLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "learning-path",
      });
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "achievements",
      });
    },
  });

  return {
    completeLesson: mutation.mutate,
    isCompleting: mutation.isPending,
    completionData: mutation.data,
    completionError: mutation.error,
  };
}
