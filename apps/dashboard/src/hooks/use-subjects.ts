import { useQuery } from '@tanstack/react-query';
import { academicApi } from '@/lib/api-service';

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await academicApi.getSubjects();
      return data.data;
    },
    staleTime: 30000,
  });
}
