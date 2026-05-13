// P2 retention — widget sync hook smoke + cache persistence.

const mockGet = jest.fn();
const mockSet = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGet(...args),
    setItem: (...args: unknown[]) => mockSet(...args),
  },
}));

const mockWidget = jest.fn();
jest.mock('../../lib/api/today', () => ({
  todayApi: { widget: (...args: unknown[]) => mockWidget(...args) },
}));

import { syncWidgetOnce, WIDGET_STORAGE_KEY } from '../../hooks/useWidgetSync';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('syncWidgetOnce', () => {
  it('fetches the widget payload + persists it under the expected key', async () => {
    const payload = {
      recipeId: 'r1',
      title: 'Fesenjan',
      imageUrl: 'https://x/f.jpg',
      cookTime: 45,
      cuisine: 'Persian',
      eyebrow: "TONIGHT'S PLATE",
      deepLink: 'sazon://recipe/r1',
    };
    mockWidget.mockResolvedValue({ data: payload });
    const result = await syncWidgetOnce();
    expect(result).toEqual(payload);
    expect(mockSet).toHaveBeenCalledWith(WIDGET_STORAGE_KEY, JSON.stringify(payload));
  });

  it('returns null + swallows errors when the request fails', async () => {
    mockWidget.mockRejectedValue(new Error('network'));
    const result = await syncWidgetOnce();
    expect(result).toBeNull();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('does not persist when the payload is missing', async () => {
    mockWidget.mockResolvedValue({ data: null });
    const result = await syncWidgetOnce();
    expect(result).toBeNull();
    expect(mockSet).not.toHaveBeenCalled();
  });
});
