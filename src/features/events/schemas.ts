import { z } from 'zod';

import { isValidIsoDate } from '@/features/people/schemas';

export const EVENT_NAME_MAX = 80;
export const EVENT_LOCATION_MAX = 120;
export const EVENT_DESCRIPTION_MAX = 1000;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((v) => (v === '' ? null : v));

/**
 * Validation for the create/edit event form. Input is the form's raw strings; output is what
 * gets saved (empty optionals become null; `networkId` '' means no network).
 */
export const eventFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(EVENT_NAME_MAX, `Name must be ${EVENT_NAME_MAX} characters or fewer`),
  eventDate: z
    .string()
    .trim()
    .min(1, 'Date is required')
    .refine(isValidIsoDate, 'Date must be a real date like 2026-12-20'),
  location: optionalText(EVENT_LOCATION_MAX, 'Location'),
  description: optionalText(EVENT_DESCRIPTION_MAX, 'Description'),
  networkId: z.string().transform((v) => (v === '' ? null : v)),
});

export type EventFormInput = z.input<typeof eventFormSchema>;
export type EventFormValues = z.output<typeof eventFormSchema>;

export const emptyEventForm: EventFormInput = {
  name: '',
  eventDate: '',
  location: '',
  description: '',
  networkId: '',
};
