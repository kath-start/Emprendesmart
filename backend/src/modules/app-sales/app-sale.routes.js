import { Router } from 'express';

import { validate } from '../../middlewares/validate.js';
import * as controller from './app-sale.controller.js';
import { listSchema, saleIdParam, createSchema } from './app-sale.validation.js';

export const appSaleRoutes = Router({ mergeParams: true });

appSaleRoutes.get('/', validate(listSchema), controller.list);
appSaleRoutes.post('/', validate(createSchema), controller.create);
appSaleRoutes.get('/summary', controller.summary);
appSaleRoutes.get('/insights', controller.insights);
appSaleRoutes.get('/:saleId', validate(saleIdParam), controller.getOne);
