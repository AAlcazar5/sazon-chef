// backend/tests/services/imageService.test.ts
//
// Tier L M23 — imageService coverage.

jest.mock('axios');
import axios from 'axios';
import { ImageService } from '../../src/services/imageService';

const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeService(apiKey: string | undefined): ImageService {
  if (apiKey === undefined) delete process.env.UNSPLASH_ACCESS_KEY;
  else process.env.UNSPLASH_ACCESS_KEY = apiKey;
  return new ImageService();
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('imageService.searchFoodImage (with API key)', () => {
  it('returns a photo with full URL + attribution + UTM-decorated profile link', async () => {
    const svc = makeService('test_key');
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        results: [
          {
            id: 'photo-1',
            urls: { full: 'https://imgcdn/full.jpg', regular: 'https://imgcdn/reg.jpg' },
            links: { download_location: 'https://api.unsplash.com/dl/photo-1' },
            user: { name: 'Jane Doe', username: 'janedoe' },
          },
        ],
      },
    });

    const photo = await svc.searchFoodImage({ recipeName: 'lasagna', cuisine: 'Italian' });

    expect(photo).toBeTruthy();
    expect(photo!.id).toBe('photo-1');
    expect(photo!.url).toBe('https://imgcdn/full.jpg');
    expect(photo!.downloadLocation).toBe('https://api.unsplash.com/dl/photo-1');
    expect(photo!.photographer.name).toBe('Jane Doe');
    expect(photo!.photographer.profileUrl).toContain('utm_source=sazon_chef');
    expect(photo!.unsplashUrl).toContain('utm_source=sazon_chef');
    expect(photo!.attributionText).toBe('Photo by Jane Doe on Unsplash');
  });

  it('falls back to urls.regular when full is missing', async () => {
    const svc = makeService('test_key');
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        results: [
          {
            id: 'p',
            urls: { regular: 'https://imgcdn/reg.jpg' },
            links: { download_location: 'dl' },
            user: { name: 'X', username: 'x' },
          },
        ],
      },
    });
    const photo = await svc.searchFoodImage({ recipeName: 'tacos' });
    expect(photo!.url).toBe('https://imgcdn/reg.jpg');
  });

  it('resultIndex selects a different photo from the same page', async () => {
    const svc = makeService('test_key');
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        results: [
          { id: 'a', urls: { full: 'A' }, links: { download_location: '' }, user: { name: 'A', username: 'a' } },
          { id: 'b', urls: { full: 'B' }, links: { download_location: '' }, user: { name: 'B', username: 'b' } },
          { id: 'c', urls: { full: 'C' }, links: { download_location: '' }, user: { name: 'C', username: 'c' } },
        ],
      },
    });
    const photo = await svc.searchFoodImage({ recipeName: 'curry', resultIndex: 2 });
    expect(photo!.id).toBe('c');
  });

  it('resultIndex wraps via modulo when out of range', async () => {
    const svc = makeService('test_key');
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        results: [
          { id: 'a', urls: { full: 'A' }, links: { download_location: '' }, user: { name: 'A', username: 'a' } },
          { id: 'b', urls: { full: 'B' }, links: { download_location: '' }, user: { name: 'B', username: 'b' } },
        ],
      },
    });
    // resultIndex=5 with only 2 results → 5 % 2 == 1 → 'b'
    const photo = await svc.searchFoodImage({ recipeName: 'soup', resultIndex: 5 });
    expect(photo!.id).toBe('b');
  });

  it('falls back to source.unsplash.com URL when Unsplash API throws', async () => {
    const svc = makeService('test_key');
    mockedAxios.get.mockRejectedValueOnce(new Error('rate limited'));
    const photo = await svc.searchFoodImage({ recipeName: 'pad thai', cuisine: 'Thai' });
    expect(photo).toBeTruthy();
    expect(photo!.url).toContain('source.unsplash.com');
    expect(photo!.url.toLowerCase()).toContain('thai');
    expect(photo!.id).toMatch(/^fallback-/);
  });

  it('falls back when results array is empty', async () => {
    const svc = makeService('test_key');
    mockedAxios.get.mockResolvedValueOnce({ data: { results: [] } });
    const photo = await svc.searchFoodImage({ recipeName: 'mystery dish' });
    expect(photo!.id).toMatch(/^fallback-/);
  });

  it('passes the right query + headers + page params to Unsplash', async () => {
    const svc = makeService('test_key');
    mockedAxios.get.mockResolvedValueOnce({ data: { results: [] } });
    await svc.searchFoodImage({ recipeName: 'salmon', cuisine: 'Japanese', page: 2, resultIndex: 5 });

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.unsplash.com/search/photos',
      expect.objectContaining({
        params: expect.objectContaining({
          query: 'salmon Japanese food',
          per_page: 30,
          page: 2,
          orientation: 'landscape',
          content_filter: 'high',
        }),
        headers: expect.objectContaining({ Authorization: 'Client-ID test_key' }),
      }),
    );
  });
});

describe('imageService.searchFoodImage (no API key — fallback path)', () => {
  it('skips the API call entirely and returns a fallback URL', async () => {
    const svc = makeService(undefined);
    const photo = await svc.searchFoodImage({ recipeName: 'gnocchi', cuisine: 'Italian' });
    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(photo!.url).toContain('source.unsplash.com');
    expect(photo!.url.toLowerCase()).toContain('italian');
    expect(photo!.url.toLowerCase()).toContain('gnocchi');
  });

  it('strips noise words ("the", "a", "an") from the recipe name keyword', async () => {
    const svc = makeService(undefined);
    const photo = await svc.searchFoodImage({ recipeName: 'the perfect risotto' });
    // "the" must NOT show up in the keyword list
    expect(photo!.url.split('?')[1]).not.toContain('the,');
  });
});

describe('imageService.triggerDownload', () => {
  it('calls the download endpoint with the API key', async () => {
    const svc = makeService('test_key');
    mockedAxios.get.mockResolvedValueOnce({});
    await svc.triggerDownload('https://api.unsplash.com/dl/abc');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.unsplash.com/dl/abc',
      expect.objectContaining({
        headers: { Authorization: 'Client-ID test_key' },
      }),
    );
  });

  it('is a no-op without an API key', async () => {
    const svc = makeService(undefined);
    await svc.triggerDownload('https://api.unsplash.com/dl/abc');
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('is a no-op when downloadLocation is empty', async () => {
    const svc = makeService('test_key');
    await svc.triggerDownload('');
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('catches network errors so a hot path can ignore the result', async () => {
    const svc = makeService('test_key');
    mockedAxios.get.mockRejectedValueOnce(new Error('boom'));
    await expect(svc.triggerDownload('https://x')).resolves.toBeUndefined();
  });
});
