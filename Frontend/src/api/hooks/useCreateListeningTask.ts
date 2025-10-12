import { useMutation } from "@tanstack/react-query";
import { createListeningTask } from "../mutations/createListeningTask";

export const useCreateListeningTask = () => {
    const mutation = useMutation({
        mutationFn: createListeningTask,
    });

    return {
        createListeningTask: mutation.mutateAsync,
        isLoading: mutation.isPending,
        error: mutation.error,
        data: mutation.data,
        reset: mutation.reset,
    };
};
