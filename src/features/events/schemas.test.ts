import { emptyEventForm, eventFormSchema, type EventFormInput } from './schemas';

const valid: EventFormInput = {
  ...emptyEventForm,
  name: 'Thanksgiving dinner',
  eventDate: '2026-11-26',
};

const parse = (overrides: Partial<EventFormInput> = {}) =>
  eventFormSchema.safeParse({ ...valid, ...overrides });

function firstError(overrides: Partial<EventFormInput>): string | undefined {
  const result = parse(overrides);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('eventFormSchema', () => {
  it('accepts name and date only, turning empty optionals into null', () => {
    const result = parse();
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'Thanksgiving dinner',
      eventDate: '2026-11-26',
      location: null,
      description: null,
      networkId: null,
    });
  });

  it('trims text and keeps the network id', () => {
    const result = parse({ name: '  Reunion ', location: ' Bend, OR ', networkId: 'n1' });
    expect(result.data).toMatchObject({ name: 'Reunion', location: 'Bend, OR', networkId: 'n1' });
  });

  it('requires a name', () => {
    expect(firstError({ name: '   ' })).toBe('Name is required');
  });

  it('limits name to 80, location to 120 and description to 1000', () => {
    expect(parse({ name: 'a'.repeat(80) }).success).toBe(true);
    expect(firstError({ name: 'a'.repeat(81) })).toBe('Name must be 80 characters or fewer');
    expect(parse({ location: 'a'.repeat(120) }).success).toBe(true);
    expect(firstError({ location: 'a'.repeat(121) })).toBe(
      'Location must be 120 characters or fewer',
    );
    expect(parse({ description: 'a'.repeat(1000) }).success).toBe(true);
    expect(firstError({ description: 'a'.repeat(1001) })).toBe(
      'Description must be 1000 characters or fewer',
    );
  });

  it('requires a real date', () => {
    expect(firstError({ eventDate: '' })).toBe('Date is required');
    expect(firstError({ eventDate: '2026-02-30' })).toMatch(/real date/);
    expect(firstError({ eventDate: 'next week' })).toMatch(/real date/);
  });
});
