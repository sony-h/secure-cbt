import { describe, it, expect } from 'vitest';
import { sampleQuestionPool } from '../session-sampler';

describe('sampleQuestionPool', () => {
  function makeQuestions(counts: { easy: number; medium: number; hard: number }) {
    const list: Array<{ id: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; position: number }> = [];
    let pos = 1;
    for (let i = 0; i < counts.easy; i++) {
      list.push({ id: `easy-${i + 1}`, difficulty: 'EASY', position: pos++ });
    }
    for (let i = 0; i < counts.medium; i++) {
      list.push({ id: `medium-${i + 1}`, difficulty: 'MEDIUM', position: pos++ });
    }
    for (let i = 0; i < counts.hard; i++) {
      list.push({ id: `hard-${i + 1}`, difficulty: 'HARD', position: pos++ });
    }
    return list;
  }

  describe('BALANCED mode', () => {
    it('distributes quotas proportionally when fractions are exact', () => {
      // 30 Easy (50%), 20 Medium (33.33%), 10 Hard (16.67%) -> Pool of 30 -> 15 Easy, 10 Medium, 5 Hard
      const candidates = makeQuestions({ easy: 30, medium: 20, hard: 10 });
      const sampled = sampleQuestionPool(candidates, 30, 'BALANCED');

      expect(sampled).toHaveLength(30);
      const easyCount = sampled.filter((q) => q.difficulty === 'EASY').length;
      const medCount = sampled.filter((q) => q.difficulty === 'MEDIUM').length;
      const hardCount = sampled.filter((q) => q.difficulty === 'HARD').length;

      expect(easyCount).toBe(15);
      expect(medCount).toBe(10);
      expect(hardCount).toBe(5);
    });

    it('uses largest-remainder method when quotas do not divide evenly', () => {
      // 10 Easy, 10 Medium, 10 Hard (Total 30) -> Pool of 10
      // 10/30 * 10 = 3.3333 each. Base = 3 each (sum=9), leftover = 1.
      // Total sampled must be exactly 10.
      const candidates = makeQuestions({ easy: 10, medium: 10, hard: 10 });
      const sampled = sampleQuestionPool(candidates, 10, 'BALANCED');

      expect(sampled).toHaveLength(10);
      const easyCount = sampled.filter((q) => q.difficulty === 'EASY').length;
      const medCount = sampled.filter((q) => q.difficulty === 'MEDIUM').length;
      const hardCount = sampled.filter((q) => q.difficulty === 'HARD').length;

      expect(easyCount + medCount + hardCount).toBe(10);
      // All counts must be either 3 or 4
      expect([3, 4]).toContain(easyCount);
      expect([3, 4]).toContain(medCount);
      expect([3, 4]).toContain(hardCount);
    });

    it('handles zero questions in a difficulty tier gracefully', () => {
      // 20 Medium, 10 Hard, 0 Easy -> Pool of 15
      // 20/30 * 15 = 10 Medium, 10/30 * 15 = 5 Hard, 0 Easy
      const candidates = makeQuestions({ easy: 0, medium: 20, hard: 10 });
      const sampled = sampleQuestionPool(candidates, 15, 'BALANCED');

      expect(sampled).toHaveLength(15);
      expect(sampled.filter((q) => q.difficulty === 'EASY')).toHaveLength(0);
      expect(sampled.filter((q) => q.difficulty === 'MEDIUM')).toHaveLength(10);
      expect(sampled.filter((q) => q.difficulty === 'HARD')).toHaveLength(5);
    });
  });

  describe('PURE_RANDOM mode', () => {
    it('draws exact poolCount uniformly from candidates', () => {
      const candidates = makeQuestions({ easy: 20, medium: 20, hard: 20 });
      const sampled = sampleQuestionPool(candidates, 25, 'PURE_RANDOM');

      expect(sampled).toHaveLength(25);
      // All items must be unique from the candidate list
      const ids = new Set(sampled.map((q) => q.id));
      expect(ids.size).toBe(25);
    });
  });

  describe('Edge cases', () => {
    it('returns all candidates when poolCount is greater than or equal to candidate count', () => {
      const candidates = makeQuestions({ easy: 5, medium: 5, hard: 5 });
      const sampled = sampleQuestionPool(candidates, 50, 'BALANCED');

      expect(sampled).toHaveLength(15);
    });

    it('returns empty array when poolCount is 0 or negative', () => {
      const candidates = makeQuestions({ easy: 5, medium: 5, hard: 5 });
      expect(sampleQuestionPool(candidates, 0, 'BALANCED')).toEqual([]);
      expect(sampleQuestionPool(candidates, -5, 'BALANCED')).toEqual([]);
    });

    it('returns empty array when candidate list is empty', () => {
      expect(sampleQuestionPool([], 10, 'BALANCED')).toEqual([]);
    });
  });
});
