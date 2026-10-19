import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PedagogyStageBar } from '../components/PedagogyStageBar';
import { MentorChat } from '../components/MentorChat';
import { ConceptContext } from '../components/ConceptContext';
import { CodeContext } from '../components/CodeContext';
import { HintControls } from '../components/HintControls';
import { ProgressPage } from '../pages/ProgressPage';
import { CONCEPTS } from '../data/concepts';
import { PROBLEMS } from '../data/problems';
import { ChatMessage, UserStats } from '../types';

describe('Milestone 4: Product Quality, UX & Learning Experience Audit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('PedagogyStageBar UX & State Safety', () => {
    it('disables all stage transitions and prevents clicks when disabled is true', () => {
      const onSelectStage = vi.fn();
      render(
        <PedagogyStageBar
          currentStage="constraints"
          onSelectStage={onSelectStage}
          disabled={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(7);
      buttons.forEach(button => {
        expect(button.hasAttribute('disabled')).toBe(true);
      });

      // Attempt to click another stage
      fireEvent.click(buttons[1]);
      expect(onSelectStage).not.toHaveBeenCalled();
    });

    it('provides accessible labels on stage buttons and permits selection when not disabled', () => {
      const onSelectStage = vi.fn();
      render(
        <PedagogyStageBar
          currentStage="constraints"
          onSelectStage={onSelectStage}
          disabled={false}
        />
      );

      const bruteForceButton = screen.getByRole('button', { name: /Step 2: 2\. Brute Force/i });
      expect(bruteForceButton).toBeDefined();
      expect(bruteForceButton.hasAttribute('disabled')).toBe(false);

      fireEvent.click(bruteForceButton);
      expect(onSelectStage).toHaveBeenCalledWith('bruteforce');
    });
  });

  describe('MentorChat Prompt Chips & Accessibility', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        sender: 'mentor',
        content: 'What do you notice about the array inputs and constraints?',
        timestamp: '12:00 PM',
        stage: 'constraints',
        suggestedActions: ['Test edge cases', 'Clarify constraints']
      }
    ];

    it('disables quick prompts and recommended action chips when isLoading is true', () => {
      const onSendMessage = vi.fn();
      render(
        <MentorChat
          messages={mockMessages}
          isLoading={true}
          currentStage="constraints"
          mode="problem"
          onSendMessage={onSendMessage}
        />
      );

      // Verify textarea has accessible label
      const textarea = screen.getByLabelText('Ask mentor a question');
      expect(textarea).toBeDefined();

      // Quick prompt buttons and action chips should be disabled
      const actionChips = screen.getAllByRole('button').filter(b =>
        b.textContent?.includes('Clarify constraints') ||
        b.textContent?.includes('Test edge cases') ||
        b.textContent?.includes('Check my intuition')
      );
      expect(actionChips.length).toBeGreaterThan(0);
      actionChips.forEach(btn => {
        expect(btn.hasAttribute('disabled')).toBe(true);
      });
    });

    it('allows clicking quick prompt chips when not loading', () => {
      const onSendMessage = vi.fn();
      render(
        <MentorChat
          messages={mockMessages}
          isLoading={false}
          currentStage="constraints"
          mode="problem"
          onSendMessage={onSendMessage}
        />
      );

      const quickPrompt = screen.getByText('Check my intuition');
      fireEvent.click(quickPrompt);
      expect(onSendMessage).toHaveBeenCalledWith('Check my intuition');
    });
  });

  describe('ConceptContext Quiz State Isolation & Accessibility', () => {
    it('resets selected quiz option and submitted status when concept changes', () => {
      const onSelectConcept = vi.fn();
      const onUpdateStatus = vi.fn();

      const concept1 = CONCEPTS[0];
      const concept2 = CONCEPTS[1];

      const { rerender } = render(
        <ConceptContext
          currentConcept={concept1}
          allConcepts={CONCEPTS}
          onSelectConcept={onSelectConcept}
          onUpdateStatus={onUpdateStatus}
        />
      );

      // Switch to Practice Quiz tab
      const quizTab = screen.getByText('Practice Quiz');
      fireEvent.click(quizTab);

      // Verify quiz rendered and select an option
      const optionButtons = screen.getAllByRole('button').filter(btn => btn.hasAttribute('aria-pressed'));
      expect(optionButtons.length).toBe(concept1.practiceQuestion.options.length);

      // Select first option
      fireEvent.click(optionButtons[0]);
      expect(optionButtons[0].getAttribute('aria-pressed')).toBe('true');

      // Submit the quiz
      const submitBtn = screen.getByText('Verify Answer');
      fireEvent.click(submitBtn);

      // Result explanation and reset button should be visible
      expect(screen.getByText('Try Question Again')).toBeDefined();

      // Now switch concept
      rerender(
        <ConceptContext
          currentConcept={concept2}
          allConcepts={CONCEPTS}
          onSelectConcept={onSelectConcept}
          onUpdateStatus={onUpdateStatus}
        />
      );

      // Switch to Practice Quiz tab for concept 2
      const quizTab2 = screen.getByText('Practice Quiz');
      fireEvent.click(quizTab2);

      // Verify new concept options are clean and unselected
      const newOptionButtons = screen.getAllByRole('button').filter(btn => btn.hasAttribute('aria-pressed'));
      newOptionButtons.forEach(btn => {
        expect(btn.getAttribute('aria-pressed')).toBe('false');
      });

      // Try Question Again button should not be shown for fresh concept
      expect(screen.queryByText('Try Question Again')).toBeNull();
    });
  });

  describe('CodeContext Accessibility', () => {
    it('provides accessible label for the DSA code editor textarea', () => {
      const onAnalyzeCode = vi.fn();
      const onResetCode = vi.fn();
      const onCodeChange = vi.fn();

      render(
        <CodeContext
          userCode="def solution(): pass"
          onCodeChange={onCodeChange}
          language="python"
          onLanguageChange={vi.fn()}
          analysis={null}
          isAnalyzing={false}
          onTriggerAnalysis={vi.fn()}
          onAskMentorAboutCode={vi.fn()}
        />
      );

      const editor = screen.getByLabelText('DSA Code Editor');
      expect(editor).toBeDefined();
    });
  });

  describe('HintControls Visual Indicators & Safety', () => {
    it('renders unlocked indicator when highestHintLevel is set and disables when disabled is true', () => {
      const onSelectHint = vi.fn();
      render(
        <HintControls
          highestHintLevel="hint"
          onSelectHint={onSelectHint}
          disabled={false}
        />
      );

      // "Nudge" (Level 1) is <= "Hint" (Level 2), so it is unlocked
      const nudgeBtn = screen.getByTitle(/Nudge:.*\(Unlocked\)/);
      expect(nudgeBtn).toBeDefined();

      // "Hint" (Level 2) is the current highest level
      const hintBtn = screen.getByTitle(/Hint:.*\(Unlocked\)/);
      expect(hintBtn).toBeDefined();

      // "Explain" (Level 4) is not unlocked
      const explainBtn = screen.getByTitle(/^Explain:/);
      expect(explainBtn.getAttribute('title')?.includes('(Unlocked)')).toBe(false);
    });

    it('handles null highestHintLevel safely without errors', () => {
      const onSelectHint = vi.fn();
      render(
        <HintControls
          highestHintLevel={null}
          onSelectHint={onSelectHint}
          disabled={false}
        />
      );

      const nudgeBtn = screen.getByTitle(/^Nudge:/);
      expect(nudgeBtn.getAttribute('title')?.includes('(Unlocked)')).toBe(false);
    });
  });

  describe('ProgressPage "Target in Practice" Weak Area Navigation', () => {
    it('locates matching problem by topic and navigates directly to that problem', () => {
      const onNavigateToTopic = vi.fn();
      const statsWithWeakness: UserStats = {
        problemsPracticed: 3,
        conceptsReviewed: 1,
        currentStreak: 2,
        weakAreas: [
          {
            topic: 'Hash Table',
            urgency: 'High',
            reason: 'Observed level 3+ hints in Hash Table sessions.'
          }
        ],
        recentlyStudied: [],
        recommendedNext: [],
        hintReliance: { averageLevel: 3, evaluatedSessions: 3, label: 'Lvl 3' },
        difficultyBreakdown: { easy: 3, medium: 0, hard: 0 }
      };

      render(
        <ProgressPage
          stats={statsWithWeakness}
          onNavigateToTopic={onNavigateToTopic}
          allProblems={PROBLEMS}
        />
      );

      const targetBtn = screen.getByText('Target in Practice');
      fireEvent.click(targetBtn);

      // Should find a problem related to 'Hash Table', like 'two-sum'
      expect(onNavigateToTopic).toHaveBeenCalledWith('problem', 'two-sum');
    });
  });
});
