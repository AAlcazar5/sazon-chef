// frontend/__tests__/e2e/coach/07-conversation-export-pro.journey.test.tsx
//
// Journey 7 — Conversation export (Pro)
//
// Flow:
//   Open Coach (Pro) → enter active conversation (has a conversationId)
//   → tap the download icon in the header
//   → coachApi.exportConversation called
//   → Share.share invoked with the returned markdown

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { makeConversation } from '../../../test-utils/coach/journey.helpers';

// ─── Module mocks ────────────────────────────────────────────────────────────

const mockListConversations = jest.fn();
const mockGetConversation = jest.fn();
const mockExportConversation = jest.fn();
const mockStreamMessage = jest.fn();

jest.mock('../../../lib/api', () => ({
  coachApi: {
    listConversations: (...a: unknown[]) => mockListConversations(...a),
    createConversation: jest.fn(),
    streamMessage: (...a: unknown[]) => mockStreamMessage(...a),
    getConversation: (...a: unknown[]) => mockGetConversation(...a),
    exportConversation: (...a: unknown[]) => mockExportConversation(...a),
  },
}));

jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscription: { tier: 'premium', isPremium: true },
    startCheckout: jest.fn(),
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../../hooks/useFoodIntelUserState', () => ({
  useFoodIntelUserState: () => ({
    userId: 'u1',
    cookHistory: { cuisines: [] },
    topAffinityIngredients: [],
    rolling7dNutrientGaps: [],
    skillTier: 'cook',
    goalPhase: 'maintain',
    last7DaysIngredients: [],
  }),
}));

jest.mock('../../../hooks/useCoachMemoryCount', () => ({
  useCoachMemoryCount: () => 0,
}));

jest.mock('../../../hooks/useCoachAttachments', () => ({
  useCoachAttachments: () => ({
    attachments: [],
    canAdd: true,
    clear: jest.fn(),
    remove: jest.fn(),
    pickFromCamera: jest.fn(),
    pickFromLibrary: jest.fn(),
  }),
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../components/mascot/Sazon', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    expressionToSazon: () => ({ variant: 'orange', motion: 'kiss', fx: [] }),
    SAZON_SIZE_PX: { tiny: 24, xsmall: 36, small: 48, medium: 96, large: 192, hero: 256 },
    default: function MockSazon() { return <Text testID="mascot">chef-kiss</Text>; },
  };
});

jest.mock('../../../components/mascot/LogoMascot', () => {
  const { View } = require('react-native');
  return function MockLogoMascot() { return <View testID="logo-mascot" />; };
});

jest.mock('../../../lib/coachAnalytics', () => ({ emit: jest.fn() }));

jest.mock('../../../hooks/useCoachQuickChipContext', () => ({
  __esModule: true,
  useCoachQuickChipContext: () => ({
    pantryExpiringSoon: ['rice'],
    remainingMacros: { calories: 320, protein: 0, carbs: 0, fat: 0 },
    leftoverInventory: [],
    topAdjacentCuisine: 'persian',
  }),
  default: () => ({
    pantryExpiringSoon: ['rice'],
    remainingMacros: { calories: 320, protein: 0, carbs: 0, fat: 0 },
    leftoverInventory: [],
    topAdjacentCuisine: 'persian',
  }),
}));

import CoachScreen from '../../../app/(tabs)/coach';

// ─── Journey ─────────────────────────────────────────────────────────────────

const MARKDOWN_EXPORT = `# Sazon\n\n**User:** Got chicken thighs\n\n**Sazon:** Here's what I'd make...`;

describe('Journey 7 — Conversation export (Pro)', () => {
  let shareSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);

    // Existing conversation so the export button renders (requires a conversationId).
    mockListConversations.mockResolvedValue([
      makeConversation({ id: 'conv_export', title: 'Chicken night', tier: 'premium' }),
    ]);
    mockGetConversation.mockResolvedValue({
      id: 'conv_export',
      title: 'Chicken night',
      tier: 'premium',
      createdAt: '2026-05-03T00:00:00Z',
      lastMessageAt: '2026-05-03T12:00:00Z',
      messages: [
        { id: 'm1', role: 'user', content: 'Got chicken thighs', createdAt: '2026-05-03T12:00:00Z' },
        { id: 'm2', role: 'assistant', content: "Here's what I'd make...", createdAt: '2026-05-03T12:01:00Z' },
      ],
    });
    mockExportConversation.mockResolvedValue(MARKDOWN_EXPORT);
  });

  afterEach(() => {
    shareSpy.mockRestore();
  });

  it('J7.1 — download icon is visible when Pro user has an active conversation', async () => {
    const { findByText, getByLabelText } = render(<CoachScreen />);
    // S15.1 default view = conversation; tap the history icon to surface the thread list.
    fireEvent.press(getByLabelText('View conversation history'));
    const row = await findByText('Chicken night');
    fireEvent.press(row);

    await waitFor(() => {
      expect(getByLabelText('Export conversation')).toBeTruthy();
    });
  });

  it('J7.2 — tapping download calls exportConversation with the correct conversationId', async () => {
    const { findByText, getByLabelText } = render(<CoachScreen />);

    fireEvent.press(getByLabelText('View conversation history'));
    const row = await findByText('Chicken night');
    fireEvent.press(row);

    await waitFor(() => getByLabelText('Export conversation'));
    fireEvent.press(getByLabelText('Export conversation'));

    await waitFor(() => {
      expect(mockExportConversation).toHaveBeenCalledWith('conv_export');
    });
  });

  it('J7.3 — Share.share is called with the markdown returned by the API', async () => {
    const { findByText, getByLabelText } = render(<CoachScreen />);

    fireEvent.press(getByLabelText('View conversation history'));
    const row = await findByText('Chicken night');
    fireEvent.press(row);

    await waitFor(() => getByLabelText('Export conversation'));
    fireEvent.press(getByLabelText('Export conversation'));

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: MARKDOWN_EXPORT }),
      );
    });
  });

  it('J7.4 — export button is absent when there is no active conversationId (new chat)', async () => {
    mockListConversations.mockResolvedValue([]);

    const { findByText, queryByLabelText, getByLabelText } = render(<CoachScreen />);

    // Enter a new conversation (no id yet).
    const chip = await findByText("Try a persian dish I haven't yet");
    fireEvent.press(chip);

    await waitFor(() => {
      // ConversationExport renders null when conversationId is null.
      expect(queryByLabelText('Export conversation')).toBeNull();
    });
  });
});
