'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AlertFormModal } from '@/components/modules/alerts/AlertFormModal';
import { AlertStatusModal } from '@/components/modules/alerts/AlertStatusModal';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import * as alertsApi from '@/lib/api/alerts';
import type { Alert, AlertSeverity, AlertStatus } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function AlertsPage() {
  const { canWrite, isSuperAdmin } = useAuth();
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Alert | null>(null);
  const [deleting, setDeleting] = useState<Alert | null>(null);

  const { items, meta, setPage, updateFilters, isLoading, reload } = usePaginatedList<
    Alert,
    { severity?: AlertSeverity; status?: AlertStatus }
  >((params) => alertsApi.listAlerts(params), {});

  const columns: Column<Alert>[] = [
    {
      header: 'Alerta',
      cell: (row) => (
        <div className="max-w-sm">
          <p className="font-medium text-slate-900">{row.type}</p>
          <p className="line-clamp-1 text-xs text-slate-400">{row.message}</p>
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
    { header: 'Severidad', cell: (row) => <StatusBadge value={row.severity} /> },
    { header: 'Estado', cell: (row) => <StatusBadge value={row.status} /> },
    { header: 'Generada', cell: (row) => formatDateTime(row.triggeredAt) },
    {
      header: '',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {canWrite && (
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setEditingStatus(row)}
              title="Actualizar estado"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {isSuperAdmin && (
            <button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => setDeleting(row)}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Alertas"
        description="Riesgos y anomalías detectadas en los negocios"
        action={
          canWrite && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> Nueva alerta
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 px-5 py-4">
          <Select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              updateFilters({ severity: (e.target.value || undefined) as AlertSeverity | undefined });
            }}
            className="max-w-[160px]"
          >
            <option value="">Toda severidad</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="CRITICAL">CRITICAL</option>
          </Select>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              updateFilters({ status: (e.target.value || undefined) as AlertStatus | undefined });
            }}
            className="max-w-[160px]"
          >
            <option value="">Todos los estados</option>
            <option value="OPEN">OPEN</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
          </Select>
        </div>

        <DataTable columns={columns} rows={items} rowKey={(row) => row.id} isLoading={isLoading} emptyMessage="No hay alertas." />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>

      <AlertFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={reload} />
      <AlertStatusModal open={Boolean(editingStatus)} alert={editingStatus} onClose={() => setEditingStatus(null)} onSaved={reload} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar alerta"
        description={`Se eliminará la alerta "${deleting?.type}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await alertsApi.deleteAlert(deleting.id);
            pushToast('Alerta eliminada');
            reload();
          } catch (error) {
            pushToast(error instanceof ApiError ? error.message : 'No se pudo eliminar', 'error');
          }
        }}
      />
    </div>
  );
}
