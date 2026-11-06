import { fakeSupabase } from '@/test-utils/fakeSupabase';

import { listCustomRelationshipTypes, saveCustomRelationshipType } from './api';

describe('custom relationship types api', () => {
  beforeEach(() => {
    fakeSupabase.reset();
  });

  describe('listCustomRelationshipTypes', () => {
    it('returns the user rows ordered by label', async () => {
      fakeSupabase.setCustomRelationshipTypes([
        { label: 'Tenant', inverse_label: 'Landlord' },
        { label: 'Landlord', inverse_label: 'Tenant' },
        { label: 'Coach', inverse_label: 'Athlete' },
      ]);

      const rows = await listCustomRelationshipTypes();

      expect(rows.map((r) => r.label)).toEqual(['Coach', 'Landlord', 'Tenant']);
      expect(rows[0]).toMatchObject({ label: 'Coach', inverse_label: 'Athlete' });
    });

    it('returns an empty array when the user has no custom labels', async () => {
      await expect(listCustomRelationshipTypes()).resolves.toEqual([]);
    });

    it('throws the database error', async () => {
      const error = new Error('network down');
      fakeSupabase.setCustomRelationshipTypesError(error);

      await expect(listCustomRelationshipTypes()).rejects.toBe(error);
    });
  });

  describe('saveCustomRelationshipType', () => {
    it('inserts a new pair with trimmed labels and returns the saved row', async () => {
      const row = await saveCustomRelationshipType({
        label: '  Landlord ',
        inverseLabel: ' Tenant  ',
      });

      expect(row).toMatchObject({
        label: 'Landlord',
        inverse_label: 'Tenant',
        owner_id: fakeSupabase.DEMO_USER_ID,
      });
      expect(fakeSupabase.getCustomRelationshipTypes()).toHaveLength(1);
    });

    it('is a no-op when the same pair already exists, ignoring case', async () => {
      fakeSupabase.setCustomRelationshipTypes([{ label: 'Landlord', inverse_label: 'Tenant' }]);

      const row = await saveCustomRelationshipType({
        label: 'landlord',
        inverseLabel: 'TENANT',
      });

      expect(row).toMatchObject({ label: 'Landlord', inverse_label: 'Tenant' });
      expect(fakeSupabase.getCustomRelationshipTypes()).toHaveLength(1);
    });

    it('keeps the saved entry when a label is reused with a different inverse', async () => {
      fakeSupabase.setCustomRelationshipTypes([{ label: 'Landlord', inverse_label: 'Tenant' }]);

      const row = await saveCustomRelationshipType({ label: 'Landlord', inverseLabel: 'Renter' });

      expect(row).toMatchObject({ label: 'Landlord', inverse_label: 'Tenant' });
      expect(fakeSupabase.getCustomRelationshipTypes()).toHaveLength(1);
    });

    it('rejects an empty label after trimming', async () => {
      await expect(
        saveCustomRelationshipType({ label: '   ', inverseLabel: 'Tenant' }),
      ).rejects.toThrow('Label is required.');
    });

    it('rejects an empty inverse label', async () => {
      await expect(
        saveCustomRelationshipType({ label: 'Landlord', inverseLabel: '' }),
      ).rejects.toThrow('Inverse label is required.');
    });

    it('rejects a label longer than 50 characters', async () => {
      await expect(
        saveCustomRelationshipType({ label: 'a'.repeat(51), inverseLabel: 'Tenant' }),
      ).rejects.toThrow('Label must be 50 characters or fewer.');
      expect(fakeSupabase.getCustomRelationshipTypes()).toHaveLength(0);
    });

    it('accepts exactly 50 characters and counts code points, not UTF-16 units', async () => {
      const fifty = '😀'.repeat(50);
      await expect(
        saveCustomRelationshipType({ label: fifty, inverseLabel: 'Friend' }),
      ).resolves.toMatchObject({ label: fifty });
      await expect(
        saveCustomRelationshipType({ label: '😀'.repeat(51), inverseLabel: 'Friend' }),
      ).rejects.toThrow('must be 50 characters or fewer');
    });

    it('rejects an inverse label longer than 50 characters', async () => {
      await expect(
        saveCustomRelationshipType({ label: 'Landlord', inverseLabel: 'b'.repeat(51) }),
      ).rejects.toThrow('Inverse label must be 50 characters or fewer.');
    });

    it('throws the database error when the insert fails', async () => {
      fakeSupabase.setCustomRelationshipTypesError(new Error('insert blocked'));

      await expect(
        saveCustomRelationshipType({ label: 'Landlord', inverseLabel: 'Tenant' }),
      ).rejects.toThrow('insert blocked');
    });
  });
});
