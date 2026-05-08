// ROADMAP 4.0 IA2.6 — MoreForYouSection cap component tests.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key) => mockGet(key)),
  setItem: jest.fn((k, v) => mockSet(k, v)),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import MoreForYouSection from '../../../components/today/MoreForYouSection';

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(null);
});

describe('MoreForYouSection', () => {
  it('renders the first INITIAL_VISIBLE children when collapsed (default 2)', async () => {
    const { findByText, queryByText } = render(
      <MoreForYouSection>
        <Text>Card 1</Text>
        <Text>Card 2</Text>
        <Text>Card 3</Text>
        <Text>Card 4</Text>
      </MoreForYouSection>,
    );
    await findByText('Card 1');
    expect(queryByText('Card 2')).toBeTruthy();
    expect(queryByText('Card 3')).toBeNull();
    expect(queryByText('Card 4')).toBeNull();
  });

  it('renders the toggle with the hidden count', async () => {
    const { findByText } = render(
      <MoreForYouSection>
        <Text>Card 1</Text>
        <Text>Card 2</Text>
        <Text>Card 3</Text>
        <Text>Card 4</Text>
      </MoreForYouSection>,
    );
    expect(await findByText(/More for you \(2\)/)).toBeTruthy();
  });

  it('expands when toggle pressed; reveals all children', async () => {
    const { findByTestId, queryByText } = render(
      <MoreForYouSection>
        <Text>Card 1</Text>
        <Text>Card 2</Text>
        <Text>Card 3</Text>
        <Text>Card 4</Text>
      </MoreForYouSection>,
    );
    const toggle = await findByTestId('more-for-you-toggle');
    fireEvent.press(toggle);
    await waitFor(() => {
      expect(queryByText('Card 3')).toBeTruthy();
      expect(queryByText('Card 4')).toBeTruthy();
    });
  });

  it('persists expanded preference to AsyncStorage', async () => {
    const { findByTestId } = render(
      <MoreForYouSection>
        <Text>Card 1</Text>
        <Text>Card 2</Text>
        <Text>Card 3</Text>
      </MoreForYouSection>,
    );
    const toggle = await findByTestId('more-for-you-toggle');
    fireEvent.press(toggle);
    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith(
        '@sazon/today/more-for-you-expanded',
        '1',
      );
    });
  });

  it('starts expanded if AsyncStorage indicates user previously expanded', async () => {
    mockGet.mockResolvedValue('1');
    const { findByText } = render(
      <MoreForYouSection>
        <Text>Card 1</Text>
        <Text>Card 2</Text>
        <Text>Card 3</Text>
      </MoreForYouSection>,
    );
    expect(await findByText('Card 3')).toBeTruthy();
  });

  it('hides toggle when no overflow children', async () => {
    const { queryByTestId, findByText } = render(
      <MoreForYouSection>
        <Text>Card 1</Text>
        <Text>Card 2</Text>
      </MoreForYouSection>,
    );
    await findByText('Card 1');
    expect(queryByTestId('more-for-you-toggle')).toBeNull();
  });

  it('respects initialVisible override', async () => {
    const { findByText, queryByText } = render(
      <MoreForYouSection initialVisible={1}>
        <Text>Card 1</Text>
        <Text>Card 2</Text>
        <Text>Card 3</Text>
      </MoreForYouSection>,
    );
    await findByText('Card 1');
    expect(queryByText('Card 2')).toBeNull();
    expect(queryByText('Card 3')).toBeNull();
  });

  it('respects label override on toggle', async () => {
    const { findByText } = render(
      <MoreForYouSection label="Discovery">
        <Text>Card 1</Text>
        <Text>Card 2</Text>
        <Text>Card 3</Text>
      </MoreForYouSection>,
    );
    expect(await findByText(/Discovery \(1\)/)).toBeTruthy();
  });
});
