import {
  archetypeAffinity,
  scorePost,
  rankPosts,
  DEFAULT_WEIGHTS,
  RankablePost,
  RankingWeights,
} from '../exploreRanking';

// Disable the random jitter so scores are deterministic in tests.
const NO_JITTER: RankingWeights = { ...DEFAULT_WEIGHTS, jitter: 0 };
const NOW = new Date(2026, 5, 21);

describe('archetypeAffinity', () => {
  it('returns 1 for the same archetype', () => {
    expect(archetypeAffinity('powerlifter', 'powerlifter')).toBe(1);
  });

  it('is symmetric for related personas', () => {
    expect(archetypeAffinity('powerlifter', 'bodybuilder')).toBe(0.6);
    expect(archetypeAffinity('bodybuilder', 'powerlifter')).toBe(0.6);
  });

  it('falls back to a neutral score when an archetype is missing or unknown', () => {
    expect(archetypeAffinity(undefined, 'athlete')).toBe(0.3);
    expect(archetypeAffinity('athlete', undefined)).toBe(0.3);
    expect(archetypeAffinity('martian', 'athlete')).toBe(0.3);
  });
});

describe('scorePost', () => {
  it('scores a same-archetype, fresh, engaged post higher than a stale neutral one', () => {
    const fresh: RankablePost = {
      id: 'a',
      authorArchetype: 'athlete',
      reactionCount: 100,
      commentCount: 20,
      createdAtMs: NOW.getTime(),
    };
    const stale: RankablePost = {
      id: 'b',
      authorArchetype: 'powerlifter',
      reactionCount: 0,
      commentCount: 0,
      createdAtMs: NOW.getTime() - 30 * 24 * 60 * 60 * 1000,
    };
    const sFresh = scorePost(fresh, 'athlete', { weights: NO_JITTER, now: NOW });
    const sStale = scorePost(stale, 'athlete', { weights: NO_JITTER, now: NOW });
    expect(sFresh).toBeGreaterThan(sStale);
  });

  it('applies the seen penalty', () => {
    const post: RankablePost = { id: 'a', authorArchetype: 'athlete', createdAtMs: NOW.getTime() };
    const unseen = scorePost(post, 'athlete', { weights: NO_JITTER, now: NOW });
    const seen = scorePost(post, 'athlete', {
      weights: NO_JITTER,
      now: NOW,
      seen: new Set(['a']),
    });
    expect(unseen - seen).toBeCloseTo(NO_JITTER.seenPenalty, 5);
  });

  it('decays recency by half over one half-life', () => {
    const base: RankablePost = { id: 'a', createdAtMs: NOW.getTime() };
    const old: RankablePost = {
      id: 'b',
      createdAtMs: NOW.getTime() - DEFAULT_WEIGHTS.recencyHalfLifeDays * 24 * 60 * 60 * 1000,
    };
    // With no archetype/engagement, the only term is recency.
    const sBase = scorePost(base, undefined, { weights: { ...NO_JITTER, archetype: 0 }, now: NOW });
    const sOld = scorePost(old, undefined, { weights: { ...NO_JITTER, archetype: 0 }, now: NOW });
    expect(sOld).toBeCloseTo(sBase / 2, 5);
  });
});

describe('rankPosts', () => {
  it('orders by descending score and does not mutate the input', () => {
    const posts: RankablePost[] = [
      { id: 'low', authorArchetype: 'powerlifter', reactionCount: 0, createdAtMs: NOW.getTime() - 20 * 86400000 },
      { id: 'high', authorArchetype: 'athlete', reactionCount: 500, createdAtMs: NOW.getTime() },
    ];
    const original = [...posts];
    const ranked = rankPosts(posts, 'athlete', { weights: NO_JITTER, now: NOW });
    expect(ranked.map(p => p.id)).toEqual(['high', 'low']);
    expect(posts).toEqual(original); // non-mutating
  });
});
