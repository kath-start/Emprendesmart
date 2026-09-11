'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RecommendationFormModal } from '@/components/modules/recommendations/RecommendationFormModal';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useDebounce } from '@/hooks/useDebounce';
import * as recommendationsApi from '@/lib/api/recommendations';
import type { Recommendation, RecommendationPriority, RecommendationStatus } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

const STATUS_OPTIONS: RecommendationStatus[] = ['PENDING', 'SENT', 'ACCEPTED', 'DISMISSED'];

export default function RecommendationsPage() {
  const { canWrite, isSuperAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Recommendation | null>(null);

  const { items, meta, setPage, updateFilters, isLoading, reload } = usePaginatedList<
    Recommendation,
    { search?: string; status?: RecommendationStatus; priority?: RecommendationPriority }
  >((params) => recommendationsApi.listRecommendations(params), {});

  useEffect(() => {
    updateFilters({ search: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  async function handleStatusChange(recommendation: Recommendation, next: RecommendationStatus) {
    try {
      await recommendationsApi.updateRecommendationStatus(recommendation.id, next);
      pushToast('Estado actualizado');
      reload();
    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'No se pudo actualizar', 'error');
    }
  }

  const columns: Column<Recommendation>[] = [
    {
      header: 'Recomendación',
      cell: (row) => (
        <div className="max-w-sm">
          <p className="font-medium text-slate-900">{row.title}</p>
          <p className="line-clamp-1 text-xs text-slate-400">{row.description}</p>
        </div>
      ),
    },
    {
      header: 'Negocio',
      cell: (row) =>
        row.business ? (
          <Link href={`/businesses/${row.business.id}`} className="text-slate-600 hover:text-brand-600">
            {row.business.name}
          </Link>
        ) : (
          '—'
        ),
    },
    { header: 'Prioridad', cell: (row) => <StatusBadge value={row.priority} /> },
    { header: 'Origen', cell: (row) => <StatusBadge value={row.source} /> },
    {
      header: 'Estado',
      cell: (row) =>
        canWrite ? (
          <Select
            value={row.status}
            onChange={(e) => handleStatusChange(row, e.target.value as RecommendationStatus)}
            className="h-8 py-1 text-xs"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        ) : (
          <StatusBadge value={row.status} />
        ),
    },
    { header: 'Generada', cell: (row) => formatDate(row.generatedAt) },
    {
      header: '',
      className: 'text-right',
      cell: (row) =>
        isSuperAdmin && (
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => setDeleting(row)}>
            <Trash2 className="h-4 w-4" />
          </button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Recomendaciones"
        description="Sugerencias generadas para los negocios"
        action={
          canWrite && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> Nueva recomendación
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Buscar por título..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              updateFilters({ status: (e.target.value || undefined) as RecommendationStatus | undefined });
            }}
            className="max-w-[160px]"
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              updateFilters({ priority: (e.target.value || undefined) as RecommendationPriority | undefined });
            }}
            className="max-w-[160px]"
          >
            <option value="">Toda prioridad</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </Select>
        </div>

        <DataTable columns={columns} rows={items} rowKey={(row) => row.id} isLoading={isLoading} emptyMessage="No hay recomendaciones." />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>

      <RecommendationFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={reload} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar recomendación"
        description={`Se eliminará "${deleting?.title}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await recommendationsApi.deleteRecommendation(deleting.id);
            pushToast('Recomendación eliminada');
            reload();
          } catch (error) {
            pushToast(error instanceof ApiError ? error.message : 'No se pudo eliminar', 'error');
          }
        }}
      />
    </div>
  );
}
