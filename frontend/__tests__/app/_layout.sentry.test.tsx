import { logError, ErrorCategory, ErrorSeverity } from '../../utils/errorLogger';

// Mock the @sentry/react-native module before lib/sentry loads it.
const mockInit = jest.fn();
const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();

jest.mock(
  '@sentry/react-native',
  () => ({
    init: mockInit,
    captureException: mockCaptureException,
    captureMessage: mockCaptureMessage,
  }),
  { virtual: true }
);

describe('Sentry frontend init', () => {
  const ORIGINAL_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const ORIGINAL_ENV = process.env.EXPO_PUBLIC_ENV;

  beforeEach(() => {
    jest.resetModules();
    mockInit.mockClear();
    mockCaptureException.mockClear();
    mockCaptureMessage.mockClear();
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://example@sentry.io/1';
    process.env.EXPO_PUBLIC_ENV = 'test';
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = ORIGINAL_DSN;
    process.env.EXPO_PUBLIC_ENV = ORIGINAL_ENV;
  });

  it('calls Sentry.init exactly once when DSN is configured', () => {
    const { initSentry, __resetSentryForTest } = require('../../lib/sentry');
    __resetSentryForTest();

    initSentry();
    initSentry();
    initSentry();

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://example@sentry.io/1',
        environment: 'test',
      })
    );
  });

  it('does not init when DSN is missing', () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    const { initSentry, __resetSentryForTest } = require('../../lib/sentry');
    __resetSentryForTest();

    initSentry();

    expect(mockInit).not.toHaveBeenCalled();
  });

  it('forwards captureException through the wrapper', () => {
    const { captureException } = require('../../lib/sentry');
    const err = new Error('boom');

    captureException(err);

    expect(mockCaptureException).toHaveBeenCalledWith(err);
  });

  it('errorLogger.logError forwards thrown error to Sentry', async () => {
    const err = new Error('render failed');
    await logError(err, {
      screen: 'TestScreen',
      action: 'render',
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.UI,
    });
    expect(mockCaptureException).toHaveBeenCalledWith(err);
  });
});
