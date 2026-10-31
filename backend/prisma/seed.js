import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

const CATEGORIES = ['Gastronomía', 'Moda', 'Tecnología', 'Servicios', 'Agroindustria', 'Educación', 'Salud', 'Turismo'];
const CITIES = [
  ['Perú', 'Lima'],
  ['Perú', 'Arequipa'],
  ['Colombia', 'Bogotá'],
  ['México', 'Guadalajara'],
  ['Chile', 'Santiago'],
  ['Argentina', 'Córdoba'],
];
const FIRST_NAMES = ['Ana', 'Luis', 'María', 'Carlos', 'Sofía', 'Jorge', 'Lucía', 'Diego', 'Valeria', 'Andrés', 'Camila', 'Mateo'];
const LAST_NAMES = ['García', 'Rodríguez', 'Martínez', 'López', 'Gómez', 'Torres', 'Ramírez', 'Flores', 'Díaz', 'Vargas'];

function monthStart(offset) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
}

async function main() {
  console.log('Limpiando datos previos...');
  await prisma.$transaction([
    prisma.usageEvent.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.product.deleteMany(),
    prisma.alert.deleteMany(),
    prisma.recommendation.deleteMany(),
    prisma.businessMetric.deleteMany(),
    prisma.business.deleteMany(),
    prisma.entrepreneur.deleteMany(),
    prisma.admin.deleteMany(),
  ]);

  // ---- Administradores del panel ----
  const superPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*';
  const superEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@emprendesmart.com').toLowerCase();

  await prisma.admin.createMany({
    data: [
      {
        name: process.env.SEED_ADMIN_NAME ?? 'Administrador General',
        email: superEmail,
        passwordHash: await bcrypt.hash(superPassword, rounds),
        role: 'SUPER_ADMIN',
      },
      {
        name: 'Gestor de Cuentas',
        email: 'gestor@emprendesmart.com',
        passwordHash: await bcrypt.hash('Gestor123*', rounds),
        role: 'ADMIN',
      },
      {
        name: 'Analista de Datos',
        email: 'analista@emprendesmart.com',
        passwordHash: await bcrypt.hash('Analista123*', rounds),
        role: 'ANALYST',
      },
    ],
  });
  const admins = await prisma.admin.findMany();
  console.log(`Administradores creados: ${admins.length}`);

  // ---- Emprendedores + negocios ----
  const totalEntrepreneurs = 24;
  const appPassword = process.env.SEED_APP_ENTREPRENEUR_PASSWORD ?? 'Entrepreneur123*';
  const appPasswordHash = await bcrypt.hash(appPassword, rounds);

  for (let i = 0; i < totalEntrepreneurs; i += 1) {
    const [country, city] = pick(CITIES);
    const firstName = pick(FIRST_NAMES);
    const lastName = `${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`;
    const registeredAt = monthStart(rand(0, 11));
    // Los dos primeros ya tienen cuenta en la app móvil (contraseña conocida para pruebas).
    const hasAppAccount = i < 2;

    const entrepreneur = await prisma.entrepreneur.create({
      data: {
        firstName,
        lastName,
        email: `emprendedor${i + 1}@example.com`,
        passwordHash: hasAppAccount ? appPasswordHash : null,
        phone: `+51 9${rand(10000000, 99999999)}`,
        country,
        city,
        plan: pick(['FREE', 'FREE', 'EMPRENDE', 'CRECIMIENTO', 'PRO']),
        status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE', 'SUSPENDED']),
        registeredAt,
      },
    });

    const businessCount = rand(1, 2);
    for (let b = 0; b < businessCount; b += 1) {
      const business = await prisma.business.create({
        data: {
          entrepreneurId: entrepreneur.id,
          name: `${pick(['Emprende', 'Nova', 'Andina', 'Global', 'Eco', 'Prime'])} ${pick(CATEGORIES)}`,
          category: pick(CATEGORIES),
          description: 'Emprendimiento registrado en la plataforma EmprendeSmart.',
          stage: pick(['IDEA', 'EARLY', 'GROWTH', 'ESTABLISHED']),
          status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']),
          employeesCount: rand(1, 25),
          foundedAt: monthStart(rand(6, 36)),
        },
      });

      // Catálogo de productos + una venta de ejemplo para el primer negocio de cada
      // cuenta con acceso a la app móvil, así hay datos reales al iniciar sesión.
      if (hasAppAccount && b === 0) {
        const products = await Promise.all(
          [
            { name: 'Producto A', price: 25, cost: 15, stock: 40, lowStockThreshold: 10 },
            { name: 'Producto B', price: 60, cost: 35, stock: 8, lowStockThreshold: 10 },
            { name: 'Producto C', price: 12, cost: 6, stock: 100, lowStockThreshold: 20 },
          ].map((product) =>
            prisma.product.create({
              data: { ...product, businessId: business.id, category: business.category, unit: 'unidad' },
            }),
          ),
        );

        for (const product of products) {
          await prisma.inventoryMovement.create({
            data: { productId: product.id, type: 'RESTOCK', quantity: product.stock, note: 'Carga inicial de inventario' },
          });
        }

        const firstProduct = products[0];
        const quantitySold = 3;
        const unitPrice = firstProduct.price;
        const subtotal = Number(unitPrice) * quantitySold;
        await prisma.$transaction([
          prisma.sale.create({
            data: {
              businessId: business.id,
              total: subtotal,
              items: { create: [{ productId: firstProduct.id, quantity: quantitySold, unitPrice, subtotal }] },
            },
          }),
          prisma.product.update({
            where: { id: firstProduct.id },
            data: { stock: firstProduct.stock - quantitySold },
          }),
          prisma.inventoryMovement.create({
            data: { productId: firstProduct.id, type: 'SALE', quantity: quantitySold, note: 'Venta de ejemplo' },
          }),
        ]);
      }

      // Métricas de los últimos 6 meses
      for (let m = 5; m >= 0; m -= 1) {
        const revenue = rand(500, 20000);
        const expenses = rand(300, Math.max(400, revenue - 100));
        await prisma.businessMetric.create({
          data: {
            businessId: business.id,
            period: monthStart(m),
            revenue,
            expenses,
            profit: revenue - expenses,
            customersCount: rand(5, 400),
            salesCount: rand(10, 800),
          },
        });
      }

      // Recomendaciones
      const recCount = rand(0, 3);
      for (let r = 0; r < recCount; r += 1) {
        await prisma.recommendation.create({
          data: {
            businessId: business.id,
            title: pick([
              'Optimiza tu control de gastos',
              'Aumenta la recurrencia de clientes',
              'Diversifica tus canales de venta',
              'Revisa tu política de precios',
              'Formaliza tu contabilidad mensual',
            ]),
            description: 'Recomendación generada automáticamente a partir del análisis de las métricas del negocio.',
            category: pick(['Finanzas', 'Marketing', 'Operaciones', 'Ventas']),
            priority: pick(['LOW', 'MEDIUM', 'HIGH']),
            status: pick(['PENDING', 'PENDING', 'SENT', 'ACCEPTED', 'DISMISSED']),
            source: pick(['SYSTEM', 'AI']),
          },
        });
      }

      // Alertas
      const alertCount = rand(0, 2);
      for (let a = 0; a < alertCount; a += 1) {
        await prisma.alert.create({
          data: {
            businessId: business.id,
            type: pick(['CAIDA_INGRESOS', 'GASTOS_ELEVADOS', 'INACTIVIDAD', 'META_ALCANZADA', 'FLUJO_CAJA']),
            severity: pick(['INFO', 'WARNING', 'WARNING', 'CRITICAL']),
            message: 'Alerta generada por el sistema de monitoreo de EmprendeSmart.',
            status: pick(['OPEN', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED']),
          },
        });
      }
    }

    // Eventos de uso
    const eventCount = rand(3, 30);
    for (let e = 0; e < eventCount; e += 1) {
      const daysBack = rand(0, 60);
      const occurredAt = new Date();
      occurredAt.setUTCDate(occurredAt.getUTCDate() - daysBack);
      await prisma.usageEvent.create({
        data: {
          entrepreneurId: entrepreneur.id,
          type: pick(['LOGIN', 'LOGIN', 'REPORT_VIEW', 'RECOMMENDATION_VIEW', 'METRIC_UPDATE', 'ALERT_VIEW', 'FEATURE_USE']),
          occurredAt,
          metadata: { source: pick(['web', 'mobile']) },
        },
      });
    }
  }

  const counts = {
    admins: await prisma.admin.count(),
    entrepreneurs: await prisma.entrepreneur.count(),
    businesses: await prisma.business.count(),
    metrics: await prisma.businessMetric.count(),
    recommendations: await prisma.recommendation.count(),
    alerts: await prisma.alert.count(),
    usageEvents: await prisma.usageEvent.count(),
    products: await prisma.product.count(),
    sales: await prisma.sale.count(),
    inventoryMovements: await prisma.inventoryMovement.count(),
  };

  console.log('Seed completado:', counts);
  console.log(`\nAcceso al panel -> ${superEmail} / ${superPassword}`);
  console.log(`Acceso a la app (emprendedor1@example.com / emprendedor2@example.com) -> ${appPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
