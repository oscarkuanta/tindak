import {
  BOARD_CREATION_LIMIT,
  BOARD_MAX_HANDLERS,
  ERROR_CODES,
  NOTIFICATION_TYPES,
} from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { recordAudit } from '../../lib/audit.js';
import { AppError } from '../../utils/AppError.js';
import { decorateCards, getBoardDetail, recordHandlerActivity } from '../boards/boards.service.js';
import { notifyBoardAdmins } from '../notifications/notifications.service.js';

const MEMBER_USER_SELECT = { id: true, name: true, email: true, avatarUrl: true };

function toBoardMember(member) {
  return {
    userId: member.userId,
    role: member.role,
    status: member.status,
    createdAt: member.createdAt,
    user: member.user,
  };
}

function invitationNotFound() {
  return new AppError(404, ERROR_CODES.INVITATION_NOT_FOUND, 'Undangan tidak ditemukan');
}

function handlerNotFound() {
  return new AppError(404, ERROR_CODES.HANDLER_NOT_FOUND, 'Penindak tidak ditemukan di Board ini');
}

export async function listHandlers(board) {
  const members = await prisma.boardMember.findMany({
    where: { boardId: board.id, role: 'HANDLER' },
    include: { user: { select: MEMBER_USER_SELECT } },
    orderBy: [{ status: 'desc' }, { createdAt: 'asc' }],
  });
  return members.map(toBoardMember);
}

export async function inviteHandler(board, owner, { email }) {
  const invitee = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!invitee) {
    throw new AppError(404, ERROR_CODES.USER_NOT_FOUND, 'Belum ada akun dengan email ini', [
      { field: 'email', message: 'Minta orang tersebut mendaftar terlebih dahulu' },
    ]);
  }

  const member = await prisma.$transaction(async (tx) => {
    const existing = await tx.boardMember.findUnique({
      where: { boardId_userId: { boardId: board.id, userId: invitee.id } },
    });
    if (existing) {
      throw new AppError(
        409,
        ERROR_CODES.HANDLER_ALREADY_MEMBER,
        existing.status === 'INVITED'
          ? 'Pengguna ini sudah diundang dan belum menjawab'
          : 'Pengguna ini sudah menjadi anggota Board',
      );
    }
    const handlerCount = await tx.boardMember.count({
      where: { boardId: board.id, role: 'HANDLER' },
    });
    if (handlerCount >= BOARD_MAX_HANDLERS) {
      throw new AppError(
        409,
        ERROR_CODES.HANDLER_LIMIT_REACHED,
        `Board sudah memiliki ${BOARD_MAX_HANDLERS} Penindak, termasuk undangan yang belum dijawab`,
      );
    }
    return tx.boardMember.create({
      data: {
        boardId: board.id,
        userId: invitee.id,
        role: 'HANDLER',
        status: 'INVITED',
        invitedById: owner.id,
      },
      include: { user: { select: MEMBER_USER_SELECT } },
    });
  });

  recordAudit('BOARD_HANDLER_INVITED', {
    boardId: board.id,
    actorId: owner.id,
    targetUserId: invitee.id,
  });
  return toBoardMember(member);
}

export async function removeHandler(board, owner, userId) {
  if (userId === owner.id) {
    throw new AppError(
      403,
      ERROR_CODES.CANNOT_REMOVE_OWNER,
      'Penindak Utama tidak bisa mencabut dirinya sendiri. Alihkan kepemilikan terlebih dahulu.',
    );
  }
  const member = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: board.id, userId } },
  });
  if (!member) throw handlerNotFound();
  if (member.role === 'OWNER') {
    throw new AppError(403, ERROR_CODES.CANNOT_REMOVE_OWNER, 'Penindak Utama tidak bisa dicabut');
  }

  await prisma.boardMember.delete({ where: { id: member.id } });
  recordAudit(
    member.status === 'INVITED' ? 'BOARD_INVITATION_CANCELLED' : 'BOARD_HANDLER_REMOVED',
    { boardId: board.id, actorId: owner.id, targetUserId: userId },
  );
}

export async function listInvitations(user) {
  const invitations = await prisma.boardMember.findMany({
    where: { userId: user.id, status: 'INVITED', board: { status: { not: 'FROZEN' } } },
    include: { board: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  const cards = await decorateCards(
    invitations.map((invitation) => invitation.board),
    user,
  );
  return invitations.map((invitation, index) => ({
    id: invitation.id,
    board: cards[index],
    createdAt: invitation.createdAt,
  }));
}

async function findPendingInvitation(tx, user, invitationId) {
  const invitation = await tx.boardMember.findUnique({
    where: { id: invitationId },
    include: { board: { select: { status: true } } },
  });
  if (!invitation || invitation.userId !== user.id || invitation.board.status === 'FROZEN') {
    throw invitationNotFound();
  }
  if (invitation.status !== 'INVITED') {
    throw new AppError(
      409,
      ERROR_CODES.INVITATION_NOT_PENDING,
      'Undangan ini sudah dijawab sebelumnya',
    );
  }
  return invitation;
}

export async function acceptInvitation(user, invitationId) {
  const member = await prisma.$transaction(async (tx) => {
    const invitation = await findPendingInvitation(tx, user, invitationId);
    await tx.boardFollower.deleteMany({ where: { boardId: invitation.boardId, userId: user.id } });
    return tx.boardMember.update({
      where: { id: invitation.id },
      data: { status: 'ACTIVE' },
      include: { user: { select: MEMBER_USER_SELECT } },
    });
  });
  recordAudit('BOARD_INVITATION_ACCEPTED', { boardId: member.boardId, actorId: user.id });
  return toBoardMember(member);
}

export async function declineInvitation(user, invitationId) {
  const invitation = await prisma.$transaction(async (tx) => {
    const pending = await findPendingInvitation(tx, user, invitationId);
    await tx.boardMember.delete({ where: { id: pending.id } });
    return pending;
  });
  recordAudit('BOARD_INVITATION_DECLINED', { boardId: invitation.boardId, actorId: user.id });
}

export async function transferOwnership(board, owner, { userId }) {
  await prisma.$transaction(async (tx) => {
    const target = await tx.boardMember.findUnique({
      where: { boardId_userId: { boardId: board.id, userId } },
    });
    if (!target || target.role !== 'HANDLER' || target.status !== 'ACTIVE') {
      throw handlerNotFound();
    }
    const ownedByTarget = await tx.board.count({ where: { ownerId: userId } });
    if (ownedByTarget >= BOARD_CREATION_LIMIT) {
      throw new AppError(
        409,
        ERROR_CODES.BOARD_LIMIT_REACHED,
        `Penindak tujuan sudah memiliki ${BOARD_CREATION_LIMIT} Board`,
      );
    }
    await tx.boardMember.update({
      where: { boardId_userId: { boardId: board.id, userId: owner.id } },
      data: { role: 'HANDLER' },
    });
    await tx.boardMember.update({ where: { id: target.id }, data: { role: 'OWNER' } });
    await tx.board.update({ where: { id: board.id }, data: { ownerId: userId } });
    await recordHandlerActivity(tx, board.id);
  });

  const event = {
    boardId: board.id,
    slug: board.slug,
    verification: board.verification,
    previousOwnerId: owner.id,
    newOwnerId: userId,
  };
  recordAudit('BOARD_OWNER_CHANGED', { ...event, actorId: owner.id });
  notifyBoardAdmins(NOTIFICATION_TYPES.BOARD_OWNER_CHANGED, event);

  return getBoardDetail(board.slug, owner);
}
