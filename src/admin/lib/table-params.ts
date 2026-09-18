/**
 * Admin list pages keep all table state in the URL so views are
 * shareable and back-button safe: ?q=…&page=2&per=25&sort=title&dir=asc
 * plus any number of filter keys (status=ACTIVE&collection=…).
 */

export type SortDir = "asc" | "desc";

export type TableParams = {
  q: string;
  page: number;
  perPage: number;
  sort: string | null;
  dir: SortDir;
  filters: Record<string, string>;
};

export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

const RESERVED = new Set(["q", "page", "per", "sort", "dir"]);

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseTableParams(
  raw: RawParams,
  options: { defaultSort?: string; defaultDir?: SortDir; filterKeys?: readonly string[]; sortable?: readonly string[] } = {},
): TableParams {
  const page = Math.max(1, Number.parseInt(first(raw.page) ?? "1", 10) || 1);
  const perRaw = Number.parseInt(first(raw.per) ?? "25", 10);
  const perPage = (PER_PAGE_OPTIONS as readonly number[]).includes(perRaw) ? perRaw : 25;

  const sortRaw = first(raw.sort) ?? null;
  const sort =
    sortRaw && (!options.sortable || options.sortable.includes(sortRaw)) ? sortRaw : (options.defaultSort ?? null);
  const dirRaw = first(raw.dir);
  const dir: SortDir = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : (options.defaultDir ?? "desc");

  const filters: Record<string, string> = {};
  for (const key of options.filterKeys ?? []) {
    const value = first(raw[key]);
    if (value) filters[key] = value;
  }

  return { q: (first(raw.q) ?? "").trim(), page, perPage, sort, dir, filters };
}

export function skipTake(params: TableParams): { skip: number; take: number } {
  return { skip: (params.page - 1) * params.perPage, take: params.perPage };
}

export function isReservedParam(key: string): boolean {
  return RESERVED.has(key);
}
