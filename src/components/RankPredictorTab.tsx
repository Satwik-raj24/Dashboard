import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { Subject } from '../services/syllabusData';
import { Profile, TopicProgress, MockTest, RevisionTask } from '../services/db';
import { predictAIR } from '../services/predictionEngine';

interface RankPredictorTabProps {
  profile: Profile;
  progress: TopicProgress[];
  mocks: MockTest[];
  revisions: RevisionTask[];
  subjects: Subject[];
}

export default function RankPredictorTab({
  profile,
  progress,
  mocks,
  revisions,
  subjects
}: RankPredictorTabProps) {
  const prediction = predictAIR(progress, mocks, revisions);

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

  // Mock score averages
  let avgMockMarks = 0;
  if (mocks.length > 0) {
    avgMockMarks = Math.round((mocks.reduce((sum, m) => sum + Number(m.marks), 0) / mocks.length) * 10) / 10;
  } else {
    avgMockMarks = 45;
  }

  return (
    <div className="space-y-12 font-outfit text-xs text-secondary">
      {/* 1. Header Hero Card */}
      <div className="glass-panel p-5 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2.5 m-0 font-outfit">
            <Trophy className="h-6 w-6 text-[#6D5DF6]" />
            AI Rank Prediction Engine
          </h2>
          <p className="text-secondary text-sm mt-2 leading-relaxed">
            Estimate your expected GATE CS marks and project your All India Rank range based on syllabus coverage, mock averages, and PYQ accuracy.
          </p>
        </div>
      </div>

      {/* 2. Projected AIR and Expected Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
        {/* Expected Rank Bracket */}
        <div className="glass-card p-5 md:p-8 rounded-[20px] flex flex-col justify-between relative overflow-hidden h-52">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="micro-tag text-amber-400">PREDICTED AIR BRACKET</span>
            <Trophy className="h-6 w-6 text-amber-400" />
          </div>
          <div className="mt-6">
            <span className="text-4xl md:text-5xl font-black text-amber-400 tracking-tight font-outfit block">
              #{prediction.rankRange}
            </span>
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider mt-2.5 block">
              Estimated Rank Bracket
            </span>
          </div>
        </div>

        {/* Expected Marks */}
        <div className="glass-card p-5 md:p-8 rounded-[20px] flex flex-col justify-between relative overflow-hidden h-52">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#6D5DF6]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="micro-tag text-[#8B7CFF]">EXPECTED MARKS</span>
            <Award className="h-6 w-6 text-[#8B7CFF]" />
          </div>
          <div className="mt-6">
            <span className="text-4xl md:text-5xl font-black text-white tracking-tight font-outfit block">
              {prediction.expectedMarks} <span className="text-base font-semibold text-secondary">/ 100</span>
            </span>
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider mt-2.5 block">
              Estimated Score under normal distribution
            </span>
          </div>
        </div>
      </div>

      {/* 3. Probability Engine Gauges */}
      <div className="glass-card p-5 md:p-8 rounded-[20px] space-y-8">
        <h3 className="text-sm font-bold text-white border-b border-white/[0.06] pb-3 mb-5 m-0 flex items-center gap-2">
          <Award className="h-4.5 w-4.5 text-[#6D5DF6]" />
          Probability Thresholds
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-8 text-center">
          {/* Probability < 100 */}
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center">
            <span className="micro-tag block mb-3.5">PROBABILITY AIR &lt; 100</span>
            <div className="relative flex items-center justify-center my-3">
              <svg className="w-24 h-24 transform -rotate-90">
                <defs>
                  <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6D5DF6" />
                    <stop offset="100%" stopColor="#8B7CFF" />
                  </linearGradient>
                </defs>
                <circle cx="48" cy="48" r="40" stroke="rgba(255, 255, 255, 0.03)" fill="none" strokeWidth="5" />
                <circle cx="48" cy="48" r="40" stroke="url(#purpleGradient)" fill="none" strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - prediction.probUnder100 / 100)}
                  strokeLinecap="round" />
              </svg>
              <span className="absolute text-xl font-black text-white">{prediction.probUnder100}%</span>
            </div>
            <span className="text-[10px] text-[#8B7CFF] font-semibold mt-3">Tough, requires top precision</span>
          </div>

          {/* Probability < 500 */}
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center">
            <span className="micro-tag block mb-3.5">PROBABILITY AIR &lt; 500</span>
            <div className="relative flex items-center justify-center my-3">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="rgba(255, 255, 255, 0.03)" fill="none" strokeWidth="5" />
                <circle cx="48" cy="48" r="40" stroke="url(#purpleGradient)" fill="none" strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - prediction.probUnder500 / 100)}
                  strokeLinecap="round" />
              </svg>
              <span className="absolute text-xl font-black text-white">{prediction.probUnder500}%</span>
            </div>
            <span className="text-[10px] text-[#8B7CFF] font-semibold mt-3">IIT Direct Admission Gate</span>
          </div>

          {/* Probability < 1000 */}
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center">
            <span className="micro-tag block mb-3.5">PROBABILITY AIR &lt; 1000</span>
            <div className="relative flex items-center justify-center my-3">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="rgba(255, 255, 255, 0.03)" fill="none" strokeWidth="5" />
                <circle cx="48" cy="48" r="40" stroke="url(#purpleGradient)" fill="none" strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - prediction.probUnder1000 / 100)}
                  strokeLinecap="round" />
              </svg>
              <span className="absolute text-xl font-black text-white">{prediction.probUnder1000}%</span>
            </div>
            <span className="text-[10px] text-[#8B7CFF] font-semibold mt-3">PSU / Top NIT threshold</span>
          </div>
        </div>
      </div>

      {/* 4. Rationale explanation box */}
      <div className="glass-card p-5 md:p-8 rounded-[20px] flex gap-5 items-start">
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h4 className="font-bold text-white m-0 text-sm">AIR Rank Projection Rationale</h4>
          <p className="text-secondary text-xs mt-2.5 leading-relaxed">
            Your target score is {profile.target_gate_score}. At your current accuracy ({Math.round(pyqAccuracy)}% on PYQs) and Mock score averages ({avgMockMarks} marks), you are estimated to secure {prediction.expectedMarks} marks under normal exam distributions, translating to a projected rank of #{prediction.expectedRank}. Focus on reducing silly errors in mock tests to boost correctness above 88% and secure a spot in the double digits.
          </p>
        </div>
      </div>
    </div>
  );
}
