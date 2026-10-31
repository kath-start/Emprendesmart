import { Router } from 'express';

import { validate } from '../../middlewares/validate.js';
import * as controller from './app-ai.controller.js';
import { chatSchema } from './app-ai.validation.js';

export const appAiRoutes = Router({ mergeParams: true });

appAiRoutes.get('/usage', controller.usage);
appAiRoutes.post('/chat', validate(chatSchema), controller.chat);
