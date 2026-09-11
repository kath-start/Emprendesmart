'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import type { PaginationMeta } from '@/lib/types';
import { pushToast } from '@/components/ui/Toast';

type Fetcher<T, F> = (params: F & { page: number; limit: number }) => Promise<{ data: T[]; meta?: PaginationMeta }>;

export function usePaginatedList<T, F extends Record<string, unknown>>(fetcher: Fetcher<T, F>, initialFilters: F, limit = 20) {
  const [filters, setFilters] = useState<F>(initialFilters);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>();
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, meta: responseMeta } = await fetcher({ ...filters, page, limit });
      setItems(data);
      setMeta(responseMeta);
    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'No se pudo cargar la información', 'error');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, limit, reloadToken]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilters(next: Partial<F>) {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  }

  function reload() {
    setReloadToken((token) => token + 1);
  }

  return { items, meta, page, setPage, filters, updateFilters, isLoading, reload };
}
