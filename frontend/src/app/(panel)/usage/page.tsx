'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, StatCard } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/Badge';
import { UsageEventFormModal } from '@/components/modules/usage/UsageEventFormModal';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import * as usageApi from '@/lib/api/usage';
import type { UsageEvent, UsageEventType, UsageSummary } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

const TYPES: UsageEventType[] = ['LOGIN', 'REPORT_VIEW', 'RECOMMENDATION_VIEW', 'METRIC_UPDATE', 'ALERT_VIEW', 'FEATURE_USE'];

export default function UsagePage() {
  const { canWrite } = useAuth();
  const [type, setType] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [summary, setSummary] = useState<UsageSummary | null>(null);

  const { items, meta, setPage, updateFilters, isLoading, reload } = usePaginatedList<UsageEvent, { type?: UsageEventType }>(
    (params) => usageApi.listUsageEvents(params),
    {},
  );

  useEffect(() => {
    usageApi
      .getUsageSummary(30)
      .then((res) => setSummary(res.data))
      .catch((error) => pushToast(error instanceof ApiError ? error.message : 'No se pudo cargar el resumen', 'error'));
  }, []);

  function reloadAll() {
    reload();
    usageApi.getUsageSummary(30).then((res) => setSummary(res.data));
  }

  const columns: Column<UsageEvent>[] = [
    { header: 'Tipo', cell: (row) => <StatusBadge value={row.type} /> },
    {
      header: 'Emprendedor',
      cell: (row) => (row.entrepreneur ? `${row.entrepreneur.firstName} ${row.entrepreneur.lastName}` : '—'),
    },
    { header: 'Fecha', cell: (row) => formatDateTime(row.occurredAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Uso de la plataforma"
        description="Eventos de actividad de los emprendedores"
        action={
          canWrite && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> Registrar evento
            </Button>
          )
        }
      />

      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Eventos (30 días)" value={summary.totalEvents} />
          <StatCard label="Emprendedores activos" value={summary.activeEntrepreneurs} />
          <StatCard label="Tipo más frecuente" value={[...summary.byType].sort((a, b) => b.count - a.count)[0]?.type ?? '—'} />
        </div>
      )}

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 px-5 py-4">
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              updateFilters({ type: (e.target.value || undefined) as UsageEventType | undefined });
            }}
            className="max-w-[220px]"
          >
            <option value="">Todos los tipos</option>
            {TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>

        <DataTable columns={columns} rows={items} rowKey={(row) => row.id} isLoading={isLoading} emptyMessage="Sin eventos registrados." />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>

      <UsageEventFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={reloadAll} />
    </div>
  );
}
