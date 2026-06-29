'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './table';
import { Button } from './button';
import { Input } from './input';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, Search } from 'lucide-react';

export interface DataTableFilter {
  column: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  filters?: DataTableFilter[];
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  manualPage?: number;
  manualTotal?: number;
  onManualPageChange?: (page: number) => void;
  manualPageSize?: number;
}

export function DataTable<TData extends Record<string, any>>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Cari...',
  filters,
  pageSize = 10,
  loading = false,
  emptyMessage = 'Tidak ada data',
  manualPage,
  manualTotal,
  onManualPageChange,
  manualPageSize,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const pagination = useMemo(() => {
    if (manualPage !== undefined && manualPageSize !== undefined) {
      return { pageIndex: manualPage - 1, pageSize: manualPageSize };
    }
    return { pageIndex: 0, pageSize };
  }, [manualPage, manualPageSize, pageSize]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      ...(manualPage !== undefined ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(manualPage === undefined ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    ...(manualPage !== undefined ? { manualPagination: true, pageCount: Math.ceil((manualTotal || 0) / (manualPageSize ?? pageSize)) } : {}),
  });

  const totalRows = manualTotal ?? table.getFilteredRowModel().rows.length;
  const currentPage = manualPage ?? table.getState().pagination.pageIndex + 1;
  const totalPages = manualPage !== undefined
    ? Math.ceil((manualTotal || 0) / manualPageSize!)
    : table.getPageCount();
  const fromRow = (currentPage - 1) * (manualPageSize || pageSize) + 1;
  const toRow = Math.min(fromRow + (manualPageSize || pageSize) - 1, totalRows);

  return (
    <div className="space-y-4">
      {(searchKey || filters) && (
        <div className="flex items-center gap-2 flex-wrap">
          {searchKey && (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {filters?.map((filter) => {
            const col = table.getColumn(filter.column);
            const value = (col?.getFilterValue() as string) ?? '';
            return (
              <select
                key={filter.column}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={value}
                onChange={(e) => col?.setFilterValue(e.target.value || undefined)}
              >
                <option value="">{filter.label}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            );
          })}
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                    onClick={() => { if (header.column.getCanSort()) { header.column.toggleSorting(undefined, undefined); } }}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <ArrowUp className="h-3 w-3" />}
                      {header.column.getIsSorted() === 'desc' && <ArrowDown className="h-3 w-3" />}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex items-center justify-center text-muted-foreground">Memuat...</div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {fromRow}-{toRow} dari {totalRows}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => {
              if (onManualPageChange) onManualPageChange(1);
              else table.setPageIndex(0);
            }}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => {
              if (onManualPageChange) onManualPageChange(currentPage - 1);
              else table.previousPage();
            }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3 text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => {
              if (onManualPageChange) onManualPageChange(currentPage + 1);
              else table.nextPage();
            }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => {
              if (onManualPageChange) onManualPageChange(totalPages);
              else table.setPageIndex(totalPages - 1);
            }}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
