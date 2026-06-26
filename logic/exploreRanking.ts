// Pure Explore ranking — no React, no Firebase. Scores candidate posts for the
// Explore photo grid so the most relevant ones surface first. The score is a
// linear sum of four signals: per-viewer archetype affinity, log-damped
// engagement (likes + comments), recency decay, and a seen-suppression penalty.
// Mirrors logic/hype.ts in spirit (exponential half-life decay).

export type Archetype =
  | 'athlete'
  | 'bodybuilder'
  | 'crossfitter'
  | 'generalist'
  | 'powerlifter';

/** Minimal shape the ranker needs from a candidate post. */
export interface RankablePost {
  id: string;
  authorArchetype?: string;
  reactionCount?: number;
  commentCount?: number;
  /** Post creation time in epoch millis (repo converts from Firestore Timestamp). */
  createdAtMs?: number;
}

export interface RankingWeights {
  /** Multiplier on the [0,1] archetype-affinity term. */
  archetype: number;
  /** Multiplier on ln(1 + likes). Log-damped so viral posts don't run away. */
  likes: number;
  /** Multiplier on ln(1 + comments). */
  comments: number;
  /** Multiplier on the [0,1] recency-decay term. */
  recency: number;
  /** Half-life (days) of the recency decay. */
  recencyHalfLifeDays: number;
  /** Penalty subtracted when the viewer has already seen a post. */
  seenPenalty: number;
  /** Max ± random tiebreak per post so equal-score grids aren't identical. */
  jitter: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  archetype: 1,
  likes: 0.1,
  comments: 0.2,
  recency: 0.7,
  recencyHalfLifeDays: 7,
  seenPenalty: 0.5,
  jitter: 0.04,
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Neutral score used when either side's archetype is missing/unknown, so those
// posts still surface rather than being treated as maximally dissimilar.
const NEUTRAL_AFFINITY = 0.3;

// Per-viewer archetype affinity in [0,1]. Symmetric. Same archetype scores 1;
// related personas get partial credit (powerlifter↔bodybuilder both iron-sport,
// crossfitter↔athlete both conditioning-led). Everything else is a mild 0.4.
const AFFINITY: Record<Archetype, Record<Archetype, number>> = {
  athlete: { athlete: 1, bodybuilder: 0.4, crossfitter: 0.6, generalist: 0.4, powerlifter: 0.4 },
  bodybuilder: { athlete: 0.4, bodybuilder: 1, crossfitter: 0.4, generalist: 0.4, powerlifter: 0.6 },
  crossfitter: { athlete: 0.6, bodybuilder: 0.4, crossfitter: 1, generalist: 0.4, powerlifter: 0.4 },
  generalist: { athlete: 0.4, bodybuilder: 0.4, crossfitter: 0.4, generalist: 1, powerlifter: 0.4 },
  powerlifter: { athlete: 0.4, bodybuilder: 0.6, crossfitter: 0.4, generalist: 0.4, powerlifter: 1 },
};

/** Affinity in [0,1] between the viewer's archetype and a post's archetype. */
export function archetypeAffinity(viewer?: string, post?: string): number {
  if (!viewer || !post) return NEUTRAL_AFFINITY;
  if (viewer === post) return 1;
  const row = AFFINITY[viewer as Archetype];
  if (!row) return NEUTRAL_AFFINITY;
  const value = row[post as Archetype];
  return value === undefined ? NEUTRAL_AFFINITY : value;
}

export interface ScoreOptions {
  weights?: RankingWeights;
  /** Posts the viewer has already seen — penalized so the grid stays fresh. */
  seen?: Set<string>;
  /** Injectable clock for deterministic tests; defaults to now. */
  now?: Date;
}

/** Relevance score for a single post from a given viewer's perspective. */
export function scorePost(
  post: RankablePost,
  viewerArchetype: string | undefined,
  opts: ScoreOptions = {}
): number {
  const w = opts.weights ?? DEFAULT_WEIGHTS;
  const nowMs = (opts.now ?? new Date()).getTime();

  const affinity = archetypeAffinity(viewerArchetype, post.authorArchetype);
  const likes = Math.max(0, post.reactionCount ?? 0);
  const comments = Math.max(0, post.commentCount ?? 0);
  const engagement = w.likes * Math.log1p(likes) + w.comments * Math.log1p(comments);

  let recency = 0;
  if (post.createdAtMs) {
    const ageDays = Math.max(0, (nowMs - post.createdAtMs) / DAY_MS);
    recency = Math.pow(0.5, ageDays / w.recencyHalfLifeDays);
  }

  const seenPenalty = opts.seen?.has(post.id) ? w.seenPenalty : 0;
  const jitter = w.jitter > 0 ? (Math.random() * 2 - 1) * w.jitter : 0;

  return (
    w.archetype * affinity +
    engagement +
    w.recency * recency -
    seenPenalty +
    jitter
  );
}

/**
 * Sort candidate posts by descending relevance for the given viewer. Pure and
 * non-mutating. Callers rank a fetched candidate pool, then append lower-ranked
 * batches as the user scrolls (already-displayed items are never reordered, so
 * there are no scroll jumps).
 */
export function rankPosts<T extends RankablePost>(
  posts: T[],
  viewerArchetype: string | undefined,
  opts: ScoreOptions = {}
): T[] {
  return [...posts]
    .map(post => ({ post, score: scorePost(post, viewerArchetype, opts) }))
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.post);
}
