import { Router } from 'express';

import { validate } from '../../middlewares/validate.js';
import * as controller from './app-alert.controller.js';
import { listSchema } from './app-alert.validation.js';

export const appAlertRoutes = Router({ mergeParams: true });

appAlertRoutes.get('/', validate(listSchema), controller.list);
