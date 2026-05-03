import { useQuery } from "@tanstack/react-query";
import { GetHistoryParams, getHistory } from "../queries/getHistory";

export const useGetHistory = (params: GetHistoryParams = {}) =>
  useQuery({
    queryKey: ["history", params.type ?? "all", params.limit ?? 30],
    queryFn: () => getHistory(params),
    staleTime: 30_000,
  });
