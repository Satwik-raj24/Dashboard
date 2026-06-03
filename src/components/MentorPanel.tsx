import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Send, Bot, User, ArrowRight, BookOpen, AlertTriangle, Compass, CheckCircle } from 'lucide-react';
import { Profile, TopicProgress, MockTest, RevisionTask, StudySession } from '../services/db';
import { generateMentorInsights } from '../services/mentorEngine';
import { calculateReadiness } from '../services/readinessEngine';
import { predictAIR } from '../services/predictionEngine';
import { syllabus } from '../services/syllabusData';

interface MentorPanelProps {
  profile: Profile;
  progress: TopicProgress[];
  mocks: MockTest[];
  revisions: RevisionTask[];
  sessions: StudySession[];
}

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
}

export default function MentorPanel({
  profile,
  progress,
  mocks,
  revisions,
  sessions
}: MentorPanelProps) {
  const { insights, completionDate } = generateMentorInsights(progress, mocks, revisions, sessions);
  const readiness = calculateReadiness(profile, progress, sessions, mocks, revisions);
  const prediction = predictAIR(progress, mocks, revisions);

  // Statistics for chat responses
  const totalPyqsSolved = progress.reduce((sum, p) => sum + p.pyqs_solved, 0);
  let avgMockMarks = 0;
  if (mocks.length > 0) {
    avgMockMarks = Math.round((mocks.reduce((sum, m) => sum + Number(m.marks), 0) / mocks.length) * 10) / 10;
  } else {
    avgMockMarks = 45; 
  }
  let studiedPyqsSolved = 0;
  let studiedPyqsCorrect = 0;
  progress.forEach(p => {
    if (p.pyqs_solved > 0) {
      studiedPyqsSolved += p.pyqs_solved;
      studiedPyqsCorrect += p.pyqs_correct;
    }
  });
  const pyqAccuracy = studiedPyqsSolved > 0 ? (studiedPyqsCorrect / studiedPyqsSolved) * 100 : 70;

  const [query, setQuery] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([
    { sender: 'bot', text: "Hello! I am your GATE AIR < 100 Command Assistant. Ask me anything about your current preparation statistics, syllabus completion details, expected rank, or what topic you should focus on next." }
  ]);
  const [generating, setGenerating] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg = query.trim();
    setChat(prev => [...prev, { sender: 'user', text: userMsg }]);
    setQuery('');
    setGenerating(true);

    // Simulate AI response based on stats
    setTimeout(() => {
      let response = '';
      const lowercase = userMsg.toLowerCase();

      if (lowercase.includes('roadmap') || lowercase.includes('road map') || lowercase.includes('road-map')) {
        response = `To secure a top 100 rank (AIR < 100) in GATE CS 2027, here is your customized roadmap based on your current readiness:

1. 🎯 **Syllabus Mastery (Goal: 100%)**: Currently you are at ${readiness.syllabus}%. Focus first on high-weightage subjects: Databases, OS, TOC, Algorithms, and Mathematics. Ensure every topic reaches a concept clarity rating of 8.5/10.
2. ✍️ **PYQ Execution (Goal: 90%+ Accuracy)**: You have solved ${totalPyqsSolved} PYQs with ${Math.round(pyqAccuracy)}% accuracy. Start solving subject-wise PYQs daily, and compile a 'mistake notebook' for incorrect questions.
3. 📊 **Mock Tests (Goal: Avg 75+ Marks)**: Your current average is ${avgMockMarks} marks. Take subject tests first, then move to full-length mocks from October. Aim for 70-75+ marks under real exam time limits.
4. 🔄 **Spaced Repetition (Goal: 0 Missed)**: Keep your consistency calendar green. Complete all pending revision drills in your revision queue to stop memory decay.`;
      } else if (lowercase.includes('pyq') || lowercase.includes('pyqs') || lowercase.includes('solved') || lowercase.includes('accuracy') || lowercase.includes('question') || lowercase.includes('practice')) {
        response = `You have solved a total of ${totalPyqsSolved} PYQs so far, with an average accuracy of ${Math.round(pyqAccuracy)}%. 
For a top 100 rank, you need to solve 15+ years of GATE questions for every topic in the syllabus. 
My recommendation:
1. Target at least 25-30 PYQs per major subject.
2. Prioritize Algorithms, Operating Systems, and Theory of Computation.
3. Review your incorrect answers in the Revisions tab regularly.`;
      } else if (lowercase.includes('syllabus') || lowercase.includes('completion') || lowercase.includes('timeline') || lowercase.includes('finish') || lowercase.includes('progress') || lowercase.includes('percent')) {
        response = `Your syllabus completion is currently at ${readiness.syllabus}%. 
Based on your study history, you are projected to complete the syllabus by ${completionDate}.
To speed up:
1. Try to increase your study velocity to ${Math.max(4, profile.daily_hours_goal || 4)} hours/day.
2. Target completion of core engineering subjects by November to leave 2 full months for mock series.
3. Mark completed topics as "Completed" or "Mastered" in your Syllabus tab to update your timeline accurately.`;
      } else if (lowercase.includes('revision') || lowercase.includes('revisions') || lowercase.includes('spaced') || lowercase.includes('due') || lowercase.includes('schedule')) {
        const missed = revisions.filter(r => r.status === 'Missed');
        const due = revisions.filter(r => r.status === 'Pending' && r.due_date <= new Date().toISOString().split('T')[0]);
        response = `You have ${revisions.filter(r => r.status === 'Completed').length} completed revisions, ${missed.length} missed revisions, and ${due.length} revisions due today.
${missed.length > 0 ? `Critical: You have missed revisions like "${missed[0].topic_name}". Please complete them immediately to avoid forgetting.` : due.length > 0 ? `You have revisions due today including "${due[0].topic_name}". Complete them to stay on top of your spaced repetition.` : 'Your revision schedule is fully up-to-date! Excellent work.'}`;
      } else if (lowercase.includes('ready') || lowercase.includes('am i') || lowercase.includes('readiness')) {
        response = `Your current GATE Readiness Score is ${readiness.overall}%. An AIR < 100 benchmark requires a readiness score of 85%+. Your syllabus completion stands at ${readiness.syllabus}% and mock performance is at ${readiness.mock}%. Keep solving PYQs to lift this.`;
      } else if (lowercase.includes('air') || lowercase.includes('rank') || lowercase.includes('predict') || lowercase.includes('score') || lowercase.includes('mark')) {
        response = `Based on your logged mock score averages (${mocks.length > 0 ? mocks[0].marks : 45} marks) and PYQ accuracy (${Math.round(pyqAccuracy)}%), your projected AIR range is currently #${prediction.rankRange}. The probability of securing AIR < 100 stands at ${prediction.probUnder100}%.`;
      } else if (lowercase.includes('weak') || lowercase.includes('difficult')) {
        const weak = progress.filter(p => p.status !== 'Not Started').sort((a,b) => a.concept_clarity - b.concept_clarity)[0];
        response = weak 
          ? `Your weakest topic on record is "${weak.topic_name}" (Concept Clarity: ${weak.concept_clarity}/10). I advise logging a 90-minute study session to map its subtopics before taking your next mock test.`
          : `No weak topics logged. You seem to have a balanced syllabus baseline.`;
      } else if (lowercase.includes('next') || lowercase.includes('study') || lowercase.includes('what to')) {
        // Recommend study
        const due = revisions.filter(r => r.status === 'Pending');
        const inProgress = progress.filter(p => p.status === 'In Progress');
        if (due.length > 0) {
          response = `Your spaced repetition queue has due items. You should revise "${due[0].topic_name}" first. After that, pick up "${inProgress[0]?.topic_name || 'a new topic in Algorithms'}" to continue your syllabus progression.`;
        } else {
          response = `Your revision queue is clean. I recommend starting a study session for Digital Logic combinational circuits or checking off new topics in Theory of Computation.`;
        }
      } else {
        response = `You have completed ${readiness.syllabus}% of the syllabus with an average concept clarity of ${(readiness.clarity/10).toFixed(1)}/10. Your study velocity indicates completion by ${completionDate}. What specific metrics would you like me to analyze?`;
      }

      setChat(prev => [...prev, { sender: 'bot', text: response }]);
      setGenerating(false);
    }, 1000);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />;
      default: return <Compass className="h-5 w-5 text-[#8B7CFF] shrink-0" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-red-500/[0.01] border-red-500/10 text-red-200';
      case 'success': return 'bg-emerald-500/[0.01] border-emerald-500/10 text-emerald-200';
      default: return 'bg-white/[0.01] border-white/[0.06] text-secondary';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8 font-outfit text-xs">
      
      {/* Left Column: Live Insights Feed */}
      <div className="glass-card p-5 md:p-8 rounded-[20px] lg:col-span-1 space-y-6 h-[580px] overflow-y-auto">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 m-0 border-b border-white/[0.06] pb-3">
          <Brain className="h-4.5 w-4.5 text-[#6D5DF6]" />
          Command Assistant Insights
        </h3>

        <div className="space-y-4">
          {insights.map((insight) => (
            <div 
              key={insight.id}
              className={`p-4 rounded-xl border flex gap-3.5 ${getInsightColor(insight.type)}`}
            >
              {getInsightIcon(insight.type)}
              <div>
                <span className="micro-tag block mb-1 opacity-80">
                  {insight.category}
                </span>
                <p className="mt-1 font-semibold text-[11px] leading-relaxed m-0 text-white">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: AI Mentoring Chat console */}
      <div className="glass-card p-5 md:p-8 rounded-[20px] lg:col-span-2 flex flex-col h-[580px]">
        <div className="flex justify-between items-center border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#6D5DF6]" />
            <h3 className="text-sm font-bold text-white m-0">Interactive AI Mentor Terminal</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#6D5DF6]/10 text-[#8B7CFF] border border-[#6D5DF6]/20 uppercase tracking-[0.05em]">
            GATECS-AIR1
          </span>
        </div>

        {/* Chat message history logs */}
        <div className="flex-grow overflow-y-auto my-4 space-y-5 pr-1">
          {chat.map((msg, idx) => (
            <div 
              key={idx}
              className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                msg.sender === 'user' 
                  ? 'bg-[#6D5DF6]/10 border-[#6D5DF6]/20 text-[#8B7CFF]' 
                  : 'bg-white/[0.02] border border-white/[0.06] text-secondary'
              }`}>
                {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className={`p-3.5 rounded-2xl text-[11px] leading-relaxed ${
                msg.sender === 'user' 
                  ? 'bg-[#6D5DF6]/10 border border-[#6D5DF6]/20 text-white rounded-tr-none' 
                  : 'bg-white/[0.02] border border-white/[0.06] text-secondary rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {generating && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="h-8 w-8 rounded-full bg-white/[0.02] border border-white/[0.06] text-secondary flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-1.5 rounded-tl-none">
                <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input prompt query footer */}
        <form onSubmit={handleSend} className="relative mt-auto pt-4 border-t border-white/[0.06] flex gap-2">
          <input
            type="text"
            placeholder="E.g. What should I study next? / Am I ready for the exam?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-grow pl-4 pr-12 py-3 rounded-xl text-xs glass-input font-medium"
          />
          <button
            type="submit"
            disabled={!query.trim() || generating}
            className="absolute right-2 top-6 p-1.5 bg-[#6D5DF6] hover:bg-[#8B7CFF] text-white rounded-lg transition-all flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
