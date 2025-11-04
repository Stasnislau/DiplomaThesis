import { useQuery } from '@tanstack/react-query';
import { getUserAITokens } from '../queries/getUserAITokens';
import { AiToken } from '@/types/models/AiToken';

export const useGetUserAITokens = () => {
  return useQuery<AiToken[], Error>({
    queryKey: ['ai-tokens'],
    queryFn: getUserAITokens,
  });
};
