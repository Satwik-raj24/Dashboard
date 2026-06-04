import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, BookOpen, Clock, BarChart4, Calendar, 
  Target, Brain, LogOut, Menu, X, Flame, ShieldCheck, Trophy, Sparkles, Search, Command
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
import SubjectAnalyticsTab from './components/SubjectAnalyticsTab';

type ActiveTab = 'dashboard' | 'syllabus' | 'timer' | 'mocks' | 'revisions' | 'goals' | 'rankPredictor' | 'subjectAnalytics';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync Timer parameters (from syllabus studies hooks)
  const [timerSubjectId, setTimerSubjectId] = useState('');
  const [timerTopicName, setTimerTopicName] = useState('');

  // Synchronized search selection for topic mappings from palette
  const [paletteSubjectId, setPaletteSubjectId] = useState<string | null>(null);
  const [paletteTopicName, setPaletteTopicName] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Core database state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<TopicProgress[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [mocks, setMockTests] = useState<MockTest[]>([]);
  const [revisions, setRevisions] = useState<RevisionTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Keyboard Shortcuts & Command Palette Global Hook
  useEffect(() => {
    let lastKey = '';
    let lastKeyTime = 0;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl && 
        (activeEl.tagName === 'INPUT' || 
         activeEl.tagName === 'TEXTAREA' || 
         activeEl.tagName === 'SELECT' || 
         activeEl.getAttribute('contenteditable') === 'true')
      ) {
        if (e.key === 'Escape' && commandPaletteOpen) {
          setCommandPaletteOpen(false);
        }
        return;
      }

      const now = Date.now();
      const key = e.key.toLowerCase();

      // Ctrl+K command palette trigger
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        setSearchQuery('');
        return;
      }

      if (key === 'escape') {
        setCommandPaletteOpen(false);
        return;
      }

      // Navigation double-stroke keyboard shortcuts (g + key)
      if (lastKey === 'g' && now - lastKeyTime < 1000) {
        let targetTab: ActiveTab | null = null;
        if (key === 'd') targetTab = 'dashboard';
        else if (key === 's') {
          setPaletteSubjectId(null);
          setPaletteTopicName(null);
          targetTab = 'syllabus';
        }
        else if (key === 't') {
          setTimerSubjectId('');
          setTimerTopicName('');
          targetTab = 'timer';
        }
        else if (key === 'r') targetTab = 'revisions';
        else if (key === 'm') targetTab = 'mocks';
        else if (key === 'a') targetTab = 'subjectAnalytics';
        else if (key === 'p') targetTab = 'rankPredictor';
        else if (key === 'g') targetTab = 'goals';

        if (targetTab) {
          e.preventDefault();
          setActiveTab(targetTab);
          lastKey = '';
          lastKeyTime = 0;
          return;
        }
      }

      lastKey = key;
      lastKeyTime = now;
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [commandPaletteOpen]);

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
              onClick={() => setActiveTab('subjectAnalytics')}
              className={`w-full py-2.5 pl-3 pr-2 font-bold flex items-center gap-3 transition-colors cursor-pointer text-left border-l-2 ${
                activeTab === 'subjectAnalytics'
                  ? 'border-l-[#6D5DF6] text-white'
                  : 'border-l-transparent text-[#7D8590] hover:text-white'
              }`}
            >
              <Sparkles className="h-4.5 w-4.5" />
              Subject Analytics
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
            onClick={() => { setActiveTab('subjectAnalytics'); setMobileMenuOpen(false); }}
            className={`w-full py-2.5 px-3 rounded-lg font-bold flex items-center gap-3 border text-left ${
              activeTab === 'subjectAnalytics' ? 'bg-[#6D5DF6]/10 border-[#6D5DF6]/20 text-white' : 'text-[#7D8590] border-transparent'
            }`}
          >
            <Sparkles className="h-4.5 w-4.5" />
            Subject Analytics
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
        <div className="max-w-6xl mx-auto flex justify-end gap-3 mb-6">
          {/* Command Palette Button */}
          <div 
            onClick={() => { setCommandPaletteOpen(true); setSearchQuery(''); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/2 hover:bg-[#6D5DF6]/10 hover:border-[#6D5DF6]/20 transition-all text-xs font-semibold cursor-pointer"
          >
            <Search className="h-3.5 w-3.5 text-[#B4BAC5]" />
            <span className="text-[10px] tracking-wider font-extrabold uppercase text-[#B4BAC5]">Search</span>
            <kbd className="text-[8px] font-mono bg-white/10 px-1 py-0.2 rounded text-secondary">Ctrl+K</kbd>
          </div>

          {isSupabaseConfigured() && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/2 hover:bg-white/5 transition-all text-xs font-semibold cursor-pointer">
              <span className="pulse-dot" />
              <span className="text-[10px] tracking-wider font-extrabold uppercase text-[#B4BAC5]">Cloud Sync Active</span>
            </div>
          )}
        </div>

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
              revisions={revisions}
              initialSubjectId={paletteSubjectId}
              initialTopicName={paletteTopicName}
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

          {activeTab === 'subjectAnalytics' && (
            <SubjectAnalyticsTab 
              profile={profile}
              progress={progress}
              sessions={sessions}
              revisions={revisions}
              subjects={syllabus}
            />
          )}

        </div>
      </main>

      {/* Premium Command Palette (Ctrl+K Overlay) */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-[#0b0f19]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0" 
            onClick={() => setCommandPaletteOpen(false)}
          />
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/10 bg-[#0D0E12] shadow-2xl p-5 relative overflow-hidden flex flex-col max-h-[450px]">
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 mb-4">
              <Search className="h-4.5 w-4.5 text-secondary shrink-0" />
              <input 
                type="text"
                autoFocus
                placeholder="Search topics, subjects, or actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-secondary"
              />
              <span className="text-[9px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-secondary uppercase shrink-0">ESC</span>
            </div>

            {/* Results Grid */}
            <div className="space-y-4 overflow-y-auto flex-grow pr-1">
              {/* Category 1: Navigation Actions */}
              {searchQuery.trim() === '' && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-secondary uppercase tracking-wider block">NAVIGATION</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Command Center', tab: 'dashboard' as const },
                      { name: 'Syllabus Map', tab: 'syllabus' as const },
                      { name: 'Study Timer', tab: 'timer' as const },
                      { name: 'Revision Spacing', tab: 'revisions' as const },
                      { name: 'Mock Center', tab: 'mocks' as const },
                      { name: 'Subject Analytics', tab: 'subjectAnalytics' as const },
                      { name: 'AIR Predictor', tab: 'rankPredictor' as const },
                      { name: 'Goals & Notes', tab: 'goals' as const }
                    ].map((nav, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveTab(nav.tab);
                          setCommandPaletteOpen(false);
                        }}
                        className="p-2.5 rounded-lg bg-white/2 border border-white/5 text-[10px] text-white font-bold hover:bg-[#6D5DF6]/10 hover:border-[#6D5DF6]/20 transition-all text-left flex items-center gap-2 cursor-pointer"
                      >
                        <Command className="h-3.5 w-3.5 text-[#8B7CFF]" />
                        {nav.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 2: Search Matches */}
              {searchQuery.trim() !== '' && (() => {
                const query = searchQuery.toLowerCase();
                
                // Match subjects
                const matchedSubjects = syllabus.filter(
                  s => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query)
                );

                // Match topics / subtopics
                const matchedTopics: Array<{ subject: any; name: string; parentName?: string; subtopicsCount?: number; isGA?: boolean }> = [];
                syllabus.forEach(s => {
                  if (s.id === 'ga') {
                    // For GA, we search and navigate to individual subtopics
                    s.topics.forEach(sec => {
                      sec.subtopics.forEach(subtopic => {
                        if (subtopic.toLowerCase().includes(query)) {
                          if (matchedTopics.length < 8) {
                            matchedTopics.push({
                              subject: s,
                              name: subtopic,
                              parentName: sec.name,
                              isGA: true
                            });
                          }
                        }
                      });
                    });
                  } else {
                    // For technical subjects, we search and navigate to topics
                    s.topics.forEach(t => {
                      if (t.name.toLowerCase().includes(query) || t.subtopics.some(st => st.toLowerCase().includes(query))) {
                        if (matchedTopics.length < 8) {
                          matchedTopics.push({
                            subject: s,
                            name: t.name,
                            subtopicsCount: t.subtopics.length
                          });
                        }
                      }
                    });
                  }
                });

                if (matchedSubjects.length === 0 && matchedTopics.length === 0) {
                  return <p className="text-[#7D8590] text-center py-6">No matching subjects or topics found.</p>;
                }

                return (
                  <div className="space-y-4">
                    {matchedSubjects.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-secondary uppercase tracking-wider block">SUBJECTS</span>
                        <div className="space-y-1.5">
                          {matchedSubjects.map((s, idx) => (
                            <div 
                              key={idx}
                              onClick={() => {
                                setPaletteSubjectId(s.id);
                                setPaletteTopicName(null);
                                setActiveTab('syllabus');
                                setCommandPaletteOpen(false);
                              }}
                              className="p-3 rounded-xl bg-white/2 border border-white/5 hover:bg-white/[0.05] cursor-pointer flex justify-between items-center transition-all animate-fade-in"
                            >
                              <span className="font-bold text-white text-xs">{s.name} ({s.code})</span>
                              <span className="text-[9px] text-[#8B7CFF] bg-[#8B7CFF]/10 px-1.5 py-0.5 rounded uppercase font-bold">Go To Map</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {matchedTopics.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-secondary uppercase tracking-wider block">TOPICS</span>
                        <div className="space-y-1.5">
                          {matchedTopics.map((mt, idx) => (
                            <div 
                              key={idx}
                              onClick={() => {
                                setPaletteSubjectId(mt.subject.id);
                                setPaletteTopicName(mt.name);
                                setActiveTab('syllabus');
                                setCommandPaletteOpen(false);
                              }}
                              className="p-3 rounded-xl bg-white/2 border border-white/5 hover:bg-white/[0.05] cursor-pointer flex justify-between items-center transition-all animate-fade-in"
                            >
                              <div>
                                <span className="font-bold text-white text-xs block">{mt.name}</span>
                                <span className="text-[9px] text-secondary mt-0.5 block">
                                  {mt.isGA ? `${mt.subject.name} • ${mt.parentName}` : `${mt.subject.name} • ${mt.subtopicsCount} subtopics`}
                                </span>
                              </div>
                              <span className="text-[9px] text-[#8B7CFF] bg-[#8B7CFF]/10 px-1.5 py-0.5 rounded uppercase font-bold">Inspect</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
