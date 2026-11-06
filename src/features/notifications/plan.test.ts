import {
  DEFAULT_REMINDER_SETTINGS,
  HOUR_CHOICES,
  LEAD_DAY_CHOICES,
  MAX_SCHEDULED,
  describeLead,
  mergeReminderSettings,
  parseReminderSettings,
  planReminders,
  reminderBody,
  type ReminderPerson,
  type ReminderSettings,
} from './plan';

function person(overrides: Partial<ReminderPerson> = {}): ReminderPerson {
  return {
    id: 'p1',
    first_name: 'Sarah',
    preferred_name: null,
    birthdate: null,
    birthday_reminder: false,
    anniversary_date: null,
    anniversary_reminder: false,
    archived_at: null,
    is_self: false,
    ...overrides,
  };
}

const birthday = (date: string, overrides: Partial<ReminderPerson> = {}) =>
  person({ birthdate: date, birthday_reminder: true, ...overrides });

const settings = (overrides: Partial<ReminderSettings> = {}): ReminderSettings => ({
  ...DEFAULT_REMINDER_SETTINGS,
  ...overrides,
});

// Local time throughout: the device's time zone is what the user sees.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe('planReminders', () => {
  it('fires today at the hour when the birthday is today and the hour has not passed', () => {
    const [r] = planReminders([birthday('1990-11-06')], settings(), at(2026, 11, 6, 8));
    expect(r?.fireAt).toEqual(at(2026, 11, 6, 9));
    expect(r?.body).toBe("Sarah's birthday is today!");
    expect(r?.kind).toBe('birthday');
    expect(r?.personId).toBe('p1');
  });

  it('moves to next year when today is the birthday but the hour has passed', () => {
    const [r] = planReminders([birthday('1990-11-06')], settings(), at(2026, 11, 6, 9, 1));
    expect(r?.fireAt).toEqual(at(2027, 11, 6, 9));
  });

  it('plans tomorrow', () => {
    const [r] = planReminders([birthday('1990-11-07')], settings(), at(2026, 11, 6, 12));
    expect(r?.fireAt).toEqual(at(2026, 11, 7, 9));
  });

  it('applies lead days and words them in the body', () => {
    const [r] = planReminders([birthday('1990-11-20')], settings({ leadDays: 3 }), at(2026, 11, 6));
    expect(r?.fireAt).toEqual(at(2026, 11, 17, 9));
    expect(r?.body).toBe("Sarah's birthday is in 3 days");
    const [w] = planReminders([birthday('1990-11-20')], settings({ leadDays: 7 }), at(2026, 11, 6));
    expect(w?.body).toBe("Sarah's birthday is in 1 week");
  });

  it('skips to next year when the lead window has already started and fire time passed', () => {
    // Birthday Nov 8, lead 3 => fire Nov 5, which is before now (Nov 6).
    const [r] = planReminders([birthday('1990-11-08')], settings({ leadDays: 3 }), at(2026, 11, 6));
    expect(r?.fireAt).toEqual(at(2027, 11, 5, 9));
  });

  it('handles lead time crossing the year boundary', () => {
    const [r] = planReminders(
      [birthday('1990-01-02')],
      settings({ leadDays: 5 }),
      at(2026, 12, 20),
    );
    expect(r?.fireAt).toEqual(at(2026, 12, 28, 9));
  });

  it('uses Feb 28 for a Feb 29 date in non-leap years and Feb 29 in leap years', () => {
    const p = birthday('2000-02-29');
    expect(planReminders([p], settings(), at(2026, 11, 6))[0]?.fireAt).toEqual(at(2027, 2, 28, 9));
    expect(planReminders([p], settings(), at(2027, 11, 6))[0]?.fireAt).toEqual(at(2028, 2, 29, 9));
    expect(planReminders([p], settings(), at(2028, 1, 1))[0]?.fireAt).toEqual(at(2028, 2, 29, 9));
  });

  it('honours the configured local hour', () => {
    const [r] = planReminders([birthday('1990-11-07')], settings({ hour: 17 }), at(2026, 11, 6));
    expect(r?.fireAt.getHours()).toBe(17);
    expect(r?.fireAt.getMinutes()).toBe(0);
  });

  it('plans anniversaries with their own wording', () => {
    const p = person({ anniversary_date: '2015-11-06', anniversary_reminder: true });
    const [r] = planReminders([p], settings(), at(2026, 11, 6, 8));
    expect(r?.kind).toBe('anniversary');
    expect(r?.title).toBe('Anniversary');
    expect(r?.body).toBe("Sarah's anniversary is today!");
    const [t] = planReminders([p], settings({ leadDays: 1 }), at(2026, 11, 4));
    expect(t?.body).toBe("Sarah's anniversary is tomorrow");
  });

  it('plans both dates of one person', () => {
    const p = person({
      birthdate: '1990-12-01',
      birthday_reminder: true,
      anniversary_date: '2015-11-20',
      anniversary_reminder: true,
    });
    const plan = planReminders([p], settings(), at(2026, 11, 6));
    expect(plan.map((r) => r.kind)).toEqual(['anniversary', 'birthday']);
  });

  it('prefers the preferred name', () => {
    const [r] = planReminders(
      [birthday('1990-11-07', { preferred_name: 'Sally' })],
      settings(),
      at(2026, 11, 6),
    );
    expect(r?.body).toBe("Sally's birthday is today!");
  });

  it('skips disabled flags, missing and invalid dates', () => {
    const plan = planReminders(
      [
        person({ id: 'a', birthdate: '1990-11-07', birthday_reminder: false }),
        person({ id: 'b', birthday_reminder: true, birthdate: null }),
        birthday('not-a-date', { id: 'c' }),
        birthday('1990-02-30', { id: 'd' }),
      ],
      settings(),
      at(2026, 11, 6),
    );
    expect(plan).toEqual([]);
  });

  it('skips a kind that is switched off globally', () => {
    const p = person({
      birthdate: '1990-11-07',
      birthday_reminder: true,
      anniversary_date: '2015-11-07',
      anniversary_reminder: true,
    });
    const plan = planReminders([p], settings({ birthdays: false }), at(2026, 11, 6));
    expect(plan.map((r) => r.kind)).toEqual(['anniversary']);
    expect(
      planReminders([p], settings({ birthdays: false, anniversaries: false }), at(2026, 11, 6)),
    ).toEqual([]);
  });

  it('skips archived people and the self person', () => {
    const plan = planReminders(
      [
        birthday('1990-11-07', { id: 'archived', archived_at: '2026-01-01T00:00:00Z' }),
        birthday('1990-11-07', { id: 'self', is_self: true }),
        birthday('1990-11-07', { id: 'ok' }),
      ],
      settings(),
      at(2026, 11, 6),
    );
    expect(plan.map((r) => r.personId)).toEqual(['ok']);
  });

  it('sorts by fire time', () => {
    const plan = planReminders(
      [
        birthday('1990-12-25', { id: 'late' }),
        birthday('1990-11-08', { id: 'soon' }),
        birthday('1990-03-01', { id: 'next-year' }),
      ],
      settings(),
      at(2026, 11, 6),
    );
    expect(plan.map((r) => r.personId)).toEqual(['soon', 'late', 'next-year']);
  });

  it('caps the plan at 60 keeping the soonest', () => {
    const people = Array.from({ length: 100 }, (_, i) =>
      birthday(
        `1990-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        {
          id: `p${String(i).padStart(3, '0')}`,
        },
      ),
    );
    const plan = planReminders(people, settings(), at(2026, 1, 1));
    expect(plan).toHaveLength(MAX_SCHEDULED);
    const all = planReminders(people.slice(0, 60), settings(), at(2026, 1, 1));
    expect(plan[plan.length - 1]!.fireAt.getTime()).toBeGreaterThanOrEqual(
      all[0]!.fireAt.getTime(),
    );
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i]!.fireAt.getTime()).toBeGreaterThanOrEqual(plan[i - 1]!.fireAt.getTime());
    }
  });
});

describe('wording', () => {
  it('describes the lead time', () => {
    expect(describeLead(0)).toBe('today');
    expect(describeLead(1)).toBe('tomorrow');
    expect(describeLead(3)).toBe('in 3 days');
    expect(describeLead(7)).toBe('in 1 week');
    expect(describeLead(14)).toBe('in 2 weeks');
    expect(reminderBody('Sam', 'birthday', 0)).toBe("Sam's birthday is today!");
  });
});

describe('parseReminderSettings', () => {
  it('defaults when nothing is set', () => {
    expect(parseReminderSettings({})).toEqual(DEFAULT_REMINDER_SETTINGS);
    expect(parseReminderSettings(null)).toEqual(DEFAULT_REMINDER_SETTINGS);
    expect(parseReminderSettings({ reminders: 'nope' })).toEqual(DEFAULT_REMINDER_SETTINGS);
  });

  it('reads valid values and clamps bad ones', () => {
    expect(
      parseReminderSettings({
        reminders: { birthdays: false, anniversaries: true, leadDays: 3, hour: 18 },
      }),
    ).toEqual({
      birthdays: false,
      anniversaries: true,
      leadDays: 3,
      hour: 18,
      monthlySummary: false,
    });
    const clamped = parseReminderSettings({ reminders: { leadDays: 400, hour: 99 } });
    expect(clamped.leadDays).toBe(30);
    expect(clamped.hour).toBe(23);
    expect(parseReminderSettings({ reminders: { leadDays: 'x', hour: -4 } })).toMatchObject({
      leadDays: 0,
      hour: 0,
    });
  });
});

describe('parseReminderSettings: monthlySummary', () => {
  it('defaults to off and reads a stored boolean', () => {
    expect(parseReminderSettings({})).toMatchObject({ monthlySummary: false });
    expect(parseReminderSettings({ reminders: { monthlySummary: true } })).toMatchObject({
      monthlySummary: true,
    });
    expect(parseReminderSettings({ reminders: { monthlySummary: 'yes' } })).toMatchObject({
      monthlySummary: false,
    });
  });
});

describe('mergeReminderSettings', () => {
  it('changes only the given reminder fields and keeps other settings keys', () => {
    const merged = mergeReminderSettings(
      { theme: 'dark', reminders: { birthdays: true, legacy: 1 }, nested: { a: 1 } },
      { leadDays: 3 },
    );
    expect(merged).toEqual({
      theme: 'dark',
      nested: { a: 1 },
      reminders: { birthdays: true, legacy: 1, leadDays: 3 },
    });
  });

  it('starts from empty when settings are missing or not an object', () => {
    expect(mergeReminderSettings(null, { hour: 8 })).toEqual({ reminders: { hour: 8 } });
    expect(mergeReminderSettings([1, 2], { hour: 8 })).toEqual({ reminders: { hour: 8 } });
    expect(mergeReminderSettings({ reminders: 'bad' }, { hour: 8 })).toEqual({
      reminders: { hour: 8 },
    });
  });
});

describe('settings choices', () => {
  it('offer the default values', () => {
    expect(LEAD_DAY_CHOICES.map((c) => c.value)).toContain(DEFAULT_REMINDER_SETTINGS.leadDays);
    expect(HOUR_CHOICES.map((c) => c.value)).toContain(DEFAULT_REMINDER_SETTINGS.hour);
  });
});

describe('disabling a reminder type', () => {
  it('drops that type from the next plan and keeps the other', () => {
    const people = [
      person({
        id: 'p1',
        birthdate: '1990-11-20',
        birthday_reminder: true,
        anniversary_date: '2015-11-22',
        anniversary_reminder: true,
      }),
    ];
    const now = at(2026, 11, 6);
    const before = planReminders(people, parseReminderSettings({}), now);
    expect(before.map((r) => r.kind).sort()).toEqual(['anniversary', 'birthday']);

    // What the app stores after the user turns Birthday reminders off.
    const stored = mergeReminderSettings({}, { birthdays: false });
    const after = planReminders(people, parseReminderSettings(stored), now);
    expect(after.map((r) => r.kind)).toEqual(['anniversary']);
  });
});
