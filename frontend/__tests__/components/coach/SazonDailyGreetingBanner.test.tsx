// P2 retention — proactive Sazon greeting banner.

const mockGet = jest.fn();
const mockSet = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGet(...args),
    setItem: (...args: unknown[]) => mockSet(...args),
  },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return TouchableOpacity;
});

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SazonDailyGreetingBanner, {
  composeDailyGreeting,
} from '../../../components/coach/SazonDailyGreetingBanner';

const today = (() => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
})();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('composeDailyGreeting', () => {
  it('prefers drought cuisine when present', () => {
    const g = composeDailyGreeting({
      droughtCuisine: 'persian',
      lastCookCuisine: 'italian',
    });
    expect(g.copy).toMatch(/Persian/);
    expect(g.starter.toLowerCase()).toContain('persian');
  });

  it('falls back to lastCookCuisine when there\'s no drought', () => {
    const g = composeDailyGreeting({ lastCookCuisine: 'thai' });
    expect(g.copy).toMatch(/Thai/);
    expect(g.starter.toLowerCase()).toContain('thai');
  });

  it('uses a generic greeting when no cuisine signals exist', () => {
    const g = composeDailyGreeting({});
    expect(g.copy).toMatch(/Two minutes free/);
    expect(g.starter).toMatch(/cook tonight/i);
  });

  it('does not use banned voice vocabulary in the copy', () => {
    const g = composeDailyGreeting({
      droughtCuisine: 'persian',
      lastCookCuisine: 'italian',
    });
    const flat = `${g.copy} ${g.starter}`.toLowerCase();
    expect(flat).not.toMatch(/streak|goal|target|cut|bulk|maintain|optimize|crush/);
  });
});

describe('<SazonDailyGreetingBanner />', () => {
  it('renders on first open of the day', async () => {
    mockGet.mockResolvedValue(null);
    const { findByTestId } = render(
      <SazonDailyGreetingBanner signals={{ lastCookCuisine: 'persian' }} onStart={jest.fn()} />,
    );
    const banner = await findByTestId('sazon-daily-greeting');
    expect(banner.props.accessibilityLabel).toMatch(/Persian/i);
  });

  it('stays hidden when already shown today', async () => {
    mockGet.mockResolvedValue(today);
    const { queryByTestId } = render(
      <SazonDailyGreetingBanner signals={{ lastCookCuisine: 'persian' }} onStart={jest.fn()} />,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(queryByTestId('sazon-daily-greeting')).toBeNull();
  });

  it('tapping the starter fires onStart with the prebuilt message + persists today', async () => {
    mockGet.mockResolvedValue(null);
    const onStart = jest.fn();
    const { findByTestId } = render(
      <SazonDailyGreetingBanner signals={{ lastCookCuisine: 'thai' }} onStart={onStart} />,
    );
    const start = await findByTestId('sazon-daily-greeting-start');
    await act(async () => { fireEvent.press(start); });
    await waitFor(() => {
      expect(onStart).toHaveBeenCalled();
    });
    const arg = onStart.mock.calls[0][0];
    expect(arg.toLowerCase()).toContain('thai');
    expect(mockSet).toHaveBeenCalledWith(
      '@sazon/sazon_greeting/last_shown_date',
      expect.any(String),
    );
  });

  it('tapping dismiss hides the banner + persists today', async () => {
    mockGet.mockResolvedValue(null);
    const { findByTestId, queryByTestId } = render(
      <SazonDailyGreetingBanner signals={{}} onStart={jest.fn()} />,
    );
    const dismiss = await findByTestId('sazon-daily-greeting-dismiss');
    await act(async () => { fireEvent.press(dismiss); });
    await waitFor(() => expect(queryByTestId('sazon-daily-greeting')).toBeNull());
    expect(mockSet).toHaveBeenCalledWith(
      '@sazon/sazon_greeting/last_shown_date',
      expect.any(String),
    );
  });
});
