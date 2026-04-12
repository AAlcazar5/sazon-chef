// frontend/lib/edgeTts.ts
// Free neural TTS using Microsoft Edge's Read Aloud voices.
// No API key required. Falls back gracefully if unavailable.

import { File, Paths, Directory } from 'expo-file-system';

const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WSS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

// High-quality neural voices (all free)
export const EDGE_VOICES = {
  aria: 'en-US-AriaNeural',         // female, warm, conversational
  jenny: 'en-US-JennyNeural',       // female, friendly
  guy: 'en-US-GuyNeural',           // male, casual
  chris: 'en-US-ChristopherNeural', // male, clear
  ana: 'en-US-AnaNeural',           // female, youthful
} as const;

export type EdgeVoiceId = (typeof EDGE_VOICES)[keyof typeof EDGE_VOICES];

function uuid(): string {
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSSML(text: string, voice: string, ratePercent: number): string {
  const rateStr = `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`;
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${voice}'>` +
    `<prosody rate='${rateStr}' pitch='+0Hz' volume='+0%'>` +
    escapeXml(text) +
    `</prosody></voice></speak>`
  );
}

/**
 * Synthesize text to an MP3 file using Edge neural TTS.
 * Returns a local file URI for playback via expo-av.
 */
export async function synthesize(
  text: string,
  voice: string = EDGE_VOICES.aria,
  rate: number = 1.0,
  timeoutMs: number = 15000,
): Promise<string> {
  const ratePercent = Math.round((rate - 1.0) * 100);
  const requestId = uuid();
  const connectionId = uuid();

  return new Promise<string>((resolve, reject) => {
    const url = `${WSS_BASE}?TrustedClientToken=${TRUSTED_TOKEN}&ConnectionId=${connectionId}`;
    const ws = new WebSocket(url);
    const audioChunks: ArrayBuffer[] = [];
    let settled = false;

    const settle = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      // Send config
      const configMsg =
        `X-Timestamp:${new Date().toISOString()}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: 'false',
                  wordBoundaryEnabled: 'true',
                },
                outputFormat: OUTPUT_FORMAT,
              },
            },
          },
        });
      ws.send(configMsg);

      // Send SSML
      const ssml = buildSSML(text, voice, ratePercent);
      const ssmlMsg =
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${new Date().toISOString()}\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml;
      ws.send(ssmlMsg);
    };

    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        if (event.data.includes('turn.end')) {
          ws.close();
        }
      } else if (event.data instanceof ArrayBuffer) {
        // Binary frame: 2-byte header length (big-endian) + headers + audio
        const view = new DataView(event.data);
        const headerLen = view.getUint16(0);
        const audioStart = 2 + headerLen;
        if (audioStart < event.data.byteLength) {
          audioChunks.push(event.data.slice(audioStart));
        }
      }
    };

    ws.onclose = async () => {
      if (audioChunks.length === 0) {
        settle(() => reject(new Error('No audio data received')));
        return;
      }
      try {
        // Concatenate chunks
        const totalLen = audioChunks.reduce((sum, buf) => sum + buf.byteLength, 0);
        const combined = new Uint8Array(totalLen);
        let offset = 0;
        for (const buf of audioChunks) {
          combined.set(new Uint8Array(buf), offset);
          offset += buf.byteLength;
        }

        // Write MP3 to cache directory
        const file = new File(Paths.cache, `tts_${requestId}.mp3`);
        file.write(combined);
        settle(() => resolve(file.uri));
      } catch (err) {
        settle(() => reject(err));
      }
    };

    ws.onerror = () => {
      settle(() => reject(new Error('Edge TTS connection failed')));
    };

    setTimeout(() => {
      if (!settled) {
        try { ws.close(); } catch {}
        settle(() => reject(new Error('Edge TTS timeout')));
      }
    }, timeoutMs);
  });
}

/**
 * Clean up cached TTS audio files.
 */
export function clearTtsCache(): void {
  try {
    const cacheDir = new Directory(Paths.cache);
    const entries = cacheDir.list();
    for (const entry of entries) {
      if (entry instanceof File && entry.name.startsWith('tts_') && entry.name.endsWith('.mp3')) {
        entry.delete();
      }
    }
  } catch {
    // ignore cleanup errors
  }
}
