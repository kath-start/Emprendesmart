'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BusinessFormModal } from '@/components/modules/businesses/BusinessFormModal';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useDebounce } from '@/hooks/useDebounce';
import * as businessesApi from '@/lib/api/businesses';
import type { Business, BusinessStage, BusinessStatus } from '@/lib/types';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function BusinessesPage() {
  const { canWrite, isSuperAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [status, setStatus] = useState('');
  const [stage, setStage] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Business | null>(null);
  const [deleting, setDeleting] = useState<Business | null>(null);

  const { items, meta, setPage, updateFilters, isLoading, reload } = usePaginatedList<
    Business,
    { search?: string; status?: BusinessStatus; stage?: BusinessStage }
  >((params) => businessesApi.listBusinesses(params), {});

  useEffect(() => {
    updateFilters({ search: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const columns: Column<Business>[] = [
    {
      header: 'Negocio',
      cell: (row) => (
        <div>
          <Link href={`/businesses/${row.id}`} className="font-medium text-slate-900 hover:text-brand-600">
            {row.name}
          </Link>
          <p className="text-xs text-slate-400">{row.category}</p>
        </div>
      ),
    },
    {
      header: 'Emprendedor',
      cell: (row) =>
        row.entrepreneur ? (
          <Link href={`/entrepreneurs/${row.entrepreneur.id}`} className="text-slate-600 hover:text-brand-600">
            {row.entrepreneur.firstName} {row.entrepreneur.lastName}
          </Link>
        ) : (
          '—'
        ),
    },
    { header: 'Etapa', cell: (row) => <StatusBadge value={row.stage} /> },
    { header: 'Estado', cell: (row) => <StatusBadge value={row.status} /> },
    { header: 'Empleados', cell: (row) => row.employeesCount },
    {
      header: '',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Link href={`/businesses/${row.id}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Eye className="h-4 w-4" />
          </Link>
          {canWrite && (
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => {
                setEditing(row);
                setFormOpen(true);
              }}
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
        title="Negocios"
        description="Emprendimientos de los clientes de EmprendeSmart"
        action={
          canWrite && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Nuevo negocio
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              updateFilters({ stage: (e.target.value || undefined) as BusinessStage | undefined });
            }}
            className="max-w-[160px]"
          >
            <option value="">Todas las etapas</option>
            <option value="IDEA">IDEA</option>
            <option value="EARLY">EARLY</option>
            <option value="GROWTH">GROWTH</option>
            <option value="ESTABLISHED">ESTABLISHED</option>
          </Select>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              updateFilters({ status: (e.target.value || undefined) as BusinessStatus | undefined });
            }}
            className="max-w-[160px]"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="CLOSED">CLOSED</option>
          </Select>
        </div>

        <DataTable columns={columns} rows={items} rowKey={(row) => row.id} isLoading={isLoading} emptyMessage="No hay negocios registrados." />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>

      <BusinessFormModal open={formOpen} business={editing} onClose={() => setFormOpen(false)} onSaved={reload} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar negocio"
        description={`Se eliminará "${deleting?.name}" junto con sus métricas, alertas y recomendaciones. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await businessesApi.deleteBusiness(deleting.id);
            pushToast('Negocio eliminado');
            reload();
          } catch (error) {
            pushToast(error instanceof ApiError ? error.message : 'No se pudo eliminar', 'error');
          }
        }}
      />
    </div>
  );
}
