import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell
} from 'recharts';
import { 
  Award, Clock, CheckCircle2, TrendingUp, Sparkles, BookOpen, Target, ShieldAlert,
  Calendar, Check, Star, RefreshCw, HelpCircle, ChevronRight
} from 'lucide-react';
import { Profile, TopicProgress, StudySession, RevisionTask, getLocalDateString } from '../services/db';
import { Subject } from '../services/syllabusData';

interface SubjectAnalyticsTabProps {
  profile: Profile;
  progress: TopicProgress[];
  sessions: StudySession[];
  revisions: RevisionTask[];
  subjects: Subject[];
}

export default function SubjectAnalyticsTab({
  profile,
  progress,
  sessions,
  revisions,
  subjects
}: SubjectAnalyticsTabProps) {
  // Default to General Aptitude ('ga') or first subject
  const [selectedSubId, setSelectedSubId] = useState('ga');
  const [selectedSectionName, setSelectedSectionName] = useState('Verbal Aptitude');

  // 1. Get Selected Subject Data
  const currentSubject = subjects.find(s => s.id === selectedSubId) || subjects[0];
  const subjectProgress = progress.filter(p => p.subject_id === selectedSubId);
  const subjectSessions = sessions.filter(s => s.subject_id === selectedSubId);
  const subjectRevisions = revisions.filter(r => r.subject_id === selectedSubId);

  // Helper for Technical Topics / GA Sections metrics extraction
  const getSubjectMetrics = () => {
    const totalCount = currentSubject.id === 'ga'
      ? currentSubject.topics.reduce((sum, t) => sum + t.subtopics.length, 0)
      : (currentSubject.topics.length || 1);

    const completedCount = subjectProgress.filter(
      p => p.status === 'Completed' || p.status === 'Mastered'
    ).length;

    const completion = Math.round((completedCount / totalCount) * 100);

    const studied = subjectProgress.filter(p => p.status !== 'Not Started');
    const avgClarity = studied.length > 0
      ? Math.round((studied.reduce((sum, p) => sum + p.concept_clarity, 0) / studied.length) * 10) / 10
      : 1.0;

    const totalHours = subjectProgress.reduce((sum, p) => sum + (p.study_hours || 0), 0);
    const totalSolved = subjectProgress.reduce((sum, p) => sum + (p.pyqs_solved || 0), 0);

    let totalCorrect = 0;
    subjectProgress.forEach(p => {
      totalCorrect += p.pyqs_correct || 0;
    });
    const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

    const completedRevs = subjectRevisions.filter(r => r.status === 'Completed').length;
    const totalRevs = subjectRevisions.length || 1;
    const revisionConsistency = Math.round((completedRevs / totalRevs) * 100);

    return {
      completion,
      avgClarity,
      totalHours: Math.round(totalHours * 10) / 10,
      totalSolved,
      accuracy,
      revisionConsistency,
      completedRevs,
      totalRevs
    };
  };

  const metrics = getSubjectMetrics();

  // 2. Radar Chart Data
  // For GA, plot the 4 sections. For technical subjects, plot the topics (up to 8 for neatness)
  const getRadarData = () => {
    if (currentSubject.id === 'ga') {
      return currentSubject.topics.map(sec => {
        const subProgress = subjectProgress.filter(p => sec.subtopics.includes(p.topic_name));
        const total = sec.subtopics.length || 1;
        const completed = subProgress.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
        const completion = Math.round((completed / total) * 100);

        const studied = subProgress.filter(p => p.status !== 'Not Started');
        const clarity = studied.length > 0
          ? Math.round(studied.reduce((sum, p) => sum + p.concept_clarity, 0) / studied.length)
          : 0;

        return {
          name: sec.name.replace(' Aptitude', ''),
          completion: completion,
          clarity: clarity * 10
        };
      });
    } else {
      // Limit to first 8 topics for readability on the radar
      return currentSubject.topics.slice(0, 8).map(t => {
        const prog = subjectProgress.find(p => p.topic_name === t.name);
        return {
          name: t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name,
          completion: prog?.completion_percentage || 0,
          clarity: (prog?.concept_clarity || 0) * 10
        };
      });
    }
  };

  const radarData = getRadarData();

  // 3. Line Chart Data: Study hours trend over 14 days
  const last14DaysData = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dStr = getLocalDateString(d);
    const daySessions = subjectSessions.filter(s => getLocalDateString(s.created_at) === dStr);
    const hours = Math.round((daySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600) * 10) / 10;
    
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      hours: hours
    };
  });

  // 4. Revision Due list (for the selected subject)
  const todayStr = getLocalDateString(new Date());
  const revisionDueItems = subjectProgress.filter(p => {
    const hasPendingRev = subjectRevisions.some(r => r.topic_name === p.topic_name && r.status === 'Pending' && r.due_date <= todayStr);
    return hasPendingRev || (p.revision_due_date && p.revision_due_date <= todayStr && p.status !== 'Not Started');
  }).slice(0, 3);

  // 5. Drilldown Calculations
  // If GA, we display filtered subtopics of selectedSectionName. If technical, we list all topics.
  const getDrilldownData = () => {
    if (currentSubject.id === 'ga') {
      const section = currentSubject.topics.find(t => t.name === selectedSectionName);
      const subtopicNames = section?.subtopics || [];
      return subjectProgress.filter(p => subtopicNames.includes(p.topic_name));
    } else {
      return subjectProgress;
    }
  };

  const drilldownProgress = getDrilldownData();

  const subtopicsChartData = drilldownProgress.map(p => {
    const accuracy = p.pyqs_solved > 0 ? Math.round((p.pyqs_correct / p.pyqs_solved) * 100) : 0;
    return {
      name: p.topic_name,
      accuracy: accuracy,
      hours: Math.round(p.study_hours * 10) / 10,
      completion: p.completion_percentage
    };
  });

  const renderStatusIcon = (statusVal: TopicProgress['status']) => {
    switch (statusVal) {
      case 'In Progress':
        return (
          <span className="text-base text-fuchsia-400 font-bold leading-none select-none drop-shadow-[0_0_8px_rgba(217,70,239,0.4)] animate-pulse" title="In Progress">◐</span>
        );
      case 'Completed':
        return (
          <span className="text-base text-emerald-400 font-bold leading-none select-none drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" title="Completed">☑</span>
        );
      case 'Mastered':
        return (
          <span className="text-base text-amber-400 font-bold leading-none select-none drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" title="Mastered">⭐</span>
        );
      default:
        return (
          <span className="text-base text-white/30 font-bold leading-none select-none" title="Not Started">☐</span>
        );
    }
  };

  return (
    <div className="space-y-8 font-outfit text-xs text-secondary">
      
      {/* Subject Carousel / Selector Bar */}
      <div className="glass-panel p-4 rounded-2xl">
        <span className="micro-tag text-[#8B7CFF] mb-2.5 block">SELECT SUBJECT TO ANALYZE</span>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {subjects.map(s => {
            const subProg = progress.filter(p => p.subject_id === s.id);
            const completedCount = subProg.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
            const totalCount = s.id === 'ga'
              ? s.topics.reduce((sum, t) => sum + t.subtopics.length, 0)
              : (s.topics.length || 1);
            const completionPercent = Math.round((completedCount / totalCount) * 100);
            const isSelected = selectedSubId === s.id;

            return (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedSubId(s.id);
                  if (s.id === 'ga') {
                    setSelectedSectionName('Verbal Aptitude');
                  }
                }}
                className={`flex-shrink-0 px-4 py-3 rounded-xl border transition-all text-left flex flex-col justify-between h-20 w-36 cursor-pointer ${
                  isSelected
                    ? `bg-gradient-to-br ${s.id === 'ga' ? 'from-fuchsia-500/25 to-pink-600/25 border-fuchsia-500/40 shadow-lg shadow-fuchsia-500/10' : 'from-[#6D5DF6]/20 to-[#8B7CFF]/20 border-[#6D5DF6]/40 shadow-lg shadow-[#6D5DF6]/10'} text-white`
                    : 'bg-white/2 border-white/5 text-secondary hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wide ${isSelected ? 'bg-white/10 text-white' : 'bg-white/5 text-secondary'}`}>
                    {s.code}
                  </span>
                  <span className="text-[10px] font-extrabold text-white">{completionPercent}%</span>
                </div>
                <span className="text-[10px] font-bold block truncate w-full mt-2 text-white">{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-panel p-5 md:p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5 m-0">
            <Sparkles className={`h-7 w-7 ${currentSubject.id === 'ga' ? 'text-fuchsia-400' : 'text-[#8B7CFF]'}`} />
            {currentSubject.name} Analytics
          </h2>
          <p className="text-secondary text-sm mt-2">
            Average weightage: <span className="text-white font-bold">{currentSubject.weightage} Marks</span> • Spaced repetition, PYQ accuracy, and understanding diagnostics.
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
          currentSubject.id === 'ga' 
            ? 'border-fuchsia-500/20 bg-fuchsia-500/5 text-fuchsia-400' 
            : 'border-[#6D5DF6]/20 bg-[#6D5DF6]/5 text-[#8B7CFF]'
        }`}>
          <span className="text-[10px] tracking-wider font-extrabold uppercase">{currentSubject.code} Diagnostics</span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className={`glass-card p-5 rounded-xl flex flex-col justify-between h-32 border-l-2 ${currentSubject.id === 'ga' ? 'border-l-fuchsia-500' : 'border-l-[#6D5DF6]'}`}>
          <span className="micro-tag text-white opacity-60 font-bold">COMPLETION</span>
          <span className="text-3xl font-black text-white mt-2">{metrics.completion}%</span>
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full ${currentSubject.id === 'ga' ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600' : 'bg-gradient-to-r from-[#6D5DF6] to-[#8B7CFF]'}`} style={{ width: `${metrics.completion}%` }} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32 border-l-2 border-l-purple-500">
          <span className="micro-tag text-purple-400 font-bold">STUDY TIME</span>
          <span className="text-3xl font-black text-white mt-2">{metrics.totalHours}h</span>
          <span className="text-[10px] text-[#7D8590] mt-1 font-semibold">{subjectSessions.length} total sessions logged</span>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32 border-l-2 border-l-pink-500">
          <span className="micro-tag text-pink-400 font-bold">PYQS SOLVED</span>
          <span className="text-3xl font-black text-white mt-2">{metrics.totalSolved}</span>
          <span className="text-[10px] text-[#7D8590] mt-1 font-semibold">{metrics.accuracy}% overall accuracy</span>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32 border-l-2 border-l-blue-500">
          <span className="micro-tag text-blue-400 font-bold">CONCEPT CLARITY</span>
          <span className="text-3xl font-black text-white mt-2">{metrics.avgClarity}/10</span>
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${metrics.avgClarity * 10}%` }} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32 border-l-2 border-l-amber-500">
          <span className="micro-tag text-amber-500 font-bold">REVISION STABILITY</span>
          <span className="text-3xl font-black text-white mt-2">{metrics.revisionConsistency}%</span>
          <span className="text-[10px] text-[#7D8590] mt-1 font-semibold">{metrics.completedRevs} of {metrics.totalRevs} tasks done</span>
        </div>
      </div>

      {/* Drilldown Area */}
      <div className="glass-panel p-5 md:p-8 rounded-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="text-md font-bold text-white m-0">
              {currentSubject.id === 'ga' ? 'Aptitude Section Drilldown' : 'Topic Detailed Diagnostic'}
            </h3>
            <p className="text-[#7D8590] text-[10px] mt-0.5">
              {currentSubject.id === 'ga' 
                ? 'Select a section below to inspect subtopics performance.' 
                : `Review full preparation details for all ${currentSubject.name} modules.`}
            </p>
          </div>
          {currentSubject.id === 'ga' && (
            <div className="flex flex-wrap gap-2">
              {['Verbal Aptitude', 'Quantitative Aptitude', 'Analytical Aptitude', 'Spatial Aptitude'].map((secName) => (
                <button
                  key={secName}
                  onClick={() => setSelectedSectionName(secName)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all border cursor-pointer ${
                    selectedSectionName === secName
                      ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400'
                      : 'bg-white/2 border-transparent text-secondary hover:bg-white/5'
                  }`}
                >
                  {secName.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Diagnostic checklist table */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className={`micro-tag ${currentSubject.id === 'ga' ? 'text-fuchsia-400' : 'text-[#8B7CFF]'}`}>
              {currentSubject.id === 'ga' ? 'SUBTOPICS ACCORDION PROGRESS' : 'TOPICS PROGRESS LIST'}
            </h4>
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-secondary border-b border-white/[0.04] pb-2 font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-2.5">Topic / Subtopic</th>
                    <th className="py-2.5 text-center">Status</th>
                    <th className="py-2.5 text-right">Completion</th>
                    <th className="py-2.5 text-right">Clarity</th>
                    <th className="py-2.5 text-right">Time Spent</th>
                    <th className="py-2.5 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {drilldownProgress.map((sub, idx) => {
                    const accuracy = sub.pyqs_solved > 0 ? Math.round((sub.pyqs_correct / sub.pyqs_solved) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-white/[0.01]">
                        <td className="py-3 font-bold text-white">{sub.topic_name}</td>
                        <td className="py-3 text-center flex items-center justify-center h-full">
                          {renderStatusIcon(sub.status)}
                        </td>
                        <td className="py-3 text-right">
                          <span className="font-extrabold text-white">{sub.completion_percentage}%</span>
                        </td>
                        <td className={`py-3 text-right font-bold ${currentSubject.id === 'ga' ? 'text-fuchsia-400' : 'text-[#8B7CFF]'}`}>{sub.concept_clarity}/10</td>
                        <td className="py-3 text-right font-medium">{sub.study_hours.toFixed(1)}h</td>
                        <td className="py-3 text-right text-emerald-400 font-extrabold">{sub.pyqs_solved > 0 ? `${accuracy}%` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subtopic charts parameters */}
          <div className="space-y-6">
            <div>
              <h4 className={`micro-tag ${currentSubject.id === 'ga' ? 'text-fuchsia-400' : 'text-[#8B7CFF]'} mb-2`}>ACCURACY BY TOPIC</h4>
              <div className="h-40 w-full bg-white/[0.01] border border-white/[0.04] rounded-xl p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subtopicsChartData} margin={{ left: -30, right: 5, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                    <XAxis dataKey="name" tick={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#7D8590', fontSize: 8 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '9px' }}
                    />
                    <Bar dataKey="accuracy" fill={currentSubject.id === 'ga' ? '#d946ef' : '#6d5df6'} radius={[2, 2, 0, 0]}>
                      {subtopicsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.accuracy >= 70 ? 'rgba(16, 185, 129, 0.7)' : entry.accuracy > 0 ? 'rgba(244, 63, 94, 0.7)' : 'rgba(255,255,255,0.05)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className={`micro-tag ${currentSubject.id === 'ga' ? 'text-fuchsia-400' : 'text-[#8B7CFF]'} mb-2`}>TIME SPENT BY TOPIC</h4>
              <div className="h-40 w-full bg-white/[0.01] border border-white/[0.04] rounded-xl p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subtopicsChartData} margin={{ left: -30, right: 5, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                    <XAxis dataKey="name" tick={false} />
                    <YAxis tick={{ fill: '#7D8590', fontSize: 8 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '9px' }}
                    />
                    <Bar dataKey="hours" fill={currentSubject.id === 'ga' ? '#8b5cf6' : '#8b7cff'} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Radar Profile & Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Radar */}
        <div className="glass-card p-5 md:p-8 rounded-xl space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white m-0">Subject Balance Profile</h3>
            <p className="text-[#7D8590] text-[10px] mt-1">Completion vs Concept Clarity levels per module</p>
          </div>
          <div className="h-60 w-full flex items-center justify-center">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: '#7D8590', fontSize: 8, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#7D8590', fontSize: 8 }} />
                  <Radar name="Completion" dataKey="completion" stroke={currentSubject.id === 'ga' ? '#f556e6' : '#6d5df6'} fill={currentSubject.id === 'ga' ? '#f556e6' : '#6d5df6'} fillOpacity={0.15} />
                  <Radar name="Clarity" dataKey="clarity" stroke="#8B7CFF" fill="#8B7CFF" fillOpacity={0.15} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-secondary italic text-center py-20">No data available for radar profile.</div>
            )}
          </div>
        </div>

        {/* Study Trend Line Chart */}
        <div className="glass-card p-5 md:p-8 rounded-xl space-y-6 flex flex-col justify-between lg:col-span-2">
          <div>
            <h3 className="text-sm font-bold text-white m-0">Daily Study Hours Trend</h3>
            <p className="text-[#7D8590] text-[10px] mt-1">Focused study hours spent on this subject over the last 14 days</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last14DaysData} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#7D8590', fontSize: 9 }} />
                <YAxis tick={{ fill: '#7D8590', fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px' }} />
                <Line type="monotone" dataKey="hours" stroke={currentSubject.id === 'ga' ? '#f556e6' : '#8b7cff'} strokeWidth={3} dot={{ fill: currentSubject.id === 'ga' ? '#f556e6' : '#8b7cff', strokeWidth: 1 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revision Due list */}
      <div className="glass-card p-5 rounded-xl space-y-4 max-w-md mx-auto">
        <h4 className="text-sm font-extrabold text-amber-400 flex items-center gap-1.5 m-0">
          <Calendar className="h-4.5 w-4.5 text-amber-400" />
          Revision Due Topics
        </h4>
        <div className="space-y-3">
          {revisionDueItems.length > 0 ? (
            revisionDueItems.map((t, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/2 border border-white/5">
                <div className="space-y-0.5">
                  <span className="text-white font-extrabold block text-xs truncate max-w-[200px]">{t.topic_name}</span>
                  <span className="text-[10px] text-secondary">Revision count: <b>{t.revision_count} completed</b></span>
                </div>
                <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black rounded uppercase">Due</span>
              </div>
            ))
          ) : (
            <p className="text-[#7D8590] italic">All reviews are up to date for this subject.</p>
          )}
        </div>
      </div>
    </div>
  );
}
