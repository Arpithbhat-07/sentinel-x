import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Scenarios } from './pages/Scenarios';
import { ScenarioBuilder } from './pages/ScenarioBuilder';
import { ExerciseLobby } from './pages/ExerciseLobby';
import { InstructorMonitor } from './pages/InstructorMonitor';
import { TraineeView } from './pages/TraineeView';
import { AARReportView } from './pages/AARReportView';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { api } from './services/api';
import { Exercise, Scenario } from './types';

const MainApp: React.FC = () => {
  const { currentRole } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeExerciseId, setActiveExerciseId] = useState<string>('');
  const [activeExerciseCode, setActiveExerciseCode] = useState<string>('');
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Synchronize default tab on role switch
  useEffect(() => {
    if (currentRole !== 'Instructor' && (currentTab === 'monitor' || currentTab === 'builder')) {
      setCurrentTab('trainee_view');
    }
  }, [currentRole]);

  // One-Click Demo Mode Handler (Section 26)
  const handleLaunchDemo = async () => {
    setIsDemoLoading(true);
    try {
      const demoEx = await api.startDemoExercise();
      setActiveExerciseId(demoEx.id);
      setActiveExerciseCode(demoEx.code);
      // Start simulation loop immediately
      await api.startExercise(demoEx.id);

      // Navigate based on current role
      if (currentRole === 'Instructor') {
        setCurrentTab('monitor');
      } else {
        setCurrentTab('trainee_view');
      }
    } catch (e) {
      console.error('Failed to launch demo exercise:', e);
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleStartExercise = async (exerciseId: string) => {
    await api.startExercise(exerciseId);
    setActiveExerciseId(exerciseId);
    if (currentRole === 'Instructor') {
      setCurrentTab('monitor');
    } else {
      setCurrentTab('trainee_view');
    }
  };

  const handleEndExercise = async (exerciseId: string) => {
    await api.endExercise(exerciseId);
    setCurrentTab('aar');
  };

  const handleCreateExerciseFromScenario = async (scenarioId: string) => {
    const ex = await api.createExercise(scenarioId, false);
    setActiveExerciseId(ex.id);
    setActiveExerciseCode(ex.code);
    setCurrentTab('lobby');
  };

  const handleScenarioCreated = (scenario: Scenario) => {
    setCurrentTab('scenarios');
  };

  // Auto-discover any active or existing exercise session on load
  useEffect(() => {
    api.getExercises()
      .then((list) => {
        const active = list.find((e) => e.status === 'RUNNING') || list[0];
        if (active) {
          setActiveExerciseId(active.id);
          setActiveExerciseCode(active.code);
        }
      })
      .catch(() => {});
  }, []);

  const handleNavigate = (tab: string, param?: string) => {
    if (param) {
      setActiveExerciseId(param);
      api.getExercise(param).then((ex) => {
        setActiveExerciseCode(ex.code);
      }).catch(() => {});
    }
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-[#F1F5F9] flex flex-col font-sans selection:bg-sky-500/30">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onLaunchDemo={handleLaunchDemo}
        isDemoLoading={isDemoLoading}
        activeExerciseCode={activeExerciseCode}
        isConnected={true}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {currentTab === 'dashboard' && (
          <Dashboard
            onNavigate={handleNavigate}
            onLaunchDemo={handleLaunchDemo}
            isDemoLoading={isDemoLoading}
          />
        )}

        {currentTab === 'scenarios' && (
          <Scenarios
            onNavigate={handleNavigate}
            onCreateExercise={handleCreateExerciseFromScenario}
          />
        )}

        {currentTab === 'builder' && (
          <ScenarioBuilder onScenarioCreated={handleScenarioCreated} />
        )}

        {currentTab === 'lobby' && (
          <ExerciseLobby
            exerciseId={activeExerciseId}
            onStartExercise={handleStartExercise}
            onJoinSession={(id) => {
              setActiveExerciseId(id);
              setCurrentTab('trainee_view');
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'monitor' && (
          <InstructorMonitor
            exerciseId={activeExerciseId || 'SNTL-4821'}
            onEndExercise={handleEndExercise}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'trainee_view' && (
          <TraineeView
            exerciseId={activeExerciseId || 'SNTL-4821'}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'aar' && (
          <AARReportView
            exerciseId={activeExerciseId || 'SNTL-4821'}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'analytics' && <Analytics />}

        {currentTab === 'settings' && <Settings />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/70 py-4 px-6 text-center text-xs font-mono text-slate-500">
        SENTINEL-X C2 DECISION SIMULATOR • PS 26248 • DEFENCE SERVICES STAFF COLLEGE • SMART INDIA HACKATHON
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
