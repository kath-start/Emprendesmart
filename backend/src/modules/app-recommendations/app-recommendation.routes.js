import { Router } from 'express';

import { validate } from '../../middlewares/validate.js';
import * as controller from './app-recommendation.controller.js';
import { listSchema, generateSchema } from './app-recommendation.validation.js';

export const appRecommendationRoutes = Router({ mergeParams: true });

appRecommendationRoutes.get('/', validate(listSchema), controller.list);
appRecommendationRoutes.post('/generate', validate(generateSchema), controller.generate);
