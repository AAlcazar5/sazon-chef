// frontend/__tests__/components/CookingStepsTimeline.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import CookingStepsTimeline from '../../components/recipe/CookingStepsTimeline';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

describe('CookingStepsTimeline', () => {
  const mockSteps = [
    'Preheat oven to 350°F',
    'Mix dry ingredients in a bowl',
    'Add wet ingredients and stir',
    'Pour into baking dish',
    'Bake for 25 minutes',
  ];

  it('renders all steps', () => {
    const { getByText } = render(
      <CookingStepsTimeline steps={mockSteps} />
    );
    mockSteps.forEach((step) => {
      expect(getByText(step)).toBeTruthy();
    });
  });

  it('renders with 1 step', () => {
    const { getByText } = render(
      <CookingStepsTimeline steps={['Only step']} />
    );
    expect(getByText('Only step')).toBeTruthy();
  });

  it('renders with 10+ steps without crashing', () => {
    const manySteps = Array.from({ length: 12 }, (_, i) => `Step ${i + 1}`);
    const { getByText } = render(
      <CookingStepsTimeline steps={manySteps} />
    );
    expect(getByText('Step 1')).toBeTruthy();
    expect(getByText('Step 12')).toBeTruthy();
  });

  it('accepts activeStep and completedSteps props', () => {
    const completed = new Set([0, 1]);
    const { getByText } = render(
      <CookingStepsTimeline
        steps={mockSteps}
        activeStep={2}
        completedSteps={completed}
      />
    );
    // Should render all steps regardless of state
    expect(getByText('Mix dry ingredients in a bowl')).toBeTruthy();
    expect(getByText('Add wet ingredients and stir')).toBeTruthy();
  });

  it('renders with testID', () => {
    const { getByTestId } = render(
      <CookingStepsTimeline steps={mockSteps} testID="timeline" />
    );
    expect(getByTestId('timeline')).toBeTruthy();
  });
});
