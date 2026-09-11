'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import * as businessesApi from '@/lib/api/businesses';
import * as entrepreneursApi from '@/lib/api/entrepreneurs';
import type { Business } from '@/lib/types';
import { SearchPicker, type PickerValue } from '@/components/ui/SearchPicker';

export function BusinessFormModal({
  open,
  onClose,
  onSaved,
  business,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  business?: Business | null;
}) {
  const isEdit = Boolean(business);
  const [entrepreneur, setEntrepreneur] = useState<PickerValue | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    stage: 'EARLY',
    status: 'ACTIVE',
    employeesCount: '1',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name,
        category: business.category,
        description: business.description ?? '',
        stage: business.stage,
        status: business.status,
        employeesCount: String(business.employeesCount),
      });
      setEntrepreneur(
        business.entrepreneur
          ? { id: business.entrepreneur.id, label: `${business.entrepreneur.firstName} ${business.entrepreneur.lastName}` }
          : null,
      );
    } else {
      setForm({ name: '', category: '', description: '', stage: 'EARLY', status: 'ACTIVE', employeesCount: '1' });
      setEntrepreneur(null);
    }
  }, [business, open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isEdit && !entrepreneur) {
      pushToast('Selecciona un emprendedor', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      if (isEdit && business) {
        await businessesApi.updateBusiness(business.id, {
          name: form.name,
          category: form.category,
          description: form.description || undefined,
          stage: form.stage as Business['stage'],
          status: form.status as Business['status'],
          employeesCount: Number(form.employeesCount),
        });
        pushToast('Negocio actualizado');
      } else {
        await businessesApi.createBusiness({
          entrepreneurId: entrepreneur!.id,
          name: form.name,
          category: form.category,
          description: form.description || undefined,
          stage: form.stage as Business['stage'],
          status: form.status as Business['status'],
          employeesCount: Number(form.employeesCount),
        });
        pushToast('Negocio creado');
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
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar negocio' : 'Nuevo negocio'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <Field label="Emprendedor">
            <SearchPicker
              value={entrepreneur}
              onChange={setEntrepreneur}
              placeholder="Buscar emprendedor por nombre o email..."
              search={(query) => entrepreneursApi.listEntrepreneurs({ search: query, limit: 6 }).then((res) => res.data)}
              toOption={(item) => ({
                id: item.id,
                label: `${item.firstName} ${item.lastName}`,
                sublabel: item.email,
              })}
            />
          </Field>
        )}
        <Field label="Nombre del negocio">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="N.º empleados">
            <Input
              type="number"
              min={0}
              value={form.employeesCount}
              onChange={(e) => setForm({ ...form, employeesCount: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Descripción">
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Etapa">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              <option value="IDEA">IDEA</option>
              <option value="EARLY">EARLY</option>
              <option value="GROWTH">GROWTH</option>
              <option value="ESTABLISHED">ESTABLISHED</option>
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="CLOSED">CLOSED</option>
            </Select>
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear negocio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
