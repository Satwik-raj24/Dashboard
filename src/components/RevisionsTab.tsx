import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarRange, BookOpen, Trash2, Plus, Calendar, AlertCircle } from 'lucide-react';
import { RevisionTask, db, getLocalDateString } from '../services/db';
import { syllabus } from '../services/syllabusData';

interface RevisionsTabProps {
  revisions: RevisionTask[];
  onRevisionUpdated: () => void;
}

export default function RevisionsTab({ revisions, onRevisionUpdated }: RevisionsTabProps) {
  // Manual revision schedule form state
  const [selSubId, setSelSubId] = useState('');
  const [selTopic, setSelTopic] = useState('');
  const [revisionDate, setRevisionDate] = useState(getLocalDateString(new Date()));
  const [submitting, setSubmitting] = useState(false);

  // Filter only completed (logged) revisions for the table
  const completedRevs = [...revisions]
    .filter(r => r.status === 'Completed')
    .sort((a, b) => new Date(b.completed_at || b.due_date).getTime() - new Date(a.completed_at || a.due_date).getTime());

  const handleLogRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selSubId || !selTopic || !revisionDate) return;
    
    setSubmitting(true);
    try {
      await db.logManualRevision(selSubId, selTopic, revisionDate);
      onRevisionUpdated();
      
      // Reset Form (keep date as is)
      setSelSubId('');
      setSelTopic('');
    } catch (err) {
      console.error("Error logging manual revision:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this revision log?")) return;
    try {
      await db.deleteRevision(id);
      onRevisionUpdated();
    } catch (err) {
      console.error("Error deleting revision log:", err);
    }
  };

  const getSubjName = (subId: string) => {
    return syllabus.find(s => s.id === subId)?.name || subId;
  };

  const getSubjCode = (subId: string) => {
    return syllabus.find(s => s.id === subId)?.code || subId;
  };

  return (
    <div className="space-y-12 font-outfit text-xs text-secondary">
      
      {/* 1. Header Hero Card */}
      <div className="glass-panel p-5 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2.5 m-0 font-outfit">
            <CalendarRange className="h-6 w-6 text-[#6D5DF6]" />
            Manual Revision Log Center
          </h2>
          <p className="text-secondary text-sm mt-2 leading-relaxed">
            Record what topic you revised and when, and keep a clean, persistent log of your syllabus revisions.
          </p>
        </div>
      </div>

      {/* 2. Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8 items-start">
        
        {/* Left Side: Logger Form */}
        <div className="glass-card p-5 md:p-8 rounded-[20px] space-y-6">
          <h3 className="text-sm font-bold text-white border-b border-white/[0.06] pb-3 mb-5 m-0 flex items-center gap-2">
            <Plus className="h-4.5 w-4.5 text-[#6D5DF6]" />
            Log a Revision Session
          </h3>
          
          <form onSubmit={handleLogRevision} className="space-y-5">
            <div>
              <label className="micro-tag block mb-2">SELECT SUBJECT</label>
              <select
                required
                value={selSubId}
                onChange={(e) => {
                  setSelSubId(e.target.value);
                  setSelTopic('');
                }}
                className="w-full p-3 rounded-xl glass-input text-xs"
              >
                <option value="" className="bg-[#111315] text-white">-- Choose Subject --</option>
                {syllabus.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#111315] text-white">{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="micro-tag block mb-2">SELECT TOPIC</label>
              <select
                required
                disabled={!selSubId}
                value={selTopic}
                onChange={(e) => setSelTopic(e.target.value)}
                className="w-full p-3 rounded-xl glass-input text-xs disabled:opacity-50"
              >
                <option value="" className="bg-[#111315] text-white">-- Choose Topic --</option>
                {selSubId && (() => {
                  const currentSub = syllabus.find(s => s.id === selSubId);
                  if (!currentSub) return null;
                  const list = selSubId === 'ga'
                    ? currentSub.topics.flatMap(sec => sec.subtopics.map(st => ({ name: st })))
                    : currentSub.topics;
                  return list.map(t => (
                    <option key={t.name} value={t.name} className="bg-[#111315] text-white">{t.name}</option>
                  ));
                })()}
              </select>
            </div>

            <div>
              <label className="micro-tag block mb-2">REVISION DATE</label>
              <input
                type="date"
                required
                value={revisionDate}
                onChange={(e) => setRevisionDate(e.target.value)}
                className="w-full p-3 rounded-xl glass-input text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={!selSubId || !selTopic || submitting}
              className="btn-premium w-full py-3.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Logging...' : 'Save Revision Log'}
            </button>
          </form>
        </div>

        {/* Right Side: Revisions Log Table */}
        <div className="glass-card p-5 md:p-8 rounded-[20px] lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-3 mb-5">
            <h3 className="text-sm font-bold text-white m-0 flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-[#8B7CFF]" />
              Revision History Log ({completedRevs.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            {completedRevs.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-muted text-[10px] uppercase font-bold tracking-[0.05em]">
                    <th className="pb-3.5 pl-2 font-bold text-[#7D8590]">Date Revised</th>
                    <th className="pb-3.5 font-bold text-[#7D8590]">Subject</th>
                    <th className="pb-3.5 font-bold text-[#7D8590]">Topic Name</th>
                    <th className="pb-3.5 pr-2 text-right font-bold text-[#7D8590]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {completedRevs.map((rev) => (
                    <tr key={rev.id} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 pl-2 font-semibold text-white">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-secondary" />
                          {new Date(rev.completed_at || rev.due_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="px-2.5 py-0.5 rounded font-bold bg-[#6D5DF6]/10 text-[#8B7CFF] uppercase tracking-[0.03em] text-[9px] border border-[#6D5DF6]/10">
                          {getSubjCode(rev.subject_id)}
                        </span>
                        <span className="text-white font-medium ml-2">{getSubjName(rev.subject_id)}</span>
                      </td>
                      <td className="py-4 font-semibold text-white text-[13px]">{rev.topic_name}</td>
                      <td className="py-4 pr-2 text-right">
                        <button
                          onClick={() => handleDeleteLog(rev.id)}
                          className="p-2 hover:bg-red-500/10 text-secondary hover:text-red-400 rounded-lg transition-all cursor-pointer bg-transparent border-none"
                          title="Delete Revision Log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state-box py-16">
                <AlertCircle className="h-10 w-10 text-white/10 mx-auto mb-3" />
                <p className="font-bold text-white mb-1 text-sm">No Revisions Logged</p>
                <p className="text-secondary text-xs leading-relaxed max-w-sm mx-auto">
                  Start logging your study reviews by selecting a subject and topic in the log panel.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
