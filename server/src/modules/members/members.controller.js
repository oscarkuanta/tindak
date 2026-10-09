import { sendData } from '../../utils/response.js';
import {
  acceptInvitation,
  declineInvitation,
  inviteHandler,
  listHandlers,
  listInvitations,
  removeHandler,
  searchHandlerCandidates,
  transferOwnership,
} from './members.service.js';

export async function handlers(req, res) {
  sendData(res, await listHandlers(req.board));
}

export async function candidates(req, res) {
  sendData(res, await searchHandlerCandidates(req.board, req.validated.query.q));
}

export async function invite(req, res) {
  sendData(res, await inviteHandler(req.board, req.user, req.body), { status: 201 });
}

export async function remove(req, res) {
  await removeHandler(req.board, req.user, req.validated.params.userId);
  res.status(204).end();
}

export async function transfer(req, res) {
  sendData(res, await transferOwnership(req.board, req.user, req.body));
}

export async function invitations(req, res) {
  sendData(res, await listInvitations(req.user));
}

export async function accept(req, res) {
  sendData(res, await acceptInvitation(req.user, req.validated.params.id));
}

export async function decline(req, res) {
  await declineInvitation(req.user, req.validated.params.id);
  res.status(204).end();
}
