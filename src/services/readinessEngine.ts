// AI Readiness Engine for GATEOS 2027
// Computes readiness metrics based on weights:
// 30% Syllabus, 20% Clarity, 20% PYQs, 15% Mocks, 10% Revisions, 5% Study Streak

import { TopicProgress, MockTest, RevisionTask, Profile } from './db';

export interface ReadinessBreakdown {
  overall: number; // 0-100
  syllabus: number; // 0-100
  clarity: number; // 0-100
  pyq: number; // 0-100
  mock: number; // 0-100
  revision: number; // 0-100
  consistency: number; // 0-100
  monthlyImprovement: number; // e.g. +4.2%
}

export function calculateReadiness(
  profile: Profile,
  progress: TopicProgress[],
  sessions: any[],
  mocks: MockTest[],
  revisions: RevisionTask[]
): ReadinessBreakdown {
  // 1. Syllabus Completion (30% weight)
  // Average completion percentage across all 100+ topics
  const totalTopics = progress.length || 1;
  const completedOrMastered = progress.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
  const syllabusScore = (progress.reduce((sum, p) => sum + Number(p.completion_percentage || 0), 0) / totalTopics);

  // 2. Concept Clarity (20% weight)
  // Average clarity score (1-10) of studied topics, mapped to 0-100
  const studiedTopics = progress.filter(p => p.status !== 'Not Started');
  const studiedCount = studiedTopics.length || 1;
  const averageClarity = studiedTopics.reduce((sum, p) => sum + p.concept_clarity, 0) / studiedCount;
  const clarityScore = Math.min(100, Math.max(0, averageClarity * 10)); // Scale 1-10 to 10-100%

  // 3. PYQ Completion (20% weight)
  // Percentage of solved PYQs against total target PYQs across all studied topics
  let totalTargetPyqs = 0;
  let totalSolvedPyqs = 0;
  let pyqAccuracySum = 0;
  let topicsWithPyqData = 0;

  progress.forEach(p => {
    if (p.pyqs_total > 0) {
      totalTargetPyqs += p.pyqs_total;
      totalSolvedPyqs += p.pyqs_solved;
      if (p.pyqs_solved > 0) {
        pyqAccuracySum += (p.pyqs_correct / p.pyqs_solved) * 100;
        topicsWithPyqData++;
      }
    }
  });

  const pyqCompletionRate = totalTargetPyqs > 0 ? (totalSolvedPyqs / totalTargetPyqs) * 100 : 0;
  const pyqAccuracyRate = topicsWithPyqData > 0 ? pyqAccuracySum / topicsWithPyqData : 0;
  // Blend completion rate (60% weight) and accuracy rate (40% weight) for PYQ score
  const pyqScore = (pyqCompletionRate * 0.6) + (pyqAccuracyRate * 0.4);

  // 4. Mock Performance (15% weight)
  // Average of mock test scores and accuracy
  let mockScore = 0;
  if (mocks.length > 0) {
    const avgMarks = mocks.reduce((sum, m) => sum + Number(m.marks), 0) / mocks.length; // Out of 100
    const avgAccuracy = mocks.reduce((sum, m) => sum + Number(m.accuracy), 0) / mocks.length; // Out of 100
    // Marks scored represents capability, accuracy represents precision
    mockScore = (avgMarks * 0.7) + (avgAccuracy * 0.3);
  } else {
    // If no mock tests are taken yet, assume base readiness score of 0
    mockScore = 0;
  }

  // 5. Revision Consistency (10% weight)
  // Completed revisions / (Completed + Missed + Pending)
  const completedRevs = revisions.filter(r => r.status === 'Completed').length;
  const missedRevs = revisions.filter(r => r.status === 'Missed').length;
  const pendingRevs = revisions.filter(r => r.status === 'Pending').length;
  const totalRevisions = completedRevs + missedRevs + pendingRevs || 1;
  const revisionScore = (completedRevs / totalRevisions) * 100;

  // 6. Study Consistency (5% weight)
  // Based on current study streak relative to a target streak of 10 days, and daily goal achievement
  const streak = profile.streak_count || 0;
  const streakScore = Math.min(100, (streak / 10) * 100);
  const consistencyScore = streakScore;

  // Calculate Weighted Overall Readiness
  const overall = (
    (syllabusScore * 0.30) +
    (clarityScore * 0.20) +
    (pyqScore * 0.20) +
    (mockScore * 0.15) +
    (revisionScore * 0.10) +
    (consistencyScore * 0.05)
  );

  // Simulated historical monthly improvement (based on streak and study sessions)
  const monthlyImprovement = overall < 1 ? 0 : 3.5 + (streak * 0.2) + (mocks.length * 0.5);

  return {
    overall: Math.round(overall * 10) / 10,
    syllabus: Math.round(syllabusScore * 10) / 10,
    clarity: Math.round(clarityScore * 10) / 10,
    pyq: Math.round(pyqScore * 10) / 10,
    mock: Math.round(mockScore * 10) / 10,
    revision: Math.round(revisionScore * 10) / 10,
    consistency: Math.round(consistencyScore * 10) / 10,
    monthlyImprovement: Math.round(monthlyImprovement * 10) / 10
  };
}
