import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mocks
jest.mock('../../constants/Haptics', () => ({
  triggerHaptic: jest.fn(),
  ImpactStyle: { LIGHT: 'light', MEDIUM: 'medium', HEAVY: 'heavy' },
  HapticPatterns: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name, testID }: { name: string; testID?: string }) {
      return <Text testID={testID || `icon-${name}`}>{name}</Text>;
    },
  };
});

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

// Import after mocks
import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { OnboardingStep } from '../../components/onboarding/OnboardingStep';
import { OptionChipGrid } from '../../components/onboarding/OptionChipGrid';

// ─── ProgressDots ────────────────────────────────────────────

describe('ProgressDots (10V-I: Progress dots)', () => {
  it('renders correct number of dots', () => {
    const { getByTestId } = render(<ProgressDots total={3} activeIndex={0} />);
    expect(getByTestId('dot-0')).toBeTruthy();
    expect(getByTestId('dot-1')).toBeTruthy();
    expect(getByTestId('dot-2')).toBeTruthy();
  });

  it('active dot is wider and orange', () => {
    const { getByTestId } = render(<ProgressDots total={3} activeIndex={1} />);
    const activeDot = getByTestId('dot-1');
    const flatStyle = Array.isArray(activeDot.props.style)
      ? Object.assign({}, ...activeDot.props.style.filter(Boolean))
      : activeDot.props.style;
    expect(flatStyle.width).toBe(24);
    expect(flatStyle.backgroundColor).toBe('#fa7e12');
  });

  it('inactive dot is narrow and muted', () => {
    const { getByTestId } = render(<ProgressDots total={3} activeIndex={1} />);
    const inactiveDot = getByTestId('dot-0');
    const flatStyle = Array.isArray(inactiveDot.props.style)
      ? Object.assign({}, ...inactiveDot.props.style.filter(Boolean))
      : inactiveDot.props.style;
    expect(flatStyle.width).toBe(8);
    expect(flatStyle.backgroundColor).toBe('#D1D5DB');
  });
});

// ─── OnboardingStep ──────────────────────────────────────────

describe('OnboardingStep (10V-I: Step content)', () => {
  it('renders "Welcome" eyebrow on step 0', () => {
    const { getByText } = render(
      <OnboardingStep stepIndex={0} totalSteps={3} title="Let's get cooking" description="Set up your profile" />
    );
    expect(getByText('Welcome')).toBeTruthy();
  });

  it('renders "Step N of M" eyebrow on later steps', () => {
    const { getByText } = render(
      <OnboardingStep stepIndex={1} totalSteps={3} title="Dietary preferences" description="Tell us about your diet" />
    );
    expect(getByText('Step 1 of 3')).toBeTruthy();
  });

  it('title size is 34 on step 0', () => {
    const { getByTestId } = render(
      <OnboardingStep stepIndex={0} totalSteps={3} title="Let's get cooking" description="Desc" />
    );
    const step = getByTestId('onboarding-step-0');
    // Find title text within
    const titleText = step.children[1] as any;
    const flatStyle = Array.isArray(titleText.props.style)
      ? Object.assign({}, ...titleText.props.style.filter(Boolean))
      : titleText.props.style;
    expect(flatStyle.fontSize).toBe(34);
  });

  it('renders description', () => {
    const { getByText } = render(
      <OnboardingStep stepIndex={0} totalSteps={3} title="Title" description="Set up your Sazon profile" />
    );
    expect(getByText('Set up your Sazon profile')).toBeTruthy();
  });
});

// ─── OptionChipGrid ──────────────────────────────────────────

describe('OptionChipGrid (10V-I: Option chips)', () => {
  const options = [
    { id: 'vegan', emoji: '🌱', label: 'Vegan' },
    { id: 'gf', emoji: '🌾', label: 'Gluten-free' },
    { id: 'dairy', emoji: '🥛', label: 'Dairy-free' },
  ];

  it('renders all option chips', () => {
    const { getByText } = render(
      <OptionChipGrid options={options} selectedIds={new Set()} onToggle={jest.fn()} />
    );
    expect(getByText('Vegan')).toBeTruthy();
    expect(getByText('Gluten-free')).toBeTruthy();
    expect(getByText('Dairy-free')).toBeTruthy();
  });

  it('selected chip has orange border', () => {
    const { getByTestId } = render(
      <OptionChipGrid options={options} selectedIds={new Set(['vegan'])} onToggle={jest.fn()} />
    );
    const chip = getByTestId('chip-vegan');
    const flatStyle = Array.isArray(chip.props.style)
      ? Object.assign({}, ...chip.props.style.filter(Boolean))
      : chip.props.style;
    expect(flatStyle.borderColor).toBe('#fa7e12');
  });

  it('unselected chip has default border', () => {
    const { getByTestId } = render(
      <OptionChipGrid options={options} selectedIds={new Set()} onToggle={jest.fn()} />
    );
    const chip = getByTestId('chip-gf');
    const flatStyle = Array.isArray(chip.props.style)
      ? Object.assign({}, ...chip.props.style.filter(Boolean))
      : chip.props.style;
    expect(flatStyle.borderColor).toBe('#E5E0DA');
  });

  it('tap fires onToggle with correct id', () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <OptionChipGrid options={options} selectedIds={new Set()} onToggle={onToggle} />
    );
    fireEvent.press(getByTestId('chip-dairy'));
    expect(onToggle).toHaveBeenCalledWith('dairy');
  });

  it('renders in 2-column layout when specified', () => {
    const { getByTestId } = render(
      <OptionChipGrid options={options} selectedIds={new Set()} onToggle={jest.fn()} columns={2} />
    );
    const chip = getByTestId('chip-vegan');
    const flatStyle = Array.isArray(chip.props.style)
      ? Object.assign({}, ...chip.props.style.filter(Boolean))
      : chip.props.style;
    expect(flatStyle.width).toBe('47%');
  });
});
