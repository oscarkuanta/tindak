import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { myBoardsKey, myFollowsKey } from '../boards/hooks.js';
import { acceptInvitation, declineInvitation, getMyInvitations } from './api.js';

export const myInvitationsKey = ['me', 'invitations'];

export function useMyInvitations(options = {}) {
  return useQuery({
    queryKey: myInvitationsKey,
    queryFn: getMyInvitations,
    enabled: options.enabled ?? true,
  });
}

function useInvitationAction(action) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: myInvitationsKey }),
        queryClient.invalidateQueries({ queryKey: myBoardsKey }),
        queryClient.invalidateQueries({ queryKey: myFollowsKey }),
        queryClient.invalidateQueries({ queryKey: ['boards'] }),
      ]);
    },
  });
}

export function useAcceptInvitation() {
  return useInvitationAction(acceptInvitation);
}

export function useDeclineInvitation() {
  return useInvitationAction(declineInvitation);
}
