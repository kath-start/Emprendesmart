'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Loader2, Sparkles } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import * as businessesApi from '@/lib/api/businesses';
import * as aiApi from '@/lib/api/ai';
import type { AiAnalysisResult, Business } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import { MetricFormModal } from '@/components/modules/businesses/MetricFormModal';
import { AiAnalysisModal } from '@/components/modules/businesses/AiAnalysisModal';
import { useAuth } from '@/lib/auth-context';

export default function BusinessDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { canWrite } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metricModalOpen, setMetricModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);

  async function load() {
    try {
      const res = await businessesApi.getBusiness(params.id);
      setBusiness(res.data);
    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'No se pudo cargar el negocio', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleAnalyze() {
    setIsAnalyzing(true);
    try {
      const { data } = await aiApi.analyzeBusiness(params.id);
      setAiResult(data);
      await load();
    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'No se pudo completar el análisis con IA', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!business) return null;

  const chartData = [...(business.metrics ?? [])]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((metric) => ({
      month: formatDate(metric.period),
      revenue: metric.revenue,
      expenses: metric.expenses,
      profit: metric.profit,
    }));

  return (
    <div>
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{business.name}</h1>
          <p className="text-sm text-slate-500">{business.category}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge value={business.stage} />
            <StatusBadge value={business.status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {business.entrepreneur && (
            <Link
              href={`/entrepreneurs/${business.entrepreneur.id}`}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Ver emprendedor: {business.entrepreneur.firstName} {business.entrepreneur.lastName}
            </Link>
          )}
          {canWrite && (
            <Button onClick={handleAnalyze} isLoading={isAnalyzing}>
              <Sparkles className="h-4 w-4" /> Analizar con IA
            </Button>
          )}
        </div>
      </div>

      {business.description && <p className="mb-6 max-w-2xl text-sm text-slate-600">{business.description}</p>}

      <Card>
        <CardHeader
          title="Métricas mensuales"
          description="Ingresos, gastos y utilidad"
          action={
            canWrite && (
              <Button size="sm" onClick={() => setMetricModalOpen(true)}>
                <Plus className="h-4 w-4" /> Registrar métrica
              </Button>
            )
          }
        />
        <div className="h-64 px-4 py-4">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin métricas registradas.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => formatCurrency(v)} width={90} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="revenue" name="Ingresos" stroke="#328bff" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" name="Gastos" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" name="Utilidad" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recomendaciones" description="Últimas generadas para este negocio" />
          <ul className="divide-y divide-slate-100">
            {business.recommendations?.map((rec) => (
              <li key={rec.id} className="px-5 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">{rec.title}</p>
                  <StatusBadge value={rec.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{rec.description}</p>
              </li>
            ))}
            {(!business.recommendations || business.recommendations.length === 0) && (
              <p className="px-5 py-6 text-center text-sm text-slate-400">Sin recomendaciones.</p>
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Alertas" description="Últimas generadas para este negocio" />
          <ul className="divide-y divide-slate-100">
            {business.alerts?.map((alert) => (
              <li key={alert.id} className="px-5 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">{alert.type}</p>
                  <div className="flex gap-1.5">
                    <StatusBadge value={alert.severity} />
                    <StatusBadge value={alert.status} />
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">{alert.message}</p>
              </li>
            ))}
            {(!business.alerts || business.alerts.length === 0) && (
              <p className="px-5 py-6 text-center text-sm text-slate-400">Sin alertas.</p>
            )}
          </ul>
        </Card>
      </div>

      <MetricFormModal open={metricModalOpen} onClose={() => setMetricModalOpen(false)} onSaved={load} businessId={business.id} />
      <AiAnalysisModal open={Boolean(aiResult)} onClose={() => setAiResult(null)} result={aiResult} />
    </div>
  );
}
