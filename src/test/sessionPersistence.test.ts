import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSavedSessions,
  saveMentorSession,
  findSavedSession,
  deleteSavedSession
} from '../services/storage';
import { MentorSession, ChatMessage } from '../types';

describe('Mentor Session Persistence (Workstream D)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and restores a problem session across simulated reloads', () => {
    const welcomeMsg: ChatMessage = {
      id: 'msg-1',
      sender: 'mentor',
      content: 'Welcome to Two Sum!',
      timestamp: '10:00 AM'
    };
    const userMsg: ChatMessage = {
      id: 'msg-2',
      sender: 'user',
      content: 'Can we use two pointers?',
      timestamp: '10:01 AM'
    };
    const mentorReply: ChatMessage = {
      id: 'msg-3',
      sender: 'mentor',
      content: 'Is the array sorted? Remember constraints!',
      timestamp: '10:01 AM'
    };

    const session: MentorSession = {
      id: 'session-problem-two-sum',
      title: 'Two Sum',
      mode: 'problem',
      problemId: 'two-sum',
      currentStage: 'pattern',
      highestHintLevel: 'nudge',
      messages: [welcomeMsg, userMsg, mentorReply],
      updatedAt: new Date().toISOString()
    };

    saveMentorSession(session);

    // Simulate page reload
    const restored = findSavedSession('problem', 'two-sum');
    expect(restored).toBeDefined();
    expect(restored?.id).toBe('session-problem-two-sum');
    expect(restored?.messages.length).toBe(3);
    expect(restored?.messages[2].content).toContain('Is the array sorted?');
    expect(restored?.currentStage).toBe('pattern');
    expect(restored?.highestHintLevel).toBe('nudge');
  });

  it('does not mix Problem, Concept, and Code sessions together', () => {
    const problemSession: MentorSession = {
      id: 'session-problem-two-sum',
      title: 'Two Sum',
      mode: 'problem',
      problemId: 'two-sum',
      currentStage: 'constraints',
      highestHintLevel: null,
      messages: [{ id: 'p1', sender: 'mentor', content: 'Problem chat', timestamp: '10:00' }],
      updatedAt: new Date().toISOString()
    };

    const conceptSession: MentorSession = {
      id: 'session-concept-two-pointers',
      title: 'Two Pointers',
      mode: 'concept',
      conceptId: 'two-pointers',
      currentStage: 'constraints',
      highestHintLevel: null,
      messages: [{ id: 'c1', sender: 'mentor', content: 'Concept chat', timestamp: '10:02' }],
      updatedAt: new Date().toISOString()
    };

    const codeSession: MentorSession = {
      id: 'session-code-two-sum',
      title: 'Code: Two Sum',
      mode: 'code',
      problemId: 'two-sum',
      userCode: 'def two_sum(): pass',
      language: 'python',
      currentStage: 'optimize',
      highestHintLevel: null,
      messages: [{ id: 'cd1', sender: 'mentor', content: 'Code analysis chat', timestamp: '10:05' }],
      updatedAt: new Date().toISOString()
    };

    saveMentorSession(problemSession);
    saveMentorSession(conceptSession);
    saveMentorSession(codeSession);

    const loadedProblem = findSavedSession('problem', 'two-sum');
    expect(loadedProblem?.messages[0].content).toBe('Problem chat');

    const loadedConcept = findSavedSession('concept', 'two-pointers');
    expect(loadedConcept?.messages[0].content).toBe('Concept chat');

    const loadedCode = findSavedSession('code', 'two-sum');
    expect(loadedCode?.messages[0].content).toBe('Code analysis chat');
    expect(loadedCode?.userCode).toBe('def two_sum(): pass');

    // Searching for an unstarted problem returns undefined
    expect(findSavedSession('problem', '3sum')).toBeUndefined();
  });

  it('updates existing session without duplicating messages or sessions', () => {
    const session: MentorSession = {
      id: 'session-problem-two-sum',
      title: 'Two Sum',
      mode: 'problem',
      problemId: 'two-sum',
      currentStage: 'constraints',
      highestHintLevel: null,
      messages: [{ id: 'msg-1', sender: 'mentor', content: 'Initial message', timestamp: '10:00' }],
      updatedAt: new Date().toISOString()
    };

    saveMentorSession(session);
    expect(loadSavedSessions()).toHaveLength(1);

    // Update with new message
    const updatedSession: MentorSession = {
      ...session,
      currentStage: 'bruteforce',
      messages: [
        ...session.messages,
        { id: 'msg-2', sender: 'user', content: 'Next step', timestamp: '10:01' }
      ],
      updatedAt: new Date().toISOString()
    };

    saveMentorSession(updatedSession);

    const allSessions = loadSavedSessions();
    expect(allSessions).toHaveLength(1); // Same session updated, no duplicate entry
    expect(allSessions[0].messages).toHaveLength(2);
    expect(allSessions[0].currentStage).toBe('bruteforce');
  });

  it('deletes a specific session on reset without touching others', () => {
    const s1: MentorSession = {
      id: 'session-problem-two-sum',
      title: 'Two Sum',
      mode: 'problem',
      problemId: 'two-sum',
      currentStage: 'constraints',
      highestHintLevel: null,
      messages: [],
      updatedAt: new Date().toISOString()
    };
    const s2: MentorSession = {
      id: 'session-problem-3sum',
      title: '3Sum',
      mode: 'problem',
      problemId: '3sum',
      currentStage: 'constraints',
      highestHintLevel: null,
      messages: [],
      updatedAt: new Date().toISOString()
    };

    saveMentorSession(s1);
    saveMentorSession(s2);
    expect(loadSavedSessions()).toHaveLength(2);

    deleteSavedSession('session-problem-two-sum');

    expect(findSavedSession('problem', 'two-sum')).toBeUndefined();
    expect(findSavedSession('problem', '3sum')).toBeDefined();
    expect(loadSavedSessions()).toHaveLength(1);
  });
});
