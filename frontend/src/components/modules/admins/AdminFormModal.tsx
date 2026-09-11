'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import * as adminsApi from '@/lib/api/admins';
import type { Admin, AdminRole, AdminStatus } from '@/lib/types';

export function AdminFormModal({
  open,
  onClose,
  onSaved,
  admin,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  admin?: Admin | null;
}) {
  const isEdit = Boolean(admin);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ADMIN', status: 'ACTIVE' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (admin) {
      setForm({ name: admin.name, email: admin.email, password: '', role: admin.role, status: admin.status });
    } else {
      setForm({ name: '', email: '', password: '', role: 'ADMIN', status: 'ACTIVE' });
    }
  }, [admin, open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEdit && admin) {
        await adminsApi.updateAdmin(admin.id, {
          name: form.name,
          role: form.role as AdminRole,
          status: form.status as AdminStatus,
          password: form.password || undefined,
        });
        pushToast('Administrador actualizado');
      } else {
        await adminsApi.createAdmin({ name: form.name, email: form.email, password: form.password, role: form.role as AdminRole });
        pushToast('Administrador creado');
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
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar administrador' : 'Nuevo administrador'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            required
            disabled={isEdit}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label={isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña'}>
          <Input
            type="password"
            required={!isEdit}
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={isEdit ? 'Dejar en blanco para no cambiarla' : undefined}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rol">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="ANALYST">ANALYST</option>
            </Select>
          </Field>
          {isEdit && (
            <Field label="Estado">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </Field>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear administrador'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
