# Emprende Smart — Web

Monorepo del ecosistema web de **EmprendeSmart**.

```
backend/     # API REST (Node.js + Express + Prisma + PostgreSQL en Supabase)
frontend/    # Panel administrativo web (Next.js + Tailwind)
```

## Backend

El backend del **Panel Administrativo de EmprendeSmart** vive en [`backend/`](backend/README.md).
Es la API que permite al equipo de EmprendeSmart gestionar y supervisar a los emprendedores
que usan el servicio: administrar usuarios y negocios, visualizar métricas generales, monitorear
el uso de la plataforma, analizar la información de los emprendimientos y supervisar las
recomendaciones y alertas generadas por el sistema.

Incorpora **Inteligencia Artificial** (API de Groq) para analizar ventas, inventario y comportamiento
de cada emprendimiento, identificar patrones y problemas, y generar recomendaciones y alertas
automáticamente — supervisadas por el equipo desde el mismo panel.

Ver [`backend/README.md`](backend/README.md) para stack, estructura, puesta en marcha
(incluida la conexión con Supabase y la configuración de la IA) y documentación de la API.

## Frontend

El panel web vive en [`frontend/`](frontend/README.md): Next.js 14 + TypeScript + Tailwind CSS,
con login, dashboard de métricas y CRUD completo para emprendedores, negocios, recomendaciones,
alertas, uso de la plataforma y administradores.

Ver [`frontend/README.md`](frontend/README.md) para puesta en marcha.
