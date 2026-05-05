// frontend/__tests__/components/profile/LegalLinks.test.tsx
// ROADMAP 4.0 E7 — privacy + ToS rows render and tap calls Linking.openURL.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LegalLinks, { PRIVACY_URL, TOS_URL } from '../../../components/profile/LegalLinks';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

describe('LegalLinks (E7)', () => {
  it('renders both rows', () => {
    const { getByTestId } = render(<LegalLinks />);
    expect(getByTestId('legal-links-privacy')).toBeTruthy();
    expect(getByTestId('legal-links-tos')).toBeTruthy();
  });

  it('tap on Privacy row opens the configured privacy URL', () => {
    const openURL = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(<LegalLinks openURL={openURL} />);
    fireEvent.press(getByTestId('legal-links-privacy'));
    expect(openURL).toHaveBeenCalledWith(PRIVACY_URL);
  });

  it('tap on ToS row opens the configured ToS URL', () => {
    const openURL = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(<LegalLinks openURL={openURL} />);
    fireEvent.press(getByTestId('legal-links-tos'));
    expect(openURL).toHaveBeenCalledWith(TOS_URL);
  });

  it('rows expose the right accessibility role + label for screen readers', () => {
    const { getByLabelText } = render(<LegalLinks />);
    expect(getByLabelText('Privacy Policy')).toBeTruthy();
    expect(getByLabelText('Terms of Service')).toBeTruthy();
  });
});
