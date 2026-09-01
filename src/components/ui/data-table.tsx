"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

export interface DataTableColumn<Row> {
  /** stable key */
  id: string;
  header: React.ReactNode;
  cell: (row: Row) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** hide this column in the mobile card view */
  hideOnMobile?: boolean;
  /** use as the card title on mobile */
  primary?: boolean;
}

export interface DataTableProps<Row> {
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  getRowId: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** custom card body for the mobile view; falls back to a generic dl of columns */
  renderMobileCard?: (row: Row) => React.ReactNode;
  className?: string;
}

/**
 * Responsive data table: a real `<table>` on >=768px, a stacked card list on
 * mobile (several pages hand-roll this split today).
 */
export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  onRowClick,
  loading = false,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  renderMobileCard,
  className,
}: DataTableProps<Row>) {
  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={44} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const primaryCol = columns.find((c) => c.primary) ?? columns[0];
  const mobileCols = columns.filter((c) => !c.hideOnMobile && c.id !== primaryCol.id);

  return (
    <>
      {/* Desktop */}
      <div className={cn("hidden overflow-x-auto rounded-xl ring-1 ring-foreground/10 md:block", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.id} className={col.headerClassName}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {columns.map((col) => (
                  <TableCell key={col.id} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className={cn("space-y-2 md:hidden", className)}>
        {rows.map((row) =>
          renderMobileCard ? (
            <div
              key={getRowId(row)}
              className="rounded-xl bg-card p-3.5 text-card-foreground ring-1 ring-foreground/10"
            >
              {renderMobileCard(row)}
            </div>
          ) : (
            <button
              key={getRowId(row)}
              type="button"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "w-full rounded-xl bg-card p-3.5 text-left text-card-foreground ring-1 ring-foreground/10",
                onRowClick && "transition-colors hover:bg-accent"
              )}
            >
              <div className="mb-1.5 font-medium">{primaryCol.cell(row)}</div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {mobileCols.map((col) => (
                  <React.Fragment key={col.id}>
                    <dt className="text-muted-foreground">{col.header}</dt>
                    <dd className="text-right">{col.cell(row)}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </button>
          )
        )}
      </div>
    </>
  );
}
