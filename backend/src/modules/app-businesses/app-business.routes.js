import express, { Router } from 'express';

import { authenticateEntrepreneur } from '../../middlewares/entrepreneurAuth.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './app-business.controller.js';
import { listSchema, idParam, createSchema, updateSchema } from './app-business.validation.js';
import { appProductRoutes } from '../app-products/app-product.routes.js';
import { appSaleRoutes } from '../app-sales/app-sale.routes.js';
import { appAlertRoutes } from '../app-alerts/app-alert.routes.js';
import { appRecommendationRoutes } from '../app-recommendations/app-recommendation.routes.js';
import { appAiRoutes } from '../app-ai/app-ai.routes.js';
import { appTeamRoutes } from '../app-team/app-team.routes.js';

export const appBusinessRoutes = Router();

appBusinessRoutes.use(authenticateEntrepreneur);

appBusinessRoutes.get('/', validate(listSchema), controller.list);
appBusinessRoutes.post('/', validate(createSchema), controller.create);
appBusinessRoutes.get('/:businessId', validate(idParam), controller.getOne);
appBusinessRoutes.patch('/:businessId', validate(updateSchema), controller.update);
// Logo del negocio: el cuerpo es la imagen binaria (image/jpeg|png|webp), no JSON.
appBusinessRoutes.post(
  '/:businessId/logo',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }),
  validate(idParam),
  controller.uploadLogo,
);
appBusinessRoutes.delete('/:businessId/logo', validate(idParam), controller.removeLogo);

appBusinessRoutes.use('/:businessId/products', appProductRoutes);
appBusinessRoutes.use('/:businessId/sales', appSaleRoutes);
appBusinessRoutes.use('/:businessId/alerts', appAlertRoutes);
appBusinessRoutes.use('/:businessId/recommendations', appRecommendationRoutes);
appBusinessRoutes.use('/:businessId/ai', appAiRoutes);
appBusinessRoutes.use('/:businessId/team', appTeamRoutes);
