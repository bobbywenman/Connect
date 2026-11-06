import { supabase } from '@/lib/supabase';

import { updateReminderSettings } from './api';

const from = supabase.from as unknown as jest.Mock;
let originalFrom: ReturnType<typeof from.getMockImplementation>;

const USER = '00000000-0000-0000-0000-000000000001';
let row: { settings: unknown } | null;
let writes: { values: { settings: unknown }; id: string }[];
let writeError: Error | null;

beforeEach(() => {
  row = {
    settings: { theme: 'dark', reminders: { birthdays: true, legacy: 1 }, nested: { a: 1 } },
  };
  writes = [];
  writeError = null;
  originalFrom = from.getMockImplementation();
  from.mockImplementation((table: string) => {
    if (table !== 'profiles') return originalFrom?.(table);
    return {
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }),
      }),
      update: (values: { settings: unknown }) => ({
        eq: async (_column: string, id: string) => {
          writes.push({ values, id });
          if (writeError) return { error: writeError };
          row = { settings: values.settings };
          return { error: null };
        },
      }),
    };
  });
});

afterEach(() => {
  from.mockImplementation(originalFrom);
});

describe('updateReminderSettings', () => {
  it('merges the patch into profiles.settings.reminders and keeps every other key', async () => {
    await updateReminderSettings(USER, { leadDays: 3 });

    expect(writes).toEqual([
      {
        id: USER,
        values: {
          settings: {
            theme: 'dark',
            nested: { a: 1 },
            reminders: { birthdays: true, legacy: 1, leadDays: 3 },
          },
        },
      },
    ]);
  });

  it('writes a patch onto settings that have no reminders yet', async () => {
    row = { settings: {} };
    await updateReminderSettings(USER, { monthlySummary: true });
    expect(writes[0]?.values.settings).toEqual({ reminders: { monthlySummary: true } });
  });

  it('throws when the write fails', async () => {
    writeError = new Error('network down');
    await expect(updateReminderSettings(USER, { hour: 8 })).rejects.toThrow('network down');
  });
});
