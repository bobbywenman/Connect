import type { PersonWithNetworks } from './api';
import { defaultNetworkIds, personToFormInput } from './formValues';
import { createPersonFormSchema } from './schemas';

const person = {
  id: 'p1',
  first_name: 'Ana',
  last_name: null,
  preferred_name: 'A',
  pronouns: null,
  birthdate: '1990-04-23',
  birthday_reminder: true,
  anniversary_date: null,
  anniversary_reminder: false,
  location_city: 'Leeds',
  job_title: null,
  company: 'NHS',
  department: null,
  notes: null,
  tags: ['golf'],
  fun_facts: null,
  conversation_starters: null,
  networkIds: ['n1', 'n2'],
} as unknown as PersonWithNetworks;

describe('personToFormInput', () => {
  it('maps nulls to empty strings and round-trips through the schema', () => {
    const input = personToFormInput(person);
    expect(input).toMatchObject({ firstName: 'Ana', lastName: '', jobTitle: '', tags: ['golf'] });
    const out = createPersonFormSchema().parse(input);
    expect(out).toMatchObject({
      firstName: 'Ana',
      lastName: null,
      birthdate: '1990-04-23',
      birthdayReminder: true,
      locationCity: 'Leeds',
      networkIds: ['n1', 'n2'],
    });
  });
});

describe('defaultNetworkIds', () => {
  const networks = [{ id: 'n1' }, { id: 'n2' }];
  it('uses the network the user came from', () => {
    expect(defaultNetworkIds(networks, 'n2')).toEqual(['n2']);
  });
  it('ignores an unknown network id', () => {
    expect(defaultNetworkIds(networks, 'zzz')).toEqual([]);
  });
  it('picks the only network when there is one', () => {
    expect(defaultNetworkIds([{ id: 'n1' }], undefined)).toEqual(['n1']);
  });
});
