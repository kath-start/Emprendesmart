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
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EntrepreneurFormModal } from '@/components/modules/entrepreneurs/EntrepreneurFormModal';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useDebounce } from '@/hooks/useDebounce';
import * as entrepreneursApi from '@/lib/api/entrepreneurs';
import type { Entrepreneur, EntrepreneurStatus, PlanType } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function EntrepreneursPage() {
  const { canWrite, isSuperAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Entrepreneur | null>(null);
  const [deleting, setDeleting] = useState<Entrepreneur | null>(null);

  const { items, meta, setPage, updateFilters, isLoading, reload } = usePaginatedList<
    Entrepreneur,
    { search?: string; status?: EntrepreneurStatus; plan?: PlanType }
  >((params) => entrepreneursApi.listEntrepreneurs(params), {});

  useEffect(() => {
    updateFilters({ search: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const columns: Column<Entrepreneur>[] = [
    {
      header: 'Nombre',
      cell: (row) => (
        <div>
          <Link href={`/entrepreneurs/${row.id}`} className="font-medium text-slate-900 hover:text-brand-600">
            {row.firstName} {row.lastName}
          </Link>
          <p className="text-xs text-slate-400">{row.email}</p>
        </div>
      ),
    },
    { header: 'Plan', cell: (row) => <StatusBadge value={row.plan} /> },
    { header: 'Estado', cell: (row) => <StatusBadge value={row.status} /> },
    { header: 'País', cell: (row) => row.country ?? '—' },
    { header: 'Negocios', cell: (row) => <Badge tone="slate">{row._count?.businesses ?? 0}</Badge> },
    { header: 'Registrado', cell: (row) => formatDate(row.registeredAt) },
    {
      header: '',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Link href={`/entrepreneurs/${row.id}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
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
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              onClick={() => setDeleting(row)}
            >
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
        title="Emprendedores"
        description="Clientes que usan el servicio de EmprendeSmart"
        action={
          canWrite && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Nuevo emprendedor
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              updateFilters({ status: (e.target.value || undefined) as EntrepreneurStatus | undefined });
            }}
            className="max-w-[160px]"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="SUSPENDED">Suspendido</option>
          </Select>
          <Select
            value={plan}
            onChange={(e) => {
              setPlan(e.target.value);
              updateFilters({ plan: (e.target.value || undefined) as PlanType | undefined });
            }}
            className="max-w-[160px]"
          >
            <option value="">Todos los planes</option>
            <option value="FREE">FREE</option>
            <option value="EMPRENDE">EMPRENDE</option>
            <option value="CRECIMIENTO">CRECIMIENTO</option>
            <option value="PRO">PRO</option>
          </Select>
        </div>

        <DataTable columns={columns} rows={items} rowKey={(row) => row.id} isLoading={isLoading} emptyMessage="No hay emprendedores registrados." />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>

      <EntrepreneurFormModal
        open={formOpen}
        entrepreneur={editing}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar emprendedor"
        description={`Se eliminará a ${deleting?.firstName} ${deleting?.lastName} junto con sus negocios y datos asociados. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await entrepreneursApi.deleteEntrepreneur(deleting.id);
            pushToast('Emprendedor eliminado');
            reload();
          } catch (error) {
            pushToast(error instanceof ApiError ? error.message : 'No se pudo eliminar', 'error');
          }
        }}
      />
    </div>
  );
}
