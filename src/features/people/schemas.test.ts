import {
  createPersonFormSchema,
  emptyPersonForm,
  isValidIsoDate,
  normalizeTags,
  toIsoDate,
} from './schemas';

const schema = createPersonFormSchema();
const valid = { ...emptyPersonForm, firstName: 'Jamie', networkIds: ['n1'] };

describe('createPersonFormSchema', () => {
  it('accepts only a first name and a network, turning empty strings into null', () => {
    const result = schema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      firstName: 'Jamie',
      lastName: null,
      preferredName: null,
      pronouns: null,
      birthdate: null,
      anniversaryDate: null,
      locationCity: null,
      jobTitle: null,
      company: null,
      department: null,
      notes: null,
      funFacts: null,
      conversationStarters: null,
      tags: [],
      birthdayReminder: false,
      anniversaryReminder: false,
    });
  });

  it('requires a first name, ignoring whitespace', () => {
    const result = schema.safeParse({ ...valid, firstName: '   ' });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['firstName'],
      message: 'First name is required',
    });
  });

  it('trims the first name and caps it at 50 characters', () => {
    expect(schema.parse({ ...valid, firstName: '  Jamie ' }).firstName).toBe('Jamie');
    expect(schema.safeParse({ ...valid, firstName: 'a'.repeat(51) }).success).toBe(false);
  });

  it('requires a network unless editing the self person', () => {
    const noNetwork = { ...valid, networkIds: [] };
    expect(schema.safeParse(noNetwork).error?.issues[0]?.path).toEqual(['networkIds']);
    expect(createPersonFormSchema({ isSelf: true }).safeParse(noNetwork).success).toBe(true);
  });

  it('cleans tags: trim, drop empties, dedupe ignoring case', () => {
    const result = schema.parse({ ...valid, tags: [' Golf ', 'golf', '', 'Book club', 'GOLF'] });
    expect(result.tags).toEqual(['Golf', 'Book club']);
  });

  it('rejects tags longer than 30 characters', () => {
    expect(schema.safeParse({ ...valid, tags: ['x'.repeat(31)] }).success).toBe(false);
  });

  it('validates dates as real ISO calendar days', () => {
    expect(schema.parse({ ...valid, birthdate: '1990-04-23' }).birthdate).toBe('1990-04-23');
    expect(schema.safeParse({ ...valid, birthdate: '23/04/1990' }).success).toBe(false);
    const bad = schema.safeParse({ ...valid, anniversaryDate: '2023-02-30' });
    expect(bad.error?.issues[0]?.path).toEqual(['anniversaryDate']);
  });

  it('turns a reminder off when there is no date', () => {
    const result = schema.parse({ ...valid, birthdayReminder: true, anniversaryReminder: true });
    expect(result.birthdayReminder).toBe(false);
    expect(result.anniversaryReminder).toBe(false);
    const withDate = schema.parse({ ...valid, birthdate: '1990-04-23', birthdayReminder: true });
    expect(withDate.birthdayReminder).toBe(true);
  });
});

describe('helpers', () => {
  it('isValidIsoDate', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2023-02-29')).toBe(false);
    expect(isValidIsoDate('2023-13-01')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
  });

  it('toIsoDate uses the local calendar day', () => {
    expect(toIsoDate(new Date(2024, 0, 5))).toBe('2024-01-05');
  });

  it('normalizeTags keeps the first spelling', () => {
    expect(normalizeTags(['Golf', 'golf'])).toEqual(['Golf']);
  });
});
