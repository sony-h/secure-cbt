export interface PaginationParams {
  page: number;
  perPage: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export function parsePagination(query: { page?: string | number; per_page?: string | number }): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(query.per_page) || 20));
  return { page, perPage, skip: (page - 1) * perPage };
}

export function buildMeta(total: number, params: PaginationParams): PaginationMeta {
  return {
    page: params.page,
    perPage: params.perPage,
    total,
    totalPages: Math.ceil(total / params.perPage),
  };
}
