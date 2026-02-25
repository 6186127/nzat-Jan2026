export type PaginationResult<T> = {
  pageRows: T[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
  start: number;
  end: number;
};

export function paginate<T>(rows: T[], currentPage: number, pageSize: number): PaginationResult<T> {
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageRows = rows.slice(startIndex, endIndex);

  const start = totalItems === 0 ? 0 : startIndex + 1;
  const end = endIndex;

  return { pageRows, totalPages, totalItems, currentPage: safePage, start, end };
}
