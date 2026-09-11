'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdminFormModal } from '@/components/modules/admins/AdminFormModal';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useDebounce } from '@/hooks/useDebounce';
import * as adminsApi from '@/lib/api/admins';
import type { Admin } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function AdminsPage() {
  const { isSuperAdmin, admin: currentAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [deleting, setDeleting] = useState<Admin | null>(null);

  const { items, meta, setPage, updateFilters, isLoading, reload } = usePaginatedList<Admin, { search?: string }>(
    (params) => adminsApi.listAdmins(params),
    {},
  );

  useEffect(() => {
    updateFilters({ search: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  if (!isSuperAdmin) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <ShieldAlert className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500">Solo un SUPER_ADMIN puede gestionar administradores del panel.</p>
      </Card>
    );
  }

  const columns: Column<Admin>[] = [
    {
      header: 'Nombre',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-400">{row.email}</p>
        </div>
      ),
    },
    { header: 'Rol', cell: (row) => <StatusBadge value={row.role} /> },
    { header: 'Estado', cell: (row) => <StatusBadge value={row.status} /> },
    { header: 'Último acceso', cell: (row) => formatDate(row.lastLoginAt) },
    {
      header: '',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={() => {
              setEditing(row);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </button>
          {row.id !== currentAdmin?.id && (
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
        title="Administradores"
        description="Equipo con acceso al panel de EmprendeSmart"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo administrador
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <DataTable columns={columns} rows={items} rowKey={(row) => row.id} isLoading={isLoading} emptyMessage="No hay administradores." />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>

      <AdminFormModal open={formOpen} admin={editing} onClose={() => setFormOpen(false)} onSaved={reload} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar administrador"
        description={`Se eliminará la cuenta de ${deleting?.name}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await adminsApi.deleteAdmin(deleting.id);
            pushToast('Administrador eliminado');
            reload();
          } catch (error) {
            pushToast(error instanceof ApiError ? error.message : 'No se pudo eliminar', 'error');
          }
        }}
      />
    </div>
  );
}
