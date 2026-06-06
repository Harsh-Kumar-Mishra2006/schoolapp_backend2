// src/utils/examConfig.js (Backend - Node.js)
// This file defines all standard exams in the system

const EXAM_TYPES = {
  // Periodic Assessments
  PERIODIC_ASSESSMENT_1: 'Periodic Assessment 1',
  PERIODIC_ASSESSMENT_2: 'Periodic Assessment 2',
  PERIODIC_ASSESSMENT_3: 'Periodic Assessment 3',
  
  // Unit Tests
  UNIT_TEST_1: 'Unit Test 1',
  UNIT_TEST_2: 'Unit Test 2', 
  UNIT_TEST_3: 'Unit Test 3',
  
  // Mid Semester
  MID_SEMESTER: 'Mid Semester Examination',
  
  // End Semester
  END_SEMESTER: 'End Semester Examination',
  
  // Summative Assessments
  SUMMATIVE_ASSESSMENT_1: 'Summative Assessment 1',
  SUMMATIVE_ASSESSMENT_2: 'Summative Assessment 2',
  
  // Terminal Exams
  TERM_1: 'Term 1 Examination',
  TERM_2: 'Term 2 Examination',
  TERM_3: 'Term 3 Examination',
  
  // Final Exams
  FINAL_EXAM: 'Final Examination',
  ANNUAL_EXAM: 'Annual Examination'
};

const EXAM_TERMS = {
  TERM_1: 'Term 1',
  TERM_2: 'Term 2', 
  TERM_3: 'Term 3',
  SEMESTER_1: 'Semester 1',
  SEMESTER_2: 'Semester 2',
  ANNUAL: 'Annual'
};

// Predefined exam schedule with typical dates
const EXAM_SCHEDULE = {
  [EXAM_TYPES.PERIODIC_ASSESSMENT_1]: { term: EXAM_TERMS.TERM_1, month: 'July', weightage: 10 },
  [EXAM_TYPES.PERIODIC_ASSESSMENT_2]: { term: EXAM_TERMS.TERM_1, month: 'August', weightage: 10 },
  [EXAM_TYPES.PERIODIC_ASSESSMENT_3]: { term: EXAM_TERMS.TERM_2, month: 'November', weightage: 10 },
  [EXAM_TYPES.UNIT_TEST_1]: { term: EXAM_TERMS.TERM_1, month: 'July', weightage: 15 },
  [EXAM_TYPES.UNIT_TEST_2]: { term: EXAM_TERMS.TERM_1, month: 'August', weightage: 15 },
  [EXAM_TYPES.UNIT_TEST_3]: { term: EXAM_TERMS.TERM_2, month: 'November', weightage: 15 },
  [EXAM_TYPES.MID_SEMESTER]: { term: EXAM_TERMS.SEMESTER_1, month: 'September', weightage: 30 },
  [EXAM_TYPES.END_SEMESTER]: { term: EXAM_TERMS.SEMESTER_2, month: 'February', weightage: 40 },
  [EXAM_TYPES.TERM_1]: { term: EXAM_TERMS.TERM_1, month: 'September', weightage: 50 },
  [EXAM_TYPES.TERM_2]: { term: EXAM_TERMS.TERM_2, month: 'December', weightage: 50 },
  [EXAM_TYPES.TERM_3]: { term: EXAM_TERMS.TERM_3, month: 'March', weightage: 100 },
  [EXAM_TYPES.SUMMATIVE_ASSESSMENT_1]: { term: EXAM_TERMS.SEMESTER_1, month: 'September', weightage: 40 },
  [EXAM_TYPES.SUMMATIVE_ASSESSMENT_2]: { term: EXAM_TERMS.SEMESTER_2, month: 'February', weightage: 40 },
  [EXAM_TYPES.FINAL_EXAM]: { term: EXAM_TERMS.ANNUAL, month: 'March', weightage: 100 },
  [EXAM_TYPES.ANNUAL_EXAM]: { term: EXAM_TERMS.ANNUAL, month: 'March', weightage: 100 }
};

// Standard subjects by class
const SUBJECTS_BY_CLASS = {
  primary: ['English', 'Mathematics', 'Science', 'Social Studies', 'General Knowledge', 'Computer Science'],
  middle: ['English', 'Mathematics', 'Science', 'Social Studies', 'Sanskrit/Hindi', 'Computer Science', 'Physical Education'],
  high: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Computer Science', 'Physical Education']
};

// Function to get subjects for a specific class
const getSubjectsForClass = (className) => {
  const classNum = parseInt(className);
  if (classNum <= 5) return SUBJECTS_BY_CLASS.primary;
  if (classNum <= 8) return SUBJECTS_BY_CLASS.middle;
  return SUBJECTS_BY_CLASS.high;
};

module.exports = {
  EXAM_TYPES,
  EXAM_TERMS,
  EXAM_SCHEDULE,
  SUBJECTS_BY_CLASS,
  getSubjectsForClass
};