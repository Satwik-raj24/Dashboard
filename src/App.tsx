import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, BookOpen, Clock, BarChart4, Calendar, 
  Target, Brain, LogOut, Menu, X, Flame, ShieldCheck, Trophy
} from 'lucide-react';
import { db, Profile, TopicProgress, MockTest, RevisionTask, StudySession, isSupabaseConfigured, getLocalDateString } from './services/db';
import { syllabus } from './services/syllabusData';
import AuthScreen from './components/AuthScreen';
import DashboardTab from './components/DashboardTab';
import SyllabusTab from './components/SyllabusTab';
import StudyTimerTab from './components/StudyTimerTab';
import MockTestTab from './components/MockTestTab';
import RevisionsTab from './components/RevisionsTab';
import GoalsNotesTab from './components/GoalsNotesTab';
import RankPredictorTab from './components/RankPredictorTab';

type ActiveTab = 'dashboard' | 'syllabus' | 'timer' | 'mocks' | 'revisions' | 'goals' | 'rankPredictor';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync Timer parameters (from syllabus studies hooks)
  const [timerSubjectId, setTimerSubjectId] = useState('');
  const [timerTopicName, setTimerTopicName] = useState('');

  // Core database state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<TopicProgress[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [mocks, setMockTests] = useState<MockTest[]>([]);
  const [revisions, setRevisions] = useState<RevisionTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Check login on mount
  useEffect(() => {
    const email = db.getCurrentUserEmail();
    const logged = localStorage.getItem('gateos_current_user');
    if (logged) {
      setUserEmail(logged);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch data on authentication
  useEffect(() => {
    if (!isAuthenticated) return;
    loadAllData();
  }, [isAuthenticated]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const prof = await db.getProfile();
      const prog = await db.getTopicProgress();
      const sess = await db.getStudySessions();
      const mck = await db.getMockTests();
      const rev = await db.getRevisions();

      setProfile(prof);
      setProgress(prog);
      setSessions(sess);
      setMockTests(mck);
      setRevisions(rev);
    } catch (err) {
      console.error("Failed to load GATEOS metrics", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    setIsAuthenticated(true);
    localStorage.setItem('gateos_current_user', email);
  };

  const handleLogout = () => {
    db.logoutUser();
    localStorage.removeItem('gateos_current_user');
    setIsAuthenticated(false);
    setProfile(null);
  };

  const navigateToTimer = (subjectId?: string, topicName?: string) => {
    if (subjectId && topicName) {
      setTimerSubjectId(subjectId);
      setTimerTopicName(topicName);
    }
    setActiveTab('timer');
  };

  const handleDashboardNavigation = (tab: string) => {
    if (tab === 'goals') {
      setActiveTab('goals');
    } else {
      setTimerSubjectId('');
      setTimerTopicName('');
      setActiveTab('timer');
    }
  };

  // Due revisions badge count
  const todayStr = getLocalDateString(new Date());
  const dueRevisionsCount = revisions.filter(r => r.status === 'Pending' && r.due_date <= todayStr).length;

  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (loading || !profile) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0b0f19] text-xs font-outfit">
        <div className="h-10 w-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
        <span className="text-gray-400 font-bold uppercase tracking-widest animate-pulse">Initializing GATEOS Command Center...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0A0A0B] relative text-xs">
      
      {/* 1. Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0A0A0B] border-r border-white/5 p-6 h-screen sticky top-0 justify-between shrink-0 font-outfit relative z-20">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-gradient-to-tr from-[#6D5DF6] to-[#8B7CFF] rounded-lg flex items-center justify-center shadow shadow-[#6D5DF6]/20">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white tracking-tight m-0">
                GATE<span className="text-gradient-purple">OS</span>
              </h1>
              <span className="text-[9px] text-[#7D8590] font-bold tracking-wider uppercase">COMMAND CENTER</span>
            </div>
          </div>

          {/* Navigation list */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full py-2.5 pl-3 pr-2 font-bold flex items-center gap-3 transition-colors cursor-pointer text-left border-l-2 ${
                activeTab === 'dashboard'
                  ? 'border-l-[#6D5DF6] text-white'
                  : 'border-l-transparent text-[#7D8590] hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              Command Center
            </button>

            <button
              onClick={() => setActiveTab('syllabus')}
              className={`w-full py-2.5 pl-3 pr-2 font-bold flex items-center gap-3 transition-colors cursor-pointer text-left border-l-2 ${
                activeTab === 'syllabus'
                  ? 'border-l-[#6D5DF6] text-white'
                  : 'border-l-transparent text-[#7D8590] hover:text-white'
              }`}
            >
              <BookOpen className="h-4.5 w-4.5" />
              Syllabus Map
            </button>

            <button
              onClick={() => {
                setTimerSubjectId('');
                setTimerTopicName('');
                setActiveTab('timer');
              }}
              className={`w-full py-2.5 pl-3 pr-2 font-bold flex items-center gap-3 transition-colors cursor-pointer text-left border-l-2 ${
                activeTab === 'timer'
                  ? 'border-l-[#6D5DF6] text-white'
                  : 'border-l-transparent text-[#7D8590] hover:text-white'
              }`}
            >
              <Clock className="h-4.5 w-4.5" />
              Study Timer
            </button>

            <button
              onClick={() => setActiveTab('revisions')}
              className={`w-full py-2.5 pl-3 pr-2 font-bold flex items-center gap-3 transition-colors justify-between cursor-pointer border-l-2 ${
                activeTab === 'revisions'
                  ? 'border-l-[#6D5DF6] text-white'
                  : 'border-l-transparent text-[#7D8590] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <Calendar className="h-4.5 w-4.5" />
                Revision Spacing
              </span>
              {dueRevisionsCount > 0 && (
                <span className="h-4.5 px-1.5 bg-[#6D5DF6] text-white rounded-full text-[9px] font-extrabold flex items-center justify-center">
                  {dueRevisionsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('mocks')}
              className={`w-full py-2.5 pl-3 pr-2 font-bold flex items-center gap-3 transition-colors cursor-pointer text-left border-l-2 ${
                activeTab === 'mocks'
                  ? 'border-l-[#6D5DF6] text-white'
                  : 'border-l-transparent text-[#7D8590] hover:text-white'
              }`}
            >
              <BarChart4 className="h-4.5 w-4.5" />
              Mock Test Center
            </button>

            <button
              onClick={() => setActiveTab('rankPredictor')}
              className={`w-full py-2.5 pl-3 pr-2 font-bold flex items-center gap-3 transition-colors cursor-pointer text-left border-l-2 ${
                activeTab === 'rankPredictor'
                  ? 'border-l-[#6D5DF6] text-white'
                  : 'border-l-transparent text-[#7D8590] hover:text-white'
              }`}
            >
              <Trophy className="h-4.5 w-4.5" />
              AIR Predictor
            </button>

            <button
              onClick={() => setActiveTab('goals')}
              className={`w-full py-2.5 pl-3 pr-2 font-bold flex items-center gap-3 transition-colors cursor-pointer text-left border-l-2 ${
                activeTab === 'goals'
                  ? 'border-l-[#6D5DF6] text-white'
                  : 'border-l-transparent text-[#7D8590] hover:text-white'
              }`}
            >
              <Target className="h-4.5 w-4.5" />
              Goals & Notes
            </button>


          </nav>
        </div>

        {/* Footer profile area */}
        <div className="space-y-4 pt-6 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-white/5 border border-white/8 rounded-full flex items-center justify-center font-bold text-white uppercase text-xs">
              {profile.display_name.substring(0, 2)}
            </div>
            <div>
              <span className="font-bold text-white text-xs block truncate w-36">{profile.display_name}</span>
              <span className="text-[10px] text-secondary font-semibold flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-[#F59E0B] fill-[#F59E0B]" />
                {profile.streak_count} day streak
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 p-2 hover:bg-white/5 text-[#7D8590] hover:text-white rounded-lg transition-colors cursor-pointer w-full"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Responsive Mobile Header */}
      <header className="lg:hidden w-full glass-panel border-b border-white/5 p-4 flex justify-between items-center sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow">
            <Brain className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-extrabold text-white text-md">GATEOS</span>
        </div>

        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 text-gray-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-[#0b0f19]/80 backdrop-blur-sm z-20"
        />
      )}

      {/* Mobile Menu Panel */}
      <aside className={`lg:hidden fixed left-0 top-16 bottom-0 w-64 bg-[#0A0A0B] border-r border-white/5 p-6 z-25 transition-transform duration-300 transform ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <nav className="space-y-1">
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            className={`w-full py-2.5 px-3 rounded-lg font-bold flex items-center gap-3 border text-left ${
              activeTab === 'dashboard' ? 'bg-[#6D5DF6]/10 border-[#6D5DF6]/20 text-white' : 'text-[#7D8590] border-transparent'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5" />
            Command Center
          </button>
          <button
            onClick={() => { setActiveTab('syllabus'); setMobileMenuOpen(false); }}
            className={`w-full py-2.5 px-3 rounded-lg font-bold flex items-center gap-3 border text-left ${
              activeTab === 'syllabus' ? 'bg-[#6D5DF6]/10 border-[#6D5DF6]/20 text-white' : 'text-[#7D8590] border-transparent'
            }`}
          >
            <BookOpen className="h-4.5 w-4.5" />
            Syllabus Map
          </button>
          <button
            onClick={() => { navigateToTimer(); setMobileMenuOpen(false); }}
            className={`w-full py-2.5 px-3 rounded-lg font-bold flex items-center gap-3 border text-left ${
              activeTab === 'timer' ? 'bg-[#6D5DF6]/10 border-[#6D5DF6]/20 text-white' : 'text-[#7D8590] border-transparent'
            }`}
          >
            <Clock className="h-4.5 w-4.5" />
            Study Timer
          </button>
          <button
            onClick={() => { setActiveTab('revisions'); setMobileMenuOpen(false); }}
            className={`w-full py-2.5 px-3 rounded-lg font-bold flex items-center gap-3 border text-left ${
              activeTab === 'revisions' ? 'bg-[#6D5DF6]/10 border-[#6D5DF6]/20 text-white' : 'text-[#7D8590] border-transparent'
            }`}
          >
            <Calendar className="h-4.5 w-4.5" />
            Revision Spacing
          </button>
          <button
            onClick={() => { setActiveTab('mocks'); setMobileMenuOpen(false); }}
            className={`w-full py-2.5 px-3 rounded-lg font-bold flex items-center gap-3 border text-left ${
              activeTab === 'mocks' ? 'bg-[#6D5DF6]/10 border-[#6D5DF6]/20 text-white' : 'text-[#7D8590] border-transparent'
            }`}
          >
            <BarChart4 className="h-4.5 w-4.5" />
            Mock Test Center
          </button>
          <button
            onClick={() => { setActiveTab('rankPredictor'); setMobileMenuOpen(false); }}
            className={`w-full py-2.5 px-3 rounded-lg font-bold flex items-center gap-3 border text-left ${
              activeTab === 'rankPredictor' ? 'bg-[#6D5DF6]/10 border-[#6D5DF6]/20 text-white' : 'text-[#7D8590] border-transparent'
            }`}
          >
            <Trophy className="h-4.5 w-4.5" />
            AIR Predictor
          </button>
          <button
            onClick={() => { setActiveTab('goals'); setMobileMenuOpen(false); }}
            className={`w-full py-2.5 px-3 rounded-lg font-bold flex items-center gap-3 border text-left ${
              activeTab === 'goals' ? 'bg-[#6D5DF6]/10 border-[#6D5DF6]/20 text-white' : 'text-[#7D8590] border-transparent'
            }`}
          >
            <Target className="h-4.5 w-4.5" />
            Goals & Notes
          </button>


          <div className="pt-6 mt-6 border-t border-white/5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2.5 text-gray-400 hover:text-white rounded-lg w-full text-left"
            >
              <LogOut className="h-4.5 w-4.5" />
              Sign Out
            </button>
          </div>
        </nav>
      </aside>

      {/* 3. Main Workspace Panel */}
      <main className="flex-grow p-4 md:p-5 md:p-8 overflow-y-auto max-w-full">
        {isSupabaseConfigured() && (
          <div className="max-w-6xl mx-auto flex justify-end mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/2 hover:bg-white/5 transition-all text-xs font-semibold cursor-pointer">
              <span className="pulse-dot" />
              <span className="text-[10px] tracking-wider font-extrabold uppercase text-[#B4BAC5]">Cloud Sync Active</span>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardTab 
              profile={profile} 
              progress={progress} 
              sessions={sessions} 
              mocks={mocks} 
              revisions={revisions}
              subjects={syllabus}
              onNavigateToTab={handleDashboardNavigation}
            />
          )}

          {activeTab === 'syllabus' && (
            <SyllabusTab 
              subjects={syllabus} 
              progress={progress}
              onProgressUpdated={loadAllData}
              onNavigateToTab={navigateToTimer}
            />
          )}

          {activeTab === 'timer' && (
            <StudyTimerTab 
              subjects={syllabus} 
              initialSubjectId={timerSubjectId}
              initialTopicName={timerTopicName}
              onSessionLogged={loadAllData}
              sessions={sessions}
            />
          )}

          {activeTab === 'revisions' && (
            <RevisionsTab 
              revisions={revisions}
              onRevisionUpdated={loadAllData}
            />
          )}

          {activeTab === 'mocks' && (
            <MockTestTab 
              mocks={mocks}
              onMockLogged={loadAllData}
            />
          )}

          {activeTab === 'rankPredictor' && (
            <RankPredictorTab 
              profile={profile}
              progress={progress}
              mocks={mocks}
              revisions={revisions}
              subjects={syllabus}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsNotesTab 
              profile={profile}
              subjects={syllabus}
              onProfileUpdated={loadAllData}
            />
          )}


        </div>
      </main>

    </div>
  );
}
