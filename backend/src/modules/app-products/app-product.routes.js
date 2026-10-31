import express, { Router } from 'express';

import { validate } from '../../middlewares/validate.js';
import * as controller from './app-product.controller.js';
import {
  listSchema,
  createSchema,
  productIdParam,
  updateSchema,
  listMovementsSchema,
  createMovementSchema,
  uploadImageSchema,
} from './app-product.validation.js';

export const appProductRoutes = Router({ mergeParams: true });

appProductRoutes.get('/', validate(listSchema), controller.list);
appProductRoutes.post('/', validate(createSchema), controller.create);
// Foto del producto: el cuerpo es la imagen binaria (image/jpeg|png|webp), no JSON.
appProductRoutes.post(
  '/images',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }),
  validate(uploadImageSchema),
  controller.uploadImage,
);
appProductRoutes.get('/:productId', validate(productIdParam), controller.getOne);
appProductRoutes.patch('/:productId', validate(updateSchema), controller.update);
appProductRoutes.delete('/:productId', validate(productIdParam), controller.remove);

appProductRoutes.get('/:productId/inventory-movements', validate(listMovementsSchema), controller.listMovements);
appProductRoutes.post('/:productId/inventory-movements', validate(createMovementSchema), controller.createMovement);
