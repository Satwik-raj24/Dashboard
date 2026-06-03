// AI Mentor Engine for GATEOS 2027
// Generates smart insights, warning flags, and syllabus projections

import { TopicProgress, MockTest, RevisionTask, StudySession } from './db';
import { syllabus } from './syllabusData';

export interface MentorInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'action';
  message: string;
  category: string;
}

export function generateMentorInsights(
  progress: TopicProgress[],
  mocks: MockTest[],
  revisions: RevisionTask[],
  sessions: StudySession[]
): { insights: MentorInsight[]; completionDate: string } {
  const insights: MentorInsight[] = [];

  // 1. Check for Weakest Topic (Low accuracy or low concept clarity)
  const studiedTopics = progress.filter(p => p.status !== 'Not Started');
  let weakestTopic: TopicProgress | null = null;
  let lowestScore = 11;

  studiedTopics.forEach(p => {
    // Score based on clarity (1-10) and pyq accuracy (1-10 equivalent)
    const accuracyScale = p.pyqs_solved > 0 ? (p.pyqs_correct / p.pyqs_solved) * 10 : 5;
    const combinedScore = (p.concept_clarity * 0.6) + (accuracyScale * 0.4);
    if (combinedScore < lowestScore) {
      lowestScore = combinedScore;
      weakestTopic = p;
    }
  });

  if (weakestTopic) {
    const topic = weakestTopic as TopicProgress;
    const subj = syllabus.find(s => s.id === topic.subject_id);
    insights.push({
      id: 'weak-topic',
      type: 'warning',
      message: `Your weakest topic is "${topic.topic_name}" in ${subj?.name || ''}. Clarity rating is only ${topic.concept_clarity}/10.`,
      category: 'Concept Strength'
    });
  }

  // 2. Check for Missed or Long-Pending Revisions
  const missed = revisions.filter(r => r.status === 'Missed');
  const dueToday = revisions.filter(r => {
    if (r.status !== 'Pending') return false;
    const today = new Date().toISOString().split('T')[0];
    return r.due_date <= today;
  });

  if (missed.length > 0) {
    insights.push({
      id: 'missed-revision',
      type: 'action',
      message: `You have ${missed.length} missed revisions. Critical: Revise "${missed[0].topic_name}" immediately to lock it into long-term memory.`,
      category: 'Revision Queue'
    });
  } else if (dueToday.length > 0) {
    insights.push({
      id: 'due-revision',
      type: 'info',
      message: `You have ${dueToday.length} revision tasks due today. Complete them to maintain your spaced repetition schedule.`,
      category: 'Revision Queue'
    });
  } else {
    insights.push({
      id: 'rev-good',
      type: 'success',
      message: "Excellent job keeping up with your revision schedule. No missed tasks!",
      category: 'Revision Queue'
    });
  }

  // 3. PYQ Solved Recommendation
  const totalSolvedPyqs = progress.reduce((sum, p) => sum + p.pyqs_solved, 0);
  if (totalSolvedPyqs < 100) {
    insights.push({
      id: 'pyq-need',
      type: 'action',
      message: `You have solved ${totalSolvedPyqs} PYQs so far. Target at least 25 more PYQs in high-weightage subjects like Algorithms and TOC.`,
      category: 'Practice Goal'
    });
  } else {
    insights.push({
      id: 'pyq-ok',
      type: 'success',
      message: `Smashed past the 100+ PYQs benchmark! Current solved count: ${totalSolvedPyqs}. Keep analyzing wrong answers.`,
      category: 'Practice Goal'
    });
  }

  // 4. Study Hours velocity & projected syllabus completion
  // Total topics = ~120. Complete = status in ('Completed', 'Mastered')
  const completedTopics = progress.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
  const totalTopicsCount = progress.length || 1;
  const syllabusPercent = (completedTopics / totalTopicsCount) * 100;

  let completionDateStr = 'December 12, 2026';
  
  if (sessions.length > 3) {
    // Calculate study speed over the last 15 days
    const totalDurationSeconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
    const totalHours = totalDurationSeconds / 3600;
    
    // Estimate hours needed to finish remaining syllabus
    // Assume 120 topics, each takes about 4 hours on average (480 hours total)
    const averageHoursPerTopic = 4;
    const remainingTopics = totalTopicsCount - completedTopics;
    const estimatedHoursNeeded = remainingTopics * averageHoursPerTopic;
    
    // Calculate average study hours per day (looking at date range of sessions)
    const dates = sessions.map(s => new Date(s.created_at).getTime());
    const minDate = Math.min(...dates);
    const maxDate = new Date().getTime();
    const diffDays = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24));
    const avgHoursPerDay = Math.max(1.5, totalHours / diffDays); // cap at min 1.5 hours/day
    
    const daysToComplete = estimatedHoursNeeded / avgHoursPerDay;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysToComplete);
    
    // Format completion date
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    completionDateStr = completionDate.toLocaleDateString('en-US', options);
    
    insights.push({
      id: 'velocity-projection',
      type: 'info',
      message: `At your current pace of ${avgHoursPerDay.toFixed(1)} hrs/day, you are projected to complete the syllabus on ${completionDateStr}.`,
      category: 'Timeline'
    });
  } else {
    insights.push({
      id: 'velocity-placeholder',
      type: 'info',
      message: "Log more study sessions to generate a personalized syllabus completion date projection.",
      category: 'Timeline'
    });
  }

  // 5. Subject Specific Recommendation (e.g. Operating Systems)
  const osProgress = progress.filter(p => p.subject_id === 'os');
  const osStudied = osProgress.filter(p => p.status !== 'Not Started');
  if (osStudied.length > 0) {
    const osClarity = osStudied.reduce((sum, p) => sum + p.concept_clarity, 0) / osStudied.length;
    if (osClarity < 7) {
      insights.push({
        id: 'os-reco',
        type: 'warning',
        message: `Your Operating Systems readiness is average (${Math.round(osClarity * 10)}%). Complete more memory management and semaphore exercises.`,
        category: 'Subject Drill'
      });
    }
  }

  return {
    insights,
    completionDate: completionDateStr
  };
}
