import { useQuery } from '@tanstack/react-query';
import { examApi } from '@/lib/api-service';

export function useExams(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['exams', params],
    queryFn: async () => {
      const { data } = await examApi.getAll(params);
      return data.data;
    },
  });
}

export function useExamDetail(id: string | null) {
  return useQuery({
    queryKey: ['exam', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await examApi.getById(id);
      return data.data;
    },
    enabled: !!id,
  });
}
