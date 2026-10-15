import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DataTable } from '../data-table';
import type { ColumnDef } from '@tanstack/react-table';

interface Item {
  id: string;
  name: string;
  category: string;
}

const mockData: Item[] = Array.from({ length: 25 }, (_, i) => ({
  id: `item-${i + 1}`,
  name: `Question ${i + 1}`,
  category: i % 2 === 0 ? 'Math' : 'Science',
}));

const columns: ColumnDef<Item>[] = [
  { accessorKey: 'id', header: 'ID', enableSorting: true },
  { accessorKey: 'name', header: 'Name', enableSorting: true },
  { accessorKey: 'category', header: 'Category' },
];

describe('DataTable Component', () => {
  it('renders default 10 rows and pagination controls', () => {
    render(<DataTable columns={columns} data={mockData} />);

    // Shows 10 rows by default
    expect(screen.getByText('Question 1')).toBeTruthy();
    expect(screen.getByText('Question 10')).toBeTruthy();
    expect(screen.queryByText('Question 11')).toBeNull();

    // Shows accurate row count
    expect(screen.getByText(/Menampilkan 1-10 dari 25/i)).toBeTruthy();
  });

  it('allows changing page size to 25 and Semua (all)', () => {
    render(<DataTable columns={columns} data={mockData} pageSizeOptions={[10, 25, 50, 'all']} />);

    const pageSizeSelect = screen.getByLabelText(/Tampilkan baris/i);
    expect(pageSizeSelect).toBeTruthy();

    // Change to 25
    fireEvent.change(pageSizeSelect, { target: { value: '25' } });
    expect(screen.getByText('Question 25')).toBeTruthy();
    expect(screen.getByText(/Menampilkan 1-25 dari 25/i)).toBeTruthy();

    // Change to Semua (all)
    fireEvent.change(pageSizeSelect, { target: { value: 'all' } });
    expect(screen.getByText('Question 25')).toBeTruthy();
    expect(screen.getByText(/Menampilkan 1-25 dari 25/i)).toBeTruthy();
  });

  it('filters data on search and clears with clear button', () => {
    render(<DataTable columns={columns} data={mockData} searchKey="name" searchPlaceholder="Cari..." />);

    const searchInput = screen.getByPlaceholderText('Cari...');
    fireEvent.change(searchInput, { target: { value: 'Question 15' } });

    expect(screen.getByText('Question 15')).toBeTruthy();
    expect(screen.queryByText('Question 16')).toBeNull();

    // Click clear search button
    const clearBtn = screen.getByLabelText(/Hapus pencarian/i);
    expect(clearBtn).toBeTruthy();
    fireEvent.click(clearBtn);

    expect((searchInput as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Question 1')).toBeTruthy();
  });

  it('supports reset all filters button when filters or search are active', () => {
    render(
      <DataTable
        columns={columns}
        data={mockData}
        searchKey="name"
        filters={[
          {
            column: 'category',
            label: 'Semua Kategori',
            options: [
              { value: 'Math', label: 'Math' },
              { value: 'Science', label: 'Science' },
            ],
          },
        ]}
      />
    );

    const filterSelect = screen.getByDisplayValue('Semua Kategori');
    fireEvent.change(filterSelect, { target: { value: 'Science' } });

    // "Reset Filter" should appear
    const resetBtn = screen.getByText(/Reset Filter/i);
    expect(resetBtn).toBeTruthy();

    fireEvent.click(resetBtn);
    expect(screen.queryByText(/Reset Filter/i)).toBeNull();
  });

  it('supports row selection when enableRowSelection is true', () => {
    const handleSelectionChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        enableRowSelection={true}
        onRowSelectionChange={handleSelectionChange}
      />
    );

    const selectAllCheckbox = screen.getByLabelText(/Pilih semua baris di halaman ini/i);
    expect(selectAllCheckbox).toBeTruthy();

    const firstRowCheckbox = screen.getByLabelText('Pilih baris 1');
    expect(firstRowCheckbox).toBeTruthy();

    fireEvent.click(firstRowCheckbox);
    expect(handleSelectionChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'item-1' })])
    );

    // Toggle select all on page
    fireEvent.click(selectAllCheckbox);
    expect(handleSelectionChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'item-1' }),
        expect.objectContaining({ id: 'item-2' }),
      ])
    );
  });
});
