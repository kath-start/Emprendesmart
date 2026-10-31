'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, ImageUp, QrCode, RefreshCw, Smartphone } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import * as paymentsApi from '@/lib/api/payments';
import type { PaymentSettings } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

const errorMessage = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback);

/** QR de Yape que ven los emprendedores en la app y código del celular que lee los avisos de Yape. */
export function PaymentSettingsCard({ canWrite }: { canWrite: boolean }) {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [holderName, setHolderName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function apply(next: PaymentSettings) {
    setSettings(next);
    setHolderName(next.yapeHolderName ?? '');
    setPhone(next.yapePhone ?? '');
  }

  useEffect(() => {
    paymentsApi
      .getPaymentSettings()
      .then(({ data }) => apply(data))
      .catch((error) => pushToast(errorMessage(error, 'No se pudo cargar la configuración de pagos'), 'error'));
  }, []);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      pushToast('La imagen debe pesar menos de 5 MB', 'error');
      return;
    }
    setIsUploading(true);
    try {
      const { data } = await paymentsApi.uploadYapeQr(file);
      apply(data);
      pushToast('QR de Yape actualizado. Ya aparece en la app.');
    } catch (error) {
      pushToast(errorMessage(error, 'No se pudo subir el QR'), 'error');
    } finally {
      setIsUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const { data } = await paymentsApi.updatePaymentSettings({
        yapeHolderName: holderName.trim() || null,
        yapePhone: phone.trim() || null,
      });
      apply(data);
      pushToast('Datos de Yape guardados');
    } catch (error) {
      pushToast(errorMessage(error, 'No se pudieron guardar los datos'), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function copyDeviceKey() {
    if (!settings) return;
    try {
      await navigator.clipboard.writeText(settings.deviceKey);
      pushToast('Código copiado');
    } catch {
      pushToast('No se pudo copiar el código', 'error');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader
          title="QR de Yape"
          description="Los emprendedores lo ven en la app al elegir un plan y yapean a esta cuenta."
        />
        <div className="flex flex-col gap-6 p-5 sm:flex-row">
          <div className="flex h-56 w-56 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
            {settings?.yapeQrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.yapeQrUrl} alt="QR de Yape" className="h-full w-full object-contain" />
            ) : (
              <div className="px-6 text-center text-slate-400">
                <QrCode className="mx-auto mb-2 h-10 w-10" />
                <p className="text-xs">Aún no subiste el QR</p>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <Field label="Titular de la cuenta Yape">
              <Input
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Ej. EmprendeSmart SAC"
                disabled={!canWrite}
              />
            </Field>
            <Field label="Número de celular Yape">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 987 654 321"
                disabled={!canWrite}
              />
            </Field>
            {canWrite && (
              <div className="mt-auto flex flex-wrap gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
                <Button variant="secondary" isLoading={isUploading} onClick={() => fileInput.current?.click()}>
                  <ImageUp className="h-4 w-4" /> {settings?.yapeQrUrl ? 'Cambiar QR' : 'Subir QR'}
                </Button>
                <Button isLoading={isSaving} onClick={handleSave}>
                  Guardar datos
                </Button>
              </div>
            )}
            {settings && <p className="text-xs text-slate-400">Actualizado: {formatDateTime(settings.updatedAt)}</p>}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Celular de notificaciones"
          description="El celular con Yape envía cada pago recibido para confirmarlo solo."
        />
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-4">
            <Smartphone className="h-8 w-8 shrink-0 text-brand-600" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Código del dispositivo</p>
              <p className="truncate font-mono text-xl font-semibold tracking-widest text-slate-900">
                {settings?.deviceKey ?? '··········'}
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            Escríbelo en la app <strong>EmprendeSmart Pagos</strong> del celular que recibe los Yape, junto con la
            dirección del servidor. Si lo cambias, tendrás que escribir el nuevo en el celular.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={copyDeviceKey} disabled={!settings}>
              <Copy className="h-4 w-4" /> Copiar
            </Button>
            {canWrite && (
              <Button variant="ghost" size="sm" onClick={() => setConfirmRegenerate(true)} disabled={!settings}>
                <RefreshCw className="h-4 w-4" /> Generar otro
              </Button>
            )}
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmRegenerate}
        title="Generar un código nuevo"
        description="El celular de notificaciones dejará de enviar pagos hasta que escribas el código nuevo en él."
        confirmLabel="Generar código"
        danger
        onClose={() => setConfirmRegenerate(false)}
        onConfirm={async () => {
          try {
            const { data } = await paymentsApi.regenerateDeviceKey();
            apply(data);
            pushToast('Código nuevo generado');
          } catch (error) {
            pushToast(errorMessage(error, 'No se pudo generar el código'), 'error');
          }
        }}
      />
    </div>
  );
}
