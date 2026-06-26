import { rankFeed } from '../feedRanking';
import type { FeedPost } from '@/features/feed/domain/FeedPost';
import type { SeenState, SeenEntry } from '@/features/feed/domain/SeenState';

// Minimal FeedPost factory — only the fields the ranker reads matter.
function post(id: string, isLiked = false): FeedPost {
  return { id, isLiked } as unknown as FeedPost;
}

function entry(over: Partial<SeenEntry> = {}): SeenEntry {
  return { lastSeenAt: 0, count: 1, opened: false, ...over };
}

function seenState(posts: Record<string, SeenEntry>): SeenState {
  return { posts };
}

describe('rankFeed', () => {
  it('puts all unseen posts first in incoming order', () => {
    const result = rankFeed([post('a'), post('b'), post('c')], seenState({}));
    expect(result.ranked.map(p => p.id)).toEqual(['a', 'b', 'c']);
    expect(result.unseenCount).toBe(3);
    expect(result.seenCount).toBe(0);
    expect(result.ranked.every(p => p.seen === false)).toBe(true);
  });

  it('demotes seen posts into the backfill tier', () => {
    const result = rankFeed(
      [post('a'), post('seen1'), post('b')],
      seenState({ seen1: entry() })
    );
    expect(result.ranked.map(p => p.id)).toEqual(['a', 'b', 'seen1']);
    expect(result.unseenCount).toBe(2);
    expect(result.seenCount).toBe(1);
  });

  it('re-show order: not-opened before opened', () => {
    const result = rankFeed(
      [post('opened'), post('glanced')],
      seenState({ opened: entry({ opened: true }), glanced: entry({ opened: false }) })
    );
    expect(result.ranked.map(p => p.id)).toEqual(['glanced', 'opened']);
  });

  it('re-show order: not-liked before liked when open-state is equal', () => {
    const result = rankFeed(
      [post('liked', true), post('unliked', false)],
      seenState({ liked: entry(), unliked: entry() })
    );
    expect(result.ranked.map(p => p.id)).toEqual(['unliked', 'liked']);
  });

  it('re-show order: fewer impressions, then seen-longest-ago', () => {
    const result = rankFeed(
      [post('many'), post('few'), post('old')],
      seenState({
        many: entry({ count: 5, lastSeenAt: 100 }),
        few: entry({ count: 1, lastSeenAt: 100 }),
        old: entry({ count: 1, lastSeenAt: 50 }),
      })
    );
    // few & old both count=1 -> older lastSeenAt first (old before few); many last.
    expect(result.ranked.map(p => p.id)).toEqual(['old', 'few', 'many']);
  });
});
