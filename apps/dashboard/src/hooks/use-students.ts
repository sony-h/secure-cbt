import { useQuery } from '@tanstack/react-query';
import { studentApi } from '@/lib/api-service';

export function useStudents(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['students', params],
    queryFn: async () => {
      const { data } = await studentApi.getAll(params);
      return data.data;
    },
  });
}
