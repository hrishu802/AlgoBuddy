import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordLearningEvent,
  loadLearningEvents,
  clearLearningEvents,
  getCompletedProblemIds,
  getCompletedProblemIdsFromEvents,
  saveLearningEvents
} from '../services/storage';
import { LearningEvent } from '../types';

describe('Learning Event Store & Problem Completion Contract', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Learning Event Model & Persistence', () => {
    it('records valid events and persists them to localStorage', () => {
      const event = recordLearningEvent({
        type: 'problem_opened',
        targetId: 'two-sum',
        targetType: 'problem',
        metadata: { stage: 'constraints' }
      });

      expect(event).not.toBeNull();
      expect(event?.id).toMatch(/^evt-/);
      expect(event?.type).toBe('problem_opened');
      expect(event?.targetId).toBe('two-sum');

      const loaded = loadLearningEvents();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(event?.id);
    });

    it('enforces idempotency on duplicate event IDs', () => {
      const fixedId = 'evt-custom-123';
      const event1 = recordLearningEvent({
        id: fixedId,
        type: 'stage_advanced',
        targetId: 'two-sum',
        targetType: 'problem',
        metadata: { stage: 'pattern' }
      });

      const event2 = recordLearningEvent({
        id: fixedId,
        type: 'stage_advanced',
        targetId: 'two-sum',
        targetType: 'problem',
        metadata: { stage: 'optimize' } // duplicate ID should not add new event
      });

      expect(event1?.id).toBe(fixedId);
      expect(event2?.id).toBe(fixedId);

      const loaded = loadLearningEvents();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].metadata?.stage).toBe('pattern'); // original preserved
    });

    it('handles malformed localStorage data defensively without crashing', () => {
      localStorage.setItem('algobuddy_learning_events', 'NOT_VALID_JSON{[');
      expect(loadLearningEvents()).toEqual([]);

      localStorage.setItem('algobuddy_learning_events', JSON.stringify({ not: 'an array' }));
      expect(loadLearningEvents()).toEqual([]);

      localStorage.setItem(
        'algobuddy_learning_events',
        JSON.stringify([
          null,
          { invalid: 'object' },
          { id: 'ok-1', type: 'hint_requested', targetId: 'two-sum', targetType: 'problem', timestamp: 'invalid-date' },
          { id: 'ok-2', type: 'hint_requested', targetId: 'two-sum', targetType: 'problem', timestamp: new Date().toISOString() }
        ])
      );
      const loaded = loadLearningEvents();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('ok-2');
    });

    it('bounds retention to MAX_LEARNING_EVENTS (500)', () => {
      const overflowEvents: LearningEvent[] = [];
      for (let i = 0; i < 550; i++) {
        overflowEvents.push({
          id: `evt-${i}`,
          type: 'hint_requested',
          targetId: 'two-sum',
          targetType: 'problem',
          timestamp: new Date().toISOString()
        });
      }
      saveLearningEvents(overflowEvents);

      const loaded = loadLearningEvents();
      expect(loaded).toHaveLength(500);
    });

    it('handles localStorage errors gracefully without throwing', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const result = recordLearningEvent({
        type: 'problem_opened',
        targetId: 'two-sum',
        targetType: 'problem'
      });

      expect(result).toBeNull();
      setItemSpy.mockRestore();
    });
  });

  describe('Truthful Completion Contract', () => {
    it('opening a problem does not count as completion', () => {
      recordLearningEvent({
        type: 'problem_opened',
        targetId: 'two-sum',
        targetType: 'problem'
      });

      const completed = getCompletedProblemIds();
      expect(completed.has('two-sum')).toBe(false);
      expect(completed.size).toBe(0);
    });

    it('requesting hints does not count as completion', () => {
      recordLearningEvent({
        type: 'hint_requested',
        targetId: 'two-sum',
        targetType: 'problem',
        metadata: { hintLevel: 'nudge' }
      });
      recordLearningEvent({
        type: 'hint_requested',
        targetId: 'two-sum',
        targetType: 'problem',
        metadata: { hintLevel: 'strong_hint' }
      });

      const completed = getCompletedProblemIds();
      expect(completed.has('two-sum')).toBe(false);
    });

    it('advancing stages up to solution stage does not automatically count as completion', () => {
      const stages = ['constraints', 'bruteforce', 'pattern', 'hints', 'optimize', 'complexity', 'solution'] as const;
      for (const stage of stages) {
        recordLearningEvent({
          type: 'stage_advanced',
          targetId: 'two-sum',
          targetType: 'problem',
          metadata: { stage }
        });
      }

      const completed = getCompletedProblemIds();
      expect(completed.has('two-sum')).toBe(false);
    });

    it('explicit confirmation creates exactly one completion record and records self-reported verification', () => {
      const completion = recordLearningEvent({
        type: 'problem_completed',
        targetId: 'two-sum',
        targetType: 'problem',
        metadata: {
          selfReported: true,
          verification: 'self_reported',
          highestHintLevel: 'hint'
        }
      });

      expect(completion).not.toBeNull();
      expect(completion?.metadata?.selfReported).toBe(true);
      expect(completion?.metadata?.verification).toBe('self_reported');
      expect(completion?.metadata?.highestHintLevel).toBe('hint');

      const completed = getCompletedProblemIds();
      expect(completed.has('two-sum')).toBe(true);
      expect(completed.size).toBe(1);
    });

    it('repeated confirmation does not inflate completed problem totals', () => {
      recordLearningEvent({
        type: 'problem_completed',
        targetId: 'two-sum',
        targetType: 'problem',
        metadata: { selfReported: true, verification: 'self_reported' }
      });

      // Second attempt to complete the already completed problem
      recordLearningEvent({
        type: 'problem_completed',
        targetId: 'two-sum',
        targetType: 'problem',
        metadata: { selfReported: true, verification: 'self_reported' }
      });

      const events = loadLearningEvents();
      const completionEvents = events.filter(e => e.type === 'problem_completed' && e.targetId === 'two-sum');
      expect(completionEvents).toHaveLength(1); // Not duplicated

      const completed = getCompletedProblemIds();
      expect(completed.size).toBe(1);
    });

    it('supports uncompleting / correcting accidental completions safely', () => {
      recordLearningEvent({
        type: 'problem_completed',
        targetId: 'two-sum',
        targetType: 'problem',
        metadata: { selfReported: true, verification: 'self_reported' }
      });

      expect(getCompletedProblemIds().has('two-sum')).toBe(true);

      // Uncomplete
      recordLearningEvent({
        type: 'problem_uncompleted',
        targetId: 'two-sum',
        targetType: 'problem'
      });

      expect(getCompletedProblemIds().has('two-sum')).toBe(false);
      expect(getCompletedProblemIds().size).toBe(0);

      // Can be completed again later
      recordLearningEvent({
        type: 'problem_completed',
        targetId: 'two-sum',
        targetType: 'problem',
        metadata: { selfReported: true, verification: 'self_reported' }
      });

      expect(getCompletedProblemIds().has('two-sum')).toBe(true);
    });

    it('reconstructs completed state chronologically from sequence of events', () => {
      const historicalEvents: LearningEvent[] = [
        {
          id: '1',
          type: 'problem_completed',
          targetId: 'p1',
          targetType: 'problem',
          timestamp: '2026-10-10T10:00:00.000Z'
        },
        {
          id: '2',
          type: 'problem_completed',
          targetId: 'p2',
          targetType: 'problem',
          timestamp: '2026-10-11T10:00:00.000Z'
        },
        {
          id: '3',
          type: 'problem_uncompleted',
          targetId: 'p1',
          targetType: 'problem',
          timestamp: '2026-10-12T10:00:00.000Z'
        }
      ];

      const completed = getCompletedProblemIdsFromEvents(historicalEvents);
      expect(completed.has('p1')).toBe(false);
      expect(completed.has('p2')).toBe(true);
      expect(completed.size).toBe(1);
    });
  });
});
