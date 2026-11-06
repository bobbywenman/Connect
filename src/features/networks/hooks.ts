import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import { listNetworks } from './api';

export function useNetworks() {
  return useQuery({ queryKey: queryKeys.networks.all, queryFn: listNetworks });
}
