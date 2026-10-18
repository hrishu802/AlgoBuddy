import React, { useState, useMemo, useEffect } from 'react';
import { 
  AppView, 
  AppMode, 
  Problem, 
  Concept, 
  UserStats, 
  AISettings, 
  ConceptStatus 
} from './types';
import { PROBLEMS } from './data/problems';
import { CONCEPTS } from './data/concepts';
import { 
  loadUserStats, 
  saveUserStats, 
  loadAISettings, 
  saveAISettings, 
  getAllProblems, 
  saveCustomProblem,
  DEFAULT_STATS,
  resetUserStats,
  loadLearningEvents,
  recordLearningEvent,
  loadProblemCompletions,
  loadSpacedReviews,
  recordReviewCompletion
} from './services/storage';
import { computeUserStats } from './services/analytics';
import { generateAdaptiveRecommendations, getDueReviews } from './services/recommendations';
import { getAIService } from './services/ai/aiService';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { ConceptLibraryPage } from './pages/ConceptLibraryPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsModal } from './components/SettingsModal';
import { NewProblemModal } from './components/NewProblemModal';

export const App: React.FC = () => {
  // Navigation & Mode
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [currentMode, setCurrentMode] = useState<AppMode>('problem');

  // Problems & Concepts State
  const [problems, setProblems] = useState<Problem[]>(() => getAllProblems());
  const [concepts, setConcepts] = useState<Concept[]>(() => CONCEPTS);
  const [selectedProblem, setSelectedProblem] = useState<Problem>(() => problems[0] || PROBLEMS[0]);
  const [selectedConcept, setSelectedConcept] = useState<Concept>(() => concepts[0] || CONCEPTS[0]);

  // Spaced reviews state
  const [reviews, setReviews] = useState(() => loadSpacedReviews());

  // Persistent User Data & AI Settings (synchronized with recorded learning events & completions)
  const [stats, setStats] = useState<UserStats>(() => {
    const events = loadLearningEvents();
    const completions = loadProblemCompletions();
    const allProbs = getAllProblems();
    if (events.length > 0 || completions.size > 0) {
      const fresh = computeUserStats(events, allProbs, CONCEPTS, new Date(), completions);
      saveUserStats(fresh);
      return fresh;
    }
    return loadUserStats();
  });
  const [settings, setSettings] = useState<AISettings>(() => loadAISettings());

  // Refresh stats deterministically from learning events & completions
  const refreshStats = () => {
    const events = loadLearningEvents();
    const completions = loadProblemCompletions();
    setReviews(loadSpacedReviews());
    if (events.length > 0 || completions.size > 0) {
      const freshStats = computeUserStats(events, problems, concepts, new Date(), completions);
      setStats(freshStats);
      saveUserStats(freshStats);
    } else {
      setStats(DEFAULT_STATS);
      saveUserStats(DEFAULT_STATS);
    }
  };

  // Adaptive recommendations memoized strictly from stored evidence
  const adaptiveRecommendations = useMemo(() => {
    const events = loadLearningEvents();
    const completions = loadProblemCompletions();
    return generateAdaptiveRecommendations({
      allProblems: problems,
      allConcepts: concepts,
      stats,
      events,
      completions,
      reviews,
      currentProblemId: selectedProblem?.id
    });
  }, [problems, concepts, stats, reviews, selectedProblem?.id]);

  // Due reviews calculated deterministically from active schedule
  const dueReviews = useMemo(() => {
    return getDueReviews(problems, reviews);
  }, [problems, reviews]);

  // Handle explicit spaced review completion action
  const handleCompleteReview = (problemId: string) => {
    recordReviewCompletion(problemId);
    setReviews(loadSpacedReviews());
    refreshStats();
  };

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewProblemOpen, setIsNewProblemOpen] = useState(false);

  // Instantiated AI Service
  const aiService = useMemo(() => getAIService(settings), [settings]);

  // Handle View Navigation
  const handleNavigate = (view: AppView, mode?: AppMode) => {
    setCurrentView(view);
    if (mode) {
      setCurrentMode(mode);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Launch Mode from Landing Page or Cards
  const handleStartMode = (mode: AppMode, problemId?: string, conceptId?: string) => {
    setCurrentMode(mode);
    if (mode === 'problem' && problemId) {
      const match = problems.find(p => p.id === problemId);
      if (match) setSelectedProblem(match);
    }
    if (mode === 'concept' && conceptId) {
      const match = concepts.find(c => c.id === conceptId);
      if (match) setSelectedConcept(match);
    }
    setCurrentView('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Study Concept from Library
  const handleStudyConcept = (concept: Concept) => {
    setSelectedConcept(concept);
    setCurrentMode('concept');
    setCurrentView('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Concept Status Update
  const handleUpdateConceptStatus = (conceptId: string, status: ConceptStatus) => {
    setConcepts(prev => 
      prev.map(c => c.id === conceptId ? { ...c, status } : c)
    );
    recordLearningEvent({
      type: 'concept_studied',
      targetId: conceptId,
      targetType: 'concept',
      metadata: { status }
    });
    refreshStats();
  };

  // Add Custom Problem
  const handleAddProblem = (newProblem: Problem) => {
    saveCustomProblem(newProblem);
    setProblems(getAllProblems());
    setSelectedProblem(newProblem);
    setCurrentMode('problem');
    setCurrentView('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save Settings
  const handleSaveSettings = (newSettings: AISettings) => {
    setSettings(newSettings);
    saveAISettings(newSettings);
  };

  // Reset Stats
  const handleResetStats = () => {
    const empty = resetUserStats();
    setStats(empty);
    setReviews(new Map());
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      
      {/* Sticky Top Header Navigation */}
      <Navbar
        currentView={currentView}
        currentMode={currentMode}
        onNavigate={handleNavigate}
        stats={stats}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNewProblem={() => setIsNewProblemOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentView === 'home' && (
          <LandingPage
            onStartMode={handleStartMode}
            onNavigate={handleNavigate}
            stats={stats}
            recommendations={adaptiveRecommendations}
            dueReviews={dueReviews}
            onCompleteReview={handleCompleteReview}
          />
        )}

        {currentView === 'workspace' && (
          <WorkspacePage
            initialMode={currentMode}
            currentProblem={selectedProblem}
            allProblems={problems}
            onSelectProblem={setSelectedProblem}
            currentConcept={selectedConcept}
            allConcepts={concepts}
            onSelectConcept={setSelectedConcept}
            onUpdateConceptStatus={handleUpdateConceptStatus}
            aiService={aiService}
            settings={settings}
            onOpenNewProblem={() => setIsNewProblemOpen(true)}
            onStatsUpdate={refreshStats}
          />
        )}

        {currentView === 'concepts' && (
          <ConceptLibraryPage
            concepts={concepts}
            onStudyConcept={handleStudyConcept}
          />
        )}

        {currentView === 'progress' && (
          <ProgressPage
            stats={stats}
            totalConcepts={concepts.length}
            onNavigateToTopic={(mode, pId, cId) => handleStartMode(mode, pId, cId)}
            recommendations={adaptiveRecommendations}
            reviews={reviews}
            allProblems={problems}
            onCompleteReview={handleCompleteReview}
          />
        )}
      </main>

      {/* Global Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetStats={handleResetStats}
      />

      <NewProblemModal
        isOpen={isNewProblemOpen}
        onClose={() => setIsNewProblemOpen(false)}
        onAddProblem={handleAddProblem}
      />

    </div>
  );
};

export default App;
