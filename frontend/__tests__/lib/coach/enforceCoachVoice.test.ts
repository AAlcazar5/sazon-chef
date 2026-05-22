// Y-Voice-7 corpus test for the post-stream voice cap. The server persona
// prompt says 3 sentences max / no preamble / no question stacks — but the
// LLM drifts. This util is the deterministic safety net. Adding a new
// drift pattern? Drop a case in the relevant describe block.

import { enforceCoachVoice } from '../../../lib/coach/enforceCoachVoice';

// ─── Sentence cap ───────────────────────────────────────────────────────

describe('enforceCoachVoice — sentence cap (default 3)', () => {
  it('passes through short replies unchanged', () => {
    expect(enforceCoachVoice('Carbonara tonight. Try it with guanciale.').text).toBe(
      'Carbonara tonight. Try it with guanciale.',
    );
  });

  it('keeps exactly 3 sentences', () => {
    const input =
      'Carbonara tonight. Try it with guanciale. Serve with a glass of Frascati.';
    expect(enforceCoachVoice(input).text).toBe(input);
  });

  it('truncates to 3 sentences when 4 arrive', () => {
    const input =
      'Carbonara tonight. Try it with guanciale. Serve with Frascati. ' +
      'And finish with espresso.';
    const result = enforceCoachVoice(input);
    expect(result.truncated).toBe(true);
    expect(result.text).toBe(
      'Carbonara tonight. Try it with guanciale. Serve with Frascati.',
    );
  });

  it('truncates a 6-sentence wall to 3', () => {
    const input =
      'Pasta is a great choice. ' +
      'You could go carbonara, cacio e pepe, or amatriciana. ' +
      'Carbonara needs guanciale, pecorino, and eggs. ' +
      'Cacio e pepe is just pasta water, pecorino, and black pepper. ' +
      'Amatriciana adds tomato to the carbonara base. ' +
      'Which one are you in the mood for tonight?';
    const result = enforceCoachVoice(input);
    expect(result.truncated).toBe(true);
    expect(result.text.split(/[.!?]+\s+/).filter(Boolean).length).toBeLessThanOrEqual(3);
    expect(result.text).not.toMatch(/in the mood for tonight/);
  });

  it('honors a custom maxSentences', () => {
    const input = 'One. Two. Three. Four. Five.';
    expect(enforceCoachVoice(input, { maxSentences: 1 }).text).toBe('One.');
    expect(enforceCoachVoice(input, { maxSentences: 2 }).text).toBe('One. Two.');
    expect(enforceCoachVoice(input, { maxSentences: 5 }).text).toBe(input);
  });

  it('handles mixed terminators (! ? . …)', () => {
    const input = 'Pizza! Carbonara? Tacos. Sushi… Pho.';
    const result = enforceCoachVoice(input);
    expect(result.truncated).toBe(true);
    expect(result.text.split(/[.!?…]+\s+/).filter(Boolean).length).toBeLessThanOrEqual(3);
  });
});

// ─── Preamble strip ─────────────────────────────────────────────────────

describe('enforceCoachVoice — preamble strip', () => {
  it.each([
    ['Sure! Carbonara tonight.', 'Carbonara tonight.'],
    ['Sure thing — carbonara tonight.', 'carbonara tonight.'],
    ['Of course! Carbonara tonight.', 'Carbonara tonight.'],
    ['Absolutely. Carbonara tonight.', 'Carbonara tonight.'],
    ['Certainly! Carbonara tonight.', 'Carbonara tonight.'],
    ['Definitely. Carbonara tonight.', 'Carbonara tonight.'],
    ['Let me think… carbonara tonight.', 'carbonara tonight.'],
    ['Let me think about that — carbonara tonight.', 'carbonara tonight.'],
    ['Let me see — carbonara tonight.', 'carbonara tonight.'],
    ['Let me check — carbonara tonight.', 'carbonara tonight.'],
    ['Great question! Carbonara tonight.', 'Carbonara tonight.'],
    ['Good question. Carbonara tonight.', 'Carbonara tonight.'],
    ['Happy to help! Carbonara tonight.', 'Carbonara tonight.'],
    ["I'd be happy to help. Carbonara tonight.", 'Carbonara tonight.'],
    ["I'd be happy to — carbonara tonight.", 'carbonara tonight.'],
    ['No problem! Carbonara tonight.', 'Carbonara tonight.'],
    ['My pleasure. Carbonara tonight.', 'Carbonara tonight.'],
    ['Gotcha! Carbonara tonight.', 'Carbonara tonight.'],
    ['Got it. Carbonara tonight.', 'Carbonara tonight.'],
    ['Awesome! Carbonara tonight.', 'Carbonara tonight.'],
    ['Perfect. Carbonara tonight.', 'Carbonara tonight.'],
    ['Lovely! Carbonara tonight.', 'Carbonara tonight.'],
    ['Nice! Carbonara tonight.', 'Carbonara tonight.'],
    ['OK — carbonara tonight.', 'carbonara tonight.'],
    ['Okay! Carbonara tonight.', 'Carbonara tonight.'],
    ['Alright! Carbonara tonight.', 'Carbonara tonight.'],
  ])('strips "%s" → "%s"', (input, expected) => {
    const result = enforceCoachVoice(input);
    expect(result.preambleStripped).toBe(true);
    expect(result.text).toBe(expected);
  });

  it('strips stacked preambles', () => {
    const input = 'Sure! Of course! Let me think — carbonara tonight.';
    const result = enforceCoachVoice(input);
    expect(result.preambleStripped).toBe(true);
    expect(result.text).toBe('carbonara tonight.');
  });

  it('preserves leading non-preamble words', () => {
    // "Pizza" is NOT a preamble.
    expect(enforceCoachVoice('Pizza tonight.').preambleStripped).toBe(false);
    expect(enforceCoachVoice('Pizza tonight.').text).toBe('Pizza tonight.');
  });

  it('does NOT strip bare "OK pasta" (no trailing punctuation after OK)', () => {
    // The "okay|ok" regex requires punctuation after — guards against
    // chomping "OK" when it's a modifier rather than an interjection.
    const result = enforceCoachVoice('OK pasta works for tonight.');
    expect(result.preambleStripped).toBe(false);
    expect(result.text).toBe('OK pasta works for tonight.');
  });

  it('opt-out: stripPreamble:false leaves preamble alone', () => {
    const input = 'Sure! Carbonara tonight.';
    const result = enforceCoachVoice(input, { stripPreamble: false });
    expect(result.preambleStripped).toBe(false);
    expect(result.text).toBe(input);
  });
});

// ─── Question-stack strip ───────────────────────────────────────────────

describe('enforceCoachVoice — trailing question-stack strip', () => {
  it('drops a 3-option trailing question stack', () => {
    const input =
      'Carbonara tonight. Would you like a quick weeknight version or a Sunday roast?';
    const result = enforceCoachVoice(input);
    expect(result.questionsStripped).toBe(true);
    expect(result.text).toBe('Carbonara tonight.');
  });

  it('drops "X? Y? Z?" stacked questions', () => {
    const input =
      'Pomodoro time. Quick weeknight? Slow Sunday? Or fresh pesto?';
    const result = enforceCoachVoice(input);
    expect(result.questionsStripped).toBe(true);
    // The trailing question gets dropped. Inner questions might stay
    // because the cap operates sentence-by-sentence; what matters is the
    // final tail is gone.
    expect(result.text).not.toMatch(/fresh pesto/);
  });

  it('keeps a single non-stacked clarifying question', () => {
    // "What pasta?" is a single question, not a stack. Sazon CAN ask
    // ONE short question — the persona allows that.
    const input = 'Pasta tonight. What pasta?';
    const result = enforceCoachVoice(input);
    expect(result.questionsStripped).toBe(false);
    expect(result.text).toBe('Pasta tonight. What pasta?');
  });

  it('keeps a bare single question (no content before)', () => {
    // Single-sentence reply that IS a question — must not be wiped.
    const input = 'Want a quick weeknight version or a slow Sunday roast?';
    const result = enforceCoachVoice(input);
    expect(result.questionsStripped).toBe(false);
    expect(result.text).toBe(input);
  });

  it('opt-out: stripQuestionStacks:false keeps the stack', () => {
    const input =
      'Carbonara tonight. Quick or slow or fresh?';
    const result = enforceCoachVoice(input, { stripQuestionStacks: false });
    expect(result.questionsStripped).toBe(false);
    expect(result.text).toBe(input);
  });
});

// ─── End-to-end wall-of-text corpus ─────────────────────────────────────

describe('enforceCoachVoice — end-to-end wall-of-text corpus', () => {
  // Real-shape LLM outputs the user has seen (sourced from screenshots
  // + the wall-of-text complaints in chat). Each case combines preamble +
  // multi-sentence + trailing question stack.

  it('founder screenshot: 5-sentence sushi interrogation', () => {
    const input =
      "Let me check what's going on in your kitchen and see if there's a " +
      "sushi vibe waiting for you. No sushi recipes saved yet, and your " +
      "pantry's running pretty light — but that doesn't mean we can't get " +
      'close. What kind of sushi are you craving? Like a simple maki roll ' +
      'situation, poke bowl, or more of a temaki thing?';
    const result = enforceCoachVoice(input);
    expect(result.truncated || result.questionsStripped).toBe(true);
    const sentenceCount = result.text.split(/[.!?…]+\s+/).filter(Boolean).length;
    expect(sentenceCount).toBeLessThanOrEqual(3);
    expect(result.text).not.toMatch(/temaki thing\?/);
  });

  it('preamble + multi-sentence wall', () => {
    const input =
      'Great question! Let me think about that. Carbonara needs guanciale, ' +
      'pecorino, and eggs. The pasta water is the binder. Toss off heat or ' +
      'the eggs scramble. Want me to write out the full recipe?';
    const result = enforceCoachVoice(input);
    expect(result.preambleStripped).toBe(true);
    expect(result.text).not.toMatch(/Great question/);
    expect(result.text).not.toMatch(/Let me think/);
    const sentenceCount = result.text.split(/[.!?…]+\s+/).filter(Boolean).length;
    expect(sentenceCount).toBeLessThanOrEqual(3);
  });

  it('numbered-list-style wall gets capped', () => {
    const input =
      'Here are three options for tonight. ' +
      'First, a quick weeknight carbonara. ' +
      'Second, a slow-roasted Sunday ragù. ' +
      'Third, a fresh-tomato pesto pasta. ' +
      'Fourth, a simple aglio e olio. ' +
      'Which one are you in the mood for?';
    const result = enforceCoachVoice(input);
    expect(result.truncated).toBe(true);
    const sentenceCount = result.text.split(/[.!?…]+\s+/).filter(Boolean).length;
    expect(sentenceCount).toBeLessThanOrEqual(3);
    expect(result.text).not.toMatch(/Fourth/);
    expect(result.text).not.toMatch(/Which one/);
  });

  it('preamble + question-only response leaves a question alone', () => {
    const input = "Sure! What kind of pasta?";
    const result = enforceCoachVoice(input);
    expect(result.text).toBe('What kind of pasta?');
    expect(result.preambleStripped).toBe(true);
  });

  it('does NOT chomp legitimate short Sazon-voice replies', () => {
    const inputs = [
      'Pomodoro time — try San Marzanos and a basil sprig.',
      'Pad thai tonight. Tamarind paste is the soul of it.',
      'Persian fesenjan — pomegranate, walnut, slow-cooked chicken.',
      'Carbonara: guanciale, pecorino, eggs, pasta water. That order.',
    ];
    for (const input of inputs) {
      const result = enforceCoachVoice(input);
      expect(result.text).toBe(input);
      expect(result.preambleStripped).toBe(false);
      expect(result.truncated).toBe(false);
      expect(result.questionsStripped).toBe(false);
    }
  });
});

// ─── Empty / non-string inputs ──────────────────────────────────────────

describe('enforceCoachVoice — defensive', () => {
  it('handles empty string', () => {
    expect(enforceCoachVoice('').text).toBe('');
  });

  it('handles whitespace-only string', () => {
    expect(enforceCoachVoice('   ').text).toBe('');
  });

  // The function annotates input as string, but in JS it might receive
  // undefined/null via runtime drift. Pin defensive behavior.
  it('handles null/undefined via the unknown cast', () => {
    expect(enforceCoachVoice(null as unknown as string).text).toBe('');
    expect(enforceCoachVoice(undefined as unknown as string).text).toBe('');
  });
});
