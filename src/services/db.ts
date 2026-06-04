// Database Adapter Layer for GATEOS 2027
// Seamlessly toggles between Supabase (if ENV is present) and high-fidelity LocalStorage simulation.

import { createClient } from '@supabase/supabase-js';
import { syllabus } from './syllabusData';

export const getLocalDateString = (val: string | Date | null | undefined): string => {
  if (!val) return '';
  
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (val.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }

  let parsedStr = val;
  if (val.includes(' ') && !val.includes('T')) {
    parsedStr = val.replace(' ', 'T');
  }

  const d = new Date(parsedStr);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  return '';
};

// Types corresponding to database tables
export interface Profile {
  id: string;
  email: string;
  display_name: string;
  target_gate_score: number;
  target_air: number;
  daily_hours_goal: number;
  weekly_hours_goal: number;
  monthly_hours_goal: number;
  streak_count: number;
  last_active_date: string | null;
}

export interface TopicProgress {
  subject_id: string;
  topic_name: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Needs Revision' | 'Mastered';
  completion_percentage: number;
  start_date: string | null;
  last_studied_date: string | null;
  concept_clarity: number; // 1-10
  confidence_score: number; // 1-10
  difficulty_rating: number; // 1-5
  study_hours: number;
  pyqs_solved: number;
  pyqs_total: number;
  pyqs_correct: number;
  pyqs_wrong: number;
  pyqs_avg_time_seconds: number;
  revision_count: number;
  revision_due_date: string | null;
}

export interface StudySession {
  id: string;
  subject_id: string;
  topic_name: string;
  duration_seconds: number;
  notes: string;
  created_at: string;
}

export interface MockTest {
  id: string;
  mock_name: string;
  date: string;
  marks: number;
  rank?: number;
  accuracy: number;
  attempted_count?: number;
  correct_count?: number;
  wrong_count?: number;
  time_taken_seconds: number;
}

export interface RevisionTask {
  id: string;
  subject_id: string;
  topic_name: string;
  interval_days: number;
  due_date: string;
  status: 'Pending' | 'Completed' | 'Missed';
  completed_at: string | null;
}

export interface Note {
  subject_id: string;
  topic_name: string | null; // null if subject level note
  content: string;
}

export type SessionType = 'Learning' | 'PYQ Practice' | 'Revision' | 'Mock Analysis';

export function getSessionType(notes: string | null | undefined): SessionType {
  const noteStr = notes || '';
  if (noteStr.startsWith('[Learning]')) return 'Learning';
  if (noteStr.startsWith('[PYQ Practice]')) return 'PYQ Practice';
  if (noteStr.startsWith('[Revision]')) return 'Revision';
  if (noteStr.startsWith('[Mock Analysis]')) return 'Mock Analysis';
  
  // Fallback keyword parsing
  const lower = noteStr.toLowerCase();
  if (lower.includes('revision') || lower.includes('revised') || lower.includes('spaced') || lower.includes('recall') || lower.includes('review') || lower.includes('spacing')) {
    return 'Revision';
  }
  if (lower.includes('pyq') || lower.includes('solved') || lower.includes('practice') || lower.includes('accuracy') || lower.includes('drill') || lower.includes('question') || lower.includes('test')) {
    return 'PYQ Practice';
  }
  if (lower.includes('mock') || lower.includes('test') || lower.includes('analysis') || lower.includes('exam')) {
    return 'Mock Analysis';
  }
  return 'Learning';
}

// ----------------------------------------------------
// Supabase Setup
// ----------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return supabaseUrl !== '' && supabaseAnonKey !== '';
};

export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// ----------------------------------------------------
// LocalStorage Simulated Database
// ----------------------------------------------------
const LOCAL_STORAGE_KEYS = {
  PROFILE: 'gateos_profile',
  PROGRESS: 'gateos_topic_progress',
  SESSIONS: 'gateos_study_sessions',
  MOCK_TESTS: 'gateos_mock_tests',
  REVISIONS: 'gateos_revisions',
  NOTES: 'gateos_notes',
  AUTH: 'gateos_current_user',
  REGISTERED_USERS: 'gateos_registered_users'
};

// Partition LocalStorage keys by email to avoid cross-account leakage on same device
const getPartitionedKey = (baseKey: string, email?: string): string => {
  const targetEmail = email || localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH) || 'aspirant@gate2027.in';
  return `${baseKey}_${targetEmail}`;
};

// Track registered users locally for LocalStorage fallback warning flows
const registerLocalUser = (email: string) => {
  const usersStr = localStorage.getItem(LOCAL_STORAGE_KEYS.REGISTERED_USERS);
  const users = usersStr ? JSON.parse(usersStr) : ['aspirant@gate2027.in'];
  if (!users.includes(email)) {
    users.push(email);
    localStorage.setItem(LOCAL_STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
  }
};

const checkLocalUserExists = (email: string): boolean => {
  const usersStr = localStorage.getItem(LOCAL_STORAGE_KEYS.REGISTERED_USERS);
  const users = usersStr ? JSON.parse(usersStr) : ['aspirant@gate2027.in'];
  return users.includes(email);
};

// Seed initial topic progress for all topics
const createInitialProgress = (email: string): TopicProgress[] => {
  const initial: TopicProgress[] = [];
  const isDemo = email === 'aspirant@gate2027.in';
  
  // To make the app look stunning out-of-the-box, we pre-populate some status progress
  // representing a student who has completed ~38% of the syllabus ONLY for guest.
  
  syllabus.forEach(subject => {
    subject.topics.forEach((topic, idx) => {
      // Seed some subjects as more complete than others
      let status: TopicProgress['status'] = 'Not Started';
      let completion = 0;
      let clarity = 1;
      let confidence = 1;
      let studyHours = 0;
      let solvedPyqs = 0;
      let totalPyqs = 15 + Math.floor(Math.random() * 25);
      let correctPyqs = 0;
      let wrongPyqs = 0;
      let difficulty = 3;
      let revisionCount = 0;
      let lastStudied: string | null = null;
      let revisionDueDate: string | null = null;

      // Seed Logic (Demo guest account only): 
      if (isDemo) {
        difficulty = 2 + Math.floor(Math.random() * 3);
        // Complete first 5 topics in Discrete Maths
        if (subject.id === 'dm' && idx < 5) {
          status = 'Mastered';
          completion = 100;
          clarity = 9;
          confidence = 9;
          studyHours = 8 + idx * 2;
          solvedPyqs = totalPyqs;
          correctPyqs = Math.floor(totalPyqs * 0.85);
          wrongPyqs = totalPyqs - correctPyqs;
          revisionCount = 4;
          lastStudied = '2026-05-28';
        } 
        // Completed some in Digital Logic
        else if (subject.id === 'dl' && idx < 3) {
          status = 'Completed';
          completion = 100;
          clarity = 7;
          confidence = 7;
          studyHours = 6 + idx;
          solvedPyqs = Math.floor(totalPyqs * 0.8);
          correctPyqs = Math.floor(solvedPyqs * 0.8);
          wrongPyqs = solvedPyqs - correctPyqs;
          revisionCount = 2;
          lastStudied = '2026-05-30';
        }
        // In progress in Operating Systems
        else if (subject.id === 'os' && idx < 4) {
          if (idx === 0) {
            status = 'Completed';
            completion = 100;
            clarity = 8;
            confidence = 8;
            studyHours = 5;
            solvedPyqs = totalPyqs;
            correctPyqs = Math.floor(totalPyqs * 0.8);
            wrongPyqs = totalPyqs - correctPyqs;
            lastStudied = '2026-06-01';
            revisionCount = 1;
          } else if (idx === 1) {
            status = 'In Progress';
            completion = 60;
            clarity = 5;
            confidence = 4;
            studyHours = 3.5;
            solvedPyqs = Math.floor(totalPyqs * 0.4);
            correctPyqs = Math.floor(solvedPyqs * 0.7);
            wrongPyqs = solvedPyqs - correctPyqs;
            lastStudied = '2026-06-02';
          } else if (idx === 2) {
            status = 'Needs Revision';
            completion = 100;
            clarity = 6;
            confidence = 5;
            studyHours = 7;
            solvedPyqs = Math.floor(totalPyqs * 0.9);
            correctPyqs = Math.floor(solvedPyqs * 0.6);
            wrongPyqs = solvedPyqs - correctPyqs;
            lastStudied = '2026-05-20';
            revisionDueDate = '2026-06-03'; // Due today
          }
        }
        // Algorithms
        else if (subject.id === 'algo' && idx < 3) {
          status = idx === 0 ? 'Mastered' : 'In Progress';
          completion = idx === 0 ? 100 : 40;
          clarity = idx === 0 ? 10 : 5;
          confidence = idx === 0 ? 9 : 4;
          studyHours = idx === 0 ? 12 : 4;
          solvedPyqs = idx === 0 ? totalPyqs : 5;
          correctPyqs = idx === 0 ? Math.floor(totalPyqs * 0.9) : 3;
          lastStudied = idx === 0 ? '2026-05-25' : '2026-06-02';
        }
        // General Aptitude (GA) Seeding
        else if (subject.id === 'ga') {
          if (idx === 0) { // Verbal Aptitude
            status = 'Completed';
            completion = 100;
            clarity = 8;
            confidence = 8;
            studyHours = 6;
            solvedPyqs = totalPyqs;
            correctPyqs = Math.floor(totalPyqs * 0.85);
            wrongPyqs = totalPyqs - correctPyqs;
            revisionCount = 2;
            lastStudied = '2026-05-25';
          } else if (idx === 1) { // Quantitative Aptitude
            status = 'In Progress';
            completion = 50;
            clarity = 6;
            confidence = 5;
            studyHours = 9;
            solvedPyqs = Math.floor(totalPyqs * 0.5);
            correctPyqs = Math.floor(solvedPyqs * 0.7);
            wrongPyqs = solvedPyqs - correctPyqs;
            revisionCount = 1;
            lastStudied = '2026-06-01';
          }
        }
      }

      initial.push({
        subject_id: subject.id,
        topic_name: topic.name,
        status,
        completion_percentage: completion,
        start_date: completion > 0 ? '2026-05-01' : null,
        last_studied_date: lastStudied,
        concept_clarity: clarity,
        confidence_score: confidence,
        difficulty_rating: difficulty,
        study_hours: studyHours,
        pyqs_solved: solvedPyqs,
        pyqs_total: totalPyqs,
        pyqs_correct: correctPyqs,
        pyqs_wrong: wrongPyqs,
        pyqs_avg_time_seconds: studyHours > 0 ? 120 + Math.floor(Math.random() * 180) : 0,
        revision_count: revisionCount,
        revision_due_date: revisionDueDate
      });
    });
  });

  return initial;
};

// Seed initial study sessions
const createInitialSessions = (email: string): StudySession[] => {
  if (email !== 'aspirant@gate2027.in') return [];
  return [
    { id: '1', subject_id: 'dm', topic_name: 'Propositional Logic', duration_seconds: 14400, notes: 'Studied truth tables and basic laws. Solved 15 easy PYQs.', created_at: '2026-05-25T10:00:00Z' },
    { id: '2', subject_id: 'dm', topic_name: 'First Order Logic', duration_seconds: 18000, notes: 'Struggled with nested quantifiers. Understood equivalence.', created_at: '2026-05-26T14:30:00Z' },
    { id: '3', subject_id: 'dm', topic_name: 'Sets', duration_seconds: 10800, notes: 'Venn diagrams are clear. Covered countable vs uncountable.', created_at: '2026-05-28T09:15:00Z' },
    { id: '4', subject_id: 'dl', topic_name: 'Boolean Algebra', duration_seconds: 7200, notes: 'Quick revision of Boolean laws and SOP/POS forms.', created_at: '2026-05-30T16:00:00Z' },
    { id: '5', subject_id: 'os', topic_name: 'System Calls', duration_seconds: 18000, notes: 'Fork and exec tracing was hard, but solved most PYQs.', created_at: '2026-06-01T11:00:00Z' },
    { id: '6', subject_id: 'algo', topic_name: 'Searching', duration_seconds: 7200, notes: 'Binary search variants covered.', created_at: '2026-06-02T18:45:00Z' },
    { id: '7', subject_id: 'ga', topic_name: 'Verbal Aptitude', duration_seconds: 10800, notes: '[Learning] Covered English tenses and noun-verb agreements. Practice questions done.', created_at: '2026-05-25T11:00:00Z' },
    { id: '8', subject_id: 'ga', topic_name: 'Quantitative Aptitude', duration_seconds: 14400, notes: '[PYQ Practice] Solved percentage and ratio questions from GATE past papers.', created_at: '2026-06-01T15:00:00Z' }
  ];
};

// Seed initial mock tests
const createInitialMockTests = (email: string): MockTest[] => {
  if (email !== 'aspirant@gate2027.in') return [];
  return [
    { id: 'm1', mock_name: 'Elite GATE Mock 1', date: '2026-05-10', marks: 58.5, rank: 320, accuracy: 78.4, attempted_count: 55, correct_count: 42, wrong_count: 13, time_taken_seconds: 10800 },
    { id: 'm2', mock_name: 'MadeEasy Subject Test - DM', date: '2026-05-20', marks: 74.0, rank: 94, accuracy: 88.0, attempted_count: 25, correct_count: 22, wrong_count: 3, time_taken_seconds: 5400 },
    { id: 'm3', mock_name: 'Elite GATE Mock 2', date: '2026-05-31', marks: 66.2, rank: 112, accuracy: 82.5, attempted_count: 58, correct_count: 48, wrong_count: 10, time_taken_seconds: 10800 }
  ];
};

// Seed initial revision tasks
const createInitialRevisions = (email: string): RevisionTask[] => {
  if (email !== 'aspirant@gate2027.in') return [];
  return [
    { id: 'r1', subject_id: 'dm', topic_name: 'Propositional Logic', interval_days: 7, due_date: '2026-06-01', status: 'Completed', completed_at: '2026-06-01' },
    { id: 'r2', subject_id: 'os', topic_name: 'Processes', interval_days: 3, due_date: '2026-06-02', status: 'Missed', completed_at: null },
    { id: 'r3', subject_id: 'os', topic_name: 'Synchronization', interval_days: 1, due_date: '2026-06-03', status: 'Pending', completed_at: null },
    { id: 'r4', subject_id: 'dl', topic_name: 'Boolean Algebra', interval_days: 3, due_date: '2026-06-04', status: 'Pending', completed_at: null },
    { id: 'r5', subject_id: 'ga', topic_name: 'Verbal Aptitude', interval_days: 7, due_date: '2026-06-01', status: 'Completed', completed_at: '2026-06-01' }
  ];
};

// Seed initial notes
const createInitialNotes = (email: string): Note[] => {
  if (email !== 'aspirant@gate2027.in') return [];
  return [
    { subject_id: 'dm', topic_name: 'Propositional Logic', content: '# Propositional Logic Cheat Sheet\n\n## Connectives & Precedence\n1. Negation ($\\neg$)\n2. Conjunction ($\\land$)\n3. Disjunction ($\\lor$)\n4. Implication ($\\rightarrow$)\n5. Biconditional ($\\leftrightarrow$)\n\n## Important Equivalences\n* **Implication Law**: $p \\rightarrow q \\equiv \\neg p \\lor q$\n* **Contrapositive**: $p \\rightarrow q \\equiv \\neg q \\rightarrow \\neg p$\n* **De Morgan\'s**: \n  * $\\neg(p \\land q) \\equiv \\neg p \\lor \\neg q$\n  * $\\neg(p \\lor q) \\equiv \\neg p \\land \\neg q$' },
    { subject_id: 'os', topic_name: 'System Calls', content: '# Operating Systems System Calls\n\n## Fork System Call\n`pid_t pid = fork();`\n* Returns `0` to the child process.\n* Returns child\'s PID to parent process.\n* Returns `-1` on failure.\n\n```c\n#include <stdio.h>\n#include <unistd.h>\n\nint main() {\n    int x = 1;\n    if (fork() == 0) {\n        printf("Child: x = %d\\n", ++x);\n    } else {\n        printf("Parent: x = %d\\n", --x);\n    }\n    return 0;\n}\n```\n**Output:**\nParent: x = 0\nChild: x = 2\n(order depends on scheduler)' }
  ];
};

// ----------------------------------------------------
// DB Provider implementation (Toggles Supabase/Storage)
// ----------------------------------------------------
export const db = {
  getCurrentUserEmail: (): string => {
    const logged = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH);
    return logged || 'aspirant@gate2027.in';
  },

  loginUser: (email: string, name?: string): void => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH, email);
    registerLocalUser(email);
    if (name) {
      localStorage.setItem('gateos_registration_name', name);
    }
  },

  logoutUser: (): void => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH);
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.signOut().catch(err => console.error("Supabase signOut error", err));
    }
  },

  // 1. Profile methods
  getProfile: async (): Promise<Profile> => {
    const targetEmail = db.getCurrentUserEmail();
    
    if (isSupabaseConfigured() && supabase) {
      let { data: { user } } = await supabase.auth.getUser();
      
      // If a session is active but email does not match the target email, sign out
      if (user && user.email !== targetEmail) {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.error("Supabase signOut sync error", err);
        }
        user = null;
      }
      
      // Auto-authenticate guest if guest session is missing
      if (!user && targetEmail === 'aspirant@gate2027.in') {
        const email = 'aspirant@gate2027.in';
        const pwd = 'GateOS2027pwd!';
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (signInError) {
          const { data: signUpData } = await supabase.auth.signUp({ 
            email, 
            password: pwd,
            options: { data: { display_name: 'Top Ranker' } } 
          });
          if (signUpData.user) user = signUpData.user;
        } else if (signInData.user) {
          user = signInData.user;
        }
      }

      if (user) {
        const { data, error } = await supabase.from('profiles').select('*').single();
        if (!error && data) {
          localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROFILE, targetEmail), JSON.stringify(data));
          return data as Profile;
        }
        
        // Seed profile if not found
        if (error || !data) {
          const regName = localStorage.getItem('gateos_registration_name');
          const isDemo = targetEmail === 'aspirant@gate2027.in';
          const defaultProfile: Profile = {
            id: user.id,
            email: user.email!,
            display_name: regName || user.user_metadata?.display_name || targetEmail.split('@')[0],
            target_gate_score: isDemo ? 820 : 800,
            target_air: isDemo ? 45 : 100,
            daily_hours_goal: isDemo ? 4.5 : 4.0,
            weekly_hours_goal: isDemo ? 30 : 25,
            monthly_hours_goal: isDemo ? 120 : 100,
            streak_count: isDemo ? 5 : 0,
            last_active_date: isDemo ? '2026-06-02' : null
          };
          if (regName) localStorage.removeItem('gateos_registration_name');
          const { data: createdProfile, error: createError } = await supabase.from('profiles').insert(defaultProfile).select().single();
          if (!createError && createdProfile) {
            localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROFILE, targetEmail), JSON.stringify(createdProfile));
            return createdProfile as Profile;
          }
        }
      }
    }
    
    let profileStr = localStorage.getItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROFILE, targetEmail));
    if (!profileStr) {
      const regName = localStorage.getItem('gateos_registration_name');
      const isDemo = targetEmail === 'aspirant@gate2027.in';
      const defaultProfile: Profile = {
        id: 'user-id-local',
        email: targetEmail,
        display_name: regName || targetEmail.split('@')[0],
        target_gate_score: isDemo ? 820 : 800,
        target_air: isDemo ? 45 : 100,
        daily_hours_goal: isDemo ? 4.5 : 4.0,
        weekly_hours_goal: isDemo ? 30 : 25,
        monthly_hours_goal: isDemo ? 120 : 100,
        streak_count: isDemo ? 5 : 0,
        last_active_date: isDemo ? '2026-06-02' : null
      };
      if (regName) localStorage.removeItem('gateos_registration_name');
      localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROFILE, targetEmail), JSON.stringify(defaultProfile));
      return defaultProfile;
    }
    return JSON.parse(profileStr) as Profile;
  },

  updateProfile: async (updates: Partial<Profile>): Promise<Profile> => {
    const targetEmail = db.getCurrentUserEmail();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('profiles').update(updates).select().single();
      if (!error && data) {
        localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROFILE, targetEmail), JSON.stringify(data));
        return data as Profile;
      }
    }
    
    const current = await db.getProfile();
    const updated = { ...current, ...updates };
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROFILE, targetEmail), JSON.stringify(updated));
    return updated;
  },

  // 2. Topic progress methods
  getTopicProgress: async (): Promise<TopicProgress[]> => {
    const targetEmail = db.getCurrentUserEmail();
    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('topic_progress').select('*');
        if (!error && data) {
          if (data.length > 0) {
            // Self-healing database sync: check for any missing topics in Supabase
            const existingKeys = new Set(data.map(p => `${p.subject_id}:${p.topic_name}`));
            const missingTopics: TopicProgress[] = [];
            
            syllabus.forEach(subject => {
              subject.topics.forEach(topic => {
                const key = `${subject.id}:${topic.name}`;
                if (!existingKeys.has(key)) {
                  missingTopics.push({
                    subject_id: subject.id,
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
                  });
                }
              });
            });

            if (missingTopics.length > 0) {
              const rowsToInsert = missingTopics.map(p => ({
                ...p,
                user_id: user.id
              }));
              const { error: syncError } = await supabase.from('topic_progress').insert(rowsToInsert);
              if (!syncError) {
                const { data: updatedData } = await supabase.from('topic_progress').select('*');
                if (updatedData) {
                  localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROGRESS, targetEmail), JSON.stringify(updatedData));
                  return updatedData as TopicProgress[];
                }
              } else {
                console.error("Failed to sync missing topics to Supabase", syncError);
              }
            }
            localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROGRESS, targetEmail), JSON.stringify(data));
            return data as TopicProgress[];
          } else {
            const isSeeded = localStorage.getItem(`gateos_seeded_progress_${user.id}`);
            if (!isSeeded) {
              // Empty in Supabase: seed topics
              const initial = createInitialProgress(user.email!);
              const rowsToInsert = initial.map(p => ({
                ...p,
                user_id: user.id
              }));
              const { error: seedError } = await supabase.from('topic_progress').insert(rowsToInsert);
              if (!seedError) {
                localStorage.setItem(`gateos_seeded_progress_${user.id}`, 'true');
                localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROGRESS, targetEmail), JSON.stringify(initial));
                return initial;
              } else {
                console.error("Failed to seed Supabase topic progress", seedError);
              }
            }
            return [];
          }
        }
      }
    }
    
    let progressStr = localStorage.getItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROGRESS, targetEmail));
    if (!progressStr) {
      const initial = createInitialProgress(targetEmail);
      localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROGRESS, targetEmail), JSON.stringify(initial));
      return initial;
    }
    const localProgress = JSON.parse(progressStr) as TopicProgress[];


    
    // Sync missing topics to LocalStorage
    const existingKeys = new Set(localProgress.map(p => `${p.subject_id}:${p.topic_name}`));
    let hasChanges = false;
    
    syllabus.forEach(subject => {
      subject.topics.forEach(topic => {
        const key = `${subject.id}:${topic.name}`;
        if (!existingKeys.has(key)) {
          localProgress.push({
            subject_id: subject.id,
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
          });
          hasChanges = true;
        }
      });
    });

    if (hasChanges) {
      localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROGRESS, targetEmail), JSON.stringify(localProgress));
    }
    
    return localProgress;
  },

  updateTopicProgress: async (subjectId: string, topicName: string, updates: Partial<TopicProgress>): Promise<TopicProgress> => {
    const targetEmail = db.getCurrentUserEmail();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('topic_progress')
        .update(updates)
        .eq('subject_id', subjectId)
        .eq('topic_name', topicName)
        .select()
        .single();
      if (!error && data) {
        const allProgress = await db.getTopicProgress();
        const index = allProgress.findIndex(p => p.subject_id === subjectId && p.topic_name === topicName);
        if (index !== -1) {
          allProgress[index] = { ...allProgress[index], ...updates };
          localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROGRESS, targetEmail), JSON.stringify(allProgress));
        }
        return data as TopicProgress;
      }
    }
    
    const allProgress = await db.getTopicProgress();
    const index = allProgress.findIndex(p => p.subject_id === subjectId && p.topic_name === topicName);
    
    let target = allProgress[index];
    if (index === -1) {
      target = {
        subject_id: subjectId,
        topic_name: topicName,
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
      allProgress.push(target);
    }
    
    const updatedRecord = { ...target, ...updates, updated_at: new Date().toISOString() };
    allProgress[index === -1 ? allProgress.length - 1 : index] = updatedRecord;
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROGRESS, targetEmail), JSON.stringify(allProgress));
    return updatedRecord;
  },

  // 3. Study Sessions
  getStudySessions: async (): Promise<StudySession[]> => {
    const targetEmail = db.getCurrentUserEmail();
    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('study_sessions').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          if (data.length > 0) {
            localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.SESSIONS, targetEmail), JSON.stringify(data));
            return data as StudySession[];
          } else {
            const isSeeded = localStorage.getItem(`gateos_seeded_sessions_${user.id}`);
            if (!isSeeded) {
              const initial = createInitialSessions(user.email!);
              const rowsToInsert = initial.map(s => ({
                subject_id: s.subject_id,
                topic_name: s.topic_name,
                duration_seconds: s.duration_seconds,
                notes: s.notes,
                created_at: s.created_at,
                user_id: user.id
              }));
              if (rowsToInsert.length > 0) {
                const { error: seedError } = await supabase.from('study_sessions').insert(rowsToInsert);
                if (!seedError) {
                  localStorage.setItem(`gateos_seeded_sessions_${user.id}`, 'true');
                  localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.SESSIONS, targetEmail), JSON.stringify(initial));
                  return initial;
                }
              } else {
                localStorage.setItem(`gateos_seeded_sessions_${user.id}`, 'true');
                localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.SESSIONS, targetEmail), JSON.stringify([]));
                return [];
              }
            }
            return [];
          }
        }
      }
    }
    
    let sessionsStr = localStorage.getItem(getPartitionedKey(LOCAL_STORAGE_KEYS.SESSIONS, targetEmail));
    if (!sessionsStr) {
      const initial = createInitialSessions(targetEmail);
      localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.SESSIONS, targetEmail), JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(sessionsStr) as StudySession[];
  },

  addStudySession: async (session: Omit<StudySession, 'id' | 'created_at'>): Promise<StudySession> => {
    const targetEmail = db.getCurrentUserEmail();
    let newSession: StudySession | null = null;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase.from('study_sessions').insert({
            subject_id: session.subject_id,
            topic_name: session.topic_name,
            duration_seconds: session.duration_seconds,
            notes: session.notes,
            user_id: user.id
          }).select().single();
          
          if (!error && data) {
            newSession = data as StudySession;
            const allSessions = await db.getStudySessions();
            allSessions.unshift(newSession);
            localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.SESSIONS, targetEmail), JSON.stringify(allSessions));
          } else {
            console.error("addStudySession error", error);
          }
        }
      } catch (err) {
        console.error("Supabase addStudySession exception", err);
      }
    }

    if (!newSession) {
      newSession = {
        ...session,
        id: Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString()
      };
      
      const allSessions = await db.getStudySessions();
      allSessions.unshift(newSession);
      localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.SESSIONS, targetEmail), JSON.stringify(allSessions));
    }
    
    // Side effect: update topic progress study hours (runs for BOTH Supabase and LocalStorage)
    const allProgress = await db.getTopicProgress();
    const progressItem = allProgress.find(p => p.subject_id === session.subject_id && p.topic_name === session.topic_name);
    const addedHours = session.duration_seconds / 3600;
    
    // Determine next status
    const currentStatus = progressItem?.status || 'Not Started';
    const nextStatus = (currentStatus === 'Not Started' || !progressItem) ? 'In Progress' : currentStatus;

    await db.updateTopicProgress(session.subject_id, session.topic_name, {
      study_hours: (progressItem?.study_hours || 0) + addedHours,
      last_studied_date: getLocalDateString(new Date()),
      status: nextStatus
    });

    return newSession;
  },

  // 4. Mock Tests
  getMockTests: async (): Promise<MockTest[]> => {
    const targetEmail = db.getCurrentUserEmail();
    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('mock_tests').select('*').order('date', { ascending: true });
        if (!error && data) {
          if (data.length > 0) {
            localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.MOCK_TESTS, targetEmail), JSON.stringify(data));
            return data as MockTest[];
          } else {
            const isSeeded = localStorage.getItem(`gateos_seeded_mocks_${user.id}`);
            if (!isSeeded) {
              const initial = createInitialMockTests(user.email!);
              const rowsToInsert = initial.map(m => ({
                mock_name: m.mock_name,
                date: m.date,
                marks: m.marks,
                rank: m.rank,
                accuracy: m.accuracy,
                attempted_count: m.attempted_count,
                correct_count: m.correct_count,
                wrong_count: m.wrong_count,
                time_taken_seconds: m.time_taken_seconds,
                user_id: user.id
              }));
              if (rowsToInsert.length > 0) {
                const { error: seedError } = await supabase.from('mock_tests').insert(rowsToInsert);
                if (!seedError) {
                  localStorage.setItem(`gateos_seeded_mocks_${user.id}`, 'true');
                  localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.MOCK_TESTS, targetEmail), JSON.stringify(initial));
                  return initial;
                }
              } else {
                localStorage.setItem(`gateos_seeded_mocks_${user.id}`, 'true');
                localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.MOCK_TESTS, targetEmail), JSON.stringify([]));
                return [];
              }
            }
            return [];
          }
        }
      }
    }
    
    let mocksStr = localStorage.getItem(getPartitionedKey(LOCAL_STORAGE_KEYS.MOCK_TESTS, targetEmail));
    if (!mocksStr) {
      const initial = createInitialMockTests(targetEmail);
      localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.MOCK_TESTS, targetEmail), JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(mocksStr) as MockTest[];
  },

  addMockTest: async (mock: Omit<MockTest, 'id'>): Promise<MockTest> => {
    const targetEmail = db.getCurrentUserEmail();
    const newMock: MockTest = {
      ...mock,
      id: Math.random().toString(36).substring(2, 9)
    };

    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('mock_tests').insert({
          mock_name: mock.mock_name,
          date: mock.date,
          marks: mock.marks,
          rank: mock.rank,
          accuracy: mock.accuracy,
          attempted_count: mock.attempted_count,
          correct_count: mock.correct_count,
          wrong_count: mock.wrong_count,
          time_taken_seconds: mock.time_taken_seconds,
          user_id: user.id
        }).select().single();
        if (!error && data) {
          const allMocks = await db.getMockTests();
          allMocks.push(data as MockTest);
          localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.MOCK_TESTS, targetEmail), JSON.stringify(allMocks));
          return data as MockTest;
        }
        else console.error("addMockTest error", error);
      }
    }
    
    const allMocks = await db.getMockTests();
    allMocks.push(newMock);
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.MOCK_TESTS, targetEmail), JSON.stringify(allMocks));
    return newMock;
  },

  // 5. Revisions
  getRevisions: async (): Promise<RevisionTask[]> => {
    const targetEmail = db.getCurrentUserEmail();
    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('revisions').select('*');
        if (!error && data) {
          if (data.length > 0) {
            localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(data));
            return data as RevisionTask[];
          } else {
            const isSeeded = localStorage.getItem(`gateos_seeded_revisions_${user.id}`);
            if (!isSeeded) {
              const initial = createInitialRevisions(user.email!);
              const rowsToInsert = initial.map(r => ({
                subject_id: r.subject_id,
                topic_name: r.topic_name,
                interval_days: r.interval_days,
                due_date: r.due_date,
                status: r.status,
                completed_at: r.completed_at,
                user_id: user.id
              }));
              if (rowsToInsert.length > 0) {
                const { error: seedError } = await supabase.from('revisions').insert(rowsToInsert);
                if (!seedError) {
                  localStorage.setItem(`gateos_seeded_revisions_${user.id}`, 'true');
                  localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(initial));
                  return initial;
                }
              } else {
                localStorage.setItem(`gateos_seeded_revisions_${user.id}`, 'true');
                localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify([]));
                return [];
              }
            }
            return [];
          }
        }
      }
    }
    
    let revisionsStr = localStorage.getItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail));
    if (!revisionsStr) {
      const initial = createInitialRevisions(targetEmail);
      localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(revisionsStr) as RevisionTask[];
  },

  completeRevision: async (id: string): Promise<RevisionTask> => {
    const targetEmail = db.getCurrentUserEmail();
    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: currentRev } = await supabase.from('revisions').select('*').eq('id', id).single();
        if (currentRev) {
          const completedAtStr = new Date().toISOString().split('T')[0];
          const { data: updated, error } = await supabase
            .from('revisions')
            .update({ status: 'Completed', completed_at: completedAtStr })
            .eq('id', id)
            .select()
            .single();

          if (!error && updated) {
            const allRevisions = await db.getRevisions();
            const index = allRevisions.findIndex(r => r.id === id);
            if (index !== -1) {
              allRevisions[index] = updated as RevisionTask;
              localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(allRevisions));
            }

            // side effects
            const currentInterval = updated.interval_days;
            const intervalMap: Record<number, number> = { 1: 3, 3: 7, 7: 15, 15: 30, 30: 60, 60: 60 };
            const nextInterval = intervalMap[currentInterval] || 1;
            
            const nextDueDate = new Date();
            nextDueDate.setDate(nextDueDate.getDate() + nextInterval);
            const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

            const progress = await db.getTopicProgress();
            const topicProg = progress.find(p => p.subject_id === updated.subject_id && p.topic_name === updated.topic_name);
            
            const comp = topicProg?.completion_percentage || 0;
            const nextStatus = comp === 100 ? ((topicProg?.concept_clarity || 1) >= 8 ? 'Mastered' : 'Completed') : 'In Progress';

            await db.updateTopicProgress(updated.subject_id, updated.topic_name, {
              revision_count: (topicProg?.revision_count || 0) + 1,
              revision_due_date: nextDueDateStr,
              status: nextStatus
            });

            const nextRev = {
              subject_id: updated.subject_id,
              topic_name: updated.topic_name,
              interval_days: nextInterval,
              due_date: nextDueDateStr,
              status: 'Pending',
              completed_at: null,
              user_id: user.id
            };
            const { data: nextCreated } = await supabase.from('revisions').insert(nextRev).select().single();
            if (nextCreated) {
              const updatedRevisions = await db.getRevisions();
              updatedRevisions.push(nextCreated as RevisionTask);
              localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(updatedRevisions));
            }

            return updated as RevisionTask;
          }
        }
      }
    }
    
    const allRevisions = await db.getRevisions();
    const index = allRevisions.findIndex(r => r.id === id);
    if (index !== -1) {
      const updated = {
        ...allRevisions[index],
        status: 'Completed' as const,
        completed_at: getLocalDateString(new Date())
      };
      allRevisions[index] = updated;
      localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(allRevisions));
      
      // Side effect: update revision count in topic progress & reset due date
      const progress = await db.getTopicProgress();
      const topicProg = progress.find(p => p.subject_id === updated.subject_id && p.topic_name === updated.topic_name);
      
      // Calculate next spaced interval
      const currentInterval = updated.interval_days;
      const intervalMap: Record<number, number> = { 1: 3, 3: 7, 7: 15, 15: 30, 30: 60, 60: 60 };
      const nextInterval = intervalMap[currentInterval] || 1;
      
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + nextInterval);
      const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

      const comp = topicProg?.completion_percentage || 0;
      const nextStatus = comp === 100 ? ((topicProg?.concept_clarity || 1) >= 8 ? 'Mastered' : 'Completed') : 'In Progress';

      await db.updateTopicProgress(updated.subject_id, updated.topic_name, {
        revision_count: (topicProg?.revision_count || 0) + 1,
        revision_due_date: nextDueDateStr,
        status: nextStatus
      });

      // Schedule the next revision automatically
      const nextRev: RevisionTask = {
        id: Math.random().toString(36).substring(2, 9),
        subject_id: updated.subject_id,
        topic_name: updated.topic_name,
        interval_days: nextInterval,
        due_date: nextDueDateStr,
        status: 'Pending',
        completed_at: null
      };
      allRevisions.push(nextRev);
      localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(allRevisions));
    }
    return allRevisions[index];
  },

  scheduleRevision: async (subjectId: string, topicName: string, intervalDays: number): Promise<RevisionTask> => {
    const targetEmail = db.getCurrentUserEmail();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + intervalDays);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    
    const newRev: RevisionTask = {
      id: Math.random().toString(36).substring(2, 9),
      subject_id: subjectId,
      topic_name: topicName,
      interval_days: intervalDays,
      due_date: dueDateStr,
      status: 'Pending',
      completed_at: null
    };

    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('revisions').insert({
          subject_id: subjectId,
          topic_name: topicName,
          interval_days: intervalDays,
          due_date: dueDateStr,
          status: 'Pending',
          completed_at: null,
          user_id: user.id
        }).select().single();

        if (!error && data) {
          await db.updateTopicProgress(subjectId, topicName, {
            revision_due_date: dueDateStr,
            status: 'Needs Revision'
          });
          const allRevisions = await db.getRevisions();
          allRevisions.push(data as RevisionTask);
          localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(allRevisions));
          return data as RevisionTask;
        } else {
          console.error("scheduleRevision error", error);
        }
      }
    }

    const allRevisions = await db.getRevisions();
    allRevisions.push(newRev);
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(allRevisions));

    // Update topic progress due date
    await db.updateTopicProgress(subjectId, topicName, {
      revision_due_date: newRev.due_date,
      status: 'Needs Revision'
    });

    return newRev;
  },

  // 6. Notes
  getNotes: async (): Promise<Note[]> => {
    const targetEmail = db.getCurrentUserEmail();
    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('notes').select('*');
        if (!error && data) {
          if (data.length > 0) {
            localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.NOTES, targetEmail), JSON.stringify(data));
            return data as Note[];
          } else {
            const isSeeded = localStorage.getItem(`gateos_seeded_notes_${user.id}`);
            if (!isSeeded) {
              const initial = createInitialNotes(user.email!);
              const rowsToInsert = initial.map(n => ({
                subject_id: n.subject_id,
                topic_name: n.topic_name,
                content: n.content,
                user_id: user.id
              }));
              if (rowsToInsert.length > 0) {
                const { error: seedError } = await supabase.from('notes').insert(rowsToInsert);
                if (!seedError) {
                  localStorage.setItem(`gateos_seeded_notes_${user.id}`, 'true');
                  localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.NOTES, targetEmail), JSON.stringify(initial));
                  return initial;
                }
              } else {
                localStorage.setItem(`gateos_seeded_notes_${user.id}`, 'true');
                localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.NOTES, targetEmail), JSON.stringify([]));
                return [];
              }
            }
            return [];
          }
        }
      }
    }
    
    let notesStr = localStorage.getItem(getPartitionedKey(LOCAL_STORAGE_KEYS.NOTES, targetEmail));
    if (!notesStr) {
      const initial = createInitialNotes(targetEmail);
      localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.NOTES, targetEmail), JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(notesStr) as Note[];
  },

  saveNote: async (subjectId: string, topicName: string | null, content: string): Promise<Note> => {
    const targetEmail = db.getCurrentUserEmail();
    const newNote: Note = { subject_id: subjectId, topic_name: topicName, content };

    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('notes')
          .upsert({ 
            subject_id: subjectId,
            topic_name: topicName,
            content,
            user_id: user.id 
          })
          .select()
          .single();
        if (!error && data) {
          const allNotes = await db.getNotes();
          const index = allNotes.findIndex(n => n.subject_id === subjectId && n.topic_name === topicName);
          if (index !== -1) {
            allNotes[index] = data as Note;
          } else {
            allNotes.push(data as Note);
          }
          localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.NOTES, targetEmail), JSON.stringify(allNotes));
          return data as Note;
        }
        else console.error("saveNote error", error);
      }
    }

    const allNotes = await db.getNotes();
    const index = allNotes.findIndex(n => n.subject_id === subjectId && n.topic_name === topicName);
    
    if (index !== -1) {
      allNotes[index] = newNote;
    } else {
      allNotes.push(newNote);
    }
    
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.NOTES, targetEmail), JSON.stringify(allNotes));
    return newNote;
  },

  logManualRevision: async (subjectId: string, topicName: string, date: string): Promise<RevisionTask> => {
    const targetEmail = db.getCurrentUserEmail();
    const newRev: RevisionTask = {
      id: Math.random().toString(36).substring(2, 9),
      subject_id: subjectId,
      topic_name: topicName,
      interval_days: 0,
      due_date: date,
      status: 'Completed',
      completed_at: date
    };

    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('revisions').insert({
          subject_id: subjectId,
          topic_name: topicName,
          interval_days: 0,
          due_date: date,
          status: 'Completed',
          completed_at: date,
          user_id: user.id
        }).select().single();
        if (!error && data) {
          const progress = await db.getTopicProgress();
          const topicProg = progress.find(p => p.subject_id === subjectId && p.topic_name === topicName);
          
          const comp = topicProg?.completion_percentage || 0;
          const nextStatus = comp === 100 ? ((topicProg?.concept_clarity || 1) >= 8 ? 'Mastered' : 'Completed') : 'In Progress';

          await db.updateTopicProgress(subjectId, topicName, {
            revision_count: (topicProg?.revision_count || 0) + 1,
            last_studied_date: date,
            status: nextStatus
          });
          const allRevisions = await db.getRevisions();
          allRevisions.push(data as RevisionTask);
          localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(allRevisions));
          return data as RevisionTask;
        } else {
          console.error("logManualRevision error", error);
        }
      }
    }

    const allRevisions = await db.getRevisions();
    allRevisions.push(newRev);
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(allRevisions));

    const progress = await db.getTopicProgress();
    const topicProg = progress.find(p => p.subject_id === subjectId && p.topic_name === topicName);
    
    const comp = topicProg?.completion_percentage || 0;
    const nextStatus = comp === 100 ? ((topicProg?.concept_clarity || 1) >= 8 ? 'Mastered' : 'Completed') : 'In Progress';

    await db.updateTopicProgress(subjectId, topicName, {
      revision_count: (topicProg?.revision_count || 0) + 1,
      last_studied_date: date,
      status: nextStatus
    });

    return newRev;
  },

  deleteRevision: async (id: string): Promise<void> => {
    const targetEmail = db.getCurrentUserEmail();
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('revisions').delete().eq('id', id);
      if (!error) {
        const allRevisions = await db.getRevisions();
        const updated = allRevisions.filter(r => r.id !== id);
        localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(updated));
        return;
      }
      else console.error("deleteRevision error", error);
    }

    const allRevisions = await db.getRevisions();
    const updated = allRevisions.filter(r => r.id !== id);
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify(updated));
  },

  resetToCleanSlate: async (): Promise<void> => {
    const targetEmail = db.getCurrentUserEmail();
    // 1. Reset LocalStorage Data Arrays
    const cleanProgress = syllabus.flatMap(subject => 
      subject.topics.map(topic => ({
        subject_id: subject.id,
        topic_name: topic.name,
        status: 'Not Started' as const,
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
      }))
    );
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROGRESS, targetEmail), JSON.stringify(cleanProgress));
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.SESSIONS, targetEmail), JSON.stringify([]));
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.MOCK_TESTS, targetEmail), JSON.stringify([]));
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.REVISIONS, targetEmail), JSON.stringify([]));
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.NOTES, targetEmail), JSON.stringify([]));
    
    const isDemo = targetEmail === 'aspirant@gate2027.in';
    const defaultProfile = {
      id: 'user-id-local',
      email: targetEmail,
      display_name: targetEmail.split('@')[0],
      target_gate_score: isDemo ? 800 : 800,
      target_air: isDemo ? 100 : 100,
      daily_hours_goal: isDemo ? 4.0 : 4.0,
      weekly_hours_goal: isDemo ? 25.0 : 25.0,
      monthly_hours_goal: isDemo ? 100.0 : 100.0,
      streak_count: 0,
      last_active_date: null
    };
    localStorage.setItem(getPartitionedKey(LOCAL_STORAGE_KEYS.PROFILE, targetEmail), JSON.stringify(defaultProfile));

    // 2. Clear Supabase Tables
    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.setItem(`gateos_seeded_progress_${user.id}`, 'true');
        localStorage.setItem(`gateos_seeded_sessions_${user.id}`, 'true');
        localStorage.setItem(`gateos_seeded_mocks_${user.id}`, 'true');
        localStorage.setItem(`gateos_seeded_revisions_${user.id}`, 'true');
        localStorage.setItem(`gateos_seeded_notes_${user.id}`, 'true');

        await supabase.from('topic_progress').delete().eq('user_id', user.id);
        
        const cleanRows = cleanProgress.map(p => ({
          ...p,
          user_id: user.id
        }));
        await supabase.from('topic_progress').insert(cleanRows);

        await supabase.from('study_sessions').delete().eq('user_id', user.id);
        await supabase.from('mock_tests').delete().eq('user_id', user.id);
        await supabase.from('revisions').delete().eq('user_id', user.id);
        await supabase.from('notes').delete().eq('user_id', user.id);
        await supabase.from('profiles').update({
          target_gate_score: 800,
          target_air: 100,
          daily_hours_goal: 4.0,
          weekly_hours_goal: 25.0,
          monthly_hours_goal: 100.0,
          streak_count: 0,
          last_active_date: null
        }).eq('id', user.id);
      }
    }
  },

  signUpUser: async (email: string, password: string, name: string): Promise<{ success: boolean; message: string; emailConfirmationRequired?: boolean }> => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
              display_name: name
            }
          }
        });
        
        if (error) {
          if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
            return { success: false, message: 'An account with this email already exists. Please sign in instead.' };
          }
          return { success: false, message: error.message };
        }
        
        if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
          return { success: false, message: 'An account with this email already exists. Please sign in instead.' };
        }
        
        if (data.user && !data.session) {
          // Email confirmation is required by Supabase config
          return { 
            success: true, 
            emailConfirmationRequired: true, 
            message: 'Account created! A verification email has been sent. Please confirm your email address in your inbox before signing in.' 
          };
        }
        
        db.loginUser(email, name);
        return { success: true, message: 'Account created successfully.' };
      } catch (err: any) {
        console.error("signUpUser exception", err);
        return { success: false, message: err.message || 'An error occurred during signup.' };
      }
    } else {
      if (checkLocalUserExists(email)) {
        return { success: false, message: 'An account with this email already exists. Please sign in instead.' };
      }
      db.loginUser(email, name);
      return { success: true, message: 'Account created successfully (offline mode).' };
    }
  },

  signInUser: async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          const errMsg = error.message.toLowerCase();
          if (errMsg.includes('invalid login credentials')) {
            try {
              const { data: exists, error: rpcError } = await supabase.rpc('check_email_exists', { email_to_check: email });
              if (!rpcError && exists === false) {
                return { success: false, message: 'No account found with this email. Please sign up first.' };
              }
            } catch (rpcErr) {
              console.warn("RPC check_email_exists failed or is missing", rpcErr);
            }
            return { success: false, message: 'Invalid email or password. (Note: if you are a new user, please sign up first).' };
          }
          if (errMsg.includes('email not confirmed') || errMsg.includes('email not verified')) {
            return { success: false, message: 'Email address not verified yet. Please check your inbox and confirm your email before signing in.' };
          }
          return { success: false, message: error.message };
        }
        
        db.loginUser(email, data.user?.user_metadata?.display_name || data.user?.user_metadata?.name || email.split('@')[0]);
        return { success: true, message: 'Login successful.' };
      } catch (err: any) {
        console.error("signInUser exception", err);
        return { success: false, message: err.message || 'An error occurred during login.' };
      }
    } else {
      if (!checkLocalUserExists(email)) {
        return { success: false, message: 'No account found with this email. Please sign up first.' };
      }
      db.loginUser(email);
      return { success: true, message: 'Login successful (offline mode).' };
    }
  }
};
