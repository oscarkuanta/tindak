import { sendData } from '../../utils/response.js';
import {
  addCategory,
  createBoard,
  deleteCategory,
  findSimilarBoards,
  getBoardDetail,
  listMyBoards,
  listPopularBoards,
  reorderCategories,
  searchBoards,
  searchCities,
  updateBoard,
  updateCategory,
} from './boards.service.js';

export async function create(req, res) {
  sendData(res, await createBoard(req.user, req.body), { status: 201 });
}

export async function search(req, res) {
  const { data, meta } = await searchBoards(req.validated.query, req.user);
  sendData(res, data, { meta });
}

export async function similar(req, res) {
  sendData(res, await findSimilarBoards(req.validated.query, req.user));
}

export async function detail(req, res) {
  sendData(res, await getBoardDetail(req.validated.params.slug, req.user));
}

export async function update(req, res) {
  sendData(res, await updateBoard(req.board, req.user, req.body));
}

export async function createCategory(req, res) {
  sendData(res, await addCategory(req.board, req.body), { status: 201 });
}

export async function editCategory(req, res) {
  sendData(res, await updateCategory(req.board, req.validated.params.id, req.body));
}

export async function removeCategory(req, res) {
  sendData(res, await deleteCategory(req.board, req.validated.params.id));
}

export async function orderCategories(req, res) {
  sendData(res, await reorderCategories(req.board, req.body));
}

export async function myBoards(req, res) {
  sendData(res, await listMyBoards(req.user));
}

export function cities(req, res) {
  sendData(res, searchCities(req.validated.query.q));
}

export async function popular(req, res) {
  sendData(res, await listPopularBoards(req.validated.query.limit, req.user));
}
