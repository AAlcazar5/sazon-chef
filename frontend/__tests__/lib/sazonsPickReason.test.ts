import { composeSazonsPickReason } from '../../lib/sazonsPickReason';

describe('composeSazonsPickReason', () => {
  it('reads as "more of the X you\'ve been loving" when pick == last', () => {
    const r = composeSazonsPickReason({
      pickCuisine: 'Persian',
      lastCookCuisine: 'Persian',
    });
    expect(r).toMatch(/More of the Persian you've been loving/);
  });

  it('weaves the adjacency flavor when pick is a known neighbor of last', () => {
    const r = composeSazonsPickReason({
      pickCuisine: 'Lebanese',
      lastCookCuisine: 'Persian',
    });
    expect(r).toMatch(/Same flavor neighborhood as your Persian/);
  });

  it('uses the welcomeLine ("fesenjan and friends") when pick has neighbors', () => {
    const r = composeSazonsPickReason({
      pickCuisine: 'Persian',
      lastCookCuisine: 'Italian',
    });
    expect(r.toLowerCase()).toContain('fesenjan');
  });

  it('uses Globetrotter copy when that tag is present + no other hooks fit', () => {
    const r = composeSazonsPickReason({
      pickCuisine: 'Glaswegian', // not in welcome / adjacency maps
      lastCookCuisine: 'Glaswegian-something-else',
      identityTags: ['Globetrotter', 'Confident in the kitchen'],
    });
    expect(r).toMatch(/another stamp for your map/i);
  });

  it('falls back to "Plant-leaning, like your style" when Veg-forward + nothing else', () => {
    const r = composeSazonsPickReason({
      pickCuisine: 'Glaswegian',
      identityTags: ['Veg-forward'],
    });
    expect(r).toMatch(/Plant-leaning/);
  });

  it('uses a "{cuisine}-curious" hook when that tag is present', () => {
    const r = composeSazonsPickReason({
      pickCuisine: 'Glaswegian',
      identityTags: ['Yucatecan-curious'],
    });
    expect(r).toMatch(/Glaswegian.*curious/i);
  });

  it('falls back to last-cook phrasing when only last is known', () => {
    const r = composeSazonsPickReason({ lastCookCuisine: 'Thai' });
    expect(r).toMatch(/After a Thai night/);
  });

  it('uses the default reason when no signal exists', () => {
    expect(composeSazonsPickReason({})).toMatch(
      /tend to come back to/,
    );
  });

  it('never uses banned voice vocabulary (judgement framing, not positive "streak")', () => {
    // Voice guard bans STREAK-GUILT ("Don't break your streak!"), not the
    // positive observation "your Persian streak". This regression pins the
    // banned patterns to the verdict-framing kind.
    const lines = [
      composeSazonsPickReason({ pickCuisine: 'Persian', lastCookCuisine: 'Persian' }),
      composeSazonsPickReason({ pickCuisine: 'Lebanese', lastCookCuisine: 'Persian' }),
      composeSazonsPickReason({ pickCuisine: 'Persian' }),
      composeSazonsPickReason({}),
    ];
    const all = lines.join(' ').toLowerCase();
    expect(all).not.toMatch(/goal|target|cut|bulk|maintain|optimize|crush|don't (break|lose)/);
  });
});
