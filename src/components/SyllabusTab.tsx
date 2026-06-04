import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, 
  HelpCircle, Star, Edit, Save, PlusCircle, Check, Play, BookOpen 
} from 'lucide-react';
import { Subject, Topic } from '../services/syllabusData';
import { TopicProgress, db, RevisionTask, getLocalDateString } from '../services/db';
import { calculateTopicPriority } from '../services/priorityEngine';

interface SyllabusTabProps {
  subjects: Subject[];
  progress: TopicProgress[];
  onProgressUpdated: () => void;
  onNavigateToTab: (tab: string, subjectId?: string, topicName?: string) => void;
  revisions: RevisionTask[];
  initialSubjectId?: string | null;
  initialTopicName?: string | null;
}

export default function SyllabusTab({
  subjects,
  progress,
  onProgressUpdated,
  onNavigateToTab,
  revisions,
  initialSubjectId = null,
  initialTopicName = null
}: SyllabusTabProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSubjectId);
  const [selectedTopicName, setSelectedTopicName] = useState<string | null>(initialTopicName);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ 'Verbal Aptitude': true });
  const [noteContent, setNoteContent] = useState('');

  React.useEffect(() => {
    if (initialSubjectId !== null) {
      setSelectedSubjectId(initialSubjectId);
    }
    if (initialTopicName !== null) {
      setSelectedTopicName(initialTopicName);
      
      // Auto-expand GA section containing this subtopic
      if (initialSubjectId === 'ga') {
        const gaSubj = subjects.find(s => s.id === 'ga');
        if (gaSubj) {
          const section = gaSubj.topics.find(t => t.subtopics.includes(initialTopicName));
          if (section) {
            setExpandedSections(prev => ({ ...prev, [section.name]: true }));
          }
        }
      }
    }
  }, [initialSubjectId, initialTopicName, subjects]);
  
  // Edit topic state
  const [completion, setCompletion] = useState(0);
  const [status, setStatus] = useState<TopicProgress['status']>('Not Started');
  const [clarity, setClarity] = useState(1);
  const [confidence, setConfidence] = useState(1);
  const [difficulty, setDifficulty] = useState(3);
  const [solvedPyqs, setSolvedPyqs] = useState(0);
  const [totalPyqs, setTotalPyqs] = useState(25);
  const [correctPyqs, setCorrectPyqs] = useState(0);
  const [wrongPyqs, setWrongPyqs] = useState(0);
  const [studyHours, setStudyHours] = useState(0);
  const [revisionCount, setRevisionCount] = useState(0);
  const [lastRevisionDate, setLastRevisionDate] = useState('');
  const [saving, setSaving] = useState(false);

  const getSubjectMetrics = (subId: string) => {
    const subProgress = progress.filter(p => p.subject_id === subId);
    const subj = subjects.find(s => s.id === subId);
    
    const totalCount = subj 
      ? (subj.id === 'ga'
          ? subj.topics.reduce((sum, t) => sum + t.subtopics.length, 0)
          : subj.topics.length)
      : (subProgress.length || 1);
      
    const completedCount = subProgress.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
    const completion = Math.round((completedCount / totalCount) * 100);
    
    const studied = subProgress.filter(p => p.status !== 'Not Started');
    const avgClarity = studied.length > 0
      ? Math.round(studied.reduce((sum, p) => sum + p.concept_clarity, 0) / studied.length)
      : 0;

    const avgConfidence = studied.length > 0
      ? Math.round(studied.reduce((sum, p) => sum + p.confidence_score, 0) / studied.length)
      : 0;

    const totalHours = subProgress.reduce((sum, p) => sum + p.study_hours, 0);
    const totalSolved = subProgress.reduce((sum, p) => sum + p.pyqs_solved, 0);
    
    // Average accuracy
    let solvedPyqsSum = 0;
    let correctPyqsSum = 0;
    subProgress.forEach(p => {
      solvedPyqsSum += p.pyqs_solved;
      correctPyqsSum += p.pyqs_correct;
    });
    const accuracy = solvedPyqsSum > 0 ? Math.round((correctPyqsSum / solvedPyqsSum) * 100) : 0;

    // Strength Rating
    let strength = 'Not Started';
    if (completion > 0) {
      const compositeScore = (avgClarity * 0.5) + (avgConfidence * 0.3) + ((accuracy / 10) * 0.2);
      if (compositeScore >= 8.5) strength = 'Master';
      else if (compositeScore >= 7.0) strength = 'Strong';
      else if (compositeScore >= 4.5) strength = 'Moderate';
      else strength = 'Weak';
    }

    return {
      completion,
      avgClarity,
      avgConfidence,
      totalHours: Math.round(totalHours * 10) / 10,
      totalSolved,
      accuracy,
      strength
    };
  };

  const handleEditTopic = (subjId: string, topicName: string) => {
    const record = progress.find(p => p.subject_id === subjId && p.topic_name === topicName);
    
    // Load notes content
    const loadNote = async () => {
      const allNotes = await db.getNotes();
      const n = allNotes.find(item => item.subject_id === subjId && item.topic_name === topicName);
      setNoteContent(n ? n.content : '');
    };
    loadNote();

    if (record) {
      setCompletion(Number(record.completion_percentage));
      setStatus(record.status);
      setClarity(record.concept_clarity);
      setConfidence(record.confidence_score);
      setDifficulty(record.difficulty_rating);
      setSolvedPyqs(record.pyqs_solved);
      setTotalPyqs(record.pyqs_total);
      setCorrectPyqs(record.pyqs_correct);
      setWrongPyqs(record.pyqs_wrong);
      setStudyHours(Number(record.study_hours || 0));
      setRevisionCount(record.revision_count || 0);
      setLastRevisionDate(record.last_studied_date ? getLocalDateString(record.last_studied_date) : '');
    } else {
      // Set defaults
      setCompletion(0);
      setStatus('Not Started');
      setClarity(1);
      setConfidence(1);
      setDifficulty(3);
      setSolvedPyqs(0);
      setTotalPyqs(25);
      setCorrectPyqs(0);
      setWrongPyqs(0);
      setStudyHours(0);
      setRevisionCount(0);
      setLastRevisionDate('');
    }
    
    setSelectedTopicName(topicName);
  };

  const handleSaveProgress = async (subjectId: string, topicName: string) => {
    setSaving(true);
    
    // Automatically reconcile status and completion percentage
    let updatedStatus = status;
    let updatedCompletion = completion;

    if (completion === 100 && (status === 'In Progress' || status === 'Not Started')) {
      updatedStatus = clarity >= 8 ? 'Mastered' : 'Completed';
    } else if (completion > 0 && completion < 100 && status === 'Not Started') {
      updatedStatus = 'In Progress';
    } else if (completion === 0 && (status === 'Completed' || status === 'Mastered')) {
      updatedStatus = 'Not Started';
    } else if (status === 'Completed' || status === 'Mastered') {
      updatedCompletion = 100;
    } else if (status === 'Not Started') {
      updatedCompletion = 0;
    }

    await db.updateTopicProgress(subjectId, topicName, {
      completion_percentage: updatedCompletion,
      status: updatedStatus,
      concept_clarity: clarity,
      confidence_score: confidence,
      difficulty_rating: difficulty,
      pyqs_solved: solvedPyqs,
      pyqs_total: totalPyqs,
      pyqs_correct: correctPyqs,
      pyqs_wrong: wrongPyqs,
      study_hours: studyHours,
      revision_count: revisionCount,
      last_studied_date: lastRevisionDate || null
    });

    // Save notes content
    await db.saveNote(subjectId, topicName, noteContent);

    onProgressUpdated();
    setSaving(false);
    setSelectedTopicName(null);
  };

  const getStatusColor = (s: TopicProgress['status']) => {
    switch (s) {
      case 'Mastered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Completed': return 'bg-emerald-500/5 text-emerald-400/80 border-emerald-500/10';
      case 'In Progress': return 'bg-[#6D5DF6]/10 text-[#8B7CFF] border-[#6D5DF6]/20';
      case 'Needs Revision': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-white/5 text-secondary border-white/5';
    }
  };

  const getSectionMetrics = (subtopicNames: string[], progressList: TopicProgress[]) => {
    const subProgress = progressList.filter(p => p.subject_id === 'ga' && subtopicNames.includes(p.topic_name));
    const totalCount = subtopicNames.length || 1;
    const completedCount = subProgress.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
    const completion = Math.round((completedCount / totalCount) * 100);
    const studied = subProgress.filter(p => p.status !== 'Not Started');
    const clarity = studied.length > 0
      ? Math.round(studied.reduce((sum, p) => sum + p.concept_clarity, 0) / studied.length)
      : 0;
    return { completion, clarity };
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const handleToggleSubtopicStatus = async (subtopicName: string, currentStatus: TopicProgress['status']) => {
    let nextStatus: TopicProgress['status'] = 'Not Started';
    let nextCompletion = 0;
    
    if (currentStatus === 'Not Started') {
      nextStatus = 'In Progress';
      nextCompletion = 30;
    } else if (currentStatus === 'In Progress') {
      nextStatus = 'Completed';
      nextCompletion = 100;
    } else if (currentStatus === 'Completed') {
      nextStatus = 'Mastered';
      nextCompletion = 100;
    } else if (currentStatus === 'Mastered') {
      nextStatus = 'Not Started';
      nextCompletion = 0;
    }
    
    const currentProg = progress.find(p => p.subject_id === 'ga' && p.topic_name === subtopicName);
    
    await db.updateTopicProgress('ga', subtopicName, {
      ...currentProg,
      status: nextStatus,
      completion_percentage: nextCompletion
    });
    
    onProgressUpdated();
  };

  const renderStatusIcon = (statusVal: TopicProgress['status']) => {
    switch (statusVal) {
      case 'In Progress':
        return (
          <span className="text-base text-fuchsia-400 font-bold leading-none select-none drop-shadow-[0_0_8px_rgba(217,70,239,0.4)]" title="In Progress">◐</span>
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
          <span className="text-base text-white/30 hover:text-fuchsia-400 font-bold leading-none select-none transition-colors" title="Not Started">☐</span>
        );
    }
  };

  const getClarityText = (val: number) => {
    const desc = [
      "No Understanding",
      "Heard About It",
      "Basic Understanding",
      "Can Solve Easy Questions",
      "Moderate Understanding",
      "Can Solve PYQs",
      "Strong",
      "Very Strong",
      "Can Teach Others",
      "Complete Mastery"
    ];
    return desc[val - 1] || "Not Rated";
  };

  return (
    <div className="space-y-8 font-outfit">
      
      {/* Subject Selector Sidebar / Grid */}
      <AnimatePresence mode="wait">
        {!selectedSubjectId ? (
          // Grid view of all 11 subjects
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {subjects.map((subj) => {
              const metrics = getSubjectMetrics(subj.id);
              
              return (
                <motion.div 
                  key={subj.id}
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedSubjectId(subj.id)}
                  className="glass-card p-5 md:p-8 rounded-[20px] cursor-pointer flex flex-col justify-between h-64 border-t-2 border-t-[#6D5DF6]/30"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6D5DF6]/10 text-[#8B7CFF] uppercase tracking-[0.05em]">
                        {subj.code}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        metrics.strength === 'Master' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        metrics.strength === 'Strong' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        metrics.strength === 'Moderate' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        metrics.strength === 'Weak' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-white/5 text-secondary border-white/5'
                      }`}>
                        {metrics.strength}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mt-4 font-outfit m-0">
                      {subj.name}
                    </h3>
                  </div>

                  <div className="space-y-4 mt-6">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-secondary">Completion</span>
                      <span className="text-white">{metrics.completion}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#6D5DF6] to-[#8B7CFF] h-full rounded-full transition-all duration-300"
                        style={{ width: `${metrics.completion}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-secondary border-t border-white/[0.06] pt-3 font-medium">
                      <div>
                        <span className="font-bold text-white text-xs block">{metrics.totalHours}h</span>
                        Studied
                      </div>
                      <div>
                        <span className="font-bold text-white text-xs block">{metrics.totalSolved}</span>
                        PYQs
                      </div>
                      <div>
                        <span className="font-bold text-white text-xs block">{metrics.accuracy}%</span>
                        Accuracy
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          // Expanded Subject detail view with Topic Accordion
          (() => {
            const subj = subjects.find(s => s.id === selectedSubjectId)!;
            const metrics = getSubjectMetrics(subj.id);
            
            return (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Back button & Subject Title card */}
                <div className="glass-panel p-5 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <button 
                      onClick={() => {
                        setSelectedSubjectId(null);
                        setSelectedTopicName(null);
                      }}
                      className="text-xs text-[#8B7CFF] hover:text-[#6D5DF6] font-bold flex items-center gap-1 cursor-pointer bg-none border-none p-0"
                    >
                      ← Back to Syllabus Map
                    </button>
                    <h2 className="text-xl md:text-2xl font-extrabold text-white mt-3 m-0 flex items-center gap-2">
                      <Book className="h-6 w-6 text-[#6D5DF6]" />
                      {subj.name}
                    </h2>
                  </div>

                  {/* Header Metrics Summary */}
                  <div className="flex gap-4 text-xs font-semibold">
                    <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-xl text-center min-w-[80px]">
                      <span className="block text-white font-bold text-base">{metrics.completion}%</span>
                      <span className="block text-[9px] text-secondary font-bold tracking-[0.05em] uppercase mt-1">COMPLETED</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-xl text-center min-w-[80px]">
                      <span className="block text-white font-bold text-base">{metrics.accuracy}%</span>
                      <span className="block text-[9px] text-secondary font-bold tracking-[0.05em] uppercase mt-1">ACCURACY</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-xl text-center min-w-[80px]">
                      <span className="block text-white font-bold text-base">{metrics.avgClarity}/10</span>
                      <span className="block text-[9px] text-secondary font-bold tracking-[0.05em] uppercase mt-1">CLARITY</span>
                    </div>
                  </div>
                </div>

                {/* Topic list & Detail Form layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Topic navigation list */}
                  <div className={`glass-card p-5 md:p-8 rounded-[20px] lg:col-span-2 space-y-3 h-[550px] overflow-y-auto ${selectedTopicName ? 'hidden lg:block' : 'block'}`}>
                    <h3 className="micro-tag mb-4 block">SUBJECT TOPICS</h3>
                    {subj.id === 'ga' ? (
                      <div className="space-y-4 w-full">
                        {subj.topics.map((section, secIdx) => {
                          const isExpanded = !!expandedSections[section.name];
                          const sectionMetrics = getSectionMetrics(section.subtopics, progress);
                          
                          return (
                            <div key={secIdx} className="glass-panel border border-white/[0.06] rounded-xl overflow-hidden">
                              <div 
                                onClick={() => toggleSection(section.name)}
                                className="p-4 bg-white/2 hover:bg-white/[0.04] cursor-pointer flex items-center justify-between transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4.5 w-4.5 text-fuchsia-400 shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4.5 w-4.5 text-secondary shrink-0" />
                                  )}
                                  <div>
                                    <h4 className="text-sm font-bold text-white m-0">{section.name}</h4>
                                    <span className="text-[10px] text-secondary mt-0.5 block">
                                      {section.subtopics.length} subtopics • Avg Clarity: {sectionMetrics.clarity}/10
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold">
                                  <span className="text-secondary hidden sm:inline">Completion:</span>
                                  <span className="text-fuchsia-400">{sectionMetrics.completion}%</span>
                                  <div className="w-16 bg-white/5 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                    <div className="bg-fuchsia-500 h-full rounded-full" style={{ width: `${sectionMetrics.completion}%` }} />
                                  </div>
                                </div>
                              </div>
                              
                              {isExpanded && (
                                <div className="border-t border-white/[0.04] p-3 space-y-2 bg-[#0B0F19]/25">
                                  {section.subtopics.map((subtopicName, subIdx) => {
                                    const subProg = progress.find(p => p.subject_id === 'ga' && p.topic_name === subtopicName);
                                    const subStatus = subProg?.status || 'Not Started';
                                    const subComp = subProg?.completion_percentage || 0;
                                    
                                    const tempProg = subProg || {
                                      subject_id: 'ga',
                                      topic_name: subtopicName,
                                      status: 'Not Started',
                                      completion_percentage: 0,
                                      start_date: null,
                                      last_studied_date: null,
                                      concept_clarity: 1,
                                      confidence_score: 1,
                                      difficulty_rating: 3,
                                      study_hours: 0,
                                      pyqs_solved: 0,
                                      pyqs_total: 25,
                                      pyqs_correct: 0,
                                      pyqs_wrong: 0,
                                      pyqs_avg_time_seconds: 0,
                                      revision_count: 0,
                                      revision_due_date: null
                                    };
                                    const priorityInfo = calculateTopicPriority(tempProg, subj.weightage, revisions || []);
                                    
                                    return (
                                      <div 
                                        key={subIdx}
                                        onClick={() => handleEditTopic(subj.id, subtopicName)}
                                        className={`p-3 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${
                                          selectedTopicName === subtopicName 
                                            ? 'bg-fuchsia-500/10 border-fuchsia-500/30 shadow shadow-fuchsia-500/10' 
                                            : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.03]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleSubtopicStatus(subtopicName, subStatus);
                                            }}
                                            className="p-1 hover:scale-110 transition-transform cursor-pointer bg-transparent border-none p-0 flex items-center justify-center"
                                          >
                                            {renderStatusIcon(subStatus)}
                                          </button>
                                          
                                          <div className="space-y-0.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-xs font-bold text-white">{subtopicName}</span>
                                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-black border uppercase tracking-wider shrink-0 ${
                                                priorityInfo.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                priorityInfo.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                priorityInfo.priority === 'Medium' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                              }`}>
                                                {priorityInfo.priority}
                                              </span>
                                            </div>
                                            <span className="text-[9px] text-secondary">
                                              Clarity: <b>{tempProg.concept_clarity}/10</b> • PYQs: <b>{tempProg.pyqs_solved} solved</b>
                                            </span>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs font-bold text-white">{subComp}%</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      subj.topics.map((topic, index) => {
                        const topicProg = progress.find(p => p.subject_id === subj.id && p.topic_name === topic.name);
                        const topicStatus = topicProg?.status || 'Not Started';
                        const topicComp = topicProg?.completion_percentage || 0;
                        
                        const tempProg = topicProg || {
                          subject_id: subj.id,
                          topic_name: topic.name,
                          status: 'Not Started',
                          completion_percentage: 0,
                          start_date: null,
                          last_studied_date: null,
                          concept_clarity: 1,
                          confidence_score: 1,
                          difficulty_rating: 3,
                          study_hours: 0,
                          pyqs_solved: 0,
                          pyqs_total: 25,
                          pyqs_correct: 0,
                          pyqs_wrong: 0,
                          pyqs_avg_time_seconds: 0,
                          revision_count: 0,
                          revision_due_date: null
                        };
                        const priorityInfo = calculateTopicPriority(tempProg, subj.weightage, revisions || []);
                        
                        return (
                          <div 
                            key={index}
                            onClick={() => handleEditTopic(subj.id, topic.name)}
                            className={`p-4 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${
                              selectedTopicName === topic.name 
                                ? 'bg-[#6D5DF6]/10 border-[#6D5DF6]/30' 
                                : 'bg-white/[0.01] border-white/[0.06] hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-white m-0 flex items-center gap-2 flex-wrap">
                                {topicComp === 100 ? (
                                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <BookOpen className="h-4.5 w-4.5 text-[#6D5DF6] shrink-0" />
                                )}
                                <span>{topic.name}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider shrink-0 ${
                                  priorityInfo.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  priorityInfo.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                  priorityInfo.priority === 'Medium' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                  'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                }`}>
                                  {priorityInfo.priority}
                                </span>
                              </h4>
                              <span className="text-[10px] text-secondary block pl-6">
                                {topic.subtopics.length} subtopics • {topicProg?.study_hours?.toFixed(1) || 0} hrs studied
                              </span>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(topicStatus)}`}>
                                {topicStatus}
                              </span>
                              <span className="text-xs font-bold text-white">{topicComp}%</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Right side Detail Editor Panel */}
                  <div className={`glass-card p-5 md:p-8 rounded-[20px] h-fit lg:block ${selectedTopicName ? 'block' : 'hidden lg:block'}`}>
                    <AnimatePresence mode="wait">
                      {selectedTopicName ? (
                        <motion.div 
                          key={selectedTopicName}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-5"
                        >
                          <div className="flex justify-between items-start border-b border-white/[0.06] pb-4">
                            <div>
                              <button
                                type="button"
                                onClick={() => setSelectedTopicName(null)}
                                className="lg:hidden text-xs text-[#8B7CFF] hover:text-[#6D5DF6] font-bold mb-3 flex items-center gap-1 cursor-pointer bg-none border-none p-0"
                              >
                                ← Back to Topics
                              </button>
                              <h3 className="text-md font-bold text-white m-0">Topic Details</h3>
                              <span className="text-xs text-[#8B7CFF] font-medium block mt-1">{selectedTopicName}</span>
                            </div>
                            <button 
                              onClick={() => onNavigateToTab('timer', subj.id, selectedTopicName)}
                              className="btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                            >
                              <Play className="h-3.5 w-3.5" />
                              Study
                            </button>
                          </div>

                          {/* Progress sliders */}
                          <div className="space-y-4 text-xs">
                            {/* Completion percentage */}
                            <div>
                              <div className="flex justify-between font-bold mb-1.5">
                                <span className="micro-tag">COMPLETION: {completion}%</span>
                              </div>
                              <input 
                                type="range" min="0" max="100" step="10"
                                value={completion}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setCompletion(val);
                                  if (val === 100 && (status === 'In Progress' || status === 'Not Started')) {
                                    setStatus(clarity >= 8 ? 'Mastered' : 'Completed');
                                  } else if (val > 0 && val < 100 && status === 'Not Started') {
                                    setStatus('In Progress');
                                  } else if (val === 0 && (status === 'Completed' || status === 'Mastered')) {
                                    setStatus('Not Started');
                                  }
                                }}
                                className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#6D5DF6]"
                              />
                            </div>

                            {/* Status */}
                            <div>
                              <label className="micro-tag block mb-2">STATUS</label>
                              {subj.id === 'ga' ? (
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { value: 'Not Started', label: 'Not Started', icon: '☐' },
                                    { value: 'In Progress', label: 'In Progress', icon: '◐' },
                                    { value: 'Completed', label: 'Completed', icon: '☑' },
                                    { value: 'Mastered', label: 'Mastered', icon: '⭐' }
                                  ].map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        const val = opt.value as TopicProgress['status'];
                                        setStatus(val);
                                        if (val === 'Completed' || val === 'Mastered') {
                                          setCompletion(100);
                                        } else if (val === 'Not Started') {
                                          setCompletion(0);
                                        } else if (val === 'In Progress' && completion === 100) {
                                          setCompletion(90);
                                        }
                                      }}
                                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                                        status === opt.value
                                          ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-white font-extrabold shadow-[0_0_12px_rgba(217,70,239,0.2)]'
                                          : 'bg-white/5 border-white/10 text-secondary hover:bg-white/10'
                                      }`}
                                    >
                                      <span className={`text-sm leading-none ${status === opt.value ? 'text-fuchsia-400 font-bold' : ''}`}>{opt.icon}</span>
                                      <span>{opt.label}</span>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <select 
                                  value={status}
                                  onChange={(e) => {
                                    const val = e.target.value as TopicProgress['status'];
                                    setStatus(val);
                                    if (val === 'Completed' || val === 'Mastered') {
                                      setCompletion(100);
                                    } else if (val === 'Not Started') {
                                      setCompletion(0);
                                    } else if ((val === 'In Progress' || val === 'Needs Revision') && completion === 100) {
                                      setCompletion(90);
                                    }
                                  }}
                                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                                >
                                  <option value="Not Started" className="bg-[#111315] text-white">Not Started</option>
                                  <option value="In Progress" className="bg-[#111315] text-white">In Progress</option>
                                  <option value="Completed" className="bg-[#111315] text-white">Completed</option>
                                  <option value="Needs Revision" className="bg-[#111315] text-white">Needs Revision</option>
                                  <option value="Mastered" className="bg-[#111315] text-white">Mastered</option>
                                </select>
                              )}
                            </div>

                            {/* Concept Clarity slider */}
                            <div>
                              <div className="flex justify-between font-bold mb-1.5">
                                <span className="micro-tag">CONCEPT CLARITY: {clarity}/10</span>
                                <span className="text-[#8B7CFF] font-semibold text-[10px]">{getClarityText(clarity)}</span>
                              </div>
                              <input 
                                type="range" min="1" max="10" step="1"
                                value={clarity}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setClarity(val);
                                  if (completion === 100) {
                                    setStatus(val >= 8 ? 'Mastered' : 'Completed');
                                  }
                                }}
                                className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#6D5DF6]"
                              />
                            </div>

                            {/* Confidence Score slider */}
                            <div>
                              <div className="flex justify-between font-bold mb-1.5">
                                <span className="micro-tag">CONFIDENCE: {confidence}/10</span>
                              </div>
                              <input 
                                type="range" min="1" max="10" step="1"
                                value={confidence}
                                onChange={(e) => setConfidence(Number(e.target.value))}
                                className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#6D5DF6]"
                              />
                            </div>

                            {/* Difficulty Star Rating */}
                            <div>
                              <label className="micro-tag block mb-2">DIFFICULTY</label>
                              <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star} type="button"
                                    onClick={() => setDifficulty(star)}
                                    className="p-1 cursor-pointer bg-none border-none hover:scale-110 transition-transform"
                                  >
                                    <Star className={`h-4.5 w-4.5 ${
                                      star <= difficulty ? 'text-amber-400 fill-amber-400' : 'text-white/10'
                                    }`} />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* PYQ Performance trackers */}
                            <div className="border-t border-white/[0.06] pt-4 space-y-3">
                              <label className="micro-tag block">PYQ TRACKING</label>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="micro-tag block mb-1.5 opacity-80">SOLVED PYQS</label>
                                  <input 
                                    type="number" min="0"
                                    value={solvedPyqs}
                                    onChange={(e) => setSolvedPyqs(Number(e.target.value))}
                                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="micro-tag block mb-1.5 opacity-80">TOTAL TARGET</label>
                                  <input 
                                    type="number" min="1"
                                    value={totalPyqs}
                                    onChange={(e) => setTotalPyqs(Number(e.target.value))}
                                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="micro-tag block mb-1.5 opacity-80">CORRECT ANS</label>
                                  <input 
                                    type="number" min="0" max={solvedPyqs}
                                    value={correctPyqs}
                                    onChange={(e) => setCorrectPyqs(Number(e.target.value))}
                                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="micro-tag block mb-1.5 opacity-80">INCORRECT</label>
                                  <input 
                                    type="number" min="0"
                                    value={wrongPyqs}
                                    onChange={(e) => setWrongPyqs(Number(e.target.value))}
                                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                                  />
                                </div>
                              </div>

                              {solvedPyqs > 0 && (
                                <div className="text-[10px] text-[#8B7CFF] font-semibold text-center mt-2 bg-[#6D5DF6]/5 py-1.5 rounded-lg">
                                  Topic Accuracy: {Math.round((correctPyqs / solvedPyqs) * 100)}%
                                </div>
                              )}
                            </div>

                            {/* Study & Revision metrics */}
                            <div className="border-t border-white/[0.06] pt-4 space-y-3">
                              <label className="micro-tag block">STUDY & REVISION METRICS</label>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="micro-tag block mb-1.5 opacity-80">STUDY HOURS</label>
                                  <input 
                                    type="number" min="0" step="0.1"
                                    value={studyHours}
                                    onChange={(e) => setStudyHours(Number(e.target.value))}
                                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                                    placeholder="0.0"
                                  />
                                </div>
                                <div>
                                  <label className="micro-tag block mb-1.5 opacity-80">REVISION COUNT</label>
                                  <input 
                                    type="number" min="0"
                                    value={revisionCount}
                                    onChange={(e) => setRevisionCount(Number(e.target.value))}
                                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="micro-tag block mb-1.5 opacity-80">LAST REVISION DATE</label>
                                <input 
                                  type="date"
                                  value={lastRevisionDate}
                                  onChange={(e) => setLastRevisionDate(e.target.value)}
                                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                                />
                              </div>
                            </div>

                            {/* Notes Area */}
                            <div className="border-t border-white/[0.06] pt-4">
                              <label className="micro-tag block mb-2">NOTES & CONCEPTS</label>
                              <textarea
                                rows={4}
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="Jot down key formulas, tenses rules, or quick shortcuts..."
                                className="w-full p-2.5 rounded-lg glass-input text-xs resize-y font-mono"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSaveProgress(subj.id, selectedTopicName)}
                            disabled={saving}
                            className="btn-premium w-full py-3 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-6"
                          >
                            {saving ? (
                              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Save Performance Log
                              </>
                            )}
                          </button>
                        </motion.div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-5 md:p-8">
                          <HelpCircle className="h-10 w-10 text-white/10 mb-3" />
                          <h4 className="text-sm font-bold text-white mb-1">No Topic Selected</h4>
                          <p className="text-xs text-secondary leading-relaxed">
                            Click on any topic in the list to update your completion status, concept clarity slider, and solved PYQ counts.
                          </p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })()
        )}
      </AnimatePresence>
    </div>
  );
}
