import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components';
import { RelationshipFlow } from '@/features/relationships/components/RelationshipFlow';

export default function NewRelationshipScreen() {
  const { personId, targetId } = useLocalSearchParams<{ personId?: string; targetId?: string }>();
  if (!personId) {
    return (
      <EmptyState
        title="Pick a person first"
        subtitle="Open someone's profile and tap Add relationship."
      />
    );
  }
  return <RelationshipFlow personId={personId} targetId={targetId} />;
}
