import { useQuery } from "@tanstack/react-query";
import { getTaskTemplates } from "../queries/getTaskTemplates";
import { TaskTemplate } from "@/types/models/TaskTemplate";

export const useGetTaskTemplates = (search: string) => {
  return useQuery<TaskTemplate[], Error>({
    queryKey: ["task-templates", search],
    queryFn: () => getTaskTemplates(search),
  });
};

