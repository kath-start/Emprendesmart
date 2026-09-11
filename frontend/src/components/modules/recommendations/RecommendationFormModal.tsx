'use client';

import { FormEvent, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchPicker, type PickerValue } from '@/components/ui/SearchPicker';
import { pushToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import * as recommendationsApi from '@/lib/api/recommendations';
import * as businessesApi from '@/lib/api/businesses';
import type { RecommendationPriority, RecommendationSource } from '@/lib/types';

export function RecommendationFormModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [business, setBusiness] = useState<PickerValue | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', priority: 'MEDIUM', source: 'ADMIN' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!business) {
      pushToast('Selecciona un negocio', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await recommendationsApi.createRecommendation({
        businessId: business.id,
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority as RecommendationPriority,
        source: form.source as RecommendationSource,
      });
      pushToast('Recomendación creada');
      onSaved();
      onClose();
      setBusiness(null);
      setForm({ title: '', description: '', category: '', priority: 'MEDIUM', source: 'ADMIN' });
    } catch (error) {
      pushToast(error instanceof ApiError ? error.message : 'No se pudo crear', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva recomendación">
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
        <Field label="Título">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Descripción">
          <Textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Categoría">
            <Input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Prioridad">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </Select>
          </Field>
          <Field label="Origen">
            <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option value="ADMIN">ADMIN</option>
              <option value="SYSTEM">SYSTEM</option>
              <option value="AI">AI</option>
            </Select>
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Crear recomendación
          </Button>
        </div>
      </form>
    </Modal>
  );
}
