import { USER_ROLES } from '@tindak/shared';
import { logger } from '../../lib/logger.js';

export function notifyBoardAdmins(type, payload) {
  logger.info(
    { notification: { type, audience: USER_ROLES.BOARD_ADMIN, ...payload } },
    `Notifikasi ${type} untuk Admin Board`,
  );
}
