import { sendData } from '../../utils/response.js';
import {
  followBoard,
  listMyFollows,
  unfollowBoard,
  updateFollowNotifyLevel,
} from './follows.service.js';

export async function follow(req, res) {
  sendData(res, await followBoard(req.validated.params.slug, req.user));
}

export async function unfollow(req, res) {
  await unfollowBoard(req.validated.params.slug, req.user);
  res.status(204).end();
}

export async function updateNotifyLevel(req, res) {
  sendData(res, await updateFollowNotifyLevel(req.validated.params.slug, req.user, req.body));
}

export async function myFollows(req, res) {
  sendData(res, await listMyFollows(req.user));
}
