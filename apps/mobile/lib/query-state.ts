// A failed query keeps its error status while a retry is in flight. Treat
// that retry as loading so "Try again" shows the skeleton instead of the
// stale error panel (no error → data blink).
interface QueryFlags {
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
}

export const isBusy = (q: QueryFlags): boolean => q.isLoading || (q.isError && q.isFetching);

export const isFailed = (q: QueryFlags): boolean => q.isError && !q.isFetching;
