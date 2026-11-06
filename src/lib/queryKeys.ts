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
 *   ['person', 'self']                 the signed-in user's self person ("You")
 *   ['events']                         list of events
 *   ['events', id]                     one event with its attendees
 *   ['persons', 'duplicateCheck']      everyone, for duplicate detection (refreshed with any ['persons'] invalidation)
 *   ['duplicates', 'dismissals']       "not duplicates" decisions
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
    list: (filter: { networkId?: string; includeArchived?: boolean } = {}) =>
      ['persons', filter] as const,
  },
  events: {
    all: ['events'] as const,
    detail: (id: string) => ['events', id] as const,
  },
  duplicates: {
    people: ['persons', 'duplicateCheck'] as const,
    dismissals: ['duplicates', 'dismissals'] as const,
  },
  person: {
    detail: (id: string) => ['person', id] as const,
    /** The detail screen's person + networks + connections; under `detail`, so it refreshes with it. */
    full: (id: string) => ['person', id, 'full'] as const,
    /** The signed-in user's self person ("You"). */
    self: ['person', 'self'] as const,
  },
  /** Global search results for a normalized query. */
  search: (query: string) => ['search', query] as const,
  /** Signed photo URLs: `['photoUrls', paths]`, plus an optional version suffix. */
  photoUrlsAll: ['photoUrls'] as const,
  photoUrls: (paths: string[]) => ['photoUrls', paths] as const,
};
