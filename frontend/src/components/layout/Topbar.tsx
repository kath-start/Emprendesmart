'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { initials } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export function Topbar() {
  const { admin, logout } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-4">
        {admin && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initials(admin.name)}
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{admin.name}</p>
              <Badge tone="violet" className="mt-0.5">
                {admin.role}
              </Badge>
            </div>
          </div>
        )}
        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
