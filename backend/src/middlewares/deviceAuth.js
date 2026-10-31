import { ApiError } from '../utils/apiError.js';
import { isValidDeviceKey } from '../modules/payments/payment.service.js';

/** Celular que lee las notificaciones de Yape: se identifica con el código del panel (header X-Device-Key). */
export const authenticateDevice = async (req, res, next) => {
  try {
    if (!(await isValidDeviceKey(req.headers['x-device-key']))) {
      return next(ApiError.unauthorized('Código de dispositivo inválido'));
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
