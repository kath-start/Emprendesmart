# EmprendeSmart · Panel Web — Frontend

Interfaz web del Panel Administrativo de EmprendeSmart. Consume la API en [`../backend`](../backend/README.md).

## Stack

| Área      | Tecnología                     |
| --------- | ------------------------------- |
| Framework | Next.js 14 (App Router)         |
| Lenguaje  | TypeScript                      |
| Estilos   | Tailwind CSS                    |
| Gráficas  | Recharts                        |
| Iconos    | lucide-react                    |

## Puesta en marcha

```bash
npm install
cp .env.local.example .env.local   # ajusta NEXT_PUBLIC_API_URL si el backend no corre en localhost:4000
npm run dev
```

Abre `http://localhost:3000`. Necesitas el backend corriendo (`../backend`, `npm run dev`) y conectado a Supabase.

Inicia sesión con el admin sembrado por el backend (`npm run db:seed` en `../backend`):
`admin@emprendesmart.com` / `Admin123*`.

## Estructura

```
src/
  app/
    login/               # Pantalla de login
    (panel)/             # Rutas protegidas (requieren sesión)
      dashboard/          # Métricas generales
      entrepreneurs/      # Emprendedores (lista, detalle, CRUD)
      businesses/         # Negocios (lista, detalle, métricas)
      recommendations/    # Recomendaciones
      alerts/             # Alertas
      usage/               # Uso de la plataforma
      admins/              # Gestión de administradores (solo SUPER_ADMIN)
  components/
    ui/                    # Componentes base (Button, Input, Table, Modal, ...)
    layout/                # Sidebar, Topbar, PageHeader
    modules/               # Formularios y widgets específicos de cada módulo
  lib/
    api/                   # Funciones que llaman a cada recurso del backend
    api-client.ts          # fetch con auth + refresh automático de token
    auth-context.tsx        # Sesión del administrador (React Context)
    types.ts                # Tipos que reflejan el schema del backend
  hooks/                   # usePaginatedList, useDebounce
```

## Notas

- La sesión (tokens + datos del admin) se guarda en `localStorage`; el cliente API renueva el `accessToken` automáticamente con el `refreshToken` cuando expira.
- Los permisos de UI reflejan las reglas del backend: `ANALYST` solo lee, `ADMIN`/`SUPER_ADMIN` pueden crear y editar, y solo `SUPER_ADMIN` puede eliminar o gestionar administradores.
- En el detalle de cada negocio, el botón **"Analizar con IA"** llama al backend (API de Groq) para generar recomendaciones y alertas automáticamente a partir de sus métricas; requiere que el backend tenga `GROQ_API_KEY` configurada (ver `../backend/README.md`).
- El **botón flotante** visible en todo el panel abre un asistente de chat (`components/ai/AiAssistant.tsx`) que puede consultar (solo lectura) cualquier emprendedor o negocio de la plataforma para responder preguntas.
