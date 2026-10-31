import { Router } from 'express';

import { appAuthRoutes } from '../modules/app-auth/app-auth.routes.js';
import { appBusinessRoutes } from '../modules/app-businesses/app-business.routes.js';
import { appPaymentRoutes } from '../modules/payments/payment.routes.js';

export const appRoutes = Router();

appRoutes.use('/auth', appAuthRoutes);
appRoutes.use('/businesses', appBusinessRoutes);
appRoutes.use('/payments', appPaymentRoutes);
