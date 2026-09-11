'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import * as alertsApi from '@/lib/api/alerts';
import type { Alert, AlertStatus } from '@/lib/types';

export function AlertStatusModal({
  open,
  onClose,
  onSaved,
  alert,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  alert: Alert | null;
}) {
  const [status, setStatus] = useState<AlertStatus>('ACKNOWLEDGED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (alert) {
      setStatus(alert.status);
      setResolutionNote(alert.resolutionNote ?? '');
    }
  }, [alert]);

  if (!alert) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!alert) return;
    setIsSubmitting(true);
    try {
      await alertsApi.updateAlertStatus(alert.id, status, resolutionNote || undefined);
      pushToast('Alerta actualizada');
      onSaved();
      onClose();
    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'No se pudo actualizar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Actualizar alerta: ${alert.type}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nuevo estado">
          <Select value={status} onChange={(e) => setStatus(e.target.value as AlertStatus)}>
            <option value="OPEN">OPEN</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
          </Select>
        </Field>
        {status === 'RESOLVED' && (
          <Field label="Nota de resolución (opcional)">
            <Textarea rows={3} value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} />
          </Field>
        )}
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
