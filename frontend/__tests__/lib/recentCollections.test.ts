// frontend/__tests__/lib/recentCollections.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRecentCollectionIds, recordRecentCollections } from '../../lib/recentCollections';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

describe('recentCollections', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getRecentCollectionIds', () => {
    it('returns empty array when key is missing', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      expect(await getRecentCollectionIds()).toEqual([]);
    });

    it('returns parsed array from storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['a', 'b', 'c']));
      expect(await getRecentCollectionIds()).toEqual(['a', 'b', 'c']);
    });

    it('returns empty array on parse error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-json');
      expect(await getRecentCollectionIds()).toEqual([]);
    });
  });

  describe('recordRecentCollections', () => {
    it('prepends new ids to the front (MRU order)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['x', 'y']));
      await recordRecentCollections(['a', 'b']);
      const saved = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(saved.slice(0, 2)).toEqual(['a', 'b']);
      expect(saved).toContain('x');
      expect(saved).toContain('y');
    });

    it('de-duplicates: existing id moves to front', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['x', 'a', 'y']));
      await recordRecentCollections(['a']);
      const saved = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(saved[0]).toBe('a');
      expect(saved.filter((id: string) => id === 'a')).toHaveLength(1);
    });

    it('caps the list at 10 entries', async () => {
      const existing = ['1','2','3','4','5','6','7','8','9','10'];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));
      await recordRecentCollections(['new']);
      const saved = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(saved).toHaveLength(10);
      expect(saved[0]).toBe('new');
    });

    it('handles empty ids gracefully (no-op save)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await recordRecentCollections([]);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });
});
