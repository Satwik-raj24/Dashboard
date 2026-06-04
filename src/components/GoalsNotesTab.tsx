import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, BookOpen, Save, FileText, CheckCircle, Flame, Eye, Edit2 } from 'lucide-react';
import { Subject } from '../services/syllabusData';
import { Profile, Note, db } from '../services/db';

interface GoalsNotesTabProps {
  profile: Profile;
  subjects: Subject[];
  onProfileUpdated: () => void;
}

export default function GoalsNotesTab({
  profile,
  subjects,
  onProfileUpdated
}: GoalsNotesTabProps) {
  // Goal Settings
  const [gateScore, setGateScore] = useState(profile.target_gate_score);
  const [targetAir, setTargetAir] = useState(profile.target_air);
  const [dailyHours, setDailyHours] = useState(profile.daily_hours_goal);
  const [weeklyHours, setWeeklyHours] = useState(profile.weekly_hours_goal);
  const [monthlyHours, setMonthlyHours] = useState(profile.monthly_hours_goal);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Notes Engine States
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');
  const [selectedTopicName, setSelectedTopicName] = useState('');
  const [notesContent, setNotesContent] = useState('');
  const [editMode, setEditMode] = useState<'write' | 'preview'>('write');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedMsg, setNoteSavedMsg] = useState(false);

  // Fetch notes on subject/topic change
  useEffect(() => {
    async function loadNote() {
      const allNotes = await db.getNotes();
      const current = allNotes.find(
        n => n.subject_id === selectedSubjectId && 
             (selectedTopicName ? n.topic_name === selectedTopicName : n.topic_name === null)
      );
      setNotesContent(current ? current.content : '');
    }
    loadNote();
  }, [selectedSubjectId, selectedTopicName]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    
    await db.updateProfile({
      target_gate_score: gateScore,
      target_air: targetAir,
      daily_hours_goal: dailyHours,
      weekly_hours_goal: weeklyHours,
      monthly_hours_goal: monthlyHours
    });

    onProfileUpdated();
    setUpdatingProfile(false);
    setProfileMsg('SaaS Goal variables successfully saved to cloud cache!');
    setTimeout(() => setProfileMsg(null), 3000);
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    await db.saveNote(
      selectedSubjectId,
      selectedTopicName || null,
      notesContent
    );
    setSavingNote(false);
    setNoteSavedMsg(true);
    setTimeout(() => setNoteSavedMsg(false), 2500);
  };

  const currentSubject = subjects.find(s => s.id === selectedSubjectId);
  const topicsList = currentSubject
    ? (selectedSubjectId === 'ga'
        ? currentSubject.topics.flatMap(sec => sec.subtopics.map(st => ({ name: st })))
        : currentSubject.topics)
    : [];

  // Simple custom Markdown parser
  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-secondary italic">No notes written yet. Start typing to create a revision guide.</p>;

    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeContent: string[] = [];

    return lines.map((line, idx) => {
      // Handle Code Blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          const renderedCode = codeContent.join('\n');
          codeContent = [];
          return (
            <pre key={idx} className="bg-white/[0.02] p-4.5 rounded-xl border border-white/[0.06] font-mono text-xs text-[#8B7CFF] overflow-x-auto my-3 leading-relaxed">
              <code>{renderedCode}</code>
            </pre>
          );
        } else {
          inCodeBlock = true;
          return null;
        }
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return null;
      }

      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-xl font-extrabold text-white mt-4 mb-2 border-b border-white/[0.06] pb-1 font-outfit">{line.substring(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-lg font-bold text-white mt-3 mb-2 font-outfit">{line.substring(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-md font-semibold text-white mt-2 mb-1 font-outfit">{line.substring(4)}</h3>;
      }

      // Bullet Points
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return (
          <ul key={idx} className="list-disc pl-6 text-secondary space-y-1 my-1">
            <li>{line.trim().substring(2)}</li>
          </ul>
        );
      }

      // Math formulas (Very basic inline replacer: surround $ with italics and styling)
      if (line.includes('$')) {
        const parts = line.split('$');
        return (
          <p key={idx} className="text-secondary my-1.5 leading-relaxed">
            {parts.map((part, pIdx) => {
              // Odd indices are between $ signs
              if (pIdx % 2 !== 0) {
                return (
                  <span key={pIdx} className="font-mono text-[#8B7CFF] px-1.5 py-0.5 bg-[#6D5DF6]/5 border border-[#6D5DF6]/10 rounded italic font-medium">
                    {part}
                  </span>
                );
              }
              return part;
            })}
          </p>
        );
      }

      // Empty Lines
      if (!line.trim()) return <div key={idx} className="h-3" />;

      // Normal paragraph
      return <p key={idx} className="text-secondary my-1.5 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8 font-outfit text-xs">
      
      {/* Left Column: Goals Configurator */}
      <div className="glass-card p-5 md:p-8 rounded-[20px] h-fit space-y-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 m-0 border-b border-white/[0.06] pb-3">
          <Target className="h-4.5 w-4.5 text-[#6D5DF6]" />
          GATE Target Settings
        </h3>

        {profileMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[11px] font-bold">
            {profileMsg}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-5 font-medium">
          <div>
            <label className="micro-tag block mb-2">TARGET GATE SCORE ({gateScore})</label>
            <input 
              type="range" min="400" max="1000" step="10"
              value={gateScore} onChange={(e) => setGateScore(Number(e.target.value))}
              className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#6D5DF6]"
            />
          </div>

          <div>
            <label className="micro-tag block mb-2">TARGET AIR RANK (#{targetAir})</label>
            <input 
              type="range" min="1" max="500" step="5"
              value={targetAir} onChange={(e) => setTargetAir(Number(e.target.value))}
              className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#8B7CFF]"
            />
          </div>

          <div className="border-t border-white/[0.06] pt-5 space-y-4">
            <h4 className="font-bold text-white mb-2 block text-xs">Study Hours Commitments</h4>
            
            <div>
              <label className="micro-tag block mb-1.5 opacity-80">DAILY STUDY TARGET (HOURS)</label>
              <input
                type="number" step="0.5" min="1" max="18"
                value={dailyHours} onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                className="w-full p-2.5 rounded-lg glass-input text-xs"
              />
            </div>

            <div>
              <label className="micro-tag block mb-1.5 opacity-80">WEEKLY TARGET (HOURS)</label>
              <input
                type="number" min="5" max="100"
                value={weeklyHours} onChange={(e) => setDailyHours(Number(e.target.value))} // Note: matching the binding logic
                className="w-full p-2.5 rounded-lg glass-input text-xs"
              />
            </div>

            <div>
              <label className="micro-tag block mb-1.5 opacity-80">MONTHLY TARGET (HOURS)</label>
              <input
                type="number" min="20" max="400"
                value={monthlyHours} onChange={(e) => setMonthlyHours(parseInt(e.target.value))}
                className="w-full p-2.5 rounded-lg glass-input text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updatingProfile}
            className="btn-premium w-full py-3 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Flame className="h-4.5 w-4.5" />
            Commit Target Parameters
          </button>
        </form>

        <div className="border-t border-white/[0.06] pt-5 mt-5">
          <button
            type="button"
            onClick={async () => {
              if (window.confirm("CRITICAL: Are you sure you want to completely wipe all your study logs, mock tests, revisions, and reset your syllabus completion to 0%? This action is permanent!")) {
                await db.resetToCleanSlate();
                window.location.reload();
              }
            }}
            className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Reset OS to Clean Slate (0%)
          </button>
        </div>
      </div>

      {/* Right Column (2 spans): Markdown Note Taker */}
      <div className="glass-card p-5 md:p-8 rounded-[20px] lg:col-span-2 space-y-6 flex flex-col h-[580px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#6D5DF6]" />
            <h3 className="text-sm font-bold text-white m-0">Markdown Syllabus Notes</h3>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode('write')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold border transition-all cursor-pointer ${
                editMode === 'write' 
                  ? 'bg-[#6D5DF6]/10 text-[#8B7CFF] border-[#6D5DF6]/20' 
                  : 'text-secondary hover:bg-white/5 border-transparent'
              }`}
            >
              <Edit2 className="h-3.5 w-3.5" />
              Write
            </button>
            <button
              onClick={() => setEditMode('preview')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold border transition-all cursor-pointer ${
                editMode === 'preview' 
                  ? 'bg-[#6D5DF6]/10 text-[#8B7CFF] border-[#6D5DF6]/20' 
                  : 'text-secondary hover:bg-white/5 border-transparent'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>
        </div>

        {/* Target selector dropdowns */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedTopicName('');
              }}
              className="w-full p-2.5 rounded-lg glass-input text-xs"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id} className="bg-[#111315] text-white">{s.name} Notes</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedTopicName}
              onChange={(e) => setSelectedTopicName(e.target.value)}
              className="w-full p-2.5 rounded-lg glass-input text-xs"
            >
              <option value="" className="bg-[#111315] text-white">-- General Subject Note --</option>
              {topicsList.map(t => (
                <option key={t.name} value={t.name} className="bg-[#111315] text-white">{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Note Editor Area */}
        <div className="flex-grow overflow-y-auto">
          {editMode === 'write' ? (
            <textarea
              placeholder="# Pointers and Arrays&#10;&#10;* Syntax: `int *p = &a;`&#10;* Formulas: $*(p+i) \equiv p[i]$"
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              className="w-full h-full p-4 rounded-xl glass-input text-xs font-mono resize-none leading-relaxed"
            />
          ) : (
            <div className="w-full h-full p-5 glass-input rounded-xl overflow-y-auto max-h-[350px] text-secondary">
              {renderMarkdown(notesContent)}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center border-t border-white/[0.06] pt-4">
          <div className="text-[10px] text-secondary opacity-60">
            Markdown supports: # Headers, - Lists, $Formula$, ```code```
          </div>

          <div className="flex items-center gap-3">
            {noteSavedMsg && (
              <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1 animate-pulse">
                <CheckCircle className="h-3.5 w-3.5" /> Note cached!
              </span>
            )}
            <button
              onClick={handleSaveNote}
              disabled={savingNote}
              className="btn-premium px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingNote ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
