import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components';
import { RelationshipFlow } from '@/features/relationships/components/RelationshipFlow';

/** Change a relationship; `personId` is the person whose page it was opened from. */
export default function EditRelationshipScreen() {
  const { id, personId } = useLocalSearchParams<{ id: string; personId?: string }>();
  if (!personId) {
    return (
      <EmptyState
        title="Open this from a profile"
        subtitle="Tap a relationship badge on someone's profile to change it."
      />
    );
  }
  return <RelationshipFlow personId={personId} relationshipId={id} />;
}
