'use client';

import { FormEvent, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchPicker, type PickerValue } from '@/components/ui/SearchPicker';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import * as usageApi from '@/lib/api/usage';
import * as entrepreneursApi from '@/lib/api/entrepreneurs';
import type { UsageEventType } from '@/lib/types';

const TYPES: UsageEventType[] = ['LOGIN', 'REPORT_VIEW', 'RECOMMENDATION_VIEW', 'METRIC_UPDATE', 'ALERT_VIEW', 'FEATURE_USE'];

export function UsageEventFormModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [entrepreneur, setEntrepreneur] = useState<PickerValue | null>(null);
  const [type, setType] = useState<UsageEventType>('LOGIN');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!entrepreneur) {
      pushToast('Selecciona un emprendedor', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await usageApi.createUsageEvent({ entrepreneurId: entrepreneur.id, type });
      pushToast('Evento registrado');
      onSaved();
      onClose();
      setEntrepreneur(null);
    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'No se pudo registrar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar evento de uso" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Emprendedor">
          <SearchPicker
            value={entrepreneur}
            onChange={setEntrepreneur}
            placeholder="Buscar emprendedor..."
            search={(query) => entrepreneursApi.listEntrepreneurs({ search: query, limit: 6 }).then((res) => res.data)}
            toOption={(item) => ({ id: item.id, label: `${item.firstName} ${item.lastName}`, sublabel: item.email })}
          />
        </Field>
        <Field label="Tipo de evento">
          <Select value={type} onChange={(e) => setType(e.target.value as UsageEventType)}>
            {TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
