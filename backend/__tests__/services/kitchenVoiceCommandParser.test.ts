// backend/__tests__/services/kitchenVoiceCommandParser.test.ts
// ROADMAP 4.0 Tier C8 — Kitchen mode voice command parser (TDD).
//
// Transcript-string in, structured intent out. Pure function — caller
// (frontend Kitchen mode) handles voice transcription + side effects.

import {
  parseKitchenVoiceCommand,
  type KitchenVoiceIntent,
} from '../../src/services/kitchenVoiceCommandParser';

describe('parseKitchenVoiceCommand — next step', () => {
  it.each([
    'next step',
    'next',
    'continue',
    'Sazon next step',
    'Sazon, next step',
    "let's go to the next step",
    'NEXT STEP',
  ])('parses "%s" as next-step', (transcript) => {
    const intent = parseKitchenVoiceCommand(transcript);
    expect(intent.kind).toBe('next-step');
  });
});

describe('parseKitchenVoiceCommand — previous step', () => {
  it.each([
    'previous step',
    'previous',
    'back',
    'go back',
    'Sazon, go back',
  ])('parses "%s" as previous-step', (transcript) => {
    const intent = parseKitchenVoiceCommand(transcript);
    expect(intent.kind).toBe('previous-step');
  });
});

describe('parseKitchenVoiceCommand — jump to step', () => {
  it.each<[string, number]>([
    ['go to step 4', 4],
    ['I\'m at step 3', 3],
    ['step 7', 7],
    ['Sazon, step 2', 2],
    ['jump to step 12', 12],
  ])('parses "%s" as jump-to %i', (transcript, expected) => {
    const intent = parseKitchenVoiceCommand(transcript);
    expect(intent.kind).toBe('jump-to');
    if (intent.kind === 'jump-to') {
      expect(intent.step).toBe(expected);
    }
  });

  it('returns unknown when step number is missing', () => {
    expect(parseKitchenVoiceCommand('go to step').kind).toBe('unknown');
  });
});

describe('parseKitchenVoiceCommand — timer', () => {
  it.each<[string, number]>([
    ['set timer 5 minutes', 5],
    ['timer 10 min', 10],
    ['set a 3 minute timer', 3],
    ['Sazon, 7 minute timer', 7],
    ['start a 20 minute timer', 20],
  ])('parses "%s" as timer for %i minutes', (transcript, minutes) => {
    const intent = parseKitchenVoiceCommand(transcript);
    expect(intent.kind).toBe('timer');
    if (intent.kind === 'timer') {
      expect(intent.minutes).toBe(minutes);
    }
  });

  it('rejects timer with no duration', () => {
    expect(parseKitchenVoiceCommand('set timer').kind).toBe('unknown');
  });

  it('rejects unrealistic durations (>180 min)', () => {
    expect(parseKitchenVoiceCommand('set timer 999 minutes').kind).toBe('unknown');
  });
});

describe('parseKitchenVoiceCommand — temperature query', () => {
  it.each([
    "what's the temperature",
    'what temperature',
    'what temp',
    "what's the temp",
    'temp for this step',
  ])('parses "%s" as temperature-query', (transcript) => {
    const intent = parseKitchenVoiceCommand(transcript);
    expect(intent.kind).toBe('temperature-query');
  });
});

describe('parseKitchenVoiceCommand — unknown / fallthrough', () => {
  it('returns unknown for empty input', () => {
    expect(parseKitchenVoiceCommand('').kind).toBe('unknown');
  });

  it('returns unknown for whitespace-only input', () => {
    expect(parseKitchenVoiceCommand('   ').kind).toBe('unknown');
  });

  it('returns unknown for unrelated chatter', () => {
    expect(parseKitchenVoiceCommand('the salmon smells amazing').kind).toBe('unknown');
    expect(parseKitchenVoiceCommand('do I need a bigger pan').kind).toBe('unknown');
  });

  it('handles null/undefined input safely', () => {
    expect(parseKitchenVoiceCommand(null as any).kind).toBe('unknown');
    expect(parseKitchenVoiceCommand(undefined as any).kind).toBe('unknown');
  });
});

describe('parseKitchenVoiceCommand — wake word stripping', () => {
  it('strips leading "Sazon" + comma + space variants', () => {
    expect(parseKitchenVoiceCommand('Sazon next').kind).toBe('next-step');
    expect(parseKitchenVoiceCommand('Sazon, next').kind).toBe('next-step');
    expect(parseKitchenVoiceCommand('hey Sazon, next').kind).toBe('next-step');
  });
});

describe('KitchenVoiceIntent type — discriminated union', () => {
  it('union narrows correctly', () => {
    const intent: KitchenVoiceIntent = parseKitchenVoiceCommand('timer 5 min');
    if (intent.kind === 'timer') {
      // TypeScript narrows: minutes accessible without optional chaining
      expect(typeof intent.minutes).toBe('number');
    }
  });
});
