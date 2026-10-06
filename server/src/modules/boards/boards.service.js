import {
  BOARD_CREATION_LIMIT,
  BOARD_DEFAULT_CATEGORIES,
  BOARD_MAX_CATEGORIES,
  BOARD_PROTECTED_CATEGORY,
  BOARD_SIMILAR_LIMIT,
  CITIES,
  CITY_SEARCH_LIMIT,
  ERROR_CODES,
  REPORT_ACTIVE_STATUSES,
  USER_ROLES,
} from '@tindak/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { boardBaseSlug, nextAvailableSlug } from '../../utils/slugify.js';
import { compareSearchResults, rankSimilarBoards, similarTokens } from './boards.ranking.js';
import { toBoardCard, toBoardDetail, toCategory, toViewer } from './boards.presenter.js';

const SLUG_RETRIES = 3;
const SIMILAR_CANDIDATES = 50;
const CATEGORY_ORDER = [{ sortOrder: 'asc' }, { id: 'asc' }];
const STAFF_ROLES = new Set([USER_ROLES.ADMIN, USER_ROLES.BOARD_ADMIN]);
const ACTIVE_REPORT_WHERE = { isHidden: false, status: { in: [...REPORT_ACTIVE_STATUSES] } };

function boardNotFound() {
  return new AppError(404, ERROR_CODES.BOARD_NOT_FOUND, 'Board tidak ditemukan');
}

function categoryNotFound() {
  return new AppError(404, ERROR_CODES.CATEGORY_NOT_FOUND, 'Kategori tidak ditemukan');
}

function categoryExists() {
  return new AppError(
    409,
    ERROR_CODES.CATEGORY_EXISTS,
    'Nama kategori sudah dipakai di Board ini',
    [{ field: 'name', message: 'Nama kategori sudah dipakai' }],
  );
}

function categoryProtected() {
  return new AppError(
    409,
    ERROR_CODES.CATEGORY_PROTECTED,
    `Kategori "${BOARD_PROTECTED_CATEGORY}" tidak bisa diubah atau dihapus`,
  );
}

function isProtectedCategory(category) {
  return category.isDefault && category.name === BOARD_PROTECTED_CATEGORY;
}

export function canSeeFrozenBoards(user) {
  return Boolean(user && STAFF_ROLES.has(user.role));
}

export async function getBoardMembership(boardId, userId) {
  if (!userId) return null;
  return prisma.boardMember.findFirst({
    where: { boardId, userId, status: 'ACTIVE' },
  });
}

export async function decorateCards(boards, user) {
  if (boards.length === 0) return [];
  const ids = boards.map((board) => board.id);
  const [counts, reportCounts, follows, memberships] = await Promise.all([
    prisma.boardFollower.groupBy({
      by: ['boardId'],
      where: { boardId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.report.groupBy({
      by: ['boardId'],
      where: { boardId: { in: ids }, ...ACTIVE_REPORT_WHERE },
      _count: { _all: true },
    }),
    user ? prisma.boardFollower.findMany({ where: { userId: user.id, boardId: { in: ids } } }) : [],
    user
      ? prisma.boardMember.findMany({
          where: { userId: user.id, status: 'ACTIVE', boardId: { in: ids } },
        })
      : [],
  ]);
  const countByBoard = new Map(counts.map((row) => [row.boardId, row._count._all]));
  const reportsByBoard = new Map(reportCounts.map((row) => [row.boardId, row._count._all]));
  const followByBoard = new Map(follows.map((follow) => [follow.boardId, follow]));
  const memberByBoard = new Map(memberships.map((member) => [member.boardId, member]));

  return boards.map((board) =>
    toBoardCard(board, {
      followerCount: countByBoard.get(board.id) ?? 0,
      activeReportCount: reportsByBoard.get(board.id) ?? 0,
      viewer: toViewer(user, {
        follow: followByBoard.get(board.id),
        membership: memberByBoard.get(board.id),
      }),
    }),
  );
}

export async function findVisibleBoard(slug, user) {
  const board = await prisma.board.findUnique({ where: { slug } });
  if (!board) throw boardNotFound();
  if (board.status === 'FROZEN' && !canSeeFrozenBoards(user)) throw boardNotFound();
  return board;
}

export async function getBoardDetail(slug, user) {
  const board = await prisma.board.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      categories: { orderBy: CATEGORY_ORDER },
    },
  });
  if (!board) throw boardNotFound();
  if (board.status === 'FROZEN' && !canSeeFrozenBoards(user)) throw boardNotFound();

  const [handlerCount, followerCount, activeReportCount, membership, follow] = await Promise.all([
    prisma.boardMember.count({ where: { boardId: board.id, status: 'ACTIVE' } }),
    prisma.boardFollower.count({ where: { boardId: board.id } }),
    prisma.report.count({ where: { boardId: board.id, ...ACTIVE_REPORT_WHERE } }),
    getBoardMembership(board.id, user?.id),
    user
      ? prisma.boardFollower.findUnique({
          where: { boardId_userId: { boardId: board.id, userId: user.id } },
        })
      : null,
  ]);

  return toBoardDetail(board, {
    handlerCount,
    followerCount,
    activeReportCount,
    viewer: toViewer(user, { follow, membership }),
  });
}

async function pickSlug(tx, name, city) {
  const base = boardBaseSlug(name, city);
  const taken = await tx.board.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  return nextAvailableSlug(
    base,
    taken.map((row) => row.slug),
  );
}

function initialCategories(type, extraCategories) {
  const defaults = BOARD_DEFAULT_CATEGORIES[type].map((name) => ({ name, isDefault: true }));
  const extras = extraCategories.map((name) => ({ name, isDefault: false }));
  return [...defaults, ...extras].map((category, index) => ({ ...category, sortOrder: index }));
}

export async function createBoard(user, input) {
  for (let attempt = 1; attempt <= SLUG_RETRIES; attempt += 1) {
    try {
      const board = await prisma.$transaction(async (tx) => {
        const owned = await tx.board.count({ where: { ownerId: user.id } });
        if (owned >= BOARD_CREATION_LIMIT) {
          throw new AppError(
            403,
            ERROR_CODES.BOARD_LIMIT_REACHED,
            `Kamu sudah membuat ${BOARD_CREATION_LIMIT} Board, batas maksimal tercapai`,
          );
        }

        return tx.board.create({
          data: {
            slug: await pickSlug(tx, input.name, input.city),
            name: input.name,
            city: input.city,
            type: input.type,
            managerTitle: input.managerTitle || null,
            description: input.description,
            dangerousTargetHours: input.dangerousTargetHours,
            verification: 'COMMUNITY',
            ownerId: user.id,
            members: { create: { userId: user.id, role: 'OWNER', status: 'ACTIVE' } },
            categories: { create: initialCategories(input.type, input.extraCategories) },
          },
        });
      });
      return getBoardDetail(board.slug, user);
    } catch (error) {
      const slugClash = error?.code === 'P2002' && attempt < SLUG_RETRIES;
      if (!slugClash) throw error;
    }
  }
  throw new AppError(409, ERROR_CODES.CONFLICT, 'Gagal membuat slug Board, coba lagi');
}

export async function updateBoard(board, user, input) {
  const data = {};
  for (const key of ['name', 'managerTitle', 'description', 'dangerousTargetHours']) {
    if (input[key] !== undefined) data[key] = input[key];
  }
  await prisma.board.update({
    where: { id: board.id },
    data: { ...data, lastHandlerActivityAt: new Date() },
  });
  return getBoardDetail(board.slug, user);
}

export async function searchBoards({ q, city, type, verification, page, pageSize }, user) {
  const where = {
    status: { not: 'FROZEN' },
    ...(city && { city }),
    ...(type && { type }),
    ...(verification && { verification }),
    ...(q && { name: { contains: q } }),
  };
  const boards = await prisma.board.findMany({ where });
  const reportCounts = await prisma.report.groupBy({
    by: ['boardId'],
    where: { boardId: { in: boards.map((board) => board.id) }, ...ACTIVE_REPORT_WHERE },
    _count: { _all: true },
  });
  const reportsByBoard = new Map(reportCounts.map((row) => [row.boardId, row._count._all]));
  const rows = boards
    .map((board) => ({ ...board, activeReportCount: reportsByBoard.get(board.id) ?? 0 }))
    .sort(compareSearchResults(q));
  const total = rows.length;
  const start = (page - 1) * pageSize;

  return {
    data: await decorateCards(rows.slice(start, start + pageSize), user),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function findSimilarBoards({ name, city }, user) {
  const tokens = similarTokens(name);
  if (tokens.length === 0) return [];
  const candidates = await prisma.board.findMany({
    where: {
      city,
      status: { not: 'FROZEN' },
      OR: tokens.map((token) => ({ name: { contains: token } })),
    },
    take: SIMILAR_CANDIDATES,
  });
  return decorateCards(rankSimilarBoards(candidates, name, BOARD_SIMILAR_LIMIT), user);
}

export async function listMyBoards(user) {
  const memberships = await prisma.boardMember.findMany({
    where: { userId: user.id, status: 'ACTIVE' },
    include: { board: true },
  });
  const cards = await decorateCards(
    memberships.map((membership) => membership.board),
    user,
  );
  return memberships
    .map((membership, index) => ({ board: cards[index], role: membership.role }))
    .sort(
      (a, b) =>
        (a.role === 'OWNER' ? 0 : 1) - (b.role === 'OWNER' ? 0 : 1) ||
        a.board.name.localeCompare(b.board.name, 'id'),
    );
}

export function searchCities(q) {
  if (!q) return CITIES;
  const needle = q.toLocaleLowerCase('id-ID');
  const matchRank = (city) => {
    const name = city.name.toLocaleLowerCase('id-ID');
    const bare = name.replace(/^(kota|kabupaten)( administrasi)? /, '');
    if (bare.startsWith(needle) || name.startsWith(needle)) return 0;
    return name.includes(needle) ? 1 : 2;
  };
  return CITIES.filter((city) => matchRank(city) < 2)
    .sort((a, b) => matchRank(a) - matchRank(b))
    .slice(0, CITY_SEARCH_LIMIT);
}

async function touchHandlerActivity(tx, boardId) {
  await tx.board.update({ where: { id: boardId }, data: { lastHandlerActivityAt: new Date() } });
}

async function assertCategoryNameFree(tx, boardId, name, exceptId) {
  const clash = await tx.category.findFirst({
    where: { boardId, name, ...(exceptId && { id: { not: exceptId } }) },
    select: { id: true },
  });
  if (clash) throw categoryExists();
}

async function findBoardCategory(tx, boardId, categoryId) {
  const category = await tx.category.findFirst({ where: { id: categoryId, boardId } });
  if (!category) throw categoryNotFound();
  return category;
}

function mapCategoryClash(error) {
  if (error?.code === 'P2002') throw categoryExists();
  throw error;
}

export async function addCategory(board, { name }) {
  return prisma
    .$transaction(async (tx) => {
      const count = await tx.category.count({ where: { boardId: board.id } });
      if (count >= BOARD_MAX_CATEGORIES) {
        throw new AppError(
          403,
          ERROR_CODES.CATEGORY_LIMIT_REACHED,
          `Board sudah memiliki ${BOARD_MAX_CATEGORIES} kategori, batas maksimal tercapai`,
        );
      }
      await assertCategoryNameFree(tx, board.id, name);
      const last = await tx.category.findFirst({
        where: { boardId: board.id },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      const category = await tx.category.create({
        data: { boardId: board.id, name, sortOrder: (last?.sortOrder ?? -1) + 1 },
      });
      await touchHandlerActivity(tx, board.id);
      return toCategory(category);
    })
    .catch(mapCategoryClash);
}

export async function updateCategory(board, categoryId, { name, sortOrder }) {
  return prisma
    .$transaction(async (tx) => {
      const category = await findBoardCategory(tx, board.id, categoryId);
      const renaming = name !== undefined && name !== category.name;
      if (renaming && isProtectedCategory(category)) throw categoryProtected();
      if (renaming) await assertCategoryNameFree(tx, board.id, name, category.id);
      const updated = await tx.category.update({
        where: { id: category.id },
        data: {
          ...(name !== undefined && { name }),
          ...(sortOrder !== undefined && { sortOrder }),
        },
      });
      await touchHandlerActivity(tx, board.id);
      return toCategory(updated);
    })
    .catch(mapCategoryClash);
}

export async function deleteCategory(board, categoryId) {
  return prisma.$transaction(async (tx) => {
    const category = await findBoardCategory(tx, board.id, categoryId);
    if (isProtectedCategory(category)) throw categoryProtected();
    const used = await tx.report.count({ where: { categoryId: category.id } });
    if (used > 0) {
      throw new AppError(
        409,
        ERROR_CODES.CATEGORY_IN_USE,
        'Kategori sudah dipakai laporan sehingga tidak bisa dihapus. Ganti namanya jika perlu.',
      );
    }
    await tx.category.delete({ where: { id: category.id } });
    await touchHandlerActivity(tx, board.id);
    return { id: category.id, deleted: true };
  });
}

export async function reorderCategories(board, { categoryIds }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.category.findMany({
      where: { boardId: board.id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((category) => category.id));
    if (categoryIds.some((id) => !existingIds.has(id))) throw categoryNotFound();
    if (categoryIds.length !== existingIds.size) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Data yang dikirim tidak valid', [
        { field: 'categoryIds', message: 'Urutan harus memuat semua kategori Board' },
      ]);
    }
    for (const [index, id] of categoryIds.entries()) {
      await tx.category.update({ where: { id }, data: { sortOrder: index } });
    }
    await touchHandlerActivity(tx, board.id);
    const categories = await tx.category.findMany({
      where: { boardId: board.id },
      orderBy: CATEGORY_ORDER,
    });
    return categories.map(toCategory);
  });
}
