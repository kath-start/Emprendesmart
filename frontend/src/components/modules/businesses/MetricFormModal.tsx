'use client';

import { FormEvent, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import * as businessesApi from '@/lib/api/businesses';

export function MetricFormModal({
  open,
  onClose,
  onSaved,
  businessId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  businessId: string;
}) {
  const today = new Date();
  const [form, setForm] = useState({
    period: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
    revenue: '',
    expenses: '',
    customersCount: '',
    salesCount: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await businessesApi.upsertBusinessMetric(businessId, {
        period: form.period,
        revenue: form.revenue ? Number(form.revenue) : undefined,
        expenses: form.expenses ? Number(form.expenses) : undefined,
        customersCount: form.customersCount ? Number(form.customersCount) : undefined,
        salesCount: form.salesCount ? Number(form.salesCount) : undefined,
      });
      pushToast('Métrica guardada');
      onSaved();
      onClose();
    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'No se pudo guardar la métrica', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar métrica mensual" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Mes">
          <Input type="date" required value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ingresos">
            <Input type="number" min={0} value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} />
          </Field>
          <Field label="Gastos">
            <Input type="number" min={0} value={form.expenses} onChange={(e) => setForm({ ...form, expenses: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Clientes">
            <Input
              type="number"
              min={0}
              value={form.customersCount}
              onChange={(e) => setForm({ ...form, customersCount: e.target.value })}
            />
          </Field>
          <Field label="Ventas">
            <Input type="number" min={0} value={form.salesCount} onChange={(e) => setForm({ ...form, salesCount: e.target.value })} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
