import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie, ScatterChart, Scatter, ZAxis, ReferenceLine, AreaChart, Area
} from 'recharts';
import { 
  BookOpen, Clock, Activity, Calendar, Percent, 
  TrendingUp, Compass, Target, ArrowUpRight, ShieldAlert, Award, AlertCircle
} from 'lucide-react';
import { Subject } from '../services/syllabusData';
import { Profile, TopicProgress, MockTest, RevisionTask, StudySession, getLocalDateString } from '../services/db';
import { calculateReadiness } from '../services/readinessEngine';
import { predictAIR } from '../services/predictionEngine';
import { calculateTopicPriority } from '../services/priorityEngine';

interface DashboardTabProps {
  profile: Profile;
  progress: TopicProgress[];
  sessions: StudySession[];
  mocks: MockTest[];
  revisions: RevisionTask[];
  subjects: Subject[];
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardTab({
  profile,
  progress,
  sessions,
  mocks,
  revisions,
  subjects,
  onNavigateToTab
}: DashboardTabProps) {
  
  // Hovered Radar series state
  const [hoveredRadar, setHoveredRadar] = useState<'completion' | 'clarity' | null>(null);

  // 1. Calculations via AI Engines
  const readiness = calculateReadiness(profile, progress, sessions, mocks, revisions);

  const prediction = predictAIR(progress, mocks, revisions);
  const targetAir = profile.target_air;
  const predictedAir = prediction.expectedRank;
  const gapToTarget = predictedAir - targetAir;
  
  // Remaining Topics: topics where completion < 100
  const remainingTopics = progress.filter(p => p.completion_percentage < 100).length;

  // Remaining PYQs: sum of target pyqs - solved pyqs for topics
  const remainingPyqs = progress.reduce((sum, p) => sum + Math.max(0, p.pyqs_total - p.pyqs_solved), 0);

  // Remaining Revision Tasks: Pending or Missed revisions
  const remainingRevisions = revisions.filter(r => r.status === 'Pending' || r.status === 'Missed').length;


  // Subject Weightage Data
  const subjectWeightageData = subjects.map(s => {
    const subProgress = progress.filter(p => p.subject_id === s.id);
    const completedCount = subProgress.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
    const totalCount = s.id === 'ga'
      ? s.topics.reduce((sum, t) => sum + t.subtopics.length, 0)
      : (s.topics.length || 1);
    const completionPercent = Math.round((completedCount / totalCount) * 100);
    
    const studied = subProgress.filter(p => p.status !== 'Not Started');
    const clarityAvg = studied.length > 0
      ? (studied.reduce((sum, p) => sum + p.concept_clarity, 0) / studied.length)
      : 1;

    const preparedMarks = Math.round((completionPercent / 100) * s.weightage * (clarityAvg / 10) * 10) / 10;
    const marksLeft = Math.round((s.weightage - preparedMarks) * 10) / 10;

    return {
      code: s.code,
      name: s.name,
      potential: s.weightage,
      prepared: preparedMarks,
      left: Math.max(0, marksLeft),
      completion: completionPercent
    };
  }).sort((a, b) => b.potential - a.potential);

  // 2. Study Session calculations
  const totalStudySeconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  const totalStudyHours = Math.round((totalStudySeconds / 3600) * 10) / 10;
  
  // Today's, Weekly, Monthly study hours
  const now = new Date();
  const localTodayStr = getLocalDateString(now);
  const todayStr = localTodayStr;
  
  const todaySessions = sessions.filter(s => {
    return getLocalDateString(s.created_at) === localTodayStr;
  });

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  const todayStudyHours = Math.round(
    (todaySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600) * 10
  ) / 10;

  const weeklyStudyHours = Math.round(
    (sessions.filter(s => new Date(s.created_at) >= oneWeekAgo)
      .reduce((sum, s) => sum + s.duration_seconds, 0) / 3600) * 10
  ) / 10;

  const monthlyStudyHours = Math.round(
    (sessions.filter(s => new Date(s.created_at) >= oneMonthAgo)
      .reduce((sum, s) => sum + s.duration_seconds, 0) / 3600) * 10
  ) / 10;

  // Total PYQs Solved
  const totalPyqsSolved = progress.reduce((sum, p) => sum + p.pyqs_solved, 0);

  // Calculate Average Mock Performance
  let avgMockMarks = 0;
  if (mocks.length > 0) {
    avgMockMarks = Math.round((mocks.reduce((sum, m) => sum + Number(m.marks), 0) / mocks.length) * 10) / 10;
  } else {
    avgMockMarks = 45; 
  }

  // Calculate PYQ Accuracy
  let studiedPyqsSolved = 0;
  let studiedPyqsCorrect = 0;
  progress.forEach(p => {
    if (p.pyqs_solved > 0) {
      studiedPyqsSolved += p.pyqs_solved;
      studiedPyqsCorrect += p.pyqs_correct;
    }
  });
  const pyqAccuracy = studiedPyqsSolved > 0 ? (studiedPyqsCorrect / studiedPyqsSolved) * 100 : 70;

  // Days left until GATE 2027 (Assume Feb 6, 2027)
  const examDate = new Date('2027-02-06');
  const msDiff = examDate.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

  // 3. Radar Chart Data: Subject Completion & Clarity
  const subjectRadarData = subjects.map(s => {
    const subjectProgress = progress.filter(p => p.subject_id === s.id);
    const completedCount = subjectProgress.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
    const totalCount = s.id === 'ga'
      ? s.topics.reduce((sum, t) => sum + t.subtopics.length, 0)
      : (s.topics.length || 1);
    const completionPercent = Math.round((completedCount / totalCount) * 100);
    
    const studied = subjectProgress.filter(p => p.status !== 'Not Started');
    const clarityAvg = studied.length > 0
      ? Math.round((studied.reduce((sum, p) => sum + p.concept_clarity, 0) / studied.length) * 10)
      : 0;

    return {
      subject: s.code,
      name: s.name,
      completion: completionPercent,
      clarity: clarityAvg
    };
  });

  // 4. Line Chart Data: Weekly Study Hours
  // Generate study hours per day for the last 14 days
  const last14DaysData = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dStr = getLocalDateString(d);
    const daySessions = sessions.filter(s => getLocalDateString(s.created_at) === dStr);
    const hours = Math.round((daySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600) * 10) / 10;
    
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      hours: hours
    };
  });



  // 6. Mock Score Trend Data
  const mockTrendData = mocks.map((m, idx) => ({
    name: `Mock ${idx + 1}`,
    marks: m.marks,
    accuracy: m.accuracy,
    rank: m.rank
  }));

  // 7. GitHub Heatmap Data Generation
  // Render grid starting from today going forward for 18 weeks
  const heatmapDays = Array.from({ length: 126 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dStr = getLocalDateString(d);
    const daySessions = sessions.filter(s => getLocalDateString(s.created_at) === dStr);
    const hours = daySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600;
    return { date: dStr, hours };
  });

  // 8. Focus Donut Chart Data Calculation
  let newConceptsSeconds = 0;
  let pyqDrillingSeconds = 0;
  let spacedRevisionSeconds = 0;

  sessions.forEach(s => {
    const note = s.notes ? s.notes.toLowerCase() : '';
    if (note.includes('revision') || note.includes('revised') || note.includes('spacing') || note.includes('spaced') || note.includes('recall') || note.includes('review')) {
      spacedRevisionSeconds += s.duration_seconds;
    } else if (note.includes('pyq') || note.includes('solved') || note.includes('practice') || note.includes('accuracy') || note.includes('drill') || note.includes('question') || note.includes('test')) {
      pyqDrillingSeconds += s.duration_seconds;
    } else {
      newConceptsSeconds += s.duration_seconds;
    }
  });

  const totalSessionsSeconds = newConceptsSeconds + pyqDrillingSeconds + spacedRevisionSeconds;
  
  let donutData = [
    { name: 'New Concepts', value: 45 },
    { name: 'PYQ Drilling', value: 35 },
    { name: 'Spaced Revision', value: 20 }
  ];

  if (totalSessionsSeconds > 0) {
    donutData = [
      { name: 'New Concepts', value: Math.round((newConceptsSeconds / totalSessionsSeconds) * 100) },
      { name: 'PYQ Drilling', value: Math.round((pyqDrillingSeconds / totalSessionsSeconds) * 100) },
      { name: 'Spaced Revision', value: Math.round((spacedRevisionSeconds / totalSessionsSeconds) * 100) }
    ];
  }

  // Calculate Spaced Revision rate
  const completedRevs = revisions.filter(r => r.status === 'Completed').length;
  const totalRevs = revisions.length || 1;
  const revisionRate = completedRevs / totalRevs;

  const efficiencyRatio = Math.round(
    (pyqAccuracy * 0.5) + 
    ((mocks.length > 0 ? (mocks.reduce((sum, m) => sum + Number(m.accuracy), 0) / mocks.length) : 75) * 0.3) +
    (revisionRate * 100 * 0.2)
  );

  // 9. Velocity Burn-Up Chart Data Calculation
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const last14DaysSessionsReal = sessions.filter(s => new Date(s.created_at) >= fourteenDaysAgo);
  const totalSeconds14Days = last14DaysSessionsReal.reduce((sum, s) => sum + s.duration_seconds, 0);
  const dailyVelocityHours = (totalSeconds14Days / 14) / 3600;

  const burnUpData = [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sessionsBefore30Days = sessions.filter(s => new Date(s.created_at) < thirtyDaysAgo);
  let baseActualHours = sessionsBefore30Days.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600;

  for (let i = 0; i <= 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (30 - i));
    const dStr = getLocalDateString(d);
    const daySessions = sessions.filter(s => getLocalDateString(s.created_at) === dStr);
    const dayHours = daySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600;
    baseActualHours += dayHours;
    
    const idealHours = (profile.daily_hours_goal || 3) * i + (sessionsBefore30Days.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600);

    burnUpData.push({
      day: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: Math.round(baseActualHours * 10) / 10,
      ideal: Math.round(idealHours * 10) / 10,
      projected: undefined as number | undefined,
    });
  }

  // Connect projection to actual at Today
  let lastActualVal = burnUpData[burnUpData.length - 1].actual;
  burnUpData[burnUpData.length - 1].projected = lastActualVal;

  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const projectedVal = lastActualVal + (dailyVelocityHours * i);
    const idealHours = (profile.daily_hours_goal || 3) * (30 + i) + (sessionsBefore30Days.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600);

    burnUpData.push({
      day: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: undefined as number | undefined,
      ideal: Math.round(idealHours * 10) / 10,
      projected: Math.round(projectedVal * 10) / 10,
    });
  }

  // Extrapolate syllabus completion date
  const completedCount = progress.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
  const totalCount = progress.length || 1;
  const syllabusCompletion = (completedCount / totalCount) * 100;
  const remainingSyllabusPercent = 100 - syllabusCompletion;
  const hoursPerPercent = 6;
  const remainingHoursNeeded = remainingSyllabusPercent * hoursPerPercent;
  const daysToComplete = dailyVelocityHours > 0.1 ? Math.ceil(remainingHoursNeeded / dailyVelocityHours) : Infinity;
  
  let predictedCompletionDate = "N/A (Velocity 0)";
  if (daysToComplete !== Infinity) {
    const compDate = new Date();
    compDate.setDate(compDate.getDate() + daysToComplete);
    predictedCompletionDate = compDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // 10. Bubble Chart Data Calculation
  const bubbleChartData = subjects.map(s => {
    const subProgress = progress.filter(p => p.subject_id === s.id);
    const studied = subProgress.filter(p => p.status !== 'Not Started');
    const hasStarted = studied.length > 0;
    const avgClarity = hasStarted
      ? Math.round((studied.reduce((sum, p) => sum + p.concept_clarity, 0) / studied.length) * 10) / 10
      : 0;
      
    const totalPyqs = subProgress.reduce((sum, p) => sum + p.pyqs_total, 0) || 25;
    const solvedPyqs = subProgress.reduce((sum, p) => sum + p.pyqs_solved, 0);
    const unsolvedPyqs = Math.max(0, totalPyqs - solvedPyqs);
    const isTopLeft = s.weightage >= 7 && hasStarted && avgClarity <= 5.5;

    return {
      name: s.code,
      fullName: s.name,
      clarity: avgClarity,
      weightage: s.weightage,
      unsolvedPyqs: unsolvedPyqs,
      z: unsolvedPyqs,
      isTopLeft: isTopLeft,
      isNotStarted: !hasStarted
    };
  });

  // Custom tooltips
  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const subject = subjects.find((s: any) => s.code === data.subject);
      
      const subjectProgress = progress.filter((p: any) => p.subject_id === subject?.id);
      const draggingTopics = subjectProgress
        .filter((p: any) => p.status === 'Needs Revision' || p.status === 'In Progress' || (p.status !== 'Not Started' && p.concept_clarity < 6))
        .map((p: any) => p.topic_name)
        .slice(0, 3);

      return (
        <div className="glass-panel p-4 rounded-xl border border-white/10 bg-[#111315]/95 text-xs text-secondary font-outfit shadow-xl max-w-xs">
          <p className="font-extrabold text-white text-sm mb-1">{data.name} ({data.subject})</p>
          <div className="space-y-1 mt-2">
            <p className="flex justify-between gap-4">
              <span>Syllabus Completed:</span>
              <span className="text-[#8B7CFF] font-bold">{data.completion}%</span>
            </p>
            <p className="flex justify-between gap-4">
              <span>Avg Clarity:</span>
              <span className="text-[#6D5DF6] font-bold">{data.clarity / 10}/10</span>
            </p>
          </div>
          
          {draggingTopics.length > 0 ? (
            <div className="mt-3 pt-2.5 border-t border-white/5">
              <span className="text-[10px] text-rose-400 font-extrabold uppercase tracking-wider">Dragging Topics:</span>
              <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-secondary">
                {draggingTopics.map((topicName: string, idx: number) => (
                  <li key={idx} className="truncate">{topicName}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-3 pt-2.5 border-t border-white/5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              ✓ Subject Solid (No Drag)
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-panel p-3 rounded-lg border border-white/10 bg-[#111315]/95 text-xs text-[#B4BAC5] font-outfit shadow-md">
          <p className="font-bold text-white mb-0.5">{data.name}</p>
          <p className="text-[11px]">Time Share: <span className="text-white font-bold">{data.value}%</span></p>
        </div>
      );
    }
    return null;
  };

  const CustomBubbleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-panel p-4 rounded-xl border border-white/10 bg-[#111315]/95 text-xs text-secondary font-outfit shadow-xl">
          <p className="font-extrabold text-white text-sm mb-1">{data.fullName} ({data.name})</p>
          <div className="space-y-1 mt-2 font-medium">
            <p>Clarity Score: <span className="text-white font-bold">{data.clarity}/10</span></p>
            <p>GATE Weight: <span className="text-white font-bold">{data.weightage} Marks</span></p>
            <p>Unsolved PYQs: <span className="text-rose-400 font-bold">{data.unsolvedPyqs} left</span></p>
          </div>
          {data.isTopLeft && (
            <div className="mt-3 px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Critical Drill Area
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const getHeatmapColorClass = (hours: number) => {
    if (hours === 0) return 'bg-[#111315]/80 border border-white/[0.02]';
    if (hours < 2) return 'bg-[#6D5DF6]/15 border border-[#6D5DF6]/20';
    if (hours < 4) return 'bg-[#6D5DF6]/40 border border-[#6D5DF6]/30';
    if (hours < 6) return 'bg-[#6D5DF6]/70';
    return 'bg-[#8B7CFF] border border-[#6D5DF6]'; // High study hours
  };

  return (
    <div className="space-y-12 font-outfit">
      {/* 1. Header Hero Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-panel p-5 md:p-8 rounded-2xl">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-outfit m-0">
            Welcome back, <span className="text-[#8B7CFF]">{profile.display_name}</span>
          </h2>
          <p className="text-secondary text-sm mt-2">
            Targeting GATE CS 2027 • Target AIR: <span className="text-[#6D5DF6] font-bold">#{profile.target_air}</span> • Exam in <span className="text-[#8B7CFF] font-bold">{daysLeft} days</span>
          </p>
        </div>
        <button 
          onClick={() => onNavigateToTab('timer')}
          className="btn-premium px-6 py-3 text-sm font-semibold flex items-center gap-2 cursor-pointer"
        >
          <Clock className="h-4 w-4" />
          Start Study Session
        </button>
      </div>

      {/* GATE Mission Control Dashboard */}
      <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] relative overflow-hidden bg-gradient-to-br from-[#0d0f17] to-[#0A0A0B] shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#8B7CFF]/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-xs font-black text-white tracking-widest uppercase m-0 font-mono">GATE MISSION CONTROL CENTER</h3>
          </div>
          <span className="text-[9px] font-mono text-[#8B7CFF] bg-[#8B7CFF]/10 px-2 py-0.5 rounded border border-[#8B7CFF]/20 font-bold uppercase tracking-wider">
            STATUS: ACTIVE MONITORING
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Target AIR vs Predicted AIR */}
          <div className="space-y-1.5">
            <span className="text-[9px] text-[#7D8590] font-bold uppercase tracking-wider block">Rank Projection</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">#{predictedAir}</span>
              <span className="text-[10px] text-[#7D8590] font-semibold">vs #{targetAir} Target</span>
            </div>
            <div className="flex items-center gap-1.5">
              {gapToTarget <= 0 ? (
                <span className="text-[8px] text-emerald-400 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">ON TARGET</span>
              ) : (
                <span className="text-[8px] text-rose-400 font-extrabold bg-rose-500/10 px-1.5 py-0.5 rounded uppercase">+{gapToTarget} RANKS GAP</span>
              )}
            </div>
          </div>

          {/* Syllabus Complete Date */}
          <div className="space-y-1.5">
            <span className="text-[9px] text-[#7D8590] font-bold uppercase tracking-wider block">Est. Completion</span>
            <div className="text-xl font-black text-white">{predictedCompletionDate}</div>
            <span className="text-[9px] text-secondary block">Based on {Math.round(dailyVelocityHours * 10) / 10}h daily study velocity</span>
          </div>

          {/* Remaining Load */}
          <div className="space-y-1.5">
            <span className="text-[9px] text-[#7D8590] font-bold uppercase tracking-wider block">Remaining Items</span>
            <div className="text-xs font-bold text-white flex flex-wrap gap-2">
              <span>📚 <b>{remainingTopics}</b> topics</span>
              <span>📝 <b>{remainingPyqs}</b> PYQs</span>
            </div>
            <span className="text-[9px] text-secondary block">🎯 {remainingRevisions} pending revisions</span>
          </div>

          {/* Hours Required */}
          <div className="space-y-1.5">
            <span className="text-[9px] text-[#7D8590] font-bold uppercase tracking-wider block">Est. Study Load Left</span>
            <div className="text-xl font-black text-white">{Math.round(remainingHoursNeeded)} Hours</div>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-gradient-to-r from-[#6D5DF6] to-[#8B7CFF] h-full rounded-full" 
                style={{ width: `${syllabusCompletion}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Readiness Dial Card */}
        <div className="glass-card p-5 md:p-8 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="micro-tag">READINESS SCORE</span>
            <Activity className="h-5 w-5 text-[#6D5DF6]" />
          </div>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-outfit text-white">{readiness.overall}%</span>
            {readiness.monthlyImprovement > 0 ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center">
                +{readiness.monthlyImprovement}% this month
              </span>
            ) : (
              <span className="text-xs text-secondary font-semibold flex items-center">
                0% this month
              </span>
            )}
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#6D5DF6] to-[#8B7CFF] h-full rounded-full transition-all duration-500" 
              style={{ width: `${readiness.overall}%` }}
            />
          </div>
        </div>

        {/* Study Clock Card */}
        <div className="glass-card p-5 md:p-8 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="micro-tag">STUDY TIME (HRS)</span>
            <Clock className="h-5 w-5 text-[#8B7CFF]" />
          </div>
          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-white">{totalStudyHours}</span>
            <span className="text-xs text-muted font-medium">total hrs</span>
          </div>
          <div className="flex justify-between text-[10px] text-secondary mt-4 border-t border-white/5 pt-3">
            <span>Today: <b>{todayStudyHours}h</b></span>
            <span>Week: <b>{weeklyStudyHours}h</b></span>
            <span>Month: <b>{monthlyStudyHours}h</b></span>
          </div>
        </div>

        {/* Streak and PYQs Card */}
        <div className="glass-card p-5 md:p-8 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="micro-tag">STREAK & PYQS</span>
            <Target className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-6 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">{profile.streak_count}</span>
              <span className="text-xs text-muted font-medium">days streak</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold text-white block">{totalPyqsSolved}</span>
              <span className="text-[10px] text-muted font-medium block">PYQs Solved</span>
            </div>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all" 
              style={{ width: `${Math.min(100, (profile.streak_count / 10) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Targets & Today's Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Target vs Actual Progress (span 2) */}
        <div className="glass-card p-5 md:p-8 rounded-2xl flex flex-col justify-between lg:col-span-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0 mb-6">
              <Target className="h-5 w-5 text-[#8B7CFF]" />
              Target vs Actual Hours
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="micro-tag">DAILY HOUR TARGET ({profile.daily_hours_goal} hrs)</span>
                  <span className="text-white font-bold">{Math.round((todayStudyHours / profile.daily_hours_goal) * 100) || 0}%</span>
                </div>
                <div className="w-full recessed-track h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${Math.min(100, (todayStudyHours / profile.daily_hours_goal) * 100)}%`,
                      background: '#6D5DF6',
                      boxShadow: ((todayStudyHours / profile.daily_hours_goal) * 100) > 100 ? '0 0 12px #8B7CFF' : 'none'
                    }} 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="micro-tag">WEEKLY HOUR TARGET ({profile.weekly_hours_goal} hrs)</span>
                  <span className="text-white font-bold">{Math.round((weeklyStudyHours / profile.weekly_hours_goal) * 100) || 0}%</span>
                </div>
                <div className="w-full recessed-track h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${Math.min(100, (weeklyStudyHours / profile.weekly_hours_goal) * 100)}%`,
                      background: '#8B7CFF',
                      boxShadow: ((weeklyStudyHours / profile.weekly_hours_goal) * 100) > 100 ? '0 0 12px #8B7CFF' : 'none'
                    }} 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="micro-tag">MONTHLY HOUR TARGET ({profile.monthly_hours_goal} hrs)</span>
                  <span className="text-white font-bold">{Math.round((monthlyStudyHours / profile.monthly_hours_goal) * 100) || 0}%</span>
                </div>
                <div className="w-full recessed-track h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${Math.min(100, (monthlyStudyHours / profile.monthly_hours_goal) * 100)}%`,
                      background: '#10B981',
                      boxShadow: ((monthlyStudyHours / profile.monthly_hours_goal) * 100) > 100 ? '0 0 12px #10B981' : 'none'
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-5 mt-8 flex justify-end">
            <button 
              onClick={() => onNavigateToTab('goals')}
              className="btn-secondary px-6 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Adjust Goal Settings
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Today's Logged Sessions (span 1) */}
        <div className="glass-card p-5 md:p-8 rounded-2xl flex flex-col justify-between lg:col-span-1">
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2 m-0 mb-2">
              <BookOpen className="h-4.5 w-4.5 text-[#6D5DF6]" />
              Today's Activity
            </h3>
            <p className="text-[#7D8590] text-[10px] mb-4">
              Overview of sessions clocked today.
            </p>
            
            <div className="space-y-3.5 max-h-[160px] overflow-y-auto pr-1">
              {todaySessions.length > 0 ? (
                todaySessions.map((s, idx) => {
                  const subj = subjects.find(sub => sub.id === s.subject_id);
                  const code = subj ? subj.code : s.subject_id;
                  const mins = Math.round(s.duration_seconds / 60);
                  return (
                    <div key={s.id || idx} className="flex justify-between items-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div>
                        <span className="text-[9px] font-extrabold text-[#8B7CFF] uppercase block tracking-wider">{code}</span>
                        <span className="text-xs text-white font-bold truncate block max-w-[130px] mt-0.5">{s.topic_name}</span>
                      </div>
                      <span className="text-[10px] font-extrabold text-white bg-white/5 px-2 py-1 rounded">
                        {mins}m
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-[#7D8590] text-xs border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                  No sessions logged today yet.
                </div>
              )}
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-4 mt-4 flex justify-between items-center text-[10px] text-secondary">
            <span>Total sessions: <b>{todaySessions.length}</b></span>
            <span>Today's Time: <b>{todayStudyHours}h</b></span>
          </div>
        </div>
      </div>

      {/* 3.1 Subject Marks Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Subject Weightage Analytics (span 3 - full row) */}
        <div className="glass-card p-5 md:p-8 rounded-2xl lg:col-span-3 space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2 m-0">
              <Award className="h-5 w-5 text-fuchsia-400" />
              Potential vs Prepared Marks
            </h3>
            <p className="text-secondary text-[10px] mt-1 leading-normal">
              Estimated prepared marks calculated from syllabus completion % and concept clarity ratings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Scrollable list */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 select-none">
              {subjectWeightageData.map((sub, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.04] text-[10px] flex justify-between items-center">
                  <div>
                    <span className="font-extrabold text-white text-xs block">{sub.name} ({sub.code})</span>
                    <span className="text-secondary mt-0.5 block">Weightage: <b>{sub.potential} M</b> • Prepared: <b className="text-[#8B7CFF]">{sub.prepared} M</b></span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-rose-400 block text-xs">-{sub.left} M</span>
                    <span className="text-secondary mt-0.5 block">Left to Capture</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recharts Bar Chart */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectWeightageData} margin={{ left: -25, right: 5, top: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="code" tick={{ fill: '#7D8590', fontSize: 8 }} />
                  <YAxis tick={{ fill: '#7D8590', fontSize: 8 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '9px' }} />
                  <Bar dataKey="prepared" name="Prepared Marks" stackId="a" fill="#8B7CFF" />
                  <Bar dataKey="left" name="Marks Left to Capture" stackId="a" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
      </div>

      {/* 4. Multi-Row Advanced Analytics Grid */}
      <div className="space-y-6">
        
        {/* ROW 1: Syllabus Radar & Focus Pie (2-column layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Syllabus Radar */}
          <div className="glass-card p-5 md:p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0 mb-2">
                <Compass className="h-5 w-5 text-[#6D5DF6]" />
                Subject Syllabus & Clarity Radar
              </h3>
              <p className="text-secondary text-[11px] mb-6">
                Hover to isolate completion progress vs conceptual clarity. Dragging topics list areas of improvement.
              </p>
            </div>
            
            <div className="h-72 w-full flex-grow relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectRadarData}>
                  <defs>
                    <linearGradient id="clarityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6D5DF6" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#6D5DF6" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B7CFF" stopOpacity={0.25}/>
                      <stop offset="100%" stopColor="#8B7CFF" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <PolarGrid gridType="circle" stroke="rgba(255,255,255,0.03)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#B4BAC5', fontSize: 10, fontWeight: 500 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#7D8590', fontSize: 8 }} />
                  
                  <Radar 
                    name="Syllabus Completion" 
                    dataKey="completion" 
                    stroke="#8B7CFF" 
                    strokeWidth={1.5} 
                    strokeDasharray="3 3"
                    fill="url(#completionGrad)" 
                    fillOpacity={hoveredRadar === 'completion' ? 0.35 : hoveredRadar === 'clarity' ? 0.02 : 0.15}
                    strokeOpacity={hoveredRadar === 'completion' ? 1.0 : hoveredRadar === 'clarity' ? 0.1 : 0.7}
                    onMouseEnter={() => setHoveredRadar('completion')}
                    onMouseLeave={() => setHoveredRadar(null)}
                  />
                  <Radar 
                    name="Concept Clarity" 
                    dataKey="clarity" 
                    stroke="#6D5DF6" 
                    strokeWidth={1.5} 
                    fill="url(#clarityGrad)" 
                    fillOpacity={hoveredRadar === 'clarity' ? 0.45 : hoveredRadar === 'completion' ? 0.02 : 0.25}
                    strokeOpacity={hoveredRadar === 'clarity' ? 1.0 : hoveredRadar === 'completion' ? 0.1 : 0.8}
                    onMouseEnter={() => setHoveredRadar('clarity')}
                    onMouseLeave={() => setHoveredRadar(null)}
                  />
                  <Tooltip content={<CustomRadarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex justify-center gap-6 text-xs font-semibold mt-4 border-t border-white/5 pt-3">
              <span 
                className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${hoveredRadar === 'clarity' ? 'opacity-30' : 'opacity-100'}`}
                onMouseEnter={() => setHoveredRadar('completion')}
                onMouseLeave={() => setHoveredRadar(null)}
              >
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#8B7CFF]" /> 
                Syllabus Completion
              </span>
              <span 
                className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${hoveredRadar === 'completion' ? 'opacity-30' : 'opacity-100'}`}
                onMouseEnter={() => setHoveredRadar('clarity')}
                onMouseLeave={() => setHoveredRadar(null)}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#6D5DF6]" /> 
                Concept Clarity
              </span>
            </div>
          </div>

          {/* Chart 2: Focus Distribution Breakdown (Sleek Donut Chart) */}
          <div className="glass-card p-5 md:p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0 mb-2">
                <Percent className="h-5 w-5 text-[#8B7CFF]" />
                Focus Distribution Breakdown
              </h3>
              <p className="text-secondary text-[11px] mb-6">
                Active time allocation split based on study session logs and spacing reviews.
              </p>
            </div>
            
            <div className="relative h-72 w-full flex items-center justify-center flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="80%"
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => {
                      const COLORS = ['#6D5DF6', '#8B7CFF', '#A78BFA'];
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip content={<CustomDonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-3xl font-black text-white tracking-tight font-outfit leading-none">{efficiencyRatio}%</span>
                <span className="text-[9px] text-[#7D8590] font-bold uppercase tracking-wider mt-2">Study Efficiency</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase mt-4 border-t border-white/5 pt-3">
              <div className="flex flex-col items-center">
                <span className="flex items-center gap-1.5 text-white">
                  <span className="w-2 h-2 rounded-full bg-[#6D5DF6]" />
                  Learning
                </span>
                <span className="text-secondary font-extrabold text-xs mt-0.5">{donutData[0].value}%</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="flex items-center gap-1.5 text-white">
                  <span className="w-2 h-2 rounded-full bg-[#8B7CFF]" />
                  PYQ Drills
                </span>
                <span className="text-secondary font-extrabold text-xs mt-0.5">{donutData[1].value}%</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="flex items-center gap-1.5 text-white">
                  <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />
                  Revisions
                </span>
                <span className="text-secondary font-extrabold text-xs mt-0.5">{donutData[2].value}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Study Velocity Area & Burn-up Chart (2-column layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 3: Study Velocity Area Chart (TradingView style) */}
          <div className="glass-card p-5 md:p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0 mb-2">
                <TrendingUp className="h-5 w-5 text-[#6D5DF6]" />
                Study Velocity (Last 14 Days)
              </h3>
              <p className="text-secondary text-[11px] mb-6">
                Active study hours vs. ideal pace required for Top 100 direct admissions.
              </p>
            </div>
            
            <div className="h-72 w-full flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last14DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6D5DF6" stopOpacity={0.12}/>
                      <stop offset="100%" stopColor="#0A0A0B" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#B4BAC5', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis unit="h" tick={{ fill: '#B4BAC5', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ stroke: '#6D5DF6', strokeWidth: 1, strokeDasharray: '3 3' }} 
                    contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} 
                  />
                  <ReferenceLine 
                    y={5.0} 
                    stroke="#7D8590" 
                    strokeDasharray="4 4" 
                    label={{ value: 'AIR < 100 Pace (5.0h)', fill: '#7D8590', position: 'top', style: { fontSize: 8, fontWeight: 700 } }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#6D5DF6" 
                    strokeWidth={1.5} 
                    fill="url(#velocityGrad)" 
                    dot={false} 
                    activeDot={{ r: 5, strokeWidth: 1.5, fill: '#6D5DF6', stroke: '#FFF' }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Burn-Up Chart */}
          <div className="glass-card p-5 md:p-8 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0 mb-2">
                  <Clock className="h-5 w-5 text-[#8B7CFF]" />
                  Velocity Burn-Up Chart
                </h3>
                <p className="text-secondary text-[11px] mb-4">
                  Plots cumulative study hours completed vs ideal trajectory.
                </p>
              </div>
              <div className="text-right">
                <span className="micro-tag block text-[9px]">Syllabus Forecast</span>
                <span className="text-white font-extrabold text-xs block mt-0.5 text-emerald-400">{predictedCompletionDate}</span>
              </div>
            </div>
            
            <div className="h-72 w-full flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burnUpData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="burnUpActualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6D5DF6" stopOpacity={0.1}/>
                      <stop offset="100%" stopColor="#6D5DF6" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="burnUpProjectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B7CFF" stopOpacity={0.05}/>
                      <stop offset="100%" stopColor="#8B7CFF" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#B4BAC5', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis unit="h" tick={{ fill: '#B4BAC5', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                  <Area 
                    name="Completed Hours" 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#6D5DF6" 
                    strokeWidth={2} 
                    fill="url(#burnUpActualGrad)" 
                    connectNulls={false} 
                    dot={false} 
                  />
                  <Area 
                    name="Projected Forecast" 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#8B7CFF" 
                    strokeWidth={1.5} 
                    strokeDasharray="3 3" 
                    fill="url(#burnUpProjectedGrad)" 
                    connectNulls={true} 
                    dot={false} 
                  />
                  <Line 
                    name="Ideal Top 100 Path" 
                    type="monotone" 
                    dataKey="ideal" 
                    stroke="#7D8590" 
                    strokeWidth={1.2} 
                    strokeDasharray="5 5" 
                    dot={false} 
                    activeDot={false} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex justify-center gap-6 text-[10px] font-bold uppercase mt-4 border-t border-white/5 pt-3">
              <span className="flex items-center gap-1.5 text-white"><span className="w-2.5 h-2.5 rounded bg-[#6D5DF6]" /> Completed</span>
              <span className="flex items-center gap-1.5 text-white"><span className="w-2.5 h-2.5 rounded border border-dashed border-[#8B7CFF]" /> 14D Forecast</span>
              <span className="flex items-center gap-1.5 text-secondary"><span className="w-2.5 h-0.5 border-t border-dashed border-[#7D8590] inline-block" /> Ideal Target Path</span>
            </div>
          </div>
        </div>

        {/* ROW 3: Bubble Chart & Mock Trends (1 or 2 columns layout) */}
        <div className={`grid grid-cols-1 ${mocks.length > 0 ? 'lg:grid-cols-2' : ''} gap-6`}>
          {/* Chart 5: Bubble Weight Matrix */}
          <div className="glass-card p-5 md:p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0 mb-2">
                <Award className="h-5 w-5 text-[#8B7CFF]" />
                Subject Weightage vs Clarity Matrix
              </h3>
              <p className="text-secondary text-[11px] mb-6">
                X-Axis: Subject Clarity. Y-Axis: GATE Marks. Bubble Size: Unsolved PYQs. Flashing red dots indicate urgent gaps in high-scoring areas.
              </p>
            </div>
            
            <div className="h-72 w-full flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 15, bottom: 15, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis 
                    type="number" 
                    dataKey="clarity" 
                    name="Concept Clarity" 
                    domain={[1, 10]} 
                    tickCount={10} 
                    stroke="#7D8590"
                    tick={{ fill: '#B4BAC5', fontSize: 9 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="weightage" 
                    name="GATE Weight" 
                    domain={[3, 16]} 
                    stroke="#7D8590"
                    tick={{ fill: '#B4BAC5', fontSize: 9 }}
                  />
                  <ZAxis type="number" dataKey="unsolvedPyqs" range={[50, 450]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} content={<CustomBubbleTooltip />} />
                  <Scatter name="Subjects" data={bubbleChartData}>
                    {bubbleChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isTopLeft ? '#EF4444' : entry.isNotStarted ? 'rgba(255, 255, 255, 0.15)' : '#6D5DF6'} 
                        className={entry.isTopLeft ? 'pulse-bubble' : ''}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 6: Mock Test trends */}
          {mocks.length > 0 && (
            <div className="glass-card p-5 md:p-8 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0 mb-6">
                  <TrendingUp className="h-5 w-5 text-[#8B7CFF]" />
                  Mock Test Performance & Accuracy Trends
                </h3>
              </div>
              <div className="h-72 w-full flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#B4BAC5', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#B4BAC5', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="marks" name="Marks Scored" stroke="#6D5DF6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#8B7CFF" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. GitHub contribution style heatmap */}
      <div className="glass-card p-5 md:p-8 rounded-2xl space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0">
            <Calendar className="h-5 w-5 text-emerald-400" />
            Study Consistency Calendar (18 Weeks)
          </h3>
          <div className="flex items-center gap-1.5 text-[10px] text-secondary">
            <span>Less</span>
            <span className="w-2.5 h-2.5 rounded-sm bg-[#111315]/80 border border-white/[0.02]" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#6D5DF6]/15 border border-[#6D5DF6]/20" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#6D5DF6]/40 border border-[#6D5DF6]/30" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#6D5DF6]/70" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#8B7CFF]" />
            <span>More</span>
          </div>
        </div>

        {/* Heatmap grid */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-1.5 min-w-[650px] justify-between">
            {Array.from({ length: 18 }).map((_, weekIdx) => (
              <div key={weekIdx} className="grid grid-rows-7 gap-1.5">
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const dataIdx = weekIdx * 7 + dayIdx;
                  const dayData = heatmapDays[dataIdx];
                  if (!dayData) return null;
                  
                  return (
                    <div 
                      key={dayIdx}
                      title={`${new Date(dayData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${dayData.hours.toFixed(1)} hrs studied`}
                      className={`w-3.5 h-3.5 rounded-sm cursor-pointer transition-colors hover:scale-110 ${getHeatmapColorClass(dayData.hours)}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
