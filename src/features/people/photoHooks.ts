import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import {
  applyPhotoChange,
  getSignedPhotoUrls,
  SIGNED_URL_TTL_SECONDS,
  type PhotoChange,
  type PhotoPerson,
} from './photos';

// Signed URLs are valid for an hour; treat them as fresh for 50 minutes so a cached URL is
// never handed out close to expiry, and keep unused ones around for the full hour.
const STALE_MS = (SIGNED_URL_TTL_SECONDS - 10 * 60) * 1000;
const GC_MS = SIGNED_URL_TTL_SECONDS * 1000;

/**
 * Signed URLs for a set of photo paths, one request and one cache entry for the whole set.
 * Pass `version` (e.g. the person's `updated_at`) for a single photo so a replaced photo, which
 * keeps the same path, gets a new cache entry. Lists should share one call for all rows.
 */
export function usePhotoUrls(paths: (string | null | undefined)[], version?: string | null) {
  const wanted = [...new Set(paths.filter((p): p is string => !!p))].sort();
  return useQuery({
    queryKey: [...queryKeys.photoUrls(wanted), version ?? null],
    queryFn: () => getSignedPhotoUrls(wanted),
    enabled: wanted.length > 0,
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });
}

/** Signed URL for one photo path (null while loading, when unset, or if signing failed). */
export function usePhotoUrl(path: string | null | undefined, version?: string | null) {
  const query = usePhotoUrls([path], version);
  return path ? (query.data?.[path] ?? null) : null;
}

/** Upload / replace / remove a person's photo, then refresh everything that shows it. */
export function useApplyPhotoChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ person, change }: { person: PhotoPerson; change: PhotoChange }) =>
      applyPhotoChange(person, change),
    onSettled: async (_data, _error, { person }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.photoUrlsAll }),
        queryClient.invalidateQueries({ queryKey: ['persons'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.person.detail(person.id) }),
      ]);
    },
  });
}
