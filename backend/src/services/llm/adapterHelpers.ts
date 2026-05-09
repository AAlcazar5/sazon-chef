// backend/src/services/llm/adapterHelpers.ts
// K13: shared error-handling helpers for LLM streaming adapters.
//
// Every streaming adapter needs the same shape: check resp.ok, log on failure
// with a slice of the body, throw with the status. Extracting it here means a
// new provider just calls `ensureStreamOk(resp, 'NewProvider')` instead of
// pasting the 8-line block + remembering to log.

import { logger } from '../../utils/logger';

export async function ensureStreamOk(
  resp: Response,
  providerName: string,
): Promise<ReadableStream<Uint8Array>> {
  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => '');
    logger.warn(
      { status: resp.status, body: text.slice(0, 300) },
      `${providerName} stream call failed`,
    );
    throw new Error(`${providerName} stream failed: ${resp.status}`);
  }
  return resp.body as unknown as ReadableStream<Uint8Array>;
}
