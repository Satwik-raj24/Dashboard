import React from 'react';
import { motion } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell
} from 'recharts';
import { 
  Award, Clock, CheckCircle2, TrendingUp, Sparkles, BookOpen, Target, ShieldAlert
} from 'lucide-react';
import { Profile, TopicProgress, StudySession, RevisionTask, getLocalDateString } from '../services/db';
import { Subject } from '../services/syllabusData';

interface GAAnalyticsTabProps {
  profile: Profile;
  progress: TopicProgress[];
  sessions: StudySession[];
  revisions: RevisionTask[];
  subjects: Subject[];
}

export default function GAAnalyticsTab({
  profile,
  progress,
  sessions,
  revisions,
  subjects
}: GAAnalyticsTabProps) {
  
  // 1. Get GA Syllabus Data & Topic Progress records
  const gaSubject = subjects.find(s => s.id === 'ga');
  const gaProgress = progress.filter(p => p.subject_id === 'ga');
  const gaSessions = sessions.filter(s => s.subject_id === 'ga');
  const gaRevisions = revisions.filter(r => r.subject_id === 'ga');

  const verbalProgress = gaProgress.find(p => p.topic_name === 'Verbal Aptitude');
  const quantProgress = gaProgress.find(p => p.topic_name === 'Quantitative Aptitude');
  const analyticalProgress = gaProgress.find(p => p.topic_name === 'Analytical Aptitude');
  const spatialProgress = gaProgress.find(p => p.topic_name === 'Spatial Aptitude');

  // Helper for metrics extraction
  const getTopicMetrics = (tp: TopicProgress | undefined) => {
    if (!tp) return { completion: 0, clarity: 1, solvedPyqs: 0, accuracy: 0 };
    const accuracy = tp.pyqs_solved > 0 ? Math.round((tp.pyqs_correct / tp.pyqs_solved) * 100) : 0;
    return {
      completion: tp.completion_percentage || 0,
      clarity: tp.concept_clarity || 1,
      solvedPyqs: tp.pyqs_solved || 0,
      accuracy
    };
  };

  const vMetrics = getTopicMetrics(verbalProgress);
  const qMetrics = getTopicMetrics(quantProgress);
  const aMetrics = getTopicMetrics(analyticalProgress);
  const sMetrics = getTopicMetrics(spatialProgress);

  // Overall calculations
  const gaCompletionsList = [vMetrics.completion, qMetrics.completion, aMetrics.completion, sMetrics.completion];
  const overallGaCompletion = Math.round(gaCompletionsList.reduce((sum, val) => sum + val, 0) / 4);

  const totalStudySeconds = gaSessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  const totalStudyHours = Math.round((totalStudySeconds / 3600) * 10) / 10;
  
  const totalPyqsSolved = gaProgress.reduce((sum, p) => sum + p.pyqs_solved, 0);
  let totalCorrectPyqs = 0;
  gaProgress.forEach(p => {
    totalCorrectPyqs += p.pyqs_correct;
  });
  const overallAccuracy = totalPyqsSolved > 0 ? Math.round((totalCorrectPyqs / totalPyqsSolved) * 100) : 0;

  const studiedTopics = gaProgress.filter(p => p.status !== 'Not Started');
  const avgConceptClarity = studiedTopics.length > 0
    ? Math.round((studiedTopics.reduce((sum, p) => sum + p.concept_clarity, 0) / studiedTopics.length) * 10) / 10
    : 1.0;

  const completedRevs = gaRevisions.filter(r => r.status === 'Completed').length;
  const totalRevs = gaRevisions.length || 1;
  const revisionConsistency = Math.round((completedRevs / totalRevs) * 100);

  // 2. Radar Chart Data
  const radarData = [
    { section: 'Verbal', completion: vMetrics.completion, clarity: vMetrics.clarity * 10 },
    { section: 'Quantitative', completion: qMetrics.completion, clarity: qMetrics.clarity * 10 },
    { section: 'Analytical', completion: aMetrics.completion, clarity: aMetrics.clarity * 10 },
    { section: 'Spatial', completion: sMetrics.completion, clarity: sMetrics.clarity * 10 }
  ];

  // 3. Line Chart Data: GA Study hours trend over 14 days
  const last14DaysData = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dStr = getLocalDateString(d);
    const daySessions = gaSessions.filter(s => getLocalDateString(s.created_at) === dStr);
    const hours = Math.round((daySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600) * 10) / 10;
    
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      hours: hours
    };
  });

  // 4. GA Accuracy Trend across GA topics
  const accuracyTrendData = [
    { name: 'Verbal', accuracy: vMetrics.accuracy, completion: vMetrics.completion },
    { name: 'Quantitative', accuracy: qMetrics.accuracy, completion: qMetrics.completion },
    { name: 'Analytical', accuracy: aMetrics.accuracy, completion: aMetrics.completion },
    { name: 'Spatial', accuracy: sMetrics.accuracy, completion: sMetrics.completion }
  ];

  // 5. GA Heatmap Data (18 weeks grid)
  const heatmapDays = Array.from({ length: 126 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dStr = getLocalDateString(d);
    const daySessions = gaSessions.filter(s => getLocalDateString(s.created_at) === dStr);
    const hours = daySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600;
    return { date: dStr, hours };
  });

  const getHeatmapColorClass = (hours: number) => {
    if (hours === 0) return 'bg-[#111315]/80 border border-white/[0.02]';
    if (hours < 1) return 'bg-fuchsia-500/15 border border-fuchsia-500/20';
    if (hours < 2) return 'bg-fuchsia-500/40 border border-fuchsia-500/30';
    if (hours < 3) return 'bg-fuchsia-500/70';
    return 'bg-pink-500 border border-fuchsia-400';
  };

  // 6. Strongest & Weakest lists
  const sortedTopics = [...gaProgress]
    .map(p => {
      const accuracy = p.pyqs_solved > 0 ? (p.pyqs_correct / p.pyqs_solved) * 100 : 0;
      const score = (p.completion_percentage * 0.4) + (p.concept_clarity * 4) + (accuracy * 0.2);
      return { topicName: p.topic_name, score, clarity: p.concept_clarity, accuracy, status: p.status };
    })
    .sort((a, b) => b.score - a.score);

  const strongestTopics = sortedTopics.filter(t => t.status !== 'Not Started').slice(0, 2);
  const weakestTopics = [...sortedTopics].reverse().slice(0, 2);

  return (
    <div className="space-y-12 font-outfit text-xs text-secondary">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-panel p-5 md:p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5 m-0">
            <Sparkles className="h-7 w-7 text-fuchsia-400" />
            General Aptitude Analytics
          </h2>
          <p className="text-secondary text-sm mt-2">
            GATE GA Section weightage: <span className="text-fuchsia-400 font-bold">15 Marks</span> • Comprehensive Quantitative, Verbal, Analytical, and Spatial Performance metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/5 text-xs font-semibold">
          <span className="text-[10px] tracking-wider font-extrabold uppercase text-fuchsia-400">Core Diagnostic Mode</span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32 border-l-2 border-l-fuchsia-500">
          <span className="micro-tag text-fuchsia-400 font-bold">OVERALL GA COMPLETION</span>
          <span className="text-3xl font-black text-white mt-2">{overallGaCompletion}%</span>
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-gradient-to-r from-fuchsia-500 to-pink-600 h-full rounded-full" style={{ width: `${overallGaCompletion}%` }} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32 border-l-2 border-l-purple-500">
          <span className="micro-tag text-purple-400 font-bold">GA STUDY TIME</span>
          <span className="text-3xl font-black text-white mt-2">{totalStudyHours}h</span>
          <span className="text-[10px] text-[#7D8590] mt-1 font-semibold">{gaSessions.length} total sessions logged</span>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32 border-l-2 border-l-pink-500">
          <span className="micro-tag text-pink-400 font-bold">PYQS SOLVED</span>
          <span className="text-3xl font-black text-white mt-2">{totalPyqsSolved}</span>
          <span className="text-[10px] text-[#7D8590] mt-1 font-semibold">{overallAccuracy}% overall accuracy</span>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32 border-l-2 border-l-blue-500">
          <span className="micro-tag text-blue-400 font-bold">CONCEPT CLARITY</span>
          <span className="text-3xl font-black text-white mt-2">{avgConceptClarity}/10</span>
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${avgConceptClarity * 10}%` }} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-32 border-l-2 border-l-amber-500">
          <span className="micro-tag text-amber-500 font-bold">REVISION STABILITY</span>
          <span className="text-3xl font-black text-white mt-2">{revisionConsistency}%</span>
          <span className="text-[10px] text-[#7D8590] mt-1 font-semibold">{completedRevs} of {totalRevs} tasks done</span>
        </div>
      </div>

      {/* Section breakdown cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {[
          { name: 'Verbal Aptitude', metrics: vMetrics, color: 'border-l-indigo-400', icon: 'V' },
          { name: 'Quantitative Aptitude', metrics: qMetrics, color: 'border-l-fuchsia-400', icon: 'Q' },
          { name: 'Analytical Aptitude', metrics: aMetrics, color: 'border-l-purple-400', icon: 'A' },
          { name: 'Spatial Aptitude', metrics: sMetrics, color: 'border-l-pink-400', icon: 'S' }
        ].map((sec, idx) => (
          <div key={idx} className={`glass-card p-4.5 rounded-xl border-l-2 ${sec.color} flex flex-col justify-between space-y-3`}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-white text-[13px]">{sec.name}</span>
              <span className="h-5 w-5 bg-white/5 rounded-full flex items-center justify-center font-black text-[9px] text-[#8B7CFF]">{sec.icon}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-[#7D8590] block">Completion</span>
                <span className="text-white font-extrabold text-[12px]">{sec.metrics.completion}%</span>
              </div>
              <div>
                <span className="text-[#7D8590] block">PYQ Accuracy</span>
                <span className="text-white font-extrabold text-[12px]">{sec.metrics.accuracy}%</span>
              </div>
              <div>
                <span className="text-[#7D8590] block">Concept Clarity</span>
                <span className="text-white font-extrabold text-[12px]">{sec.metrics.clarity}/10</span>
              </div>
              <div>
                <span className="text-[#7D8590] block">Solved PYQs</span>
                <span className="text-white font-extrabold text-[12px]">{sec.metrics.solvedPyqs}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Radar */}
        <div className="glass-card p-5 md:p-8 rounded-xl space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white m-0">Aptitude Profile Balance</h3>
            <p className="text-[#7D8590] text-[10px] mt-1">Completion vs Concept Clarity levels per section</p>
          </div>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="section" tick={{ fill: '#7D8590', fontSize: 10, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#7D8590', fontSize: 8 }} />
                <Radar name="Completion" dataKey="completion" stroke="#f556e6" fill="#f556e6" fillOpacity={0.15} />
                <Radar name="Clarity" dataKey="clarity" stroke="#8B7CFF" fill="#8B7CFF" fillOpacity={0.15} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Study Trend Line Chart */}
        <div className="glass-card p-5 md:p-8 rounded-xl space-y-6 flex flex-col justify-between lg:col-span-2">
          <div>
            <h3 className="text-sm font-bold text-white m-0">GA Study Time Trend</h3>
            <p className="text-[#7D8590] text-[10px] mt-1">Focused study hours spent on GA over the last 14 days</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last14DaysData} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#7D8590', fontSize: 9 }} />
                <YAxis tick={{ fill: '#7D8590', fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px' }} />
                <Line type="monotone" dataKey="hours" stroke="#f556e6" strokeWidth={3} dot={{ fill: '#f556e6', strokeWidth: 1 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Accuracy trend + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GA Accuracy Trend Bar Chart */}
        <div className="glass-card p-5 md:p-8 rounded-xl space-y-6 flex flex-col justify-between lg:col-span-2">
          <div>
            <h3 className="text-sm font-bold text-white m-0">Accuracy Profile per Category</h3>
            <p className="text-[#7D8590] text-[10px] mt-1">Target accuracy must cross 70% for ideal prediction models</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracyTrendData} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#7D8590', fontSize: 9 }} />
                <YAxis tick={{ fill: '#7D8590', fontSize: 9 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px' }} />
                <Bar dataKey="accuracy" fill="#8B7CFF" radius={[4, 4, 0, 0]}>
                  {accuracyTrendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.accuracy >= 70 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heatmap */}
        <div className="glass-card p-5 md:p-8 rounded-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white m-0">GA Study Heatmap</h3>
            <p className="text-[#7D8590] text-[10px] mt-1">Study pacing projected over the next 18 weeks (126 days)</p>
          </div>

          <div className="grid grid-cols-7 gap-1.5 w-full overflow-x-auto pt-2">
            {heatmapDays.map((day, idx) => (
              <div 
                key={idx}
                className={`h-4.5 w-full rounded-sm transition-all duration-300 hover:scale-125 cursor-pointer relative group ${getHeatmapColorClass(day.hours)}`}
              >
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-[#111315] border border-white/10 text-[9px] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap mb-1.5 z-30 shadow-lg">
                  {day.date}: {Math.round(day.hours * 10) / 10} hrs studied
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[#7D8590] pt-4 border-t border-white/[0.04]">
            <span>Less study</span>
            <div className="flex gap-1">
              <span className="h-3 w-3 rounded-sm bg-[#111315]/80" />
              <span className="h-3 w-3 rounded-sm bg-fuchsia-500/15" />
              <span className="h-3 w-3 rounded-sm bg-fuchsia-500/40" />
              <span className="h-3 w-3 rounded-sm bg-fuchsia-500/70" />
              <span className="h-3 w-3 rounded-sm bg-pink-500" />
            </div>
            <span>More study</span>
          </div>
        </div>
      </div>

      {/* Strongest vs Weakest list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strongest */}
        <div className="glass-card p-5 rounded-xl space-y-4">
          <h4 className="text-sm font-extrabold text-emerald-400 flex items-center gap-1.5 m-0">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
            Strongest Aptitude Focus
          </h4>
          <div className="space-y-3">
            {strongestTopics.length > 0 ? (
              strongestTopics.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/2 border border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-white font-extrabold block text-xs">{t.topicName}</span>
                    <span className="text-[10px] text-[#7D8590]">Clarity: <b>{t.clarity}/10</b> • Accuracy: <b>{Math.round(t.accuracy)}%</b></span>
                  </div>
                  <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black rounded uppercase">Solid</span>
                </div>
              ))
            ) : (
              <p className="text-[#7D8590] italic">No aptitude modules studied yet.</p>
            )}
          </div>
        </div>

        {/* Weakest */}
        <div className="glass-card p-5 rounded-xl space-y-4">
          <h4 className="text-sm font-extrabold text-rose-400 flex items-center gap-1.5 m-0">
            <ShieldAlert className="h-4.5 w-4.5 text-rose-400" />
            Aptitude Weak Areas
          </h4>
          <div className="space-y-3">
            {weakestTopics.length > 0 ? (
              weakestTopics.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/2 border border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-white font-extrabold block text-xs">{t.topicName}</span>
                    <span className="text-[10px] text-[#7D8590]">Clarity: <b>{t.clarity}/10</b> • Accuracy: <b>{Math.round(t.accuracy)}%</b></span>
                  </div>
                  <span className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black rounded uppercase">Requires Drill</span>
                </div>
              ))
            ) : (
              <p className="text-[#7D8590] italic">All started modules are stable.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
