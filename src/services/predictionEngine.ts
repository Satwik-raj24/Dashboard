// AIR Prediction Engine for GATEOS 2027
// Computes predicted marks, rank bracket, and probability thresholds

import { TopicProgress, MockTest, RevisionTask } from './db';

export interface PredictionResults {
  expectedMarks: number; // Out of 100
  expectedRank: number;  // Median rank
  rankRange: string;     // E.g. "18 - 45"
  probUnder100: number;  // 0-100%
  probUnder500: number;  // 0-100%
  probUnder1000: number; // 0-100%
}

export function predictAIR(
  progress: TopicProgress[],
  mocks: MockTest[],
  revisions: RevisionTask[]
): PredictionResults {
  // 1. Calculate Average Mock Performance
  let avgMockMarks = 0;
  let avgMockAccuracy = 0;
  if (mocks.length > 0) {
    avgMockMarks = mocks.reduce((sum, m) => sum + Number(m.marks), 0) / mocks.length;
    avgMockAccuracy = mocks.reduce((sum, m) => sum + Number(m.accuracy), 0) / mocks.length;
  } else {
    // Default starting point if no mock tests are taken (based on syllabus progress)
    avgMockMarks = 45; 
    avgMockAccuracy = 70;
  }

  // 2. Calculate PYQ Accuracy
  let studiedPyqsSolved = 0;
  let studiedPyqsCorrect = 0;
  progress.forEach(p => {
    if (p.pyqs_solved > 0) {
      studiedPyqsSolved += p.pyqs_solved;
      studiedPyqsCorrect += p.pyqs_correct;
    }
  });
  const pyqAccuracy = studiedPyqsSolved > 0 ? (studiedPyqsCorrect / studiedPyqsSolved) * 100 : 70;

  // 3. Syllabus Completion Factor
  const completedCount = progress.filter(p => p.status === 'Completed' || p.status === 'Mastered').length;
  const totalCount = progress.length || 1;
  const syllabusCompletion = (completedCount / totalCount) * 100;

  // 4. Revision Quality Factor
  const completedRevs = revisions.filter(r => r.status === 'Completed').length;
  const totalRevs = revisions.length || 1;
  const revisionRate = completedRevs / totalRevs;

  // 5. Predict GATE Marks (Expected Marks out of 100)
  // Formula blends Mock marks (50%), PYQ Accuracy (20%), Syllabus completion (20%), and Revision consistency (10%)
  // Scale syllabus completion so that 100% syllabus gives a max of +15 marks, but progress is non-linear
  const syllabusContribution = (syllabusCompletion / 100) * 15;
  const revisionContribution = revisionRate * 5;
  const accuracyContribution = (pyqAccuracy / 100) * 20;
  const mockContribution = (avgMockMarks / 100) * 60; // Mock marks already scaled to 100

  // Combine to calculate expected marks (max 100, min 0)
  let expectedMarks = mockContribution + accuracyContribution + syllabusContribution + revisionContribution;
  
  // Cap at 95.5 for realism (getting 100 is extremely rare)
  expectedMarks = Math.min(95.5, Math.max(15.0, expectedMarks));

  // 6. Predict Expected Rank (AIR) based on Marks
  // Historical mapping model of GATE CS Marks to Rank
  let medianRank = 10000;
  let minRank = 12000;
  let maxRank = 15000;

  if (expectedMarks >= 85) {
    // Top 20 range
    const fraction = (95.5 - expectedMarks) / (95.5 - 85); // 0 to 1
    minRank = Math.max(1, Math.round(1 + fraction * 10));
    maxRank = Math.round(5 + fraction * 20);
    medianRank = Math.round((minRank + maxRank) / 2);
  } else if (expectedMarks >= 76) {
    // Rank 20 - 100 range
    const fraction = (85 - expectedMarks) / (85 - 76);
    minRank = Math.round(15 + fraction * 30);
    maxRank = Math.round(40 + fraction * 60);
    medianRank = Math.round((minRank + maxRank) / 2);
  } else if (expectedMarks >= 68) {
    // Rank 100 - 350 range
    const fraction = (76 - expectedMarks) / (76 - 68);
    minRank = Math.round(90 + fraction * 110);
    maxRank = Math.round(180 + fraction * 170);
    medianRank = Math.round((minRank + maxRank) / 2);
  } else if (expectedMarks >= 60) {
    // Rank 350 - 900 range
    const fraction = (68 - expectedMarks) / (68 - 60);
    minRank = Math.round(320 + fraction * 230);
    maxRank = Math.round(550 + fraction * 350);
    medianRank = Math.round((minRank + maxRank) / 2);
  } else if (expectedMarks >= 50) {
    // Rank 900 - 2500 range
    const fraction = (60 - expectedMarks) / (60 - 50);
    minRank = Math.round(850 + fraction * 550);
    maxRank = Math.round(1400 + fraction * 1100);
    medianRank = Math.round((minRank + maxRank) / 2);
  } else {
    // Rank > 2500
    const fraction = (50 - expectedMarks) / 50;
    minRank = Math.round(2300 + fraction * 5000);
    maxRank = Math.round(3500 + fraction * 8000);
    medianRank = Math.round((minRank + maxRank) / 2);
  }

  // 7. Calculate Probabilities using logistic functions
  // Probability under 100 (Inflection point: 75 marks)
  const probUnder100 = 100 / (1 + Math.exp(-(expectedMarks - 75.5) / 3.0));
  // Probability under 500 (Inflection point: 64 marks)
  const probUnder500 = 100 / (1 + Math.exp(-(expectedMarks - 63.8) / 3.8));
  // Probability under 1000 (Inflection point: 57 marks)
  const probUnder1000 = 100 / (1 + Math.exp(-(expectedMarks - 57.0) / 4.5));

  const rankRangeStr = expectedMarks >= 85 ? `1 - ${maxRank}` : `${minRank} - ${maxRank}`;

  return {
    expectedMarks: Math.round(expectedMarks * 10) / 10,
    expectedRank: medianRank,
    rankRange: rankRangeStr,
    probUnder100: Math.round(probUnder100),
    probUnder500: Math.round(probUnder500),
    probUnder1000: Math.round(probUnder1000)
  };
}
