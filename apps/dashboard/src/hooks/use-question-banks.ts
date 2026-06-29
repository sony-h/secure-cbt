import { useQuery } from '@tanstack/react-query';
import { questionBankApi } from '@/lib/api-service';

export function useQuestionBanks() {
  return useQuery({
    queryKey: ['question-banks'],
    queryFn: async () => {
      const { data } = await questionBankApi.getBanks();
      return data.data;
    },
    staleTime: 30000,
  });
}

export function useQuestions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['questions', params],
    queryFn: async () => {
      const { data } = await questionBankApi.getQuestions(params);
      return data.data;
    },
  });
}
