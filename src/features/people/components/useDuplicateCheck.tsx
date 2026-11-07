import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ReactElement } from 'react';

import { ConfirmDialog } from '@/components';
import { useNetworks } from '@/features/networks/hooks';

import { dismissalsQuery, peopleForDuplicateCheckQuery } from '../duplicateHooks';
import {
  describeMatches,
  findDuplicatesFor,
  normalizeName,
  type DuplicateCandidate,
  type DuplicateMatch,
} from '../duplicates';

type Names = Pick<DuplicateCandidate, 'first_name' | 'last_name' | 'preferred_name'>;

const sameName = (a: Names, b: Names) =>
  normalizeName(a.first_name) === normalizeName(b.first_name) &&
  normalizeName(a.last_name) === normalizeName(b.last_name) &&
  normalizeName(a.preferred_name) === normalizeName(b.preferred_name);

/**
 * Duplicate warning for the person form (KT-33). Call `confirmSave(candidate)` just
 * before saving: it resolves `true` to carry on (no matches, the user chose "Save
 * anyway", or the check itself failed, since a network hiccup must never block saving)
 * and `false` to stay on the form ("Review" also opens the existing person). Render
 * `dialog` once in the screen. Pass `original` when editing: the check is skipped
 * unless the name changed.
 */
export function useDuplicateCheck() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const networks = useNetworks();
  const [matches, setMatches] = useState<DuplicateMatch[] | null>(null);
  const resolver = useRef<((proceed: boolean) => void) | null>(null);

  const settle = useCallback((proceed: boolean) => {
    resolver.current?.(proceed);
    resolver.current = null;
    setMatches(null);
  }, []);

  const confirmSave = useCallback(
    async (candidate: DuplicateCandidate, original?: Names): Promise<boolean> => {
      if (candidate.is_self || (original && sameName(candidate, original))) return true;
      let found: DuplicateMatch[];
      try {
        const [people, dismissals] = await Promise.all([
          queryClient.fetchQuery({ ...peopleForDuplicateCheckQuery, staleTime: 0 }),
          queryClient.fetchQuery({ ...dismissalsQuery, staleTime: 0 }),
        ]);
        found = findDuplicatesFor(candidate, people, dismissals);
      } catch {
        return true;
      }
      if (found.length === 0) return true;
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setMatches(found);
      });
    },
    [queryClient],
  );

  const networkNames = new Map((networks.data ?? []).map((n) => [n.id, n.name]));
  const first = matches?.[0]?.person;
  const dialog: ReactElement = (
    <ConfirmDialog
      visible={matches !== null}
      title="Possible duplicate"
      message={matches ? describeMatches(matches, networkNames) : ''}
      confirmLabel="Save anyway"
      cancelLabel="Cancel"
      neutralLabel="Review"
      onNeutral={() => {
        settle(false);
        if (first) router.push({ pathname: '/person/[id]', params: { id: first.id } });
      }}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirmSave, dialog };
}
