import { useQuery } from '@tanstack/react-query';
import { academicApi } from '@/lib/api-service';

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await academicApi.getClasses();
      return data.data;
    },
    staleTime: 30000,
  });
}
