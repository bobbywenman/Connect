/**
 * Query key convention: `[resource, ...qualifiers]`, most general first, so
 * `invalidateQueries({ queryKey: queryKeys.networks.all })` also refreshes every
 * more specific key under it.
 *
 *   ['profile']                        the signed-in user's profile
 *   ['networks']                       list of networks
 *   ['networks', id]                   one network
 *   ['persons', { networkId }]         people list, filtered
 *   ['person', id]                     one person
 *   ['customRelationshipTypes']        the user's custom relationship labels
 *
 * Always build keys with this module so they stay consistent.
 */
export const queryKeys = {
  profile: ['profile'] as const,
  customRelationshipTypes: ['customRelationshipTypes'] as const,
  networks: {
    all: ['networks'] as const,
    detail: (id: string) => ['networks', id] as const,
  },
  persons: {
    list: (filter: { networkId?: string } = {}) => ['persons', filter] as const,
  },
  person: {
    detail: (id: string) => ['person', id] as const,
  },
  /** Signed photo URLs: `['photoUrls', paths]`, plus an optional version suffix. */
  photoUrlsAll: ['photoUrls'] as const,
  photoUrls: (paths: string[]) => ['photoUrls', paths] as const,
};
