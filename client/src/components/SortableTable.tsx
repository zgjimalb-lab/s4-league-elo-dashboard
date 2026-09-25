import { ArrowDown, ArrowUp } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  /** Sortierwert; ohne diesen ist die Spalte nicht sortierbar */
  sort?: (row: T) => number | string;
  align?: 'left' | 'right';
  title?: string;
}

export function SortableTable<T>({
  columns,
  rows,
  rowKey,
  initialSort,
  rowClassName,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  initialSort?: { key: string; desc: boolean };
  rowClassName?: (row: T) => string | undefined;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const column = columns.find((c) => c.key === sort?.key);
  const sorted =
    column?.sort && sort
      ? [...rows].sort((a, b) => {
          const x = column.sort!(a);
          const y = column.sort!(b);
          const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
          return sort.desc ? -order : order;
        })
      : rows;

  const toggle = (key: string) =>
    setSort((current) => (current?.key === key ? { key, desc: !current.desc } : { key, desc: true }));

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c) => (
              <TableHead
                key={c.key}
                title={c.title}
                className={cn('px-4 text-xs uppercase tracking-wide text-muted-foreground', c.align === 'right' && 'text-right')}
              >
                {c.sort ? (
                  <button
                    type="button"
                    onClick={() => toggle(c.key)}
                    className={cn('inline-flex items-center gap-1 uppercase hover:text-foreground', sort?.key === c.key && 'text-foreground')}
                  >
                    {c.header}
                    {sort?.key === c.key && (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
                  </button>
                ) : (
                  c.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row, index) => (
            <TableRow key={rowKey(row)} className={rowClassName?.(row)}>
              {columns.map((c) => (
                <TableCell key={c.key} className={cn('px-4 py-2.5', c.align === 'right' && 'text-right tabular-nums')}>
                  {c.cell(row, index)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
