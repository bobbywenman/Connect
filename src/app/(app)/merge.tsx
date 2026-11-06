import { EmptyState, Screen } from '@/components';

// Placeholder: the merge tool is KT-34. The "Merge" action on the duplicates list
// links here with `?a=<personId>&b=<personId>`.
export default function MergeScreen() {
  return (
    <Screen>
      <EmptyState
        title="Merging arrives in KT-34"
        subtitle="For now, tap Not duplicates or edit either person."
      />
    </Screen>
  );
}
