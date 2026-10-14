import { shuffle } from '@secure-cbt/shared';

export interface SampleCandidate {
  id: string;
  difficulty?: string | null;
  [key: string]: any;
}

/**
 * Samples a subset of questions from a candidate question pool.
 *
 * @param candidates All available questions in the exam or package
 * @param poolCount Target number of questions to draw
 * @param mode 'BALANCED' (stratified by difficulty) or 'PURE_RANDOM'
 * @param randomize Whether to shuffle the final result
 */
export function sampleQuestionPool<T extends SampleCandidate>(
  candidates: T[],
  poolCount: number,
  mode: 'BALANCED' | 'PURE_RANDOM' = 'BALANCED',
  randomize = true,
): T[] {
  if (!candidates || candidates.length === 0 || poolCount <= 0) {
    return [];
  }

  // If pool count meets or exceeds candidate count, return all candidates
  if (candidates.length <= poolCount) {
    return randomize ? shuffle(candidates) : [...candidates];
  }

  if (mode === 'PURE_RANDOM') {
    const shuffled = shuffle(candidates);
    return shuffled.slice(0, poolCount);
  }

  // BALANCED mode: Stratified proportional draw by difficulty (EASY, MEDIUM, HARD)
  const buckets: Record<'EASY' | 'MEDIUM' | 'HARD', T[]> = {
    EASY: [],
    MEDIUM: [],
    HARD: [],
  };

  for (const item of candidates) {
    const diff = (item.difficulty || '').toUpperCase();
    if (diff === 'EASY') {
      buckets.EASY.push(item);
    } else if (diff === 'HARD') {
      buckets.HARD.push(item);
    } else {
      // Default / MEDIUM
      buckets.MEDIUM.push(item);
    }
  }

  const tiers: Array<'EASY' | 'MEDIUM' | 'HARD'> = ['EASY', 'MEDIUM', 'HARD'];
  const total = candidates.length;

  interface TierQuota {
    tier: 'EASY' | 'MEDIUM' | 'HARD';
    available: number;
    ideal: number;
    base: number;
    remainder: number;
  }

  const quotas: TierQuota[] = tiers.map((tier) => {
    const available = buckets[tier].length;
    if (available === 0) {
      return { tier, available: 0, ideal: 0, base: 0, remainder: 0 };
    }
    const ideal = (available / total) * poolCount;
    const base = Math.floor(ideal);
    return {
      tier,
      available,
      ideal,
      base,
      remainder: ideal - base,
    };
  });

  // Calculate allocated sum and leftover slots
  let allocated = quotas.reduce((acc, q) => acc + q.base, 0);
  let leftover = poolCount - allocated;

  // Largest-remainder distribution
  quotas.sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    return b.available - a.available;
  });

  for (const q of quotas) {
    if (leftover <= 0) break;
    if (q.base < q.available) {
      q.base += 1;
      leftover -= 1;
    }
  }

  // In the rare event leftover still remains, distribute to any tier with available space
  if (leftover > 0) {
    for (const q of quotas) {
      const canTake = Math.min(leftover, q.available - q.base);
      if (canTake > 0) {
        q.base += canTake;
        leftover -= canTake;
      }
      if (leftover <= 0) break;
    }
  }

  // Sample items from each bucket according to assigned base quota
  const selected: T[] = [];
  for (const q of quotas) {
    if (q.base > 0) {
      const shuffledBucket = shuffle(buckets[q.tier]);
      selected.push(...shuffledBucket.slice(0, q.base));
    }
  }

  return randomize ? shuffle(selected) : selected;
}
