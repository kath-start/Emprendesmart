'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Lightbulb,
  AlertTriangle,
  Activity,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/entrepreneurs', label: 'Emprendedores', icon: Users },
  { href: '/businesses', label: 'Negocios', icon: Briefcase },
  { href: '/recommendations', label: 'Recomendaciones', icon: Lightbulb },
  { href: '/alerts', label: 'Alertas', icon: AlertTriangle },
  { href: '/usage', label: 'Uso de la plataforma', icon: Activity },
  { href: '/payments', label: 'Pagos', icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isSuperAdmin } = useAuth();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">EmprendeSmart</p>
          <p className="text-xs text-slate-500">Panel Web</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isSuperAdmin && (
          <Link
            href="/admins"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname?.startsWith('/admins') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Administradores
          </Link>
        )}
      </nav>

      <div className="px-5 py-4 text-xs text-slate-400">EmprendeSmart © {new Date().getFullYear()}</div>
    </aside>
  );
}
