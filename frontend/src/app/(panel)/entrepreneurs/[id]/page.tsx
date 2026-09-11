'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';
import * as entrepreneursApi from '@/lib/api/entrepreneurs';
import type { Entrepreneur, UsageEvent } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/Table';
import { formatDate, formatDateTime } from '@/lib/utils';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

export default function EntrepreneurDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [entrepreneur, setEntrepreneur] = useState<Entrepreneur | null>(null);
  const [usage, setUsage] = useState<UsageEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [entrepreneurRes, usageRes] = await Promise.all([
          entrepreneursApi.getEntrepreneur(params.id),
          entrepreneursApi.getEntrepreneurUsage(params.id, { limit: 10 }),
        ]);
        setEntrepreneur(entrepreneurRes.data);
        setUsage(usageRes.data);
      } catch (error) {
        pushToast(error instanceof ApiError ? error.message : 'No se pudo cargar el emprendedor', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id]);

  const usageColumns: Column<UsageEvent>[] = [
    { header: 'Tipo', cell: (row) => <StatusBadge value={row.type} /> },
    { header: 'Fecha', cell: (row) => formatDateTime(row.occurredAt) },
  ];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!entrepreneur) return null;

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {entrepreneur.firstName} {entrepreneur.lastName}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge value={entrepreneur.status} />
            <StatusBadge value={entrepreneur.plan} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Información de contacto" />
          <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" /> {entrepreneur.email}
            </p>
            {entrepreneur.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" /> {entrepreneur.phone}
              </p>
            )}
            {(entrepreneur.city || entrepreneur.country) && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                {[entrepreneur.city, entrepreneur.country].filter(Boolean).join(', ')}
              </p>
            )}
            <p className="text-xs text-slate-400">Registrado el {formatDate(entrepreneur.registeredAt)}</p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Negocios" description={`${entrepreneur.businesses?.length ?? 0} negocio(s)`} />
          <div className="divide-y divide-slate-100">
            {entrepreneur.businesses?.map((business) => (
              <Link
                key={business.id}
                href={`/businesses/${business.id}`}
                className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-800">{business.name}</p>
                  <p className="text-xs text-slate-400">{business.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={business.stage} />
                  <StatusBadge value={business.status} />
                </div>
              </Link>
            ))}
            {(!entrepreneur.businesses || entrepreneur.businesses.length === 0) && (
              <p className="px-5 py-6 text-center text-sm text-slate-400">Sin negocios registrados.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Actividad reciente" description="Últimos eventos de uso de la plataforma" />
        <DataTable columns={usageColumns} rows={usage} rowKey={(row) => row.id} emptyMessage="Sin actividad registrada." />
      </Card>
    </div>
  );
}
