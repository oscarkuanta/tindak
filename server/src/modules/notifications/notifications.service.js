import { USER_ROLES } from '@tindak/shared';
import { logger } from '../../lib/logger.js';

export function notifyBoardAdmins(type, payload) {
  logger.info(
    { notification: { type, audience: USER_ROLES.BOARD_ADMIN, ...payload } },
    `Notifikasi ${type} untuk Admin Board`,
  );
}

function notifyBoardOwner(type, board) {
  logger.info(
    { notification: { type, audience: 'BOARD_OWNER', boardId: board.id, ownerId: board.ownerId } },
    `Notifikasi ${type} untuk Penindak Utama`,
  );
}

export async function notifyBoardAdminsNewCandidate(board) {
  notifyBoardAdmins('BOARD_OFFICIAL_CANDIDATE', { boardId: board.id, slug: board.slug });
}

export async function notifyBoardVerified(board) {
  notifyBoardOwner('BOARD_VERIFIED', board);
}

export async function notifyBoardVerificationRevoked(board) {
  notifyBoardOwner('BOARD_VERIFICATION_REVOKED', board);
}
