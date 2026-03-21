"use client"

import * as React from "react"
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react"

import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  pageSize?: number
  searchable?: boolean
  searchPlaceholder?: string
  loading?: boolean
  emptyMessage?: string
  className?: string
}

function getAriaSort(sortState: false | "asc" | "desc") {
  if (sortState === "asc") {
    return "ascending"
  }

  if (sortState === "desc") {
    return "descending"
  }

  return "none"
}

function getSortIcon(sortState: false | "asc" | "desc") {
  if (sortState === "asc") {
    return <ArrowUp aria-hidden="true" className="ml-1 size-3.5 text-primary" />
  }

  if (sortState === "desc") {
    return <ArrowDown aria-hidden="true" className="ml-1 size-3.5 text-primary" />
  }

  return (
    <ArrowUpDown
      aria-hidden="true"
      className="ml-1 size-3.5 text-foreground-tertiary"
    />
  )
}

export function DataTable<TData>({
  columns,
  data,
  pageSize = 10,
  searchable = false,
  searchPlaceholder = "Buscar...",
  loading = false,
  emptyMessage = "Nenhum resultado encontrado.",
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  React.useEffect(() => {
    setPagination((current) => ({ ...current, pageSize }))
  }, [pageSize])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue ?? "").trim().toLowerCase()

      if (!search) {
        return true
      }

      return row.getAllCells().some((cell) => {
        const value = cell.getValue()

        if (value === null || value === undefined) {
          return false
        }

        return String(value).toLowerCase().includes(search)
      })
    },
  })

  const filteredRowCount = table.getFilteredRowModel().rows.length
  const shouldShowPagination = !loading && table.getPageCount() > 1

  return (
    <div className={cn("w-full", className)}>
      {searchable ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-tertiary"
            />
            <Input
              className="border-border/15 bg-input pl-9 text-foreground placeholder:text-foreground-tertiary"
              onChange={(event) => {
                const nextValue = event.target.value

                React.startTransition(() => {
                  setGlobalFilter(nextValue)
                  setPagination((current) => ({ ...current, pageIndex: 0 }))
                })
              }}
              placeholder={searchPlaceholder}
              value={globalFilter}
            />
          </div>

          <p className="text-body-sm text-foreground-secondary">
            {filteredRowCount} resultado{filteredRowCount === 1 ? "" : "s"}
          </p>
        </div>
      ) : null}

      <ScrollArea className="w-full whitespace-nowrap rounded-lg border border-border/15">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow className="border-border/15" key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortState = header.column.getIsSorted()
                  const canSort = header.column.getCanSort()

                  return (
                    <TableHead
                      aria-sort={canSort ? getAriaSort(sortState) : undefined}
                      className="h-10 text-label text-foreground-secondary"
                      key={header.id}
                      scope="col"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          className="inline-flex items-center gap-1 rounded-sm text-label text-foreground-secondary transition-colors hover:text-foreground focus-visible:outline-none"
                          onClick={() => {
                            if (sortState === false) {
                              header.column.toggleSorting(false)
                              return
                            }

                            if (sortState === "asc") {
                              header.column.toggleSorting(true)
                              return
                            }

                            header.column.clearSorting()
                          }}
                          type="button"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {getSortIcon(sortState)}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow className="border-border/15">
                <TableCell className="px-3 py-2" colSpan={columns.length}>
                  <LoadingSkeleton rows={pageSize} variant="tableRow" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className="h-11 border-border/15 transition-colors duration-100 hover:bg-surface-raised"
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell className="text-body-sm text-foreground" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="border-border/15">
                <TableCell className="p-0" colSpan={columns.length}>
                  <EmptyState title={emptyMessage} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {shouldShowPagination ? (
        <div className="flex items-center justify-between pt-4">
          <Button
            aria-label="Pagina anterior"
            className="border-border/15 bg-transparent text-primary hover:bg-surface-raised hover:text-primary"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            size="sm"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Anterior
          </Button>

          <p className="text-body-sm text-foreground-secondary">
            Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </p>

          <Button
            aria-label="Proxima pagina"
            className="border-border/15 bg-transparent text-primary hover:bg-surface-raised hover:text-primary"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            size="sm"
            type="button"
            variant="outline"
          >
            Proxima
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
