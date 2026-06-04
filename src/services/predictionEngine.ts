// AIR Prediction Engine for GATEOS 2027
// Computes predicted marks, rank bracket, and probability thresholds
// Separates Technical (85%) and General Aptitude (15%) predictions.

import { TopicProgress, MockTest, RevisionTask } from './db';

export interface PredictionResults {
  expectedMarks: number; // Out of 100
  expectedRank: number;  // Median rank
  rankRange: string;     // E.g. "18 - 45"
  probUnder100: number;  // 0-100%
  probUnder500: number;  // 0-100%
  probUnder1000: number; // 0-100%
  expectedTechnicalMarks: number; // Out of 85
  expectedAptitudeMarks: number;  // Out of 15
}

export function predictAIR(
  progress: TopicProgress[],
  mocks: MockTest[],
  revisions: RevisionTask[]
): PredictionResults {
  // 1. Separate Technical vs. General Aptitude
  const techProgress = progress.filter(p => p.subject_id !== 'ga');
  const gaProgress = progress.filter(p => p.subject_id === 'ga');

  const techRevisions = revisions.filter(r => r.subject_id !== 'ga');
  const gaRevisions = revisions.filter(r => r.subject_id === 'ga');

  // --- Technical Prediction (out of 85 marks) ---
  // Average Mock performance (full-length mocks scale to 100, we scale technical share to 51 marks, which is 60% of 85)
  let avgMockMarks = 0;
  if (mocks.length > 0) {
    avgMockMarks = mocks.reduce((sum, m) => sum + Number(m.marks), 0) / mocks.length;
  } else {
    avgMockMarks = 45; 
  }

  // Technical PYQ accuracy
  let techStudiedPyqs = 0;
  let techCorrectPyqs = 0;
  techProgress.forEach(p => {
    if (p.pyqs_solved > 0) {
      techStudiedPyqs += p.pyqs_solved;
      techCorrectPyqs += p.pyqs_correct;
    }
  });
  const techPyqAccuracy = techStudiedPyqs > 0 ? (techCorrectPyqs / techStudiedPyqs) * 100 : 70;

  // Technical syllabus completion
  const techCompleted = techProgress.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
  const techTotal = techProgress.length || 1;
  const techSyllabusCompletion = (techCompleted / techTotal) * 100;

  // Technical revision rate
  const techCompletedRevs = techRevisions.filter(r => r.status === 'Completed').length;
  const techTotalRevs = techRevisions.length || 1;
  const techRevisionRate = techCompletedRevs / techTotalRevs;

  // Technical marks components (Total max: 85 marks)
  // Mock contribution (max 51)
  const techMockContrib = (avgMockMarks / 100) * 51;
  // PYQ Accuracy contribution (max 17)
  const techAccuracyContrib = (techPyqAccuracy / 100) * 17;
  // Syllabus completion (max 13)
  const techSyllabusContrib = (techSyllabusCompletion / 100) * 13;
  // Revision consistency (max 4)
  const techRevisionContrib = techRevisionRate * 4;

  let expectedTechnicalMarks = techMockContrib + techAccuracyContrib + techSyllabusContrib + techRevisionContrib;
  expectedTechnicalMarks = Math.min(85, Math.max(10, expectedTechnicalMarks));

  // --- General Aptitude Prediction (out of 15 marks) ---
  // GA syllabus completion
  const gaCompleted = gaProgress.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
  const gaTotal = gaProgress.length || 1;
  const gaSyllabusCompletion = (gaCompleted / gaTotal) * 100;

  // GA PYQ accuracy
  let gaStudiedPyqs = 0;
  let gaCorrectPyqs = 0;
  gaProgress.forEach(p => {
    if (p.pyqs_solved > 0) {
      gaStudiedPyqs += p.pyqs_solved;
      gaCorrectPyqs += p.pyqs_correct;
    }
  });
  const gaPyqAccuracy = gaStudiedPyqs > 0 ? (gaCorrectPyqs / gaStudiedPyqs) * 100 : 70;

  // GA average concept clarity
  const gaStudied = gaProgress.filter(p => p.status !== 'Not Started');
  const gaClarityAvg = gaStudied.length > 0
    ? (gaStudied.reduce((sum, p) => sum + p.concept_clarity, 0) / gaStudied.length) * 10 // scale to 0-100
    : 0;

  // GA revision rate
  const gaCompletedRevs = gaRevisions.filter(r => r.status === 'Completed').length;
  const gaTotalRevs = gaRevisions.length || 1;
  const gaRevisionRate = gaCompletedRevs / gaTotalRevs;

  // GA marks components (Total max: 15 marks)
  // Syllabus completion (max 5)
  const gaSyllabusContrib = (gaSyllabusCompletion / 100) * 5;
  // PYQ accuracy (max 5)
  const gaAccuracyContrib = (gaPyqAccuracy / 100) * 5;
  // Clarity contribution (max 3)
  const gaClarityContrib = (gaClarityAvg / 100) * 3;
  // Revision contribution (max 2)
  const gaRevisionContrib = gaRevisionRate * 2;

  let expectedAptitudeMarks = gaSyllabusContrib + gaAccuracyContrib + gaClarityContrib + gaRevisionContrib;
  // Base GA score if syllabus started is at least 3 marks for basic intuition
  expectedAptitudeMarks = Math.min(15, Math.max(gaStudied.length > 0 ? 3 : 0, expectedAptitudeMarks));

  // Combine Expected Marks (out of 100)
  let expectedMarks = expectedTechnicalMarks + expectedAptitudeMarks;
  expectedMarks = Math.min(99.5, Math.max(10.0, expectedMarks));

  // Rank range calculation (Historical Model)
  let medianRank = 10000;
  let minRank = 12000;
  let maxRank = 15000;

  if (expectedMarks >= 85) {
    const fraction = (95.5 - expectedMarks) / (95.5 - 85);
    minRank = Math.max(1, Math.round(1 + fraction * 10));
    maxRank = Math.round(5 + fraction * 20);
    medianRank = Math.round((minRank + maxRank) / 2);
  } else if (expectedMarks >= 76) {
    const fraction = (85 - expectedMarks) / (85 - 76);
    minRank = Math.round(15 + fraction * 30);
    maxRank = Math.round(40 + fraction * 60);
    medianRank = Math.round((minRank + maxRank) / 2);
  } else if (expectedMarks >= 68) {
    const fraction = (76 - expectedMarks) / (76 - 68);
    minRank = Math.round(90 + fraction * 110);
    maxRank = Math.round(180 + fraction * 170);
    medianRank = Math.round((minRank + maxRank) / 2);
  } else if (expectedMarks >= 60) {
    const fraction = (68 - expectedMarks) / (68 - 60);
    minRank = Math.round(320 + fraction * 230);
    maxRank = Math.round(550 + fraction * 350);
    medianRank = Math.round((minRank + maxRank) / 2);
  } else if (expectedMarks >= 50) {
    const fraction = (60 - expectedMarks) / (60 - 50);
    minRank = Math.round(850 + fraction * 550);
    maxRank = Math.round(1400 + fraction * 1100);
    medianRank = Math.round((minRank + maxRank) / 2);
  } else {
    const fraction = (50 - expectedMarks) / 50;
    minRank = Math.round(2300 + fraction * 5000);
    maxRank = Math.round(3500 + fraction * 8000);
    medianRank = Math.round((minRank + maxRank) / 2);
  }

  // Probabilities using logistic functions
  const probUnder100 = 100 / (1 + Math.exp(-(expectedMarks - 75.5) / 3.0));
  const probUnder500 = 100 / (1 + Math.exp(-(expectedMarks - 63.8) / 3.8));
  const probUnder1000 = 100 / (1 + Math.exp(-(expectedMarks - 57.0) / 4.5));

  const rankRangeStr = expectedMarks >= 85 ? `1 - ${maxRank}` : `${minRank} - ${maxRank}`;

  return {
    expectedMarks: Math.round(expectedMarks * 10) / 10,
    expectedRank: medianRank,
    rankRange: rankRangeStr,
    probUnder100: Math.round(probUnder100),
    probUnder500: Math.round(probUnder500),
    probUnder1000: Math.round(probUnder1000),
    expectedTechnicalMarks: Math.round(expectedTechnicalMarks * 10) / 10,
    expectedAptitudeMarks: Math.round(expectedAptitudeMarks * 10) / 10
  };
}
