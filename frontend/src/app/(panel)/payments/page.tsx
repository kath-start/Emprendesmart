'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { DataTable, type Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { pushToast } from '@/components/ui/Toast';
import { PaymentSettingsCard } from '@/components/modules/payments/PaymentSettingsCard';
import { ConfirmPaymentModal } from '@/components/modules/payments/ConfirmPaymentModal';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import * as paymentsApi from '@/lib/api/payments';
import type { PlanPayment, PlanPaymentStatus, YapeNotification } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

const soles = (value: number | null | undefined) => (value == null ? '—' : `S/ ${value.toFixed(2)}`);

export default function PaymentsPage() {
  const { canWrite } = useAuth();
  const [status, setStatus] = useState<PlanPaymentStatus | ''>('PENDING');
  const [confirming, setConfirming] = useState<PlanPayment | null>(null);
  const [rejecting, setRejecting] = useState<PlanPayment | null>(null);

  const payments = usePaginatedList<PlanPayment, { status?: PlanPaymentStatus }>(
    (params) => paymentsApi.listPlanPayments(params),
    { status: 'PENDING' },
  );
  const notifications = usePaginatedList<YapeNotification, Record<string, never>>(
    (params) => paymentsApi.listYapeNotifications(params),
    {},
    10,
  );

  function reloadAll() {
    payments.reload();
    notifications.reload();
  }

  const paymentColumns: Column<PlanPayment>[] = [
    {
      header: 'Emprendedor',
      cell: (row) =>
        row.entrepreneur ? (
          <Link href={`/entrepreneurs/${row.entrepreneur.id}`} className="hover:text-brand-600">
            <p className="font-medium text-slate-900">
              {row.entrepreneur.firstName} {row.entrepreneur.lastName}
            </p>
            <p className="text-xs text-slate-400">{row.entrepreneur.email}</p>
          </Link>
        ) : (
          '—'
        ),
    },
    { header: 'Plan', cell: (row) => <StatusBadge value={row.plan} /> },
    { header: 'Monto', cell: (row) => <span className="font-medium">{soles(row.amount)}</span> },
    { header: 'Nombre en Yape', cell: (row) => row.payerName },
    {
      header: 'Aviso de Yape',
      cell: (row) =>
        row.notification ? (
          <div>
            <p className="text-slate-700">{row.notification.senderName ?? '—'}</p>
            <p className="text-xs text-slate-400">{formatDateTime(row.notification.notifiedAt)}</p>
          </div>
        ) : row.status === 'CONFIRMED' ? (
          <span className="text-xs text-slate-400">Confirmado a mano</span>
        ) : (
          <span className="text-xs text-slate-400">Esperando aviso…</span>
        ),
    },
    {
      header: 'Estado',
      cell: (row) => (
        <div>
          <StatusBadge value={row.status} />
          {row.rejectedReason && <p className="mt-1 max-w-[180px] text-xs text-slate-400">{row.rejectedReason}</p>}
        </div>
      ),
    },
    { header: 'Solicitado', cell: (row) => formatDateTime(row.createdAt) },
    {
      header: '',
      className: 'text-right',
      cell: (row) =>
        canWrite && row.status === 'PENDING' ? (
          <div className="flex justify-end gap-1">
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
              onClick={() => setConfirming(row)}
              title="Confirmar pago"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              onClick={() => setRejecting(row)}
              title="Rechazar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  const notificationColumns: Column<YapeNotification>[] = [
    { header: 'Recibido', cell: (row) => formatDateTime(row.notifiedAt) },
    { header: 'Emisor', cell: (row) => row.senderName ?? '—' },
    { header: 'Monto', cell: (row) => <span className="font-medium">{soles(row.amount)}</span> },
    {
      header: 'Mensaje',
      cell: (row) => <p className="line-clamp-2 max-w-md text-xs text-slate-500">{row.message}</p>,
    },
    {
      header: 'Asignado a',
      cell: (row) =>
        row.planPayment ? (
          <Badge tone="green">
            {row.planPayment.payerName} · {row.planPayment.plan}
          </Badge>
        ) : (
          <Badge tone="amber">Sin asignar</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Pagos" description="Cobro de planes por Yape y confirmación con los avisos del celular" />

      <PaymentSettingsCard canWrite={canWrite} />

      <Card>
        <CardHeader
          title="Pagos de planes"
          description="Se confirman solos cuando llega un aviso de Yape con el mismo monto y nombre. Si no, revísalos aquí."
          action={
            <Select
              value={status}
              onChange={(e) => {
                const next = e.target.value as PlanPaymentStatus | '';
                setStatus(next);
                payments.updateFilters({ status: next || undefined });
              }}
              className="max-w-[170px]"
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendientes</option>
              <option value="CONFIRMED">Confirmados</option>
              <option value="REJECTED">Rechazados</option>
            </Select>
          }
        />
        <DataTable
          columns={paymentColumns}
          rows={payments.items}
          rowKey={(row) => row.id}
          isLoading={payments.isLoading}
          emptyMessage="No hay pagos con este estado."
        />
        <Pagination meta={payments.meta} onPageChange={payments.setPage} />
      </Card>

      <Card>
        <CardHeader title="Avisos de Yape recibidos" description="Lo que envió el celular de notificaciones." />
        <DataTable
          columns={notificationColumns}
          rows={notifications.items}
          rowKey={(row) => row.id}
          isLoading={notifications.isLoading}
          emptyMessage="Todavía no llegan avisos del celular."
        />
        <Pagination meta={notifications.meta} onPageChange={notifications.setPage} />
      </Card>

      <ConfirmPaymentModal payment={confirming} onClose={() => setConfirming(null)} onSaved={reloadAll} />

      <ConfirmDialog
        open={Boolean(rejecting)}
        title="Rechazar pago"
        description={`Se rechazará el pago de ${rejecting?.payerName} (${soles(rejecting?.amount)}). El emprendedor lo verá en la app.`}
        confirmLabel="Rechazar"
        danger
        onClose={() => setRejecting(null)}
        onConfirm={async () => {
          if (!rejecting) return;
          try {
            await paymentsApi.rejectPlanPayment(rejecting.id, 'No se encontró el pago en Yape');
            pushToast('Pago rechazado');
            reloadAll();
          } catch (error) {
            pushToast(error instanceof ApiError ? error.message : 'No se pudo rechazar', 'error');
          }
        }}
      />
    </div>
  );
}
