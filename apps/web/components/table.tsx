import type { ReactNode } from 'react';

// A semantic table styled like the prototype's PTable.

export interface Column<Row> {
  header: string;
  align?: 'left' | 'right';
  /** Visually hide the header (it stays available to screen readers). */
  hideHeader?: boolean;
  className?: string;
  cell: (row: Row) => ReactNode;
}

export interface TableProps<Row> {
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  empty?: ReactNode;
  footer?: ReactNode;
}

export function Table<Row>({ caption, columns, rows, rowKey, empty, footer }: TableProps<Row>) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-paper shadow-sm">
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-paper2">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={`px-[18px] py-2.5 text-[10.5px] font-bold uppercase tracking-[1.2px] text-muted ${column.align === 'right' ? 'text-right' : ''} ${column.className ?? ''}`}
              >
                {column.hideHeader ? (
                  <span className="sr-only">{column.header}</span>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty !== undefined ? (
            <tr>
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-t border-line2 first:border-t-0">
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={`px-[18px] py-3 align-middle text-[13px] ${column.align === 'right' ? 'text-right' : ''}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {footer ? <div className="border-t border-line px-[18px] py-3">{footer}</div> : null}
    </div>
  );
}

export function NameCell({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 leading-tight">
      <div className="truncate font-semibold text-text">{title}</div>
      {sub ? <div className="mt-0.5 truncate text-[12px] text-muted">{sub}</div> : null}
    </div>
  );
}
