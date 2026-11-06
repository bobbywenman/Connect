import { fieldsForEdit, inverseQuestion, rowFromChoice, typeQuestion } from './flow';
import { buildRelationship, sentence } from './labels';

const sarah = { first_name: 'Sarah', preferred_name: null };
const maria = { first_name: 'Maria', preferred_name: null };
const names = (id: string) => (id === 'sarah' ? sarah : id === 'maria' ? maria : undefined);

describe('step 2 phrasing', () => {
  it('words the question from the first person side', () => {
    expect(typeQuestion(sarah, maria)).toBe("Sarah is Maria's…");
    expect(inverseQuestion(sarah, maria)).toBe("and Maria is Sarah's…");
  });

  it('uses nicknames and a bare apostrophe after s', () => {
    expect(
      typeQuestion({ first_name: 'Robert', preferred_name: 'Bob' }, { first_name: 'Chris' }),
    ).toBe("Bob is Chris'…");
  });
});

describe('rowFromChoice', () => {
  it('builds a predefined row with the first person as source', () => {
    expect(rowFromChoice('sarah', 'maria', { typeId: 'parent' })).toEqual(
      buildRelationship('sarah', 'maria', 'parent'),
    );
  });

  it('keeps a different inverse label', () => {
    const row = rowFromChoice('sarah', 'maria', {
      typeId: 'custom',
      custom: { label: 'Landlord', inverseLabel: 'Tenant' },
    });
    expect(row).toMatchObject({ custom_label: 'Landlord', inverse_custom_label: 'Tenant' });
  });

  it('treats a blank inverse as the same word for both sides', () => {
    const row = rowFromChoice('sarah', 'maria', {
      typeId: 'custom',
      custom: { label: 'Teammate', inverseLabel: '   ' },
    });
    expect(row).toMatchObject({ custom_label: 'Teammate', inverse_custom_label: 'Teammate' });
  });

  it('rejects an empty custom label', () => {
    expect(() =>
      rowFromChoice('sarah', 'maria', { typeId: 'custom', custom: { label: ' ' } }),
    ).toThrow();
  });
});

describe('fieldsForEdit', () => {
  const stored = { source_person_id: 'sarah', target_person_id: 'maria' };

  it('writes the choice as is when the viewer is the source', () => {
    expect(fieldsForEdit(stored, 'sarah', { typeId: 'parent' })).toEqual({
      type: 'parent',
      inverse_type: 'child',
      custom_label: null,
      inverse_custom_label: null,
    });
  });

  it('swaps the sides when the viewer is the target, so the row reads the same from the viewer', () => {
    // Maria is viewing: "Maria is Sarah's parent" is stored as Sarah (source) is Maria's child.
    const fields = fieldsForEdit(stored, 'maria', { typeId: 'parent' });
    expect(fields).toEqual({
      type: 'child',
      inverse_type: 'parent',
      custom_label: null,
      inverse_custom_label: null,
    });
    const row = { ...stored, ...fields };
    expect(sentence(row, 'maria', names)).toBe("Maria is Sarah's parent");
    expect(sentence(row, 'sarah', names)).toBe("Sarah is Maria's child");
  });

  it('swaps custom labels with the sides', () => {
    const fields = fieldsForEdit(stored, 'maria', {
      typeId: 'custom',
      custom: { label: 'Landlord', inverseLabel: 'Tenant' },
    });
    expect(fields).toEqual({
      type: 'custom',
      inverse_type: 'custom',
      custom_label: 'Tenant',
      inverse_custom_label: 'Landlord',
    });
    const row = { ...stored, ...fields };
    expect(sentence(row, 'maria', names)).toBe("Maria is Sarah's landlord");
    expect(sentence(row, 'sarah', names)).toBe("Sarah is Maria's tenant");
  });

  it('is its own inverse for symmetric types', () => {
    expect(fieldsForEdit(stored, 'maria', { typeId: 'friend' })).toEqual(
      fieldsForEdit(stored, 'sarah', { typeId: 'friend' }),
    );
  });

  it('rejects a viewer who is not part of the relationship', () => {
    expect(() => fieldsForEdit(stored, 'zed', { typeId: 'friend' })).toThrow();
  });
});
