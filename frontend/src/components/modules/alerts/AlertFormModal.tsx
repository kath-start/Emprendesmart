'use client';

import { FormEvent, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchPicker, type PickerValue } from '@/components/ui/SearchPicker';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import * as alertsApi from '@/lib/api/alerts';
import * as businessesApi from '@/lib/api/businesses';
import type { AlertSeverity } from '@/lib/types';

export function AlertFormModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [business, setBusiness] = useState<PickerValue | null>(null);
  const [form, setForm] = useState({ type: '', severity: 'WARNING', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!business) {
      pushToast('Selecciona un negocio', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await alertsApi.createAlert({
        businessId: business.id,
        type: form.type,
        severity: form.severity as AlertSeverity,
        message: form.message,
      });
      pushToast('Alerta creada');
      onSaved();
      onClose();
      setBusiness(null);
      setForm({ type: '', severity: 'WARNING', message: '' });
    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'No se pudo crear', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva alerta">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Negocio">
          <SearchPicker
            value={business}
            onChange={setBusiness}
            placeholder="Buscar negocio por nombre..."
            search={(query) => businessesApi.listBusinesses({ search: query, limit: 6 }).then((res) => res.data)}
            toOption={(item) => ({ id: item.id, label: item.name, sublabel: item.category })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Input
              required
              placeholder="ej. CAIDA_INGRESOS"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
          </Field>
          <Field label="Severidad">
            <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </Select>
          </Field>
        </div>
        <Field label="Mensaje">
          <Textarea required rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Crear alerta
          </Button>
        </div>
      </form>
    </Modal>
  );
}
