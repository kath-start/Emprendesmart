import { Router } from 'express';

import { validate } from '../../middlewares/validate.js';
import * as controller from './app-team.controller.js';
import { listSchema, addSchema, updateSchema, memberParam } from './app-team.validation.js';

/** /api/v1/app/businesses/:businessId/team — equipo del negocio (solo el dueño, plan Pro). */
export const appTeamRoutes = Router({ mergeParams: true });

appTeamRoutes.get('/', validate(listSchema), controller.list);
appTeamRoutes.post('/', validate(addSchema), controller.add);
appTeamRoutes.patch('/:memberId', validate(updateSchema), controller.updateRole);
appTeamRoutes.delete('/:memberId', validate(memberParam), controller.remove);
