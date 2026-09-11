import { Router } from 'express';

import { authRoutes } from '../modules/auth/auth.routes.js';
import { adminRoutes } from '../modules/admins/admin.routes.js';
import { entrepreneurRoutes } from '../modules/entrepreneurs/entrepreneur.routes.js';
import { businessRoutes } from '../modules/businesses/business.routes.js';
import { metricRoutes } from '../modules/metrics/metric.routes.js';
import { usageRoutes } from '../modules/usage/usage.routes.js';
import { recommendationRoutes } from '../modules/recommendations/recommendation.routes.js';
import { alertRoutes } from '../modules/alerts/alert.routes.js';
import { aiRoutes } from '../modules/ai/ai.routes.js';

export const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'EmprendeSmart Panel API',
    version: '1.0.0',
    resources: [
      '/api/v1/auth',
      '/api/v1/admins',
      '/api/v1/entrepreneurs',
      '/api/v1/businesses',
      '/api/v1/metrics',
      '/api/v1/usage',
      '/api/v1/recommendations',
      '/api/v1/alerts',
      '/api/v1/ai',
    ],
  });
});

router.use('/auth', authRoutes);
router.use('/admins', adminRoutes);
router.use('/entrepreneurs', entrepreneurRoutes);
router.use('/businesses', businessRoutes);
router.use('/metrics', metricRoutes);
router.use('/usage', usageRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/alerts', alertRoutes);
router.use('/ai', aiRoutes);
