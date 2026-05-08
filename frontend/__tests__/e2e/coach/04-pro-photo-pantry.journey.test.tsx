// frontend/__tests__/e2e/coach/04-pro-photo-pantry.journey.test.tsx
//
// Journey 4 — Pro happy path: photo attachment → PantryConfirmSheet
//
// Flow:
//   Open Coach (Pro tier) → enter conversation view
//   → tap paperclip (Pro — no lock) → action sheet appears
//   → pick "Photo Library" → AttachmentBar shows thumbnail
//   → send message → assistant streams reply
//   → extractPantryFromImage resolves with ingredients
//   → PantryConfirmSheet appears with detected items
//   → tap "Add to pantry" → pantryApi.addMany called → sheet closes

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { makeConversation, textStream } from '../../../test-utils/coach/journey.helpers';

// ─── Module mocks ────────────────────────────────────────────────────────────

const mockListConversations = jest.fn();
const mockCreateConversation = jest.fn();
const mockStreamMessage = jest.fn();
const mockExtractPantry = jest.fn();
const mockPantryAddMany = jest.fn();
const mockPickFromLibrary = jest.fn();

jest.mock('../../../lib/api', () => ({
  coachApi: {
    listConversations: (...a: unknown[]) => mockListConversations(...a),
    createConversation: (...a: unknown[]) => mockCreateConversation(...a),
    streamMessage: (...a: unknown[]) => mockStreamMessage(...a),
    extractPantryFromImage: (...a: unknown[]) => mockExtractPantry(...a),
    getConversation: jest.fn(),
  },
  pantryApi: {
    addMany: (...a: unknown[]) => mockPantryAddMany(...a),
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

// Attachment hook returns a photo once pickFromLibrary is called.
const mockAttachments: any[] = [];
const mockClear = jest.fn();
const mockRemove = jest.fn();

jest.mock('../../../hooks/useCoachAttachments', () => ({
  useCoachAttachments: () => ({
    attachments: mockAttachments,
    canAdd: true,
    clear: mockClear,
    remove: mockRemove,
    pickFromCamera: jest.fn(),
    pickFromLibrary: mockPickFromLibrary,
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

// expo-image-picker is mocked inside useCoachAttachments — not needed here.

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

const DETECTED_INGREDIENTS = [
  { name: 'chicken thighs', confidence: 0.95 },
  { name: 'broccoli', confidence: 0.88 },
];

describe('Journey 4 — Pro photo attachment → PantryConfirmSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAttachments.length = 0;
    mockListConversations.mockResolvedValue([]);
    mockCreateConversation.mockResolvedValue(makeConversation({ tier: 'premium' }));
    mockStreamMessage.mockReturnValue(textStream(["Looks great! Here's a plate idea."]));
    mockExtractPantry.mockResolvedValue({ ingredients: DETECTED_INGREDIENTS });
    mockPantryAddMany.mockResolvedValue({ added: DETECTED_INGREDIENTS.length });
  });

  it('J4.1 — Pro paperclip shows no lock badge', async () => {
    const { findByText, getByLabelText } = render(<CoachScreen />);
    const chip = await findByText("Try a persian dish I haven't yet");  // chip auto-sends per S0.1 — but the test wants to assert on user-typed input, so don\'t tap

    await waitFor(() => {
      // Pro label: "Attach a photo" (no "(Pro only)" suffix)
      expect(getByLabelText('Attach a photo')).toBeTruthy();
    });
  });

  it('J4.2 — after send with photo, PantryConfirmSheet appears with detected items', async () => {
    // Simulate a photo already attached when the coach sends.
    mockAttachments.push({
      uri: 'file://photo.jpg',
      base64: 'BASE64DATA',
      mediaType: 'image/jpeg',
    });

    const { findByText, getByPlaceholderText, getByLabelText, findByLabelText } = render(
      <CoachScreen />,
    );

    const chip = await findByText("Try a persian dish I haven't yet");  // chip auto-sends per S0.1 — but the test wants to assert on user-typed input, so don\'t tap

    const composer = getByPlaceholderText(/Tell me what you're hungry for/i);
    fireEvent.changeText(composer, "What can I make with this?");
    fireEvent.press(getByLabelText('Send message to coach'));

    // PantryConfirmSheet should appear after the stream + extraction complete.
    const sheet = await findByLabelText('Pantry confirm sheet');
    expect(sheet).toBeTruthy();

    // Ingredient names should be listed.
    await waitFor(async () => {
      expect(await findByText(/chicken thighs/i)).toBeTruthy();
      expect(await findByText(/broccoli/i)).toBeTruthy();
    });
  });

  it('J4.3 — tapping "Add to pantry" calls pantryApi.addMany and closes the sheet', async () => {
    mockAttachments.push({
      uri: 'file://photo.jpg',
      base64: 'BASE64DATA',
      mediaType: 'image/jpeg',
    });

    const { findByText, getByPlaceholderText, getByLabelText, findByLabelText, queryByLabelText } =
      render(<CoachScreen />);

    const chip = await findByText("Try a persian dish I haven't yet");  // chip auto-sends per S0.1 — but the test wants to assert on user-typed input, so don\'t tap

    const composer = getByPlaceholderText(/Tell me what you're hungry for/i);
    fireEvent.changeText(composer, "What can I make with this?");
    fireEvent.press(getByLabelText('Send message to coach'));

    await findByLabelText('Pantry confirm sheet');

    fireEvent.press(getByLabelText('Add to pantry'));

    await waitFor(() => {
      expect(mockPantryAddMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'chicken thighs' }),
          expect.objectContaining({ name: 'broccoli' }),
        ]),
      );
    });

    await waitFor(() => {
      expect(queryByLabelText('Pantry confirm sheet')).toBeNull();
    });
  });
});
