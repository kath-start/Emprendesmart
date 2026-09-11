'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Briefcase,
  AlertTriangle,
  Lightbulb,
  Activity,
  DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import * as metricsApi from '@/lib/api/metrics';
import type {
  CategoryCount,
  FinancePoint,
  GrowthPoint,
  MetricsOverview,
  SystemSignals,
  TopActiveEntrepreneur,
} from '@/lib/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { ApiError } from '@/lib/api-client';
import { pushToast } from '@/components/ui/Toast';

export default function DashboardPage() {
  const [overview, setOverview] = useState<MetricsOverview | null>(null);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [finance, setFinance] = useState<FinancePoint[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [signals, setSignals] = useState<SystemSignals | null>(null);
  const [topActive, setTopActive] = useState<TopActiveEntrepreneur[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [overviewRes, growthRes, financeRes, categoriesRes, signalsRes, topActiveRes] = await Promise.all([
          metricsApi.getOverview(),
          metricsApi.getGrowth(6),
          metricsApi.getFinanceTrend(6),
          metricsApi.getBusinessesByCategory(),
          metricsApi.getSignals(),
          metricsApi.getTopActiveEntrepreneurs(),
        ]);
        setOverview(overviewRes.data);
        setGrowth(growthRes.data);
        setFinance(financeRes.data);
        setCategories(categoriesRes.data);
        setSignals(signalsRes.data);
        setTopActive(topActiveRes.data);
      } catch (error) {
        pushToast(error instanceof ApiError ? error.message : 'No se pudo cargar el dashboard', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" description="Resumen general de EmprendeSmart" />

      {isLoading || !overview ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Emprendedores"
              value={formatNumber(overview.entrepreneurs.total)}
              hint={`${overview.entrepreneurs.active} activos · +${overview.entrepreneurs.newLast30Days} en 30 días`}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              label="Negocios"
              value={formatNumber(overview.businesses.total)}
              hint={`${overview.businesses.active} activos`}
              icon={<Briefcase className="h-5 w-5" />}
            />
            <StatCard
              label="Alertas abiertas"
              value={formatNumber(overview.alerts.open)}
              hint={`${overview.alerts.critical} críticas`}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
            <StatCard
              label="Recomendaciones pendientes"
              value={formatNumber(overview.recommendations.pending)}
              icon={<Lightbulb className="h-5 w-5" />}
            />
            <StatCard
              label="Eventos de uso (30d)"
              value={formatNumber(overview.usage.eventsLast30Days)}
              icon={<Activity className="h-5 w-5" />}
            />
            <StatCard
              label="Utilidad total"
              value={formatCurrency(overview.finance.totalProfit)}
              hint={`Ingresos ${formatCurrency(overview.finance.totalRevenue)}`}
              icon={<DollarSign className="h-5 w-5" />}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Finanzas agregadas" description="Ingresos, gastos y utilidad por mes" />
              <div className="h-72 px-4 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={finance}>
                    <defs>
                      <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#328bff" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#328bff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => formatCurrency(v)} width={90} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Ingresos" stroke="#328bff" fill="url(#revenue)" />
                    <Area type="monotone" dataKey="expenses" name="Gastos" stroke="#f97316" fillOpacity={0} />
                    <Area type="monotone" dataKey="profit" name="Utilidad" stroke="#16a34a" fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Nuevos emprendedores" description="Altas registradas por mes" />
              <div className="h-72 px-4 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Emprendedores" fill="#328bff" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader title="Negocios por categoría" />
              <ul className="space-y-2 px-5 py-4">
                {categories.slice(0, 8).map((category) => (
                  <li key={category.category} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{category.category}</span>
                    <span className="font-medium text-slate-900">{category.count}</span>
                  </li>
                ))}
                {categories.length === 0 && <p className="text-sm text-slate-400">Sin datos aún.</p>}
              </ul>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader title="Señales del sistema" />
              <div className="space-y-4 px-5 py-4 text-sm">
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase text-slate-400">Recomendaciones</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(signals?.recommendations.byStatus ?? {}).map(([status, count]) => (
                      <StatusBadge key={status} value={`${status} (${count})`} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase text-slate-400">Alertas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(signals?.alerts.byStatus ?? {}).map(([status, count]) => (
                      <StatusBadge key={status} value={`${status} (${count})`} />
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader title="Emprendedores más activos" />
              <ul className="divide-y divide-slate-100">
                {topActive.slice(0, 6).map((row, index) => (
                  <li key={row.entrepreneur?.id ?? index} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">
                        {row.entrepreneur ? `${row.entrepreneur.firstName} ${row.entrepreneur.lastName}` : 'N/D'}
                      </p>
                      <p className="text-xs text-slate-400">{row.entrepreneur?.email}</p>
                    </div>
                    <span className="text-xs font-semibold text-brand-600">{row.events} eventos</span>
                  </li>
                ))}
                {topActive.length === 0 && <p className="px-5 py-4 text-sm text-slate-400">Sin datos aún.</p>}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
