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
  technicalReadiness: number; // 0-100 (CS technical subjects)
  aptitudeReadiness: number;  // 0-100 (General Aptitude subject)
}

export function calculateReadiness(
  profile: Profile,
  progress: TopicProgress[],
  sessions: any[],
  mocks: MockTest[],
  revisions: RevisionTask[]
): ReadinessBreakdown {
  // Split progress
  const techProgress = progress.filter(p => p.subject_id !== 'ga');
  const gaProgress = progress.filter(p => p.subject_id === 'ga');

  const streak = profile.streak_count || 0;
  const consistencyScore = Math.min(100, (streak / 10) * 100);

  // Mocks score (shared or primarily tech)
  let mockScore = 0;
  if (mocks.length > 0) {
    const avgMarks = mocks.reduce((sum, m) => sum + Number(m.marks), 0) / mocks.length;
    const avgAccuracy = mocks.reduce((sum, m) => sum + Number(m.accuracy), 0) / mocks.length;
    mockScore = (avgMarks * 0.7) + (avgAccuracy * 0.3);
  }

  // --- Calculate Technical Readiness ---
  const techTopicsCount = techProgress.length || 1;
  const techSyllabusScore = techProgress.reduce((sum, p) => sum + Number(p.completion_percentage || 0), 0) / techTopicsCount;

  const techStudied = techProgress.filter(p => p.status !== 'Not Started');
  const techClarityScore = techStudied.length > 0
    ? Math.min(100, (techStudied.reduce((sum, p) => sum + p.concept_clarity, 0) / techStudied.length) * 10)
    : 0;

  let techTargetPyqs = 0;
  let techSolvedPyqs = 0;
  let techPyqAccuracySum = 0;
  let techTopicsWithPyq = 0;
  techProgress.forEach(p => {
    if (p.pyqs_total > 0) {
      techTargetPyqs += p.pyqs_total;
      techSolvedPyqs += p.pyqs_solved;
      if (p.pyqs_solved > 0) {
        techPyqAccuracySum += (p.pyqs_correct / p.pyqs_solved) * 100;
        techTopicsWithPyq++;
      }
    }
  });
  const techPyqCompletionRate = techTargetPyqs > 0 ? (techSolvedPyqs / techTargetPyqs) * 100 : 0;
  const techPyqAccuracyRate = techTopicsWithPyq > 0 ? techPyqAccuracySum / techTopicsWithPyq : 0;
  const techPyqScore = (techPyqCompletionRate * 0.6) + (techPyqAccuracyRate * 0.4);

  const techRevisionsList = revisions.filter(r => r.subject_id !== 'ga');
  const techCompletedRevs = techRevisionsList.filter(r => r.status === 'Completed').length;
  const techTotalRevisions = techRevisionsList.length || 1;
  const techRevisionScore = (techCompletedRevs / techTotalRevisions) * 100;

  const technicalReadiness = (
    (techSyllabusScore * 0.30) +
    (techClarityScore * 0.20) +
    (techPyqScore * 0.20) +
    (mockScore * 0.15) +
    (techRevisionScore * 0.10) +
    (consistencyScore * 0.05)
  );

  // --- Calculate Aptitude Readiness ---
  const gaTopicsCount = gaProgress.length || 1;
  const gaSyllabusScore = gaProgress.reduce((sum, p) => sum + Number(p.completion_percentage || 0), 0) / gaTopicsCount;

  const gaStudied = gaProgress.filter(p => p.status !== 'Not Started');
  const gaClarityScore = gaStudied.length > 0
    ? Math.min(100, (gaStudied.reduce((sum, p) => sum + p.concept_clarity, 0) / gaStudied.length) * 10)
    : 0;

  let gaTargetPyqs = 0;
  let gaSolvedPyqs = 0;
  let gaPyqAccuracySum = 0;
  let gaTopicsWithPyq = 0;
  gaProgress.forEach(p => {
    if (p.pyqs_total > 0) {
      gaTargetPyqs += p.pyqs_total;
      gaSolvedPyqs += p.pyqs_solved;
      if (p.pyqs_solved > 0) {
        gaPyqAccuracySum += (p.pyqs_correct / p.pyqs_solved) * 100;
        gaTopicsWithPyq++;
      }
    }
  });
  const gaPyqCompletionRate = gaTargetPyqs > 0 ? (gaSolvedPyqs / gaTargetPyqs) * 100 : 0;
  const gaPyqAccuracyRate = gaTopicsWithPyq > 0 ? gaPyqAccuracySum / gaTopicsWithPyq : 0;
  const gaPyqScore = (gaPyqCompletionRate * 0.6) + (gaPyqAccuracyRate * 0.4);

  const gaRevisionsList = revisions.filter(r => r.subject_id === 'ga');
  const gaCompletedRevs = gaRevisionsList.filter(r => r.status === 'Completed').length;
  const gaTotalRevisions = gaRevisionsList.length || 1;
  const gaRevisionScore = (gaCompletedRevs / gaTotalRevisions) * 100;

  const aptitudeReadiness = (
    (gaSyllabusScore * 0.35) +
    (gaClarityScore * 0.25) +
    (gaPyqScore * 0.25) +
    (gaRevisionScore * 0.10) +
    (consistencyScore * 0.05)
  );

  // --- Calculate Weighted Overall Readiness ---
  // Official GATE Split: 85% Technical + 15% Aptitude
  const overall = (technicalReadiness * 0.85) + (aptitudeReadiness * 0.15);

  // Shared overall components (for compatibility display on dashboard charts)
  const totalTopics = progress.length || 1;
  const syllabusScore = progress.reduce((sum, p) => sum + Number(p.completion_percentage || 0), 0) / totalTopics;
  const studiedTopics = progress.filter(p => p.status !== 'Not Started');
  const clarityScore = studiedTopics.length > 0
    ? Math.min(100, (studiedTopics.reduce((sum, p) => sum + p.concept_clarity, 0) / studiedTopics.length) * 10)
    : 0;

  let totalTargetPyqs = 0;
  let totalSolvedPyqs = 0;
  progress.forEach(p => {
    totalTargetPyqs += p.pyqs_total;
    totalSolvedPyqs += p.pyqs_solved;
  });
  const pyqScore = totalTargetPyqs > 0 ? (totalSolvedPyqs / totalTargetPyqs) * 100 : 0;

  const completedRevs = revisions.filter(r => r.status === 'Completed').length;
  const totalRevs = revisions.length || 1;
  const revisionScore = (completedRevs / totalRevs) * 100;

  const monthlyImprovement = overall < 1 ? 0 : 3.5 + (streak * 0.2) + (mocks.length * 0.5);

  return {
    overall: Math.round(overall * 10) / 10,
    syllabus: Math.round(syllabusScore * 10) / 10,
    clarity: Math.round(clarityScore * 10) / 10,
    pyq: Math.round(pyqScore * 10) / 10,
    mock: Math.round(mockScore * 10) / 10,
    revision: Math.round(revisionScore * 10) / 10,
    consistency: Math.round(consistencyScore * 10) / 10,
    monthlyImprovement: Math.round(monthlyImprovement * 10) / 10,
    technicalReadiness: Math.round(technicalReadiness * 10) / 10,
    aptitudeReadiness: Math.round(aptitudeReadiness * 10) / 10
  };
}
