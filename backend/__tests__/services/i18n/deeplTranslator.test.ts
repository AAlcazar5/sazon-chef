// ROADMAP 4.0 Tier i18n-OPS7 — DeepL translator unit tests.
//
// Covers:
//   - DeepL API call shape (auth, endpoint, body)
//   - Free vs Pro endpoint routing by key suffix (:fx → free)
//   - Placeholder preservation: {{name}}, {{percent}} survive translation
//   - Error handling: missing key, non-2xx response, empty input

import {
  translateBatch,
  findMissingKeys,
  mergeTranslations,
  __test_only_pickEndpoint,
} from '../../../src/services/i18n/deeplTranslator';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_KEY = process.env.DEEPL_API_KEY;

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  if (ORIGINAL_KEY === undefined) {
    delete process.env.DEEPL_API_KEY;
  } else {
    process.env.DEEPL_API_KEY = ORIGINAL_KEY;
  }
});

function mockDeeplResponse(translations: string[]): jest.Mock {
  return jest.fn(async () =>
    new Response(
      JSON.stringify({ translations: translations.map((text) => ({ text })) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  );
}

describe('pickEndpoint', () => {
  it('routes :fx-suffixed keys to the free API host', () => {
    expect(__test_only_pickEndpoint('abc-123:fx')).toBe(
      'https://api-free.deepl.com/v2/translate',
    );
  });

  it('routes plain keys to the Pro API host', () => {
    expect(__test_only_pickEndpoint('abc-123')).toBe(
      'https://api.deepl.com/v2/translate',
    );
  });
});

describe('translateBatch', () => {
  it('throws when DEEPL_API_KEY is missing', async () => {
    delete process.env.DEEPL_API_KEY;
    await expect(translateBatch(['hello'], 'ES')).rejects.toThrow(
      /DEEPL_API_KEY/,
    );
  });

  it('returns input unchanged for an empty batch (no API call)', async () => {
    process.env.DEEPL_API_KEY = 'k:fx';
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const out = await translateBatch([], 'ES');
    expect(out).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends auth header, target_lang, and tag_handling=xml', async () => {
    process.env.DEEPL_API_KEY = 'test-key:fx';
    const fetchMock = mockDeeplResponse(['Hola']);
    global.fetch = fetchMock as unknown as typeof fetch;

    await translateBatch(['Hello'], 'ES');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api-free.deepl.com/v2/translate');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('DeepL-Auth-Key test-key:fx');
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body as string);
    expect(body.target_lang).toBe('ES');
    expect(body.tag_handling).toBe('xml');
    expect(body.ignore_tags).toEqual(['x']);
    expect(body.text).toEqual(['Hello']);
  });

  it('wraps {{var}} placeholders so DeepL leaves them alone', async () => {
    process.env.DEEPL_API_KEY = 'k:fx';
    const fetchMock = mockDeeplResponse([
      'Hola, <x>name</x>',
      '<x>percent</x>% COINCIDENCIA',
    ]);
    global.fetch = fetchMock as unknown as typeof fetch;

    const out = await translateBatch(
      ['Hello, {{name}}', '{{percent}}% MATCH'],
      'ES',
    );

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.text).toEqual([
      'Hello, <x>name</x>',
      '<x>percent</x>% MATCH',
    ]);
    expect(out).toEqual(['Hola, {{name}}', '{{percent}}% COINCIDENCIA']);
  });

  it('throws on non-2xx response with status + body context', async () => {
    process.env.DEEPL_API_KEY = 'k:fx';
    global.fetch = jest.fn(async () =>
      new Response('quota exceeded', { status: 456 }),
    ) as unknown as typeof fetch;

    await expect(translateBatch(['hi'], 'ES')).rejects.toThrow(
      /456.*quota exceeded/,
    );
  });

  it('passes optional source_lang when provided', async () => {
    process.env.DEEPL_API_KEY = 'k:fx';
    const fetchMock = mockDeeplResponse(['hola']);
    global.fetch = fetchMock as unknown as typeof fetch;

    await translateBatch(['hello'], 'ES', { sourceLang: 'EN' });

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.source_lang).toBe('EN');
  });
});

describe('findMissingKeys', () => {
  it('returns keys present in source but absent in target', () => {
    const source = { a: '1', b: '2', c: '3' };
    const target = { a: 'x' };
    expect(findMissingKeys(source, target)).toEqual(['b', 'c']);
  });

  it('treats empty-string target values as missing (gap to fill)', () => {
    const source = { a: '1', b: '2' };
    const target = { a: '', b: 'translated' };
    expect(findMissingKeys(source, target)).toEqual(['a']);
  });

  it('returns [] when target is a complete superset', () => {
    expect(findMissingKeys({ a: '1' }, { a: 'x', b: 'y' })).toEqual([]);
  });

  it('returns all source keys when target is empty', () => {
    expect(findMissingKeys({ a: '1', b: '2' }, {})).toEqual(['a', 'b']);
  });
});

describe('mergeTranslations', () => {
  it('fills missing keys without overwriting existing translations', () => {
    const target = { a: 'curated' };
    const merged = mergeTranslations(target, { a: 'auto', b: 'auto' });
    expect(merged).toEqual({ a: 'curated', b: 'auto' });
  });

  it('returns a new object (immutable)', () => {
    const target = { a: 'curated' };
    const merged = mergeTranslations(target, { b: 'new' });
    expect(merged).not.toBe(target);
    expect(target).toEqual({ a: 'curated' });
  });

  it('skips empty-string additions (do not poison locale with blanks)', () => {
    const merged = mergeTranslations({ a: 'x' }, { b: '', c: 'ok' });
    expect(merged).toEqual({ a: 'x', c: 'ok' });
  });
});
