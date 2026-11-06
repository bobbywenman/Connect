import { groupEvents } from './grouping';

const e = (id: string, eventDate: string | null) => ({ id, eventDate });

describe('groupEvents', () => {
  const today = '2026-12-14';

  it('puts today in upcoming and yesterday in past', () => {
    const { upcoming, past } = groupEvents(
      [e('today', today), e('yesterday', '2026-12-13')],
      today,
    );
    expect(upcoming.map((x) => x.id)).toEqual(['today']);
    expect(past.map((x) => x.id)).toEqual(['yesterday']);
  });

  it('sorts upcoming soonest first and past most recent first', () => {
    const { upcoming, past } = groupEvents(
      [
        e('c', '2027-01-01'),
        e('old', '2025-01-01'),
        e('a', '2026-12-14'),
        e('recent', '2026-12-01'),
        e('b', '2026-12-20'),
      ],
      today,
    );
    expect(upcoming.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(past.map((x) => x.id)).toEqual(['recent', 'old']);
  });

  it('keeps undated events last in upcoming', () => {
    const { upcoming } = groupEvents(
      [e('none', null), e('a', '2026-12-20'), e('b', '2026-12-15')],
      today,
    );
    expect(upcoming.map((x) => x.id)).toEqual(['b', 'a', 'none']);
  });

  it('handles empty input and does not mutate it', () => {
    expect(groupEvents([], today)).toEqual({ upcoming: [], past: [] });
    const input = [e('b', '2026-12-20'), e('a', '2026-12-15')];
    groupEvents(input, today);
    expect(input.map((x) => x.id)).toEqual(['b', 'a']);
  });
});
