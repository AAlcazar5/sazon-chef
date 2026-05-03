// Phase 5 (10Y-E): Coach screen paperclip behavior — free tier opens paywall;
// Pro tier opens the picker action sheet.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ActionSheetIOS, Platform, Alert } from 'react-native';

const mockSubscription = { tier: 'free', isPremium: false };
jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscription: mockSubscription,
    startCheckout: jest.fn(),
    checkoutLoading: false,
  }),
}));

jest.mock('../../../lib/api', () => ({
  coachApi: {
    listConversations: jest.fn().mockResolvedValue([]),
    getConversation: jest.fn(),
    createConversation: jest.fn(),
    streamMessage: jest.fn(),
    extractPantryFromImage: jest.fn(),
  },
  pantryApi: {
    addMany: jest.fn(),
  },
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
    expressionToSazon: () => ({ variant: 'orange', motion: 'kiss', fx: ['hearts'] }),
    SAZON_SIZE_PX: { tiny: 24, xsmall: 36, small: 48, medium: 96, large: 192, hero: 256 },
    default: function MockSazon() {
      return <Text testID="mascot">chef-kiss</Text>;
    },
  };
});

jest.mock('../../../components/mascot/LogoMascot', () => {
  const { View } = require('react-native');
  return function MockLogoMascot() { return <View testID="logo-mascot" />; };
});

jest.mock('../../../hooks/useFoodIntelUserState', () => ({
  __esModule: true,
  default: () => ({
    userId: 'u1',
    cookHistory: { cuisines: [] },
    topAffinityIngredients: [],
    rolling7dNutrientGaps: [],
    skillTier: 'cook',
    goalPhase: 'maintain',
    last7DaysIngredients: [],
  }),
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

const mockPickFromCamera = jest.fn().mockResolvedValue(null);
const mockPickFromLibrary = jest.fn().mockResolvedValue(null);
jest.mock('../../../hooks/useCoachAttachments', () => {
  const ACTUAL = jest.requireActual('../../../hooks/useCoachAttachments');
  return {
    ...ACTUAL,
    useCoachAttachments: () => ({
      attachments: [],
      pickFromCamera: mockPickFromCamera,
      pickFromLibrary: mockPickFromLibrary,
      remove: jest.fn(),
      clear: jest.fn(),
      canAdd: true,
    }),
  };
});

import CoachScreen from '../../../app/(tabs)/coach';

describe('Coach paperclip — photo attachment entry point', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscription.tier = 'free';
    mockSubscription.isPremium = false;
  });

  it('free tier: tapping paperclip surfaces the photos paywall sheet (no picker)', async () => {
    const { findByLabelText, findByText } = render(<CoachScreen />);
    // Open a fresh conversation so the composer is visible.
    const newBtn = await findByLabelText('New coach conversation');
    fireEvent.press(newBtn);

    const paperclip = await findByLabelText(/Attach a photo \(Pro only\)/i);
    fireEvent.press(paperclip);

    // The CoachPaywallSheet renders the photos headline.
    await waitFor(async () => {
      expect(await findByText(/Snap your fridge/i)).toBeTruthy();
    });
    expect(mockPickFromCamera).not.toHaveBeenCalled();
    expect(mockPickFromLibrary).not.toHaveBeenCalled();
  });

  it('Pro tier (iOS): tapping paperclip opens the camera/library action sheet', async () => {
    mockSubscription.tier = 'premium';
    mockSubscription.isPremium = true;
    Platform.OS = 'ios';
    const showSheetSpy = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation(() => {});

    const { findByLabelText } = render(<CoachScreen />);
    const newBtn = await findByLabelText('New coach conversation');
    fireEvent.press(newBtn);

    const paperclip = await findByLabelText('Attach a photo');
    fireEvent.press(paperclip);

    expect(showSheetSpy).toHaveBeenCalledTimes(1);
    const opts = showSheetSpy.mock.calls[0][0];
    expect(opts.options).toEqual(['Cancel', 'Camera', 'Photo Library']);

    showSheetSpy.mockRestore();
  });

  it('Pro tier (Android): tapping paperclip opens an Alert with Camera + Library options', async () => {
    mockSubscription.tier = 'premium';
    mockSubscription.isPremium = true;
    Platform.OS = 'android';
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { findByLabelText } = render(<CoachScreen />);
    const newBtn = await findByLabelText('New coach conversation');
    fireEvent.press(newBtn);

    const paperclip = await findByLabelText('Attach a photo');
    fireEvent.press(paperclip);

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string }>;
    expect(buttons.map(b => b.text)).toEqual(['Camera', 'Photo Library', 'Cancel']);

    alertSpy.mockRestore();
  });
});
