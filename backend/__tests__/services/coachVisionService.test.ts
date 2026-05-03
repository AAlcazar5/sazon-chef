// Phase 5 (10Y-E): Coach vision service — JSON-only contract for pantry pickup
// from a photo. The Anthropic SDK is fully mocked so behavior is deterministic.

import {
  identifyPantryFromImage,
  CoachVisionError,
} from '../../src/services/coachVisionService';

interface MockClient {
  messages: { create: jest.Mock };
}

function makeClient(content: string): MockClient {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: content }],
        role: 'assistant',
        id: 'msg_1',
        model: 'claude-opus-4-7',
        stop_reason: 'end_turn',
        type: 'message',
        usage: { input_tokens: 0, output_tokens: 0 },
      }),
    },
  };
}

function makeFailingClient(message: string): MockClient {
  return {
    messages: {
      create: jest.fn().mockRejectedValue(new Error(message)),
    },
  };
}

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

describe('identifyPantryFromImage', () => {
  it('returns the parsed ingredient list on a clean JSON response', async () => {
    const client = makeClient(
      JSON.stringify({
        ingredients: [
          { name: 'chicken thigh', confidence: 0.9 },
          { name: 'broccoli', confidence: 0.85 },
        ],
      }),
    );
    const result = await identifyPantryFromImage({
      imageBase64: TINY_PNG_BASE64,
      mediaType: 'image/png',
      client: client as never,
    });
    expect(result.ingredients).toHaveLength(2);
    expect(result.ingredients[0].name).toBe('chicken thigh');
    expect(result.ingredients[1].confidence).toBe(0.85);
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });

  it('strips ```json``` code fences', async () => {
    const client = makeClient(
      '```json\n{"ingredients":[{"name":"lime","confidence":0.7}]}\n```',
    );
    const result = await identifyPantryFromImage({
      imageBase64: TINY_PNG_BASE64,
      mediaType: 'image/jpeg',
      client: client as never,
    });
    expect(result.ingredients[0].name).toBe('lime');
  });

  it('throws CoachVisionError(invalid_response) on malformed JSON', async () => {
    const client = makeClient('{ not real json');
    await expect(
      identifyPantryFromImage({
        imageBase64: TINY_PNG_BASE64,
        mediaType: 'image/jpeg',
        client: client as never,
      }),
    ).rejects.toMatchObject({
      name: 'CoachVisionError',
      code: 'invalid_response',
    });
  });

  it('throws CoachVisionError(invalid_response) when JSON shape mismatches the schema', async () => {
    const client = makeClient(
      JSON.stringify({ ingredients: [{ name: 'x', confidence: 'high' }] }),
    );
    await expect(
      identifyPantryFromImage({
        imageBase64: TINY_PNG_BASE64,
        mediaType: 'image/jpeg',
        client: client as never,
      }),
    ).rejects.toBeInstanceOf(CoachVisionError);
  });

  it('throws CoachVisionError(refusal) when the model replies in prose instead of JSON', async () => {
    const client = makeClient(
      "I can't identify ingredients in this image. Please provide a clearer photo.",
    );
    await expect(
      identifyPantryFromImage({
        imageBase64: TINY_PNG_BASE64,
        mediaType: 'image/jpeg',
        client: client as never,
      }),
    ).rejects.toMatchObject({ code: 'refusal' });
  });

  it('throws CoachVisionError(empty_response) when no text block is returned', async () => {
    const client: MockClient = {
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [],
          role: 'assistant',
          id: 'msg_2',
          model: 'claude-opus-4-7',
          stop_reason: 'end_turn',
          type: 'message',
          usage: { input_tokens: 0, output_tokens: 0 },
        }),
      },
    };
    await expect(
      identifyPantryFromImage({
        imageBase64: TINY_PNG_BASE64,
        mediaType: 'image/jpeg',
        client: client as never,
      }),
    ).rejects.toMatchObject({ code: 'empty_response' });
  });

  it('throws CoachVisionError(provider_error) when the API call fails', async () => {
    const client = makeFailingClient('rate limit');
    await expect(
      identifyPantryFromImage({
        imageBase64: TINY_PNG_BASE64,
        mediaType: 'image/jpeg',
        client: client as never,
      }),
    ).rejects.toMatchObject({ code: 'provider_error' });
  });

  it('returns an empty array when the model finds no food', async () => {
    const client = makeClient(JSON.stringify({ ingredients: [] }));
    const result = await identifyPantryFromImage({
      imageBase64: TINY_PNG_BASE64,
      mediaType: 'image/jpeg',
      client: client as never,
    });
    expect(result.ingredients).toEqual([]);
  });
});
