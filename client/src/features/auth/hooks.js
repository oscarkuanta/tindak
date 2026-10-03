import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, login, logout, register } from './api.js';

export const meQueryKey = ['me'];

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: getMe,
    staleTime: 5 * 60_000,
  });
}

function useSetMe() {
  const queryClient = useQueryClient();
  return (user) => {
    queryClient.setQueryData(meQueryKey, user);
    queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== meQueryKey[0] });
  };
}

export function useLogin() {
  const setMe = useSetMe();
  return useMutation({ mutationFn: login, onSuccess: setMe });
}

export function useRegister() {
  const setMe = useSetMe();
  return useMutation({ mutationFn: register, onSuccess: setMe });
}

export function useLogout() {
  const setMe = useSetMe();
  return useMutation({ mutationFn: logout, onSuccess: () => setMe(null) });
}
