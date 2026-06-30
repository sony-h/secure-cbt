import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CrudApi<T, CreateDto, UpdateDto> {
  getAll: (params?: unknown) => Promise<{ data: { data: T[] } }>;
  getById?: (id: string) => Promise<{ data: { data: T } }>;
  create: (dto: CreateDto) => Promise<unknown>;
  update: (id: string, dto: UpdateDto) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
}

interface CrudMessages {
  created?: string;
  updated?: string;
  deleted?: string;
}

export function useCrud<T, CreateDto = Record<string, unknown>, UpdateDto = Record<string, unknown>>(
  queryKey: string,
  api: CrudApi<T, CreateDto, UpdateDto>,
  messages?: CrudMessages,
) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data: res } = await api.getAll();
      return res.data as T[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateDto) => api.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(messages?.created || 'Berhasil ditambahkan');
    },
    onError: () => toast.error('Gagal menyimpan'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDto }) => api.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(messages?.updated || 'Berhasil diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(messages?.deleted || 'Berhasil dihapus');
    },
    onError: () => toast.error('Gagal menghapus'),
  });

  return { data, isLoading, create: createMutation, update: updateMutation, remove: deleteMutation };
}
