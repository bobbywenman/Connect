import { z } from 'zod';

import { networkColors } from '@/constants';

export const NETWORK_NAME_MAX = 50;

export const networkTypes = ['family', 'friends', 'work', 'custom'] as const;
export type NetworkType = (typeof networkTypes)[number];

const colorNames = networkColors.map((c) => c.name) as [string, ...string[]];

/** Form values for creating or editing a network. Mirrors the table's check constraints. */
export const networkFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name for this network')
    .max(NETWORK_NAME_MAX, `Use ${NETWORK_NAME_MAX} characters or fewer`),
  type: z.enum(networkTypes, { error: 'Choose a network type' }),
  color: z.enum(colorNames, { error: 'Choose a color' }),
});

export type NetworkFormValues = z.infer<typeof networkFormSchema>;
export type NetworkFormErrors = Partial<Record<keyof NetworkFormValues, string>>;

/** Field name to first error message; an empty object when the values are valid. */
export function validateNetworkForm(values: {
  name: string;
  type: string;
  color: string;
}): NetworkFormErrors {
  const result = networkFormSchema.safeParse(values);
  if (result.success) return {};
  const errors: NetworkFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof NetworkFormValues;
    errors[key] ??= issue.message;
  }
  return errors;
}
