'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/Input';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import * as paymentsApi from '@/lib/api/payments';
import type { PlanPayment, YapeNotification } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

/** Confirmación manual: el administrador elige el aviso de Yape que corresponde al pago (o confirma sin aviso). */
export function ConfirmPaymentModal({
  payment,
  onClose,
  onSaved,
}: {
  payment: PlanPayment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [candidates, setCandidates] = useState<YapeNotification[]>([]);
  const [notificationId, setNotificationId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!payment) return;
    setNotificationId('');
    paymentsApi
      .listYapeNotifications({ matched: 'false', limit: 100 })
      .then(({ data }) => setCandidates(data.filter((n) => n.amount === payment.amount)))
      .catch(() => setCandidates([]));
  }, [payment]);

  async function handleConfirm() {
    if (!payment) return;
    setIsSaving(true);
    try {
      await paymentsApi.confirmPlanPayment(payment.id, notificationId || undefined);
      pushToast('Pago confirmado. El plan del emprendedor ya está activo.');
      onSaved();
      onClose();
    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'No se pudo confirmar el pago', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal open={Boolean(payment)} onClose={onClose} title="Confirmar pago">
      {payment && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <strong>{payment.payerName}</strong> dice que pagó <strong>S/ {payment.amount.toFixed(2)}</strong> por el
            plan <strong>{payment.plan}</strong>.
          </p>
          <Field label="Aviso de Yape recibido">
            <Select value={notificationId} onChange={(e) => setNotificationId(e.target.value)}>
              <option value="">Confirmar sin aviso (verifiqué el pago por otro medio)</option>
              {candidates.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.senderName ?? 'Sin nombre'} · S/ {n.amount?.toFixed(2)} · {formatDateTime(n.notifiedAt)}
                </option>
              ))}
            </Select>
          </Field>
          {candidates.length === 0 && (
            <p className="text-xs text-amber-700">No hay avisos de Yape sin asignar con el mismo monto.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button isLoading={isSaving} onClick={handleConfirm}>
              Confirmar pago
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
