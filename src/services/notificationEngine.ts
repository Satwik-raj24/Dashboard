// Smart Notification Engine for GATEOS 2027
// Persists settings and history in localStorage to avoid modifying database schemas.

import { Profile, TopicProgress, MockTest, RevisionTask, StudySession, getLocalDateString } from './db';
import { syllabus } from './syllabusData';
import { calculateTopicPriority } from './priorityEngine';
import { calculateReadiness } from './readinessEngine';
import { predictAIR } from './predictionEngine';

export interface NotificationPreferences {
  dailyGoalReminder: boolean;
  revisionReminder: boolean;
  criticalTopicAlert: boolean;
  weeklyReport: boolean;
  mockReminder: boolean;
  airUpdates: boolean;
  milestones: boolean;
  dailyReminderTime: string; // E.g., "19:00"
  revisionReminderTime: string; // E.g., "20:30"
}

export interface GateNotification {
  id: string;
  title: string;
  message: string;
  type: 'dailyGoal' | 'revision' | 'critical' | 'weeklyReport' | 'streak' | 'milestone' | 'mockReminder' | 'todayFocus';
  timestamp: string; // ISO string
  read: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  dailyGoalReminder: true,
  revisionReminder: true,
  criticalTopicAlert: true,
  weeklyReport: true,
  mockReminder: true,
  airUpdates: true,
  milestones: true,
  dailyReminderTime: '19:00',
  revisionReminderTime: '20:30',
};

// Key helper to get today's date string
function getTodayDateStr(): string {
  return getLocalDateString(new Date());
}

export const notificationEngine = {
  getPreferences(): NotificationPreferences {
    const data = localStorage.getItem('gateos_notification_prefs');
    if (!data) return DEFAULT_PREFS;
    try {
      return { ...DEFAULT_PREFS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_PREFS;
    }
  },

  savePreferences(prefs: NotificationPreferences): void {
    localStorage.setItem('gateos_notification_prefs', JSON.stringify(prefs));
  },

  getHistory(): GateNotification[] {
    const data = localStorage.getItem('gateos_notification_history');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveHistory(history: GateNotification[]): void {
    localStorage.setItem('gateos_notification_history', JSON.stringify(history));
  },

  clearHistory(): void {
    localStorage.removeItem('gateos_notification_history');
  },

  markAsRead(id: string): void {
    const history = this.getHistory();
    const updated = history.map(n => n.id === id ? { ...n, read: true } : n);
    this.saveHistory(updated);
  },

  markAllAsRead(): void {
    const history = this.getHistory();
    const updated = history.map(n => ({ ...n, read: true }));
    this.saveHistory(updated);
  },

  triggerBrowserNotification(title: string, message: string): void {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
        });
      } catch (err) {
        console.error('Failed to trigger native notification', err);
      }
    }
  },

  addNotification(
    title: string,
    message: string,
    type: GateNotification['type']
  ): GateNotification {
    const history = this.getHistory();
    const newNotif: GateNotification = {
      id: Math.random().toString(36).substring(2, 11),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    // Add to beginning of history list (capped at 50 to conserve localStorage)
    const updated = [newNotif, ...history].slice(0, 50);
    this.saveHistory(updated);
    this.triggerBrowserNotification(title, message);
    return newNotif;
  },

  // Runs all metrics checks and returns any newly triggered notifications (to display as toasts in the UI)
  checkAndGenerate(
    profile: Profile,
    progress: TopicProgress[],
    sessions: StudySession[],
    mocks: MockTest[],
    revisions: RevisionTask[]
  ): GateNotification[] {
    const prefs = this.getPreferences();
    const today = getTodayDateStr();
    
    // Get last triggered dates to avoid spamming same notification type in one day
    const lastTriggeredStr = localStorage.getItem('gateos_last_triggered');
    const lastTriggered: Record<string, string> = lastTriggeredStr ? JSON.parse(lastTriggeredStr) : {};
    
    const newNotifications: GateNotification[] = [];
    const recordTrigger = (key: string) => {
      lastTriggered[key] = today;
      localStorage.setItem('gateos_last_triggered', JSON.stringify(lastTriggered));
    };

    // 1. STREAK PROTECTION (Checked if evening: after 6 PM, or if no study sessions today)
    const todaySessions = sessions.filter(s => getLocalDateString(s.created_at) === today);
    const hasStudiedToday = todaySessions.length > 0;
    const currentHour = new Date().getHours();
    
    if (!hasStudiedToday && currentHour >= 18 && lastTriggered['streak'] !== today) {
      const streak = profile.streak_count || 0;
      if (streak > 0) {
        const notif = this.addNotification(
          '🔥 Protect Your Streak',
          `You have not studied today. Current streak: ${streak} days. Log a session to keep it alive!`,
          'streak'
        );
        newNotifications.push(notif);
        recordTrigger('streak');
      }
    }

    // 2. DAILY STUDY GOAL REMINDER
    if (prefs.dailyGoalReminder && lastTriggered['dailyGoal'] !== today) {
      // Calculate today's study hours
      const todaySeconds = todaySessions.reduce((sum, s) => sum + s.duration_seconds, 0);
      const todayHours = Math.round((todaySeconds / 3600) * 10) / 10;
      const targetHours = profile.daily_hours_goal || 4.0;
      
      // Trigger if user is below target and it's past 7 PM (or custom set time)
      const dailyTime = prefs.dailyReminderTime.split(':');
      const targetHour = parseInt(dailyTime[0]) || 19;
      const targetMinute = parseInt(dailyTime[1]) || 0;
      
      if (todayHours < targetHours && (currentHour > targetHour || (currentHour === targetHour && new Date().getMinutes() >= targetMinute))) {
        // Recommend a topic from priority queue
        const recommendedTopic = this.getRecommendedTopic(progress, revisions);
        const remaining = Math.round((targetHours - todayHours) * 10) / 10;
        
        const notif = this.addNotification(
          '🔔 Daily Goal Reminder',
          `You have completed ${todayHours} / ${targetHours} hours today.\nRemaining: ${remaining} hours.\nRecommended focus: ${recommendedTopic}`,
          'dailyGoal'
        );
        newNotifications.push(notif);
        recordTrigger('dailyGoal');
      }
    }

    // 3. REVISION DUE REMINDER
    if (prefs.revisionReminder && lastTriggered['revision'] !== today) {
      const revisionTime = prefs.revisionReminderTime.split(':');
      const targetHour = parseInt(revisionTime[0]) || 20;
      const targetMinute = parseInt(revisionTime[1]) || 30;

      if (currentHour > targetHour || (currentHour === targetHour && new Date().getMinutes() >= targetMinute)) {
        const dueRevisions = revisions.filter(r => r.status === 'Pending' && r.due_date <= today);
        if (dueRevisions.length > 0) {
          const listStr = dueRevisions.slice(0, 3).map(r => `• ${r.topic_name}`).join('\n');
          const count = dueRevisions.length;
          
          const notif = this.addNotification(
            '🔔 Revision Due',
            `Topics waiting:\n${listStr}\n${count} topic${count > 1 ? 's require' : ' requires'} revision today.`,
            'revision'
          );
          newNotifications.push(notif);
          recordTrigger('revision');
        }
      }
    }

    // 4. CRITICAL TOPIC ALERT
    if (prefs.criticalTopicAlert && lastTriggered['critical'] !== today) {
      // Find critical topics that are under 50% completed
      const criticalTopics: Array<{ topic: TopicProgress; marks: number }> = [];
      progress.forEach(tp => {
        if (tp.completion_percentage < 50) {
          const subject = syllabus.find(s => s.id === tp.subject_id);
          if (subject) {
            const priorityInfo = calculateTopicPriority(tp, subject.weightage, revisions);
            if (priorityInfo.priority === 'Critical') {
              // Estimate potential marks lost: (1 - completion) * (subject weightage / topic count)
              const topicCount = subject.id === 'ga'
                ? subject.topics.reduce((sum, t) => sum + t.subtopics.length, 0)
                : subject.topics.length;
              const weight = subject.weightage || 5;
              const lost = Math.round((1 - (tp.completion_percentage / 100)) * (weight / topicCount) * 10) / 10;
              criticalTopics.push({ topic: tp, marks: lost });
            }
          }
        }
      });

      if (criticalTopics.length > 0) {
        // Sort by marks lost descending
        criticalTopics.sort((a, b) => b.marks - a.marks);
        const target = criticalTopics[0];
        const subjectName = syllabus.find(s => s.id === target.topic.subject_id)?.name || target.topic.subject_id;
        
        const notif = this.addNotification(
          '🔔 Critical Topic Alert',
          `${subjectName} → ${target.topic.topic_name}: Only ${target.topic.completion_percentage}% completed.\nPotential marks being lost: ${target.marks} marks.`,
          'critical'
        );
        newNotifications.push(notif);
        recordTrigger('critical');
      }
    }

    // 5. MOCK TEST REMINDER
    if (prefs.mockReminder && lastTriggered['mockReminder'] !== today) {
      let lastMockDays = 999;
      if (mocks.length > 0) {
        // Sort mocks by date descending
        const sortedMocks = [...mocks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastMockDate = new Date(sortedMocks[0].date);
        const diffTime = Math.abs(new Date().getTime() - lastMockDate.getTime());
        lastMockDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      if (lastMockDays > 7) {
        const notif = this.addNotification(
          '📝 Mock Test Reminder',
          `You have not attempted a mock test in ${lastMockDays === 999 ? 'many' : lastMockDays} days. Keep practicing to gauge your readiness.`,
          'mockReminder'
        );
        newNotifications.push(notif);
        recordTrigger('mockReminder');
      }
    }

    // 6. WEEKLY PROGRESS REPORT (Triggers only on Sundays)
    if (prefs.weeklyReport && new Date().getDay() === 0 && lastTriggered['weeklyReport'] !== today) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const weeklySessions = sessions.filter(s => new Date(s.created_at) >= oneWeekAgo);
      const studyHours = Math.round((weeklySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600) * 10) / 10;
      
      // Calculate PYQs Practiced (from study session notes matching [PYQ Practice])
      const pyqSessionsCount = weeklySessions.filter(s => s.notes.includes('[PYQ Practice]')).length;
      const pyqsEstimated = pyqSessionsCount * 15; // Estimate 15 PYQs per session as robust fallback

      // Fetch current AIR & Readiness
      const readinessObj = calculateReadiness(profile, progress, sessions, mocks, revisions);
      const predictionObj = predictAIR(progress, mocks, revisions);

      const notif = this.addNotification(
        '📊 Weekly Report',
        `Study Hours: ${studyHours}\nEstimated PYQs Solved: ${pyqsEstimated}\nReadiness Increase: +${readinessObj.monthlyImprovement}%\nCurrent predicted AIR: #${predictionObj.expectedRank}\nTarget AIR: #${profile.target_air}`,
        'weeklyReport'
      );
      newNotifications.push(notif);
      recordTrigger('weeklyReport');
    }

    // 7. MISSION CONTROL ALERTS (AIR updates & Milestone checks)
    // Check if predicted rank has improved compared to last stored rank
    const lastKnownRankStr = localStorage.getItem('gateos_last_known_rank');
    const currentPrediction = predictAIR(progress, mocks, revisions);
    const currentRank = currentPrediction.expectedRank;

    if (prefs.airUpdates && lastKnownRankStr) {
      const lastRank = parseInt(lastKnownRankStr);
      if (currentRank < lastRank) {
        const notif = this.addNotification(
          '🎉 AIR Prediction Improved!',
          `Your predicted AIR has improved from #${lastRank} to #${currentRank}! Keep up the momentum.`,
          'milestone'
        );
        newNotifications.push(notif);
      }
    }
    localStorage.setItem('gateos_last_known_rank', currentRank.toString());

    // Check if readiness has increased
    const lastReadinessStr = localStorage.getItem('gateos_last_known_readiness');
    const currentReadinessObj = calculateReadiness(profile, progress, sessions, mocks, revisions);
    const currentReadiness = currentReadinessObj.overall;

    if (prefs.airUpdates && lastReadinessStr) {
      const lastReadiness = parseFloat(lastReadinessStr);
      if (currentReadiness > lastReadiness + 1.5) { // Notify on significant readiness jumps (>1.5%)
        const notif = this.addNotification(
          '⚡ Readiness Level Increased',
          `Your overall syllabus readiness score jumped to ${currentReadiness}% (+${Math.round((currentReadiness - lastReadiness) * 10)/10}%).`,
          'milestone'
        );
        newNotifications.push(notif);
      }
    }
    localStorage.setItem('gateos_last_known_readiness', currentReadiness.toString());

    // Check if a subject has become "Strong"
    if (prefs.milestones) {
      const strongSubjectsStr = localStorage.getItem('gateos_strong_subjects');
      const strongSubjects: string[] = strongSubjectsStr ? JSON.parse(strongSubjectsStr) : [];
      const newlyStrong: string[] = [];

      syllabus.forEach(sub => {
        const subProgress = progress.filter(p => p.subject_id === sub.id);
        const studied = subProgress.filter(p => p.status !== 'Not Started');
        
        // Completion
        const completedCount = subProgress.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
        const totalCount = sub.id === 'ga'
          ? sub.topics.reduce((sum, t) => sum + t.subtopics.length, 0)
          : (sub.topics.length || 1);
        const completionPercent = Math.round((completedCount / totalCount) * 100);

        // Clarity
        const clarityAvg = studied.length > 0
          ? (studied.reduce((sum, p) => sum + p.concept_clarity, 0) / studied.length)
          : 0;

        // "Strong" is defined as completion >= 80% and concept clarity >= 7.5
        if (completionPercent >= 80 && clarityAvg >= 7.5) {
          if (!strongSubjects.includes(sub.id)) {
            strongSubjects.push(sub.id);
            newlyStrong.push(sub.name);
          }
        }
      });

      if (newlyStrong.length > 0) {
        localStorage.setItem('gateos_strong_subjects', JSON.stringify(strongSubjects));
        newlyStrong.forEach(subName => {
          const notif = this.addNotification(
            '🎉 Milestone Reached',
            `${subName} has reached Strong status. Excellent progress!`,
            'milestone'
          );
          newNotifications.push(notif);
        });
      }
    }

    // 8. AI TODAY'S FOCUS REMINDER (Once a day on load)
    if (lastTriggered['todayFocus'] !== today) {
      const focusAgenda = this.generateTodayFocus(progress, revisions, profile);
      if (focusAgenda) {
        const notif = this.addNotification(
          "🔔 Today's Focus",
          `1. Finish ${focusAgenda.finishTopic}\n2. Solve ${focusAgenda.solvePyqTopic}\n3. Revise ${focusAgenda.reviseTopic}\n\nEstimated Time: ${focusAgenda.estimatedTime}`,
          'todayFocus'
        );
        newNotifications.push(notif);
        recordTrigger('todayFocus');
      }
    }

    return newNotifications;
  },

  getRecommendedTopic(progress: TopicProgress[], revisions: RevisionTask[]): string {
    const uncompleted = progress.filter(p => p.completion_percentage < 100);
    if (uncompleted.length === 0) return 'Practice Mock Exams';
    
    // Sort by priority score
    const scored = uncompleted.map(tp => {
      const subject = syllabus.find(s => s.id === tp.subject_id);
      const weight = subject?.weightage || 5;
      const priority = calculateTopicPriority(tp, weight, revisions);
      return { tp, priority };
    }).sort((a, b) => b.priority.score - a.priority.score);

    const target = scored[0].tp;
    const subjectName = syllabus.find(s => s.id === target.subject_id)?.name || target.subject_id;
    return `${subjectName} → ${target.topic_name}`;
  },

  generateTodayFocus(
    progress: TopicProgress[],
    revisions: RevisionTask[],
    profile: Profile
  ) {
    const uncompleted = progress.filter(p => p.completion_percentage < 100);
    if (uncompleted.length === 0) return null;

    // Sort by priority score
    const scored = uncompleted.map(tp => {
      const subject = syllabus.find(s => s.id === tp.subject_id);
      const weight = subject?.weightage || 5;
      const priority = calculateTopicPriority(tp, weight, revisions);
      return { tp, score: priority.score };
    }).sort((a, b) => b.score - a.score);

    // 1. Uncompleted topic to finish
    const finishTopicObj = scored[0]?.tp;
    const finishSubName = syllabus.find(s => s.id === finishTopicObj?.subject_id)?.name || '';
    const finishTopic = finishTopicObj ? `${finishSubName} → ${finishTopicObj.topic_name}` : 'Syllabus Review';

    // 2. PYQ Practice topic
    const needPracticeObj = progress.find(p => p.completion_percentage > 20 && p.pyqs_solved < p.pyqs_total / 2) || finishTopicObj;
    const practiceSubName = syllabus.find(s => s.id === needPracticeObj?.subject_id)?.name || '';
    const pyqsCount = Math.max(10, Math.min(20, (needPracticeObj?.pyqs_total || 20) - (needPracticeObj?.pyqs_solved || 0)));
    const solvePyqTopic = needPracticeObj ? `${pyqsCount} ${needPracticeObj.topic_name} PYQs` : '20 Mixed Topic PYQs';

    // 3. Revision due topic
    const dueRevObj = revisions.find(r => r.status === 'Pending');
    const reviseTopic = dueRevObj ? dueRevObj.topic_name : (progress.find(p => p.status === 'Needs Revision')?.topic_name || 'Key Formulas');

    // Estimating focus time
    const targetHours = profile.daily_hours_goal || 4.0;
    const hours = Math.floor(targetHours);
    const minutes = Math.round((targetHours - hours) * 60);
    const estimatedTime = `${hours}h ${minutes > 0 ? minutes + 'm' : '00m'}`;

    return {
      finishTopic,
      solvePyqTopic,
      reviseTopic,
      estimatedTime,
    };
  }
};
