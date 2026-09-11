import { cn } from '@/lib/utils';

type Tone = 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'violet';

const toneClasses: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-700',
  violet: 'bg-violet-100 text-violet-700',
};

export function Badge({ tone = 'slate', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', toneClasses[tone], className)}>
      {children}
    </span>
  );
}

const statusTones: Record<string, Tone> = {
  ACTIVE: 'green',
  INACTIVE: 'slate',
  SUSPENDED: 'red',
  CLOSED: 'slate',
  OPEN: 'red',
  ACKNOWLEDGED: 'amber',
  RESOLVED: 'green',
  PENDING: 'amber',
  SENT: 'blue',
  ACCEPTED: 'green',
  DISMISSED: 'slate',
  CRITICAL: 'red',
  WARNING: 'amber',
  INFO: 'blue',
  LOW: 'slate',
  MEDIUM: 'amber',
  HIGH: 'red',
  SUPER_ADMIN: 'violet',
  ADMIN: 'blue',
  ANALYST: 'slate',
  FREE: 'slate',
  PRO: 'blue',
  BUSINESS: 'violet',
  IDEA: 'slate',
  EARLY: 'blue',
  GROWTH: 'amber',
  ESTABLISHED: 'green',
  AI: 'violet',
  SYSTEM: 'blue',
};

export function StatusBadge({ value }: { value: string }) {
  return <Badge tone={statusTones[value] ?? 'slate'}>{value}</Badge>;
}
