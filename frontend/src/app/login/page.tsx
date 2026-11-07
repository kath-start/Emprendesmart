'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Plus_Jakarta_Sans } from 'next/font/google';
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

const REMEMBER_KEY = 'esm_remember_email';

export default function LoginPage() {
  const { admin, isLoading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && admin) router.replace('/dashboard');
  }, [admin, isLoading, router]);

  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) setEmail(saved);
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      if (remember) window.localStorage.setItem(REMEMBER_KEY, email);
      else window.localStorage.removeItem(REMEMBER_KEY);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        jakarta.className,
        'relative min-h-screen overflow-hidden bg-gradient-to-br from-[#eef4ff] via-white to-[#e8f0ff] text-[#0b1f4d]',
      )}
    >
      <BackgroundDecor />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_minmax(0,30rem)_1fr]">
        {/* Ilustración izquierda */}
        <div className="hidden justify-end lg:flex">
          <LaptopRocket />
        </div>

        {/* Columna central */}
        <main className="flex flex-col items-center">
          <Logo />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Emprende<span className="text-brand-600">Smart</span>
          </h1>
          <div className="mt-3 flex items-center gap-4 text-slate-600">
            <span className="h-px w-12 bg-brand-700/60 sm:w-16" />
            <span className="text-base font-medium">Tu negocio, en tus manos</span>
            <span className="h-px w-12 bg-brand-700/60 sm:w-16" />
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-10 w-full rounded-[2rem] border border-white/80 bg-white/80 p-7 shadow-[0_20px_60px_-15px_rgba(27,105,245,0.25)] backdrop-blur-xl sm:p-9"
          >
            <div className="mb-7">
              <h2 className="flex items-center gap-3 text-2xl font-bold">
                <span className="h-7 w-1.5 rounded-full bg-brand-600" />
                Iniciar sesión
              </h2>
              <p className="mt-1 pl-[1.125rem] text-sm text-slate-500">Accede a tu panel administrativo</p>
            </div>

            <div className="space-y-4">
              <PillInput icon={<Mail className="h-5 w-5" />}>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  aria-label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="h-full w-full bg-transparent text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </PillInput>

              <PillInput icon={<LockKeyhole className="h-5 w-5" />}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  aria-label="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="h-full w-full bg-transparent text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="mr-2 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </PillInput>
            </div>

            <div className="mt-5 flex items-center text-sm">
              <label className="flex cursor-pointer select-none items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-5 w-5 cursor-pointer rounded-md border-slate-300 accent-brand-600"
                />
                Recordar sesión
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-7 flex h-14 w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-sky-400 text-base font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:shadow-xl hover:shadow-brand-600/40 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              Iniciar sesión
            </button>
          </form>
        </main>

        {/* Lema derecho */}
        <aside className="hidden lg:flex">
          <div className="border-l border-brand-200 pl-10">
            <p className="text-4xl font-bold leading-tight tracking-tight">Crece. Gestiona.</p>
            <p className="text-4xl font-extrabold italic tracking-tight text-brand-600">Emprende.</p>
            <svg viewBox="0 0 240 24" className="mt-1 w-56 text-brand-700" fill="none" aria-hidden>
              <path d="M4 20C70 6 160 2 236 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PillInput({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-14 items-center overflow-hidden rounded-full border border-brand-100 bg-white/90 shadow-sm transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
      <span className="ml-1.5 mr-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100/80 text-slate-700">
        {icon}
      </span>
      {children}
    </div>
  );
}

function Logo() {
  return (
    <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white p-2.5 shadow-[0_12px_40px_-10px_rgba(27,105,245,0.35)] sm:h-32 sm:w-32">
      <Image src="/logo-icon.png" alt="EmprendeSmart" width={620} height={620} priority className="h-full w-full object-contain" />
    </div>
  );
}

function LaptopRocket() {
  return (
    <svg viewBox="0 0 360 340" className="w-full max-w-[22rem] drop-shadow-[0_25px_35px_rgba(27,105,245,0.25)]" aria-hidden>
      <defs>
        <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1844b6" />
          <stop offset="1" stopColor="#0b2a7a" />
        </linearGradient>
        <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8ecdff" />
          <stop offset="1" stopColor="#328bff" />
        </linearGradient>
        <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Laptop */}
      <g transform="translate(10 120) skewY(8)">
        <rect x="0" y="0" width="230" height="150" rx="14" fill="#cbd5e1" />
        <rect x="9" y="9" width="212" height="132" rx="8" fill="url(#screen)" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={40 + i * 34} y={110 - i * 18} width="22" height={22 + i * 18} rx="3" fill="url(#bar)" />
        ))}
        <path d="M30 105 L80 75 L115 85 L190 30" stroke="#bce0ff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M178 26 L196 26 L194 44" stroke="#bce0ff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d="M0 290 L250 325 L330 300 L95 262 Z" fill="url(#base)" />
      <path d="M95 280 L230 299 L262 290 L130 272 Z" fill="#cbd5e1" />

      {/* Cohete */}
      <g transform="translate(250 30) rotate(30)">
        <path d="M0 110 Q-10 140 0 175 Q10 140 0 110" fill="url(#flame)" />
        <path d="M-22 40 Q0 -30 22 40 L22 100 L-22 100 Z" fill="#f8fafc" />
        <path d="M-22 40 Q0 -30 22 40 Z" fill="#1b69f5" />
        <circle cx="0" cy="62" r="11" fill="#1553e1" stroke="#e2e8f0" strokeWidth="4" />
        <path d="M-22 75 L-40 110 L-22 100 Z M22 75 L40 110 L22 100 Z" fill="#1b69f5" />
        <rect x="-10" y="100" width="20" height="10" rx="3" fill="#94a3b8" />
      </g>

      {/* Tarjeta flotante */}
      <g transform="translate(290 170)">
        <rect width="58" height="58" rx="12" fill="#ffffff" opacity="0.85" />
        <rect x="14" y="30" width="7" height="16" rx="2" fill="#1b69f5" />
        <rect x="26" y="22" width="7" height="24" rx="2" fill="#1b69f5" />
        <rect x="38" y="14" width="7" height="32" rx="2" fill="#1b69f5" />
      </g>
    </svg>
  );
}

function BackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <svg className="absolute -left-10 -top-10 h-[22rem] w-[34rem] opacity-90" viewBox="0 0 540 350">
        <defs>
          <linearGradient id="tl" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1553e1" />
            <stop offset="1" stopColor="#59b0ff" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path d="M0 0 H420 C380 90 300 120 200 150 C110 178 50 230 0 300 Z" fill="url(#tl)" />
        <path d="M0 300 C80 200 200 170 330 120 C400 92 450 50 480 0" stroke="#1b69f5" strokeOpacity="0.35" strokeWidth="2" fill="none" />
      </svg>
      <svg className="absolute -bottom-10 -right-10 h-[20rem] w-[36rem]" viewBox="0 0 560 320">
        <defs>
          <linearGradient id="br" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#1553e1" />
            <stop offset="1" stopColor="#8ecdff" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path d="M560 40 C470 120 400 180 280 230 C190 268 130 290 60 320 H560 Z" fill="url(#br)" />
      </svg>
      <div className="absolute right-[8%] top-[8%] h-20 w-20 rounded-3xl bg-brand-200/30 backdrop-blur" />
      <div className="absolute right-[13%] top-[17%] h-24 w-24 rounded-3xl bg-brand-200/40" />
      <div className="absolute left-[5%] top-[33%] h-20 w-20 rounded-3xl bg-brand-100/60" />
    </div>
  );
}
