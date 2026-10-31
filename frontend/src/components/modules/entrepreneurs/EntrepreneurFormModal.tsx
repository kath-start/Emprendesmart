'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import * as entrepreneursApi from '@/lib/api/entrepreneurs';
import type { Entrepreneur } from '@/lib/types';

export function EntrepreneurFormModal({
  open,
  onClose,
  onSaved,
  entrepreneur,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  entrepreneur?: Entrepreneur | null;
}) {
  const isEdit = Boolean(entrepreneur);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    plan: 'FREE',
    status: 'ACTIVE',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (entrepreneur) {
      setForm({
        firstName: entrepreneur.firstName,
        lastName: entrepreneur.lastName,
        email: entrepreneur.email,
        phone: entrepreneur.phone ?? '',
        country: entrepreneur.country ?? '',
        city: entrepreneur.city ?? '',
        plan: entrepreneur.plan,
        status: entrepreneur.status,
      });
    } else {
      setForm({ firstName: '', lastName: '', email: '', phone: '', country: '', city: '', plan: 'FREE', status: 'ACTIVE' });
    }
  }, [entrepreneur, open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
        plan: form.plan as Entrepreneur['plan'],
        status: form.status as Entrepreneur['status'],
      };
      if (isEdit && entrepreneur) {
        await entrepreneursApi.updateEntrepreneur(entrepreneur.id, payload);
        pushToast('Emprendedor actualizado');
      } else {
        await entrepreneursApi.createEntrepreneur(payload);
        pushToast('Emprendedor creado');
      }
      onSaved();
      onClose();
    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'No se pudo guardar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar emprendedor' : 'Nuevo emprendedor'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre">
            <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Apellido">
            <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="País">
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ciudad">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Plan">
            <Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
              <option value="FREE">FREE</option>
              <option value="EMPRENDE">EMPRENDE</option>
              <option value="CRECIMIENTO">CRECIMIENTO</option>
              <option value="PRO">PRO</option>
            </Select>
          </Field>
        </div>
        <Field label="Estado">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </Select>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear emprendedor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
