# EmprendeSmart · Panel Web — Backend (API)

Backend del **Panel Administrativo de EmprendeSmart**: la plataforma con la que el equipo
gestiona y supervisa a los emprendedores que usan el servicio. Permite administrar
usuarios y negocios, visualizar métricas generales, monitorear el uso de la plataforma,
analizar la información de los emprendimientos y supervisar las recomendaciones y alertas
generadas por el sistema.

Incorpora **Inteligencia Artificial** (vía la API de [Groq](https://console.groq.com)):
a partir de las ventas, métricas e inventario de cada negocio, la IA identifica patrones,
detecta posibles problemas y genera recomendaciones y alertas automáticamente, que el equipo
supervisa y gestiona junto con el resto de recomendaciones/alertas del sistema.

## Stack

| Área            | Tecnología                          |
| --------------- | ----------------------------------- |
| Runtime         | Node.js 18+ (ES Modules)            |
| Framework HTTP  | Express 4                           |
| Base de datos   | PostgreSQL (Supabase)                |
| ORM             | Prisma 5                            |
| Autenticación   | JWT (access + refresh) + bcrypt     |
| Validación      | Zod                                 |
| Seguridad       | Helmet, CORS, rate-limit            |
| IA              | Groq API (Llama 3.3)                |

## Estructura

```
src/
  app.js                 # Configuración de Express (middlewares, rutas)
  server.js              # Arranque del servidor + apagado ordenado
  config/                # env, logger, cliente Prisma
  middlewares/           # auth, validación, manejo de errores
  utils/                 # helpers (jwt, password, http, validación)
  routes/index.js        # Router raíz /api/v1
  modules/
    auth/                # login, refresh, perfil, cambio de contraseña
    admins/              # gestión de usuarios del panel (solo SUPER_ADMIN)
    entrepreneurs/       # emprendedores (clientes del servicio)
    businesses/          # negocios + métricas mensuales
    metrics/             # dashboard: overview, growth, uso, finanzas, señales
    usage/               # eventos de uso de la plataforma
    recommendations/     # recomendaciones generadas por el sistema
    alerts/              # alertas de monitoreo
    ai/                  # análisis con IA (Groq) por negocio
prisma/
  schema.prisma          # Modelo de datos
  seed.js                # Datos de ejemplo
```

## Puesta en marcha

### 1. Requisitos

- Node.js 18 o superior
- Un proyecto de [Supabase](https://supabase.com) (plan gratuito es suficiente) o, alternativamente, Docker/PostgreSQL propio para desarrollo local.

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear el proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com/dashboard).
2. Ve a **Project Settings → Database → Connection string** y copia:
   - **Connection pooling** (puerto `6543`, `pgbouncer=true`) → variable `DATABASE_URL`.
   - **Direct connection** (puerto `5432`) → variable `DIRECT_URL` (la usan `prisma migrate` y `prisma studio`).
3. (Opcional) Si más adelante usas Storage/Auth/Realtime del SDK de Supabase, toma `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` desde **Project Settings → API**.

### 4. Variables de entorno

```bash
cp .env.example .env
```

Ajusta `DATABASE_URL`, `DIRECT_URL` (con los datos de tu proyecto Supabase) y los secretos `JWT_*`.

> **Alternativa local sin Supabase:** puedes levantar un PostgreSQL local con `docker compose up -d`
> (ver `docker-compose.yml`) y apuntar `DATABASE_URL`/`DIRECT_URL` a `postgresql://emprende:emprende@localhost:5432/emprendesmart?schema=public`.

### 5. Migraciones + cliente Prisma

```bash
npm run prisma:migrate      # crea las tablas (modo desarrollo)
npm run prisma:generate     # genera el cliente (lo hace también migrate)
```

### 6. Datos de ejemplo (opcional)

```bash
npm run db:seed
```

Crea el super administrador definido en `.env`
(`admin@emprendesmart.com` / `Admin123*` por defecto) y datos de demostración.

### 7. Inteligencia Artificial (opcional, requerida para `/api/v1/ai`)

1. Crea una cuenta en [console.groq.com](https://console.groq.com) y genera una API key en **API Keys**.
2. Copia esa key a `GROQ_API_KEY` en `.env`.
3. (Opcional) Cambia `GROQ_MODEL` si prefieres otro modelo disponible en Groq.

Si no configuras `GROQ_API_KEY`, el resto del panel funciona con normalidad; solo el análisis
con IA devolverá un error 502 indicando que falta la API key.

### 8. Arrancar

```bash
npm run dev     # desarrollo con recarga (nodemon)
npm start       # producción
```

API disponible en `http://localhost:4000/api/v1`. Healthcheck en `http://localhost:4000/health`.

## Autenticación

1. `POST /api/v1/auth/login` con `{ email, password }` → devuelve `accessToken` y `refreshToken`.
2. Enviar `Authorization: Bearer <accessToken>` en el resto de peticiones.
3. `POST /api/v1/auth/refresh` con `{ refreshToken }` para renovar el access token.

### Roles

| Rol           | Permisos                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `SUPER_ADMIN` | Todo, incluida la gestión de administradores y los borrados            |
| `ADMIN`       | Gestión de emprendedores, negocios, recomendaciones y alertas          |
| `ANALYST`     | Solo lectura (consultas y métricas)                                    |

## Endpoints principales

### Auth — `/api/v1/auth`
| Método | Ruta               | Descripción                        |
| ------ | ------------------ | ---------------------------------- |
| POST   | `/login`           | Inicia sesión                     |
| POST   | `/refresh`         | Renueva el access token           |
| POST   | `/logout`          | Cierra sesión (cliente descarta)  |
| GET    | `/me`              | Perfil del administrador actual   |
| POST   | `/change-password` | Cambia la contraseña propia       |

### Administradores — `/api/v1/admins` *(solo SUPER_ADMIN)*
`GET /` · `POST /` · `GET /:id` · `PATCH /:id` · `DELETE /:id`

### Emprendedores — `/api/v1/entrepreneurs`
`GET /` (filtros: `search`, `status`, `plan`, `country`, `registeredFrom`, `registeredTo`, paginación) ·
`GET /:id` · `GET /:id/usage` · `POST /` · `PATCH /:id` · `PATCH /:id/status` · `DELETE /:id`

### Negocios — `/api/v1/businesses`
`GET /` (filtros: `search`, `category`, `status`, `stage`, `entrepreneurId`) ·
`GET /:id` · `GET /:id/metrics?from=&to=` · `POST /` · `PATCH /:id` ·
`PUT /:id/metrics` (registra/actualiza la métrica de un mes) · `DELETE /:id`

### Métricas / Dashboard — `/api/v1/metrics`
| Ruta                          | Descripción                                             |
| ----------------------------- | ------------------------------------------------------ |
| `GET /overview`               | Totales de emprendedores, negocios, alertas, finanzas |
| `GET /growth?months=12`       | Altas de emprendedores por mes                        |
| `GET /usage?months=12`        | Uso de la plataforma por mes y por tipo               |
| `GET /businesses-by-category` | Distribución de negocios por categoría                |
| `GET /finance?months=12`      | Evolución de ingresos/gastos/utilidad agregados       |
| `GET /signals`                | Estado de recomendaciones y alertas del sistema       |
| `GET /top-active-entrepreneurs`| Emprendedores con más actividad                      |

### Uso de la plataforma — `/api/v1/usage`
`GET /` (filtros: `entrepreneurId`, `type`, `from`, `to`) · `GET /summary?days=30` · `POST /`

### Recomendaciones — `/api/v1/recommendations`
`GET /` (filtros: `businessId`, `status`, `priority`, `source`, `search`) ·
`GET /:id` · `POST /` · `PATCH /:id/status` · `DELETE /:id`

### Alertas — `/api/v1/alerts`
`GET /` (filtros: `businessId`, `status`, `severity`, `type`, `from`, `to`) ·
`GET /:id` · `POST /` · `PATCH /:id/status` (con `resolutionNote` opcional) · `DELETE /:id`

### Inteligencia Artificial — `/api/v1/ai`
| Método | Ruta                              | Permisos              | Descripción                                                                 |
| ------ | --------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| POST   | `/businesses/:id/analyze`         | SUPER_ADMIN, ADMIN     | Analiza el negocio con IA (Groq) y crea recomendaciones (`source: AI`) y alertas según corresponda. Devuelve `{ summary, recommendations, alerts }`. |
| POST   | `/chat`                           | Cualquier admin        | Asistente conversacional: `{ message, history? }` → `{ reply }`. La IA puede consultar (solo lectura) emprendedores, negocios, alertas, recomendaciones y métricas para responder con datos reales; nunca crea ni modifica nada. |

## Formato de respuesta

```jsonc
// Éxito
{ "success": true, "data": { /* ... */ }, "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 } }

// Error
{ "success": false, "message": "Datos de entrada inválidos", "details": [ { "path": "email", "message": "Email inválido" } ] }
```

## Scripts npm

| Script                | Acción                                        |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | Servidor con recarga automática               |
| `npm start`           | Servidor en modo producción                   |
| `npm run prisma:migrate` | Aplica migraciones (desarrollo)            |
| `npm run prisma:deploy`  | Aplica migraciones (producción)            |
| `npm run prisma:studio`  | Explorador visual de la base de datos      |
| `npm run db:seed`     | Carga datos de ejemplo                         |
| `npm run db:reset`    | Reinicia la base de datos y vuelve a sembrar  |
