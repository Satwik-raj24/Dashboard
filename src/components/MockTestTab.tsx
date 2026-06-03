import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ClipboardList, Plus, BarChart4, TrendingUp, Calendar, Award, Clock } from 'lucide-react';
import { MockTest, db } from '../services/db';

interface MockTestTabProps {
  mocks: MockTest[];
  onMockLogged: () => void;
}

export default function MockTestTab({ mocks, onMockLogged }: MockTestTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [mockName, setMockName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [marks, setMarks] = useState('');
  const [rank, setRank] = useState('');
  const [accuracy, setAccuracy] = useState('');
  const [attempted, setAttempted] = useState('');
  const [correct, setCorrect] = useState('');
  const [wrong, setWrong] = useState('');
  const [timeTakenMinutes, setTimeTakenMinutes] = useState('180');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockName || !marks || !accuracy) return;
    
    setSaving(true);
    
    try {
      await db.addMockTest({
        mock_name: mockName,
        date,
        marks: parseFloat(marks),
        rank: rank ? parseInt(rank) : undefined,
        accuracy: parseFloat(accuracy),
        attempted_count: attempted ? parseInt(attempted) : undefined,
        correct_count: correct ? parseInt(correct) : undefined,
        wrong_count: wrong ? parseInt(wrong) : undefined,
        time_taken_seconds: parseInt(timeTakenMinutes) * 60
      });

      onMockLogged();
      setShowAddForm(false);
      // Reset fields
      setMockName('');
      setMarks('');
      setRank('');
      setAccuracy('');
      setAttempted('');
      setCorrect('');
      setWrong('');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Compute aggregated stats
  const totalMocks = mocks.length;
  const avgMarks = totalMocks > 0 
    ? Math.round((mocks.reduce((sum, m) => sum + m.marks, 0) / totalMocks) * 10) / 10 
    : 0;
  const avgAccuracy = totalMocks > 0 
    ? Math.round((mocks.reduce((sum, m) => sum + m.accuracy, 0) / totalMocks) * 10) / 10 
    : 0;
  const highestMarks = totalMocks > 0 
    ? Math.max(...mocks.map(m => m.marks)) 
    : 0;

  return (
    <div className="space-y-8 font-outfit">
      
      {/* 1. Header and Add Trigger */}
      <div className="flex justify-between items-center glass-panel p-5 md:p-8 rounded-2xl">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2 m-0">
            <ClipboardList className="h-6 w-6 text-[#6D5DF6]" />
            Mock Test Center
          </h2>
          <p className="text-secondary text-xs mt-2 leading-relaxed">
            Simulate and log your full-length or subject-level tests to trace performance.
          </p>
        </div>
        
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-premium px-5 py-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          Log Mock Test
        </button>
      </div>

      {/* 2. Interactive Add Mock Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="glass-card p-5 md:p-8 rounded-[20px] grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <h3 className="text-sm font-bold text-white col-span-full border-b border-white/[0.06] pb-3 mb-2 m-0">
                Log New Mock Attempt
              </h3>

              <div className="space-y-1.5">
                <label className="micro-tag block mb-1">MOCK TEST NAME</label>
                <input 
                  type="text" required placeholder="E.g. MadeEasy FLT-1" 
                  value={mockName} onChange={(e) => setMockName(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="micro-tag block mb-1">DATE OF ATTEMPT</label>
                <input 
                  type="date" required 
                  value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs text-secondary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="micro-tag block mb-1">MARKS SCORED (OUT OF 100)</label>
                <input 
                  type="number" step="0.01" required min="0" max="100" placeholder="E.g. 72.5" 
                  value={marks} onChange={(e) => setMarks(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="micro-tag block mb-1">RANK ACHIEVED (OPTIONAL)</label>
                <input 
                  type="number" min="1" placeholder="E.g. 84" 
                  value={rank} onChange={(e) => setRank(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="micro-tag block mb-1">PERCENTAGE ACCURACY (%)</label>
                <input 
                  type="number" step="0.1" required min="0" max="100" placeholder="E.g. 84.5" 
                  value={accuracy} onChange={(e) => setAccuracy(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="micro-tag block mb-1">TIME TAKEN (MINUTES)</label>
                <input 
                  type="number" min="1" placeholder="E.g. 180" 
                  value={timeTakenMinutes} onChange={(e) => setTimeTakenMinutes(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="micro-tag block mb-1">ATTEMPTED QUESTIONS</label>
                <input 
                  type="number" min="0" placeholder="E.g. 52" 
                  value={attempted} onChange={(e) => setAttempted(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="micro-tag block mb-1">CORRECT ANSWERS</label>
                <input 
                  type="number" min="0" placeholder="E.g. 44" 
                  value={correct} onChange={(e) => setCorrect(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="micro-tag block mb-1">WRONG ANSWERS</label>
                <input 
                  type="number" min="0" placeholder="E.g. 8" 
                  value={wrong} onChange={(e) => setWrong(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                />
              </div>

              <div className="col-span-full flex gap-3 justify-end mt-4">
                <button 
                  type="button" onClick={() => setShowAddForm(false)}
                  className="btn-secondary px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" disabled={saving}
                  className="btn-premium px-5 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Confirm Entry'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Aggregate Stats Card Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
        <div className="glass-card p-5 md:p-8 rounded-[20px]">
          <span className="micro-tag block">TOTAL MOCK TESTS</span>
          <span className="text-3xl font-extrabold text-white block mt-2">{totalMocks}</span>
        </div>
        <div className="glass-card p-5 md:p-8 rounded-[20px]">
          <span className="micro-tag block">AVERAGE MARKS</span>
          <span className="text-3xl font-extrabold text-[#6D5DF6] block mt-2">{avgMarks}/100</span>
        </div>
        <div className="glass-card p-5 md:p-8 rounded-[20px]">
          <span className="micro-tag block">AVERAGE ACCURACY</span>
          <span className="text-3xl font-extrabold text-[#8B7CFF] block mt-2">{avgAccuracy}%</span>
        </div>
        <div className="glass-card p-5 md:p-8 rounded-[20px]">
          <span className="micro-tag block">HIGHEST MOCK SCORE</span>
          <span className="text-3xl font-extrabold text-emerald-400 block mt-2">{highestMarks}/100</span>
        </div>
      </div>

      {/* 4. Trends Visualizations */}
      {mocks.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score & Accuracy trends */}
          <div className="glass-card p-5 md:p-8 rounded-[20px] flex flex-col">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 m-0 mb-6">
              <TrendingUp className="h-4.5 w-4.5 text-[#6D5DF6]" />
              Mock Scores & Accuracy Trend
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mocks}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#B4BAC5', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#B4BAC5', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '12px' }} />
                  <Legend textAnchor="middle" style={{fontSize: 10}} />
                  <Line type="monotone" dataKey="marks" name="Marks Scored" stroke="#6D5DF6" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#8B7CFF" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rank trend (Reversed scale since smaller rank is better!) */}
          <div className="glass-card p-5 md:p-8 rounded-[20px] flex flex-col">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 m-0 mb-6">
              <Award className="h-4.5 w-4.5 text-amber-400" />
              Mock Rank Progression
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mocks.filter(m => m.rank !== undefined)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#B4BAC5', fontSize: 10 }} />
                  {/* Reversed YAxis */}
                  <YAxis reversed tick={{ fill: '#B4BAC5', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111315', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="rank" name="Rank Achieved" stroke="#F59E0B" strokeWidth={2.5} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state-box">
          <BarChart4 className="h-12 w-12 text-white/10 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">No Mocks Registered Yet</h4>
          <p className="text-xs text-secondary max-w-xs mx-auto leading-relaxed">
            Click "Log Mock Test" above to log your first full-length test and initialize accuracy analytics.
          </p>
        </div>
      )}

      {/* 5. Mock logs table */}
      {mocks.length > 0 && (
        <div className="glass-card p-5 md:p-8 rounded-[20px] overflow-hidden">
          <h3 className="text-sm font-bold text-white mb-6 m-0">All Attempted Mocks</h3>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-secondary font-bold text-[10px] tracking-[0.05em] uppercase">
                  <th className="py-3">Mock Details</th>
                  <th>Marks</th>
                  <th>Rank</th>
                  <th>Accuracy</th>
                  <th>Correct / Wrong</th>
                  <th>Time Taken</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {mocks.map((m) => (
                  <tr key={m.id} className="text-secondary hover:bg-white/[0.02] transition-colors">
                    <td className="py-4.5 font-semibold text-white">{m.mock_name}</td>
                    <td className="font-bold text-[#6D5DF6]">{m.marks}/100</td>
                    <td className="font-bold text-amber-400">{m.rank ? `#${m.rank}` : 'N/A'}</td>
                    <td>{m.accuracy}%</td>
                    <td>
                      {m.correct_count !== undefined ? (
                        <span className="text-emerald-400 font-bold">{m.correct_count}</span>
                      ) : '-'} 
                      {' / '}
                      {m.wrong_count !== undefined ? (
                        <span className="text-rose-400 font-bold">{m.wrong_count}</span>
                      ) : '-'}
                    </td>
                    <td>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-secondary opacity-60" />
                        {Math.round(m.time_taken_seconds / 60)} mins
                      </span>
                    </td>
                    <td className="text-muted">{new Date(m.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
