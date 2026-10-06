import { api } from '../../lib/api.js';

export function getMyInvitations() {
  return api.get('/me/invitations');
}

export function acceptInvitation(id) {
  return api.post(`/me/invitations/${encodeURIComponent(id)}/accept`);
}

export function declineInvitation(id) {
  return api.post(`/me/invitations/${encodeURIComponent(id)}/decline`);
}
