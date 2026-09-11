'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { admin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(admin ? '/dashboard' : '/login');
  }, [admin, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
    </div>
  );
}
