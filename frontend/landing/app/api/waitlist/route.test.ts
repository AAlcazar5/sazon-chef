import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const ORIGINAL_BACKEND = process.env.BACKEND_URL;

function jsonRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3002/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const validBody = {
  email: 'cook@kitchen.com',
  topCuisine: 'Persian',
  macroGoal: 'flavor_balanced' as const,
  dietary: ['Gluten'],
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  process.env.BACKEND_URL = 'http://backend.test';
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.BACKEND_URL = ORIGINAL_BACKEND;
});

describe('POST /api/waitlist (Next.js proxy)', () => {
  it('forwards a valid payload to the backend and returns its response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { id: 'wl_1', position: 42 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await POST(jsonRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, data: { id: 'wl_1', position: 42 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend.test/api/waitlist');
    expect((init as RequestInit).method).toBe('POST');
    const forwarded = JSON.parse((init as RequestInit).body as string);
    expect(forwarded.email).toBe('cook@kitchen.com');
    expect(forwarded.topCuisine).toBe('Persian');
  });

  it('tags source from the referer hostname when present', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { id: 'x' } }), { status: 200 }),
    );

    await POST(jsonRequest(validBody, { Referer: 'https://sazonchef.com/?utm=tiktok' }));

    const [, init] = fetchMock.mock.calls[0];
    const forwarded = JSON.parse((init as RequestInit).body as string);
    expect(forwarded.source).toBe('sazonchef.com');
  });

  it('400s on a malformed email without calling the backend', async () => {
    const res = await POST(jsonRequest({ ...validBody, email: 'not-an-email' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/email/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('400s when macroGoal contains banned vocabulary (cut/bulk/maintain)', async () => {
    const res = await POST(jsonRequest({ ...validBody, macroGoal: 'bulk' }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('400s on invalid JSON body', async () => {
    const res = await POST(jsonRequest('not-json{'));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('502s with friendly Sazon-voice copy when the backend is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await POST(jsonRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/kitchen/i);
  });

  it('passes through the backend status code on upstream failure', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: 'rate limited' }), { status: 429 }),
    );

    const res = await POST(jsonRequest(validBody));
    expect(res.status).toBe(429);
  });
});
