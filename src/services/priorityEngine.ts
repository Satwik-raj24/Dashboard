// Topic Priority Engine for GATEOS 2027
// Categorizes topics into Critical, High, Medium, or Low Priority based on:
// Subject Weightage, Completion %, Concept Clarity, PYQ Accuracy, and Revision intervals.

import { TopicProgress, RevisionTask } from './db';

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface PriorityBreakdown {
  priority: PriorityLevel;
  score: number; // 0-100
}

export function calculateTopicPriority(
  topic: TopicProgress,
  subjectWeightage: number,
  revisions: RevisionTask[]
): PriorityBreakdown {
  let score = 0;

  // 1. Subject Weightage Factor (max 30 points)
  // Subjects with higher weightage are more critical. Max weightage is 15 (GA), Technical subjects are 4-10.
  // We map weightage to 0-30 points.
  score += Math.min(30, subjectWeightage * 2.0);

  // 2. Completion Factor (max 25 points)
  // Low completion of a topic increases its priority for studying.
  const completion = topic.completion_percentage || 0;
  score += ((100 - completion) / 100) * 25;

  // 3. Concept Clarity Factor (max 20 points)
  // If the topic is started, lower concept clarity = higher priority to review/study.
  if (completion > 0) {
    const clarity = topic.concept_clarity || 1;
    score += ((10 - clarity) / 9) * 20; // Clarity 1 => 20 pts, Clarity 10 => 0 pts
  } else {
    // If not started yet, assign a baseline priority weight of 15 pts
    score += 15;
  }

  // 4. PYQ Accuracy Factor (max 15 points)
  // If PYQs are solved, poor accuracy increases study/drill priority.
  if (topic.pyqs_solved > 0) {
    const pyqAccuracy = (topic.pyqs_correct / topic.pyqs_solved) * 100;
    if (pyqAccuracy < 70) {
      score += ((70 - pyqAccuracy) / 70) * 15;
    }
  } else if (completion > 20) {
    // Started studying but hasn't practiced PYQs yet
    score += 10;
  }

  // 5. Recency / Revision Recency Factor (max 10 points)
  // Check how many days have elapsed since last studied.
  let daysSinceLast = 999;
  if (topic.last_studied_date) {
    const lastDate = new Date(topic.last_studied_date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    daysSinceLast = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // If topic has not been reviewed/studied in 30 days, or is currently marked "Needs Revision"
  const topicRevisions = revisions.filter(
    r => r.subject_id === topic.subject_id && r.topic_name === topic.topic_name
  );
  const hasOverduePending = topicRevisions.some(r => r.status === 'Pending');

  if (topic.status === 'Needs Revision' || hasOverduePending || daysSinceLast > 30) {
    score += 10;
  } else if (daysSinceLast > 14) {
    score += 5;
  }

  // Normalize final score to a maximum of 100
  const normalizedScore = Math.min(100, Math.round(score));

  // Determine Categorization
  let priority: PriorityLevel = 'Low';
  if (normalizedScore >= 70) {
    priority = 'Critical';
  } else if (normalizedScore >= 50) {
    priority = 'High';
  } else if (normalizedScore >= 35) {
    priority = 'Medium';
  }

  return {
    priority,
    score: normalizedScore
  };
}
