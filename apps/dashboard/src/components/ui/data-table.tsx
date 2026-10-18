'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
  type RowSelectionState,
} from '@tanstack/react-table';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './table';
import { Skeleton } from './skeleton';
import { Button } from './button';
import { Input } from './input';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  RotateCcw,
} from 'lucide-react';

export interface DataTableFilter {
  column: string;
  label: string;
  options: { value: string; label: string }[];
}

export type PageSizeOption = number | 'all';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  filters?: DataTableFilter[];
  pageSize?: number;
  pageSizeOptions?: PageSizeOption[];
  loading?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  manualPage?: number;
  manualTotal?: number;
  onManualPageChange?: (page: number) => void;
  manualPageSize?: number;
  initialSearch?: string;
  initialPage?: number;
  onStateChange?: (state: { page: number; pageSize: PageSizeOption; search: string }) => void;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionModelChange?: (selection: RowSelectionState) => void;
  getRowId?: (originalRow: TData, index: number) => string;
}

export function DataTable<TData extends Record<string, any>>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Cari...',
  filters,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100, 'all'],
  loading = false,
  skeletonRows = 5,
  emptyMessage = 'Tidak ada data',
  manualPage,
  manualTotal,
  onManualPageChange,
  manualPageSize,
  initialSearch = '',
  initialPage = 1,
  onStateChange,
  enableRowSelection = false,
  onRowSelectionChange,
  rowSelection: controlledRowSelection,
  onRowSelectionModelChange,
  getRowId,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState(initialSearch);
  const [selectedPageSize, setSelectedPageSize] = useState<PageSizeOption>(pageSize);
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});

  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const onRowSelectionChangeRef = useRef(onRowSelectionChange);
  onRowSelectionChangeRef.current = onRowSelectionChange;

  const tableColumns = useMemo(() => {
    if (!enableRowSelection) return columns;
    const selectColumn: ColumnDef<TData, any> = {
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center justify-center px-1">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer align-middle"
            checked={table.getIsAllPageRowsSelected()}
            ref={(input) => {
              if (input) {
                input.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected();
              }
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Pilih semua baris di halaman ini"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center px-1">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer align-middle"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={`Pilih baris ${row.index + 1}`}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    };
    return [selectColumn, ...columns];
  }, [columns, enableRowSelection]);

  const isAll = selectedPageSize === 'all';
  const effectivePageSize = isAll ? 999999 : (manualPageSize || (selectedPageSize as number));

  const pagination = useMemo(() => {
    if (manualPage !== undefined && manualPageSize !== undefined) {
      return { pageIndex: manualPage - 1, pageSize: manualPageSize };
    }
    return {
      pageIndex: Math.max(0, initialPage - 1),
      pageSize: effectivePageSize,
    };
  }, [manualPage, manualPageSize, initialPage, effectivePageSize]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    enableRowSelection: enableRowSelection ?? false,
    getRowId: getRowId ?? ((row: any, index: number) => (row && row.id ? String(row.id) : String(index))),
    initialState: {
      pagination,
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      ...(manualPage !== undefined ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      if (onRowSelectionModelChange) {
        onRowSelectionModelChange(next);
      } else {
        setInternalRowSelection(next);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(manualPage === undefined ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    ...(manualPage !== undefined
      ? {
          manualPagination: true,
          pageCount: Math.ceil((manualTotal || 0) / (manualPageSize ?? (isAll ? 1 : (selectedPageSize as number)))),
        }
      : {}),
  });

  useEffect(() => {
    if (enableRowSelection && onRowSelectionChangeRef.current) {
      const selected = table.getSelectedRowModel().flatRows.map((r) => r.original);
      onRowSelectionChangeRef.current(selected);
    }
  }, [rowSelection, enableRowSelection, data, table]);

  // Sync internal page size change with tanstack table
  useEffect(() => {
    if (manualPage === undefined) {
      table.setPageSize(effectivePageSize);
    }
  }, [effectivePageSize, manualPage, table]);

  const totalRows = manualTotal ?? table.getFilteredRowModel().rows.length;
  const currentPage = manualPage ?? table.getState().pagination.pageIndex + 1;
  const totalPages = manualPage !== undefined
    ? Math.ceil((manualTotal || 0) / (manualPageSize || 10))
    : (isAll ? 1 : Math.max(1, table.getPageCount()));

  const fromRow = totalRows === 0 ? 0 : isAll ? 1 : (currentPage - 1) * effectivePageSize + 1;
  const toRow = isAll ? totalRows : Math.min(fromRow + effectivePageSize - 1, totalRows);

  const hasActiveFilters = Boolean(
    globalFilter || columnFilters.some((f) => f.value !== undefined && f.value !== '')
  );

  const resetAllFilters = () => {
    setGlobalFilter('');
    setColumnFilters([]);
    table.resetColumnFilters();
    table.resetGlobalFilter();
    if (manualPage === undefined) {
      table.setPageIndex(0);
    }
  };

  const handlePageSizeChange = (val: string) => {
    const newSize: PageSizeOption = val === 'all' ? 'all' : Number(val);
    setSelectedPageSize(newSize);
    if (manualPage === undefined) {
      table.setPageIndex(0);
    }
    if (onStateChange) {
      onStateChange({ page: 1, pageSize: newSize, search: globalFilter });
    }
  };

  return (
    <div className="space-y-4">
      {(searchKey || filters) && (
        <div className="flex items-center gap-2 flex-wrap">
          {searchKey && (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 pr-8"
              />
              {globalFilter && (
                <button
                  type="button"
                  aria-label="Hapus pencarian"
                  onClick={() => setGlobalFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {filters?.map((filter) => {
            const col = table.getColumn(filter.column);
            const value = (col?.getFilterValue() as string) ?? '';
            return (
              <select
                key={filter.column}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllFilters}
              className="h-10 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-3"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filter
            </Button>
          )}
        </div>
      )}

      <div className="rounded-md border overflow-x-auto touch-scroll-smooth">
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
              Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`}>
                  {tableColumns.map((col, colIndex) => (
                    <TableCell key={`skeleton-cell-${rowIndex}-${col.id ?? (col as any).accessorKey ?? colIndex}`}>
                      {col.id === 'select' ? (
                        <Skeleton className="h-4 w-4 rounded mx-auto" />
                      ) : (
                        <Skeleton className="h-5 w-full max-w-[85%] rounded" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="h-32 text-center text-muted-foreground">
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label htmlFor="page-size-select" className="text-xs whitespace-nowrap">
              Tampilkan baris:
            </label>
            <select
              id="page-size-select"
              aria-label="Tampilkan baris"
              value={isAll ? 'all' : String(selectedPageSize)}
              onChange={(e) => handlePageSizeChange(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {pageSizeOptions.map((opt) => (
                <option key={String(opt)} value={String(opt)}>
                  {opt === 'all' ? 'Semua' : opt}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs font-medium">
            Menampilkan {fromRow}-{toRow} dari {totalRows} data
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage <= 1 || isAll}
            onClick={() => {
              if (onManualPageChange) onManualPageChange(1);
              else table.setPageIndex(0);
            }}
            title="Halaman Pertama"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage <= 1 || isAll}
            onClick={() => {
              if (onManualPageChange) onManualPageChange(currentPage - 1);
              else table.previousPage();
            }}
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-semibold px-2 text-foreground">
            {isAll ? 'Semua Data' : `Halaman ${currentPage} / ${Math.max(1, totalPages)}`}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= totalPages || isAll}
            onClick={() => {
              if (onManualPageChange) onManualPageChange(currentPage + 1);
              else table.nextPage();
            }}
            title="Halaman Berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= totalPages || isAll}
            onClick={() => {
              if (onManualPageChange) onManualPageChange(totalPages);
              else table.setPageIndex(totalPages - 1);
            }}
            title="Halaman Terakhir"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
