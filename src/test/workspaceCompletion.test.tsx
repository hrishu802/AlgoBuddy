import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { WorkspacePage } from '../pages/WorkspacePage';
import { MockAIService } from '../services/ai/aiService';
import { DEFAULT_SETTINGS, getCompletedProblemIds } from '../services/storage';
import { PROBLEMS } from '../data/problems';
import { CONCEPTS } from '../data/concepts';

describe('Workspace Problem Completion Contract & UI Integration', () => {
  const mockAIService = new MockAIService();
  const onSelectProblem = vi.fn();
  const onSelectConcept = vi.fn();
  const onOpenNewProblem = vi.fn();
  const onStatsUpdate = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders initial Unsolved status and Mark as Solved button', () => {
    render(
      <WorkspacePage
        initialMode="problem"
        currentProblem={PROBLEMS[0]}
        allProblems={PROBLEMS}
        onSelectProblem={onSelectProblem}
        currentConcept={CONCEPTS[0]}
        allConcepts={CONCEPTS}
        onSelectConcept={onSelectConcept}
        aiService={mockAIService}
        settings={DEFAULT_SETTINGS}
        onOpenNewProblem={onOpenNewProblem}
        onStatsUpdate={onStatsUpdate}
      />
    );

    expect(screen.getByText('Unsolved')).toBeDefined();
    expect(screen.getByText('Mark as Solved')).toBeDefined();
  });

  it('opens confirmation modal explaining self-reported policy and records completion on confirm', async () => {
    render(
      <WorkspacePage
        initialMode="problem"
        currentProblem={PROBLEMS[0]}
        allProblems={PROBLEMS}
        onSelectProblem={onSelectProblem}
        currentConcept={CONCEPTS[0]}
        allConcepts={CONCEPTS}
        onSelectConcept={onSelectConcept}
        aiService={mockAIService}
        settings={DEFAULT_SETTINGS}
        onOpenNewProblem={onOpenNewProblem}
        onStatsUpdate={onStatsUpdate}
      />
    );

    // Click Mark as Solved
    const markBtn = screen.getByText('Mark as Solved');
    fireEvent.click(markBtn);

    // Verify modal is open and has clear truthful explanations
    expect(screen.getByText('Confirm Problem Completion')).toBeDefined();
    expect(screen.getByText(/Recorded as self-reported completion/)).toBeDefined();
    expect(screen.getByText('Independent solve (No hints requested)')).toBeDefined();

    // Confirm completion
    const confirmBtn = screen.getByText('Confirm & Save');
    fireEvent.click(confirmBtn);

    // Verify status updated to Solved (Self-reported)
    await waitFor(() => {
      expect(screen.getByText('Solved (Self-reported)')).toBeDefined();
      expect(screen.getByText('Undo Solved')).toBeDefined();
    });

    // Check storage
    expect(getCompletedProblemIds().has(PROBLEMS[0].id)).toBe(true);
    expect(onStatsUpdate).toHaveBeenCalled();
  });

  it('allows undoing accidental completion and reverts status to Unsolved', async () => {
    render(
      <WorkspacePage
        initialMode="problem"
        currentProblem={PROBLEMS[0]}
        allProblems={PROBLEMS}
        onSelectProblem={onSelectProblem}
        currentConcept={CONCEPTS[0]}
        allConcepts={CONCEPTS}
        onSelectConcept={onSelectConcept}
        aiService={mockAIService}
        settings={DEFAULT_SETTINGS}
        onOpenNewProblem={onOpenNewProblem}
        onStatsUpdate={onStatsUpdate}
      />
    );

    // Mark solved
    fireEvent.click(screen.getByText('Mark as Solved'));
    fireEvent.click(screen.getByText('Confirm & Save'));

    await waitFor(() => {
      expect(screen.getByText('Undo Solved')).toBeDefined();
    });

    // Click Undo Solved
    fireEvent.click(screen.getByText('Undo Solved'));
    expect(screen.getByText('Undo Problem Completion')).toBeDefined();

    // Confirm Undo
    fireEvent.click(screen.getByText('Confirm Undo'));

    await waitFor(() => {
      expect(screen.getByText('Unsolved')).toBeDefined();
      expect(screen.getByText('Mark as Solved')).toBeDefined();
    });

    expect(getCompletedProblemIds().has(PROBLEMS[0].id)).toBe(false);
  });

  it('updates completed state dynamically when switching between problems', async () => {
    const { rerender } = render(
      <WorkspacePage
        initialMode="problem"
        currentProblem={PROBLEMS[0]}
        allProblems={PROBLEMS}
        onSelectProblem={onSelectProblem}
        currentConcept={CONCEPTS[0]}
        allConcepts={CONCEPTS}
        onSelectConcept={onSelectConcept}
        aiService={mockAIService}
        settings={DEFAULT_SETTINGS}
        onOpenNewProblem={onOpenNewProblem}
        onStatsUpdate={onStatsUpdate}
      />
    );

    // Complete problem 0
    fireEvent.click(screen.getByText('Mark as Solved'));
    fireEvent.click(screen.getByText('Confirm & Save'));

    await waitFor(() => {
      expect(screen.getByText('Solved (Self-reported)')).toBeDefined();
    });

    // Switch to problem 1 (which is unsolved)
    rerender(
      <WorkspacePage
        initialMode="problem"
        currentProblem={PROBLEMS[1]}
        allProblems={PROBLEMS}
        onSelectProblem={onSelectProblem}
        currentConcept={CONCEPTS[0]}
        allConcepts={CONCEPTS}
        onSelectConcept={onSelectConcept}
        aiService={mockAIService}
        settings={DEFAULT_SETTINGS}
        onOpenNewProblem={onOpenNewProblem}
        onStatsUpdate={onStatsUpdate}
      />
    );

    expect(screen.getByText('Unsolved')).toBeDefined();
    expect(screen.getByText('Mark as Solved')).toBeDefined();
  });
});
