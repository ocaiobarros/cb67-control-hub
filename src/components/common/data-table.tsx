import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | undefined;
  align?: "left" | "right" | undefined;
  className?: string | undefined;
  hideByDefault?: boolean | undefined;
}

interface DataTableProps<T> {
  data: T[] | undefined;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  isLoading?: boolean | undefined;
  error?: unknown | undefined;
  searchable?: boolean | undefined;
  searchPlaceholder?: string | undefined;
  searchValue?: (row: T) => string | undefined;
  pageSize?: number | undefined;
  onRowClick?: (row: T) => void | undefined;
  emptyMessage?: string | undefined;
  toolbar?: ReactNode | undefined;
  dense?: boolean | undefined;
}

/**
 * Client-side table. Sorting, filtering and pagination happen in the browser
 * because mock endpoints return full collections. When the backend adds
 * server-side pagination, swap the internals here — the call sites stay valid.
 */
export function DataTable<T>({
  data,
  columns,
  rowKey,
  isLoading,
  error,
  searchable = true,
  searchPlaceholder = "Buscar…",
  searchValue,
  pageSize = 12,
  onRowClick,
  emptyMessage = "Nenhum registro encontrado.",
  toolbar,
  dense,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);
  const [hidden, setHidden] = useState<string[]>(
    columns.filter((c) => c.hideByDefault).map((c) => c.id),
  );

  const visibleColumns = columns.filter((c) => !hidden.includes(c.id));

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!query.trim() || !searchable) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const haystack = searchValue
        ? searchValue(row)
        : columns
            .map((c) => c.sortValue?.(row) ?? "")
            .join(" ")
            .concat(" ", JSON.stringify(row));
      return String(haystack ?? "")
        .toLowerCase()
        .includes(q);
    });
  }, [data, query, searchable, searchValue, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((c) => c.id === sort.id);
    if (!column?.sortValue) return filtered;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const rows = sorted.slice(current * pageSize, current * pageSize + pageSize);

  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-3">
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative min-w-52 flex-1">
              <Search
                className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="pl-8"
              />
            </div>
          )}
          {toolbar}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Columns3 className="size-4" aria-hidden />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={!hidden.includes(column.id)}
                  onCheckedChange={(checked) =>
                    setHidden((prev) =>
                      checked ? prev.filter((id) => id !== column.id) : [...prev, column.id],
                    )
                  }
                >
                  {column.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {visibleColumns.map((column) => {
                const sortable = Boolean(column.sortValue);
                const active = sort?.id === column.id;
                return (
                  <TableHead
                    key={column.id}
                    className={cn(
                      "text-xs font-medium tracking-wide text-muted-foreground uppercase",
                      column.align === "right" && "text-right",
                    )}
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSort((prev) =>
                            prev?.id === column.id
                              ? { id: column.id, dir: prev.dir === "asc" ? "desc" : "asc" }
                              : { id: column.id, dir: "asc" },
                          )
                        }
                        className={cn(
                          "inline-flex items-center gap-1 hover:text-foreground",
                          column.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort!.dir === "asc" ? (
                            <ArrowUp className="size-3" aria-hidden />
                          ) : (
                            <ArrowDown className="size-3" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {visibleColumns.map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading &&
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter") onRowClick(row);
                        }
                      : undefined
                  }
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        dense ? "py-1.5" : "py-2.5",
                        "text-sm",
                        column.align === "right" && "text-right tabular",
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="py-10">
                  <EmptyState message={emptyMessage} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular">
          {sorted.length} registro{sorted.length === 1 ? "" : "s"}
          {sorted.length > pageSize ? ` · página ${current + 1} de ${pageCount}` : ""}
        </span>
        {pageCount > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
