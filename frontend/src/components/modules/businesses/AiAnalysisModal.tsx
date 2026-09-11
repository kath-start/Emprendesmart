'use client';

import { Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AiAnalysisResult } from '@/lib/types';

export function AiAnalysisModal({
  open,
  onClose,
  result,
}: {
  open: boolean;
  onClose: () => void;
  result: AiAnalysisResult | null;
}) {
  if (!result) return null;

  return (
    <Modal open={open} onClose={onClose} title="Análisis con IA" size="lg">
      <div className="space-y-5">
        <div className="flex gap-3 rounded-lg bg-brand-50 p-4 text-sm text-brand-900">
          <Sparkles className="h-5 w-5 shrink-0 text-brand-600" />
          <p>{result.summary}</p>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recomendaciones generadas ({result.recommendations.length})
          </h3>
          {result.recommendations.length === 0 ? (
            <p className="text-sm text-slate-400">La IA no encontró motivos para generar recomendaciones nuevas.</p>
          ) : (
            <ul className="space-y-2">
              {result.recommendations.map((rec) => (
                <li key={rec.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">{rec.title}</p>
                    <StatusBadge value={rec.priority} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{rec.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Alertas generadas ({result.alerts.length})
          </h3>
          {result.alerts.length === 0 ? (
            <p className="text-sm text-slate-400">La IA no detectó riesgos que requieran una alerta.</p>
          ) : (
            <ul className="space-y-2">
              {result.alerts.map((alert) => (
                <li key={alert.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">{alert.type}</p>
                    <StatusBadge value={alert.severity} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{alert.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
