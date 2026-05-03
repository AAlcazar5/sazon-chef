// backend/__tests__/services/householdRosterService.test.ts

import {
  listHouseholdMembers,
  createHouseholdMember,
  updateHouseholdMember,
  deleteHouseholdMember,
} from '../../src/services/householdRosterService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('householdRosterService', () => {
  describe('listHouseholdMembers', () => {
    it('returns members scoped to user, parsed from JSON columns', async () => {
      mockPrisma.householdMember.findMany.mockResolvedValueOnce([
        {
          id: 'm1',
          userId: 'u1',
          displayName: 'Mia',
          ageBand: 'kid',
          pickinessLevel: 3,
          dietaryFlags: JSON.stringify(['no_spicy']),
          bannedComponentIds: JSON.stringify(['s_chimichurri']),
          createdAt: new Date('2026-05-01'),
          updatedAt: new Date('2026-05-01'),
        },
      ]);
      const result = await listHouseholdMembers('u1');
      expect(mockPrisma.householdMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result[0].dietaryFlags).toEqual(['no_spicy']);
      expect(result[0].bannedComponentIds).toEqual(['s_chimichurri']);
    });

    it('returns empty list when no members exist', async () => {
      mockPrisma.householdMember.findMany.mockResolvedValueOnce([]);
      expect(await listHouseholdMembers('u1')).toEqual([]);
    });
  });

  describe('createHouseholdMember', () => {
    it('rejects empty displayName', async () => {
      await expect(
        createHouseholdMember('u1', { displayName: '', ageBand: 'kid' }),
      ).rejects.toThrow(/displayName/i);
      expect(mockPrisma.householdMember.create).not.toHaveBeenCalled();
    });

    it('rejects invalid ageBand', async () => {
      await expect(
        createHouseholdMember('u1', { displayName: 'Mia', ageBand: 'baby' as any }),
      ).rejects.toThrow(/ageBand/i);
    });

    it('rejects pickinessLevel out of range', async () => {
      await expect(
        createHouseholdMember('u1', { displayName: 'Mia', ageBand: 'kid', pickinessLevel: 99 }),
      ).rejects.toThrow(/pickinessLevel/i);
    });

    it('serializes JSON arrays + applies defaults', async () => {
      mockPrisma.householdMember.create.mockResolvedValueOnce({
        id: 'm1',
        userId: 'u1',
        displayName: 'Mia',
        ageBand: 'kid',
        pickinessLevel: 0,
        dietaryFlags: '[]',
        bannedComponentIds: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await createHouseholdMember('u1', { displayName: 'Mia', ageBand: 'kid' });
      const args = mockPrisma.householdMember.create.mock.calls[0][0].data;
      expect(args.userId).toBe('u1');
      expect(args.pickinessLevel).toBe(0);
      expect(args.dietaryFlags).toBe('[]');
      expect(args.bannedComponentIds).toBe('[]');
    });
  });

  describe('updateHouseholdMember', () => {
    it('throws when member not owned by user (IDOR guard)', async () => {
      mockPrisma.householdMember.findUnique.mockResolvedValueOnce({
        id: 'm1',
        userId: 'someone-else',
        displayName: 'X',
        ageBand: 'adult',
        pickinessLevel: 0,
        dietaryFlags: '[]',
        bannedComponentIds: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await expect(
        updateHouseholdMember('u1', 'm1', { displayName: 'Hacked' }),
      ).rejects.toThrow(/forbidden|not found/i);
      expect(mockPrisma.householdMember.update).not.toHaveBeenCalled();
    });

    it('throws when member does not exist', async () => {
      mockPrisma.householdMember.findUnique.mockResolvedValueOnce(null);
      await expect(updateHouseholdMember('u1', 'ghost', {})).rejects.toThrow(/not found/i);
    });

    it('merges partial update with existing values', async () => {
      mockPrisma.householdMember.findUnique.mockResolvedValueOnce({
        id: 'm1',
        userId: 'u1',
        displayName: 'Mia',
        ageBand: 'kid',
        pickinessLevel: 2,
        dietaryFlags: JSON.stringify(['no_spicy']),
        bannedComponentIds: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.householdMember.update.mockResolvedValueOnce({
        id: 'm1',
        userId: 'u1',
        displayName: 'Mia',
        ageBand: 'kid',
        pickinessLevel: 4,
        dietaryFlags: JSON.stringify(['no_spicy']),
        bannedComponentIds: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await updateHouseholdMember('u1', 'm1', { pickinessLevel: 4 });
      const args = mockPrisma.householdMember.update.mock.calls[0][0].data;
      // existing displayName/ageBand/dietaryFlags preserved; pickiness updated
      expect(args.displayName).toBe('Mia');
      expect(args.ageBand).toBe('kid');
      expect(args.pickinessLevel).toBe(4);
      expect(args.dietaryFlags).toBe(JSON.stringify(['no_spicy']));
    });
  });

  describe('deleteHouseholdMember', () => {
    it('IDOR guard — refuses to delete a member owned by another user', async () => {
      mockPrisma.householdMember.findUnique.mockResolvedValueOnce({
        id: 'm1',
        userId: 'someone-else',
      });
      await expect(deleteHouseholdMember('u1', 'm1')).rejects.toThrow(/forbidden|not found/i);
      expect(mockPrisma.householdMember.delete).not.toHaveBeenCalled();
    });

    it('deletes the member when ownership checks pass', async () => {
      mockPrisma.householdMember.findUnique.mockResolvedValueOnce({ id: 'm1', userId: 'u1' });
      mockPrisma.householdMember.delete.mockResolvedValueOnce({ id: 'm1' });
      await deleteHouseholdMember('u1', 'm1');
      expect(mockPrisma.householdMember.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    });
  });
});
