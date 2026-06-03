import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, RotateCcw, AlertCircle, Clock, PlusCircle } from 'lucide-react';
import { Subject } from '../services/syllabusData';
import { db, StudySession, getLocalDateString } from '../services/db';

interface StudyTimerTabProps {
  subjects: Subject[];
  initialSubjectId?: string;
  initialTopicName?: string;
  onSessionLogged: () => void;
  sessions: StudySession[];
}

type TimerMode = 'timer' | 'manual';

export default function StudyTimerTab({
  subjects,
  initialSubjectId = '',
  initialTopicName = '',
  onSessionLogged,
  sessions
}: StudyTimerTabProps) {
  const [mode, setMode] = useState<TimerMode>('timer');
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [selectedTopicName, setSelectedTopicName] = useState(initialTopicName);
  
  // Timer states
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [notes, setNotes] = useState('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Manual log states
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [loggingManual, setLoggingManual] = useState(false);

  const increment = useRef<any>(null);

  // Sync with props if navigating from syllabus study hooks
  useEffect(() => {
    if (initialSubjectId) {
      setSelectedSubjectId(initialSubjectId);
    }
    if (initialTopicName) {
      setSelectedTopicName(initialTopicName);
    }
  }, [initialSubjectId, initialTopicName]);

  const handleStart = () => {
    if (!selectedSubjectId || !selectedTopicName) return;
    setIsActive(true);
    setIsPaused(false);
    
    increment.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handlePause = () => {
    if (increment.current) {
      clearInterval(increment.current);
    }
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    increment.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handleStop = async () => {
    if (increment.current) {
      clearInterval(increment.current);
    }
    
    // Only log if duration is at least 3 seconds
    if (seconds >= 3) {
      try {
        await db.addStudySession({
          subject_id: selectedSubjectId,
          topic_name: selectedTopicName,
          duration_seconds: seconds,
          notes: notes.trim() || 'Studied concepts.'
        });
        
        setSavedMessage(`Logged session: ${formatTime(seconds)} spent on ${selectedTopicName}`);
        setTimeout(() => setSavedMessage(null), 4000);
        onSessionLogged();
      } catch (err) {
        console.error('Failed to log study session', err);
      }
    }
    
    // Reset timer
    setSeconds(0);
    setIsActive(false);
    setIsPaused(false);
    setNotes('');
  };

  const handleReset = () => {
    if (increment.current) {
      clearInterval(increment.current);
    }
    setSeconds(0);
    setIsActive(false);
    setIsPaused(false);
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !selectedTopicName) return;

    const hrs = parseFloat(manualHours) || 0;
    const mins = parseFloat(manualMinutes) || 0;
    const totalSecs = (hrs * 3600) + (mins * 60);

    if (totalSecs <= 0) {
      alert("Please enter a valid study duration.");
      return;
    }

    setLoggingManual(true);
    try {
      await db.addStudySession({
        subject_id: selectedSubjectId,
        topic_name: selectedTopicName,
        duration_seconds: totalSecs,
        notes: notes.trim() || 'Logged from Yeolpumta / External tracker.'
      });

      setSavedMessage(`Manually logged: ${hrs}h ${mins}m spent on ${selectedTopicName}`);
      setTimeout(() => setSavedMessage(null), 4000);
      onSessionLogged();
      
      // Clear manual values
      setManualHours('');
      setManualMinutes('');
      setNotes('');
    } catch (err) {
      console.error('Failed to manually log session', err);
    } finally {
      setLoggingManual(false);
    }
  };

  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  // Get topics for selected subject
  const currentSubject = subjects.find(s => s.id === selectedSubjectId);
  const topicsList = currentSubject ? currentSubject.topics : [];

  const localTodayStr = getLocalDateString(new Date());
  const todaySessions = sessions.filter(s => {
    return getLocalDateString(s.created_at) === localTodayStr;
  });

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8 font-outfit">
      
      {/* Left Column: Timer Controls */}
      <div className="lg:col-span-2 space-y-8">
        <div className="glass-panel p-5 md:p-8 rounded-3xl shadow-xl flex flex-col items-center relative overflow-hidden text-xs">
          {/* Glow backdrop during active state */}
          <div className={`absolute -inset-10 bg-purple-500/10 rounded-full blur-3xl transition-opacity duration-1000 ${
            isActive && !isPaused ? 'opacity-100 animate-pulse' : 'opacity-0'
          }`} />

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-8 bg-[#111315]/80 p-1 rounded-xl border border-white/[0.06] relative z-10">
            <button
              onClick={() => {
                if (isActive) return;
                setMode('timer');
              }}
              disabled={isActive}
              className={`px-4.5 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                mode === 'timer' 
                  ? 'bg-[#6D5DF6]/10 border border-[#6D5DF6]/20 text-[#8B7CFF]' 
                  : 'text-secondary border border-transparent hover:bg-white/5'
              }`}
            >
              <Clock className="h-4 w-4" />
              Live Timer
            </button>
            <button
              onClick={() => {
                if (isActive) return;
                setMode('manual');
              }}
              disabled={isActive}
              className={`px-4.5 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                mode === 'manual' 
                  ? 'bg-[#6D5DF6]/10 border border-[#6D5DF6]/20 text-[#8B7CFF]' 
                  : 'text-secondary border border-transparent hover:bg-white/5'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Log Manually (Yeolpumta)
            </button>
          </div>

          {mode === 'timer' ? (
            /* Stopwatch UI */
            <>
              {/* Big visual timer */}
              <div className="relative h-56 w-56 rounded-full border border-white/[0.06] flex flex-col items-center justify-center bg-white/[0.02] backdrop-blur-md shadow-2xl relative z-10">
                {/* Animated ticking dot */}
                {isActive && !isPaused && (
                  <div className="absolute w-2 h-2 bg-purple-500 rounded-full animate-ping top-6" />
                )}
                <span className="text-4xl md:text-5xl font-extrabold text-white tracking-widest font-mono">
                  {formatTime(seconds)}
                </span>
                <span className="text-[10px] text-secondary font-bold uppercase tracking-wider mt-2.5">
                  {isActive ? (isPaused ? 'Paused' : 'Active Session') : 'Standby Mode'}
                </span>
              </div>
            </>
          ) : (
            /* Manual Input UI */
            <div className="w-full text-center relative z-10 py-4 flex flex-col items-center">
              <div className="h-14 w-14 rounded-full border border-white/[0.06] bg-white/[0.02] flex items-center justify-center mb-4">
                <PlusCircle className="h-6 w-6 text-[#6D5DF6]" />
              </div>
              <h3 className="text-md font-bold text-white m-0">Manual Session Entry</h3>
              <p className="text-secondary text-[10px] mt-1.5 leading-relaxed">Copy and log study durations from external clocks or Yeolpumta.</p>
            </div>
          )}

          {/* Inputs (disabled while timer is running) */}
          <form onSubmit={handleManualLog} className="w-full space-y-5 mt-8 relative z-10 text-xs">
            
            {savedMessage && (
              <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-center font-bold">
                {savedMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="micro-tag block mb-2">SELECT SUBJECT</label>
                <select
                  disabled={isActive}
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedTopicName('');
                  }}
                  className="w-full p-2.5 rounded-lg glass-input text-xs disabled:opacity-50"
                >
                  <option value="" className="bg-[#111315] text-white">-- Choose Subject --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#111315] text-white">{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="micro-tag block mb-2">SELECT TOPIC</label>
                <select
                  disabled={isActive || !selectedSubjectId}
                  value={selectedTopicName}
                  onChange={(e) => setSelectedTopicName(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs disabled:opacity-50"
                >
                  <option value="" className="bg-[#111315] text-white">-- Choose Topic --</option>
                  {topicsList.map(t => (
                    <option key={t.name} value={t.name} className="bg-[#111315] text-white">{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {mode === 'manual' && (
              <div className="grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4">
                <div>
                  <label className="micro-tag block mb-2">STUDY HOURS</label>
                  <input
                    type="number"
                    placeholder="E.g. 2"
                    min="0"
                    max="18"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="micro-tag block mb-2">STUDY MINUTES</label>
                  <input
                    type="number"
                    placeholder="E.g. 30"
                    min="0"
                    max="59"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="micro-tag block mb-2">SESSION NOTES</label>
              <textarea
                placeholder={mode === 'manual' ? "Copy notes from Yeolpumta or summarize concepts studied..." : "What concepts are you working on? (Formula sheet, theorem review, PYQ set...)"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl glass-input text-xs resize-none"
              />
            </div>

            {/* Controls rendering */}
            {mode === 'timer' ? (
              <div className="flex justify-center gap-4 mt-6">
                {!isActive ? (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={!selectedSubjectId || !selectedTopicName}
                    className="btn-premium px-8 py-3.5 text-sm font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Play className="h-4.5 w-4.5" />
                    Initiate Clock
                  </button>
                ) : (
                  <div className="flex gap-3">
                    {isPaused ? (
                      <button
                        type="button"
                        onClick={handleResume}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="h-4 w-4" />
                        Resume
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePause}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-full font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Pause className="h-4 w-4" />
                        Pause
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleStop}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Square className="h-4 w-4 fill-white" />
                      Commit Session
                    </button>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-gray-400 rounded-full font-bold text-xs transition-all flex items-center justify-center cursor-pointer border border-white/5"
                    >
                      <RotateCcw className="h-4.5 w-4.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center mt-6">
                <button
                  type="submit"
                  disabled={!selectedSubjectId || !selectedTopicName || loggingManual}
                  className="btn-premium w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  Log Yeolpumta Session
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="glass-card p-6 rounded-2xl flex gap-3.5 text-xs bg-white/[0.01] border border-white/[0.06]">
          <AlertCircle className="h-5 w-5 text-[#6D5DF6] shrink-0" />
          <div className="text-secondary leading-relaxed">
            <h4 className="font-bold text-white m-0">Rank-1 Mentor Tip</h4>
            <p className="mt-1.5 m-0 text-secondary">
              For topics with a clarity score under 6, avoid doing full-length tests. Spend at least 45 minutes doing highly focused, slow derivations of formulas before attempting any GATE PYQs.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Today's Detailed Study Log */}
      <div className="lg:col-span-1">
        <div className="glass-card p-6 rounded-3xl flex flex-col justify-between h-fit">
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2 m-0 mb-2">
              <Clock className="h-4.5 w-4.5 text-[#8B7CFF]" />
              Today's Activity Log
            </h3>
            <p className="text-secondary text-[10px] mb-5">
              History of all study sessions completed today.
            </p>

            <div className="space-y-4 pr-1">
              {todaySessions.length > 0 ? (
                todaySessions.map((s, idx) => {
                  const subj = subjects.find(sub => sub.id === s.subject_id);
                  const code = subj ? subj.code : s.subject_id;
                  const mins = Math.floor(s.duration_seconds / 60);
                  const secs = s.duration_seconds % 60;
                  const timeDisplay = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

                  return (
                    <div key={s.id || idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-extrabold text-[#6D5DF6] uppercase block tracking-wider">{code}</span>
                          <span className="text-xs text-white font-bold block mt-0.5">{s.topic_name}</span>
                        </div>
                        <span className="text-[9px] font-extrabold text-[#8B7CFF] bg-[#8B7CFF]/10 border border-[#8B7CFF]/20 px-2 py-0.5 rounded-full">
                          {timeDisplay}
                        </span>
                      </div>
                      {s.notes && (
                        <p className="text-[#7D8590] text-[10px] italic leading-normal border-t border-white/[0.03] pt-1.5 mt-1">
                          "{s.notes}"
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 text-[#7D8590] text-xs border border-dashed border-white/8 rounded-2xl bg-white/[0.01]">
                  No study sessions logged today.
                  <br />
                  <span className="text-[9px] mt-2 block text-secondary">Initiate the timer or enter manually to log.</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center text-[10px] text-secondary">
            <span>Total logged: <b>{todaySessions.length} sessions</b></span>
            <span className="text-white font-bold bg-[#8B7CFF]/10 border border-[#8B7CFF]/20 px-2.5 py-1 rounded-lg">
              Total: {Math.round((todaySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600) * 10) / 10} hrs
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
