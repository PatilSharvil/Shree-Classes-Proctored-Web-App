import { create } from 'zustand';

const useExamStore = create((set, get) => ({
  // Exam state
  activeExam: null,
  session: null,
  questions: [],
  currentQuestionIndex: 0,
  responses: {},
  markedForReview: {},
  timeRemaining: null,
  isSubmitting: false,

  // Proctoring state
  violations: [],
  warningCount: 0,

  // Set active exam and session
  setActiveExam: (exam, session) => set({ activeExam: exam, session }),

  // Set questions
  setQuestions: (questions) => set({ questions }),

  // Save response - create new object reference to trigger re-render
  saveResponse: (questionId, selectedOption) => {
    const currentResponses = get().responses;
    const newResponses = JSON.parse(JSON.stringify(currentResponses));
    newResponses[questionId] = selectedOption;
    set({ responses: newResponses });
  },

  // Toggle review mark - create new object reference to trigger re-render
  toggleReview: (questionId) => {
    const currentMarked = get().markedForReview;
    const newMarked = JSON.parse(JSON.stringify(currentMarked));
    if (newMarked[questionId]) {
      delete newMarked[questionId];
    } else {
      newMarked[questionId] = true;
    }
    set({ markedForReview: newMarked });
  },

  // Check if question is marked for review
  isMarkedForReview: (questionId) => {
    return !!get().markedForReview[questionId];
  },

  // Set current question index
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

  // Set timer
  setTimeRemaining: (seconds) => set({ timeRemaining: seconds }),

  // Add violation
  addViolation: (violation) => {
    const violations = [...get().violations, violation];
    set({ violations, warningCount: violations.length });
  },

  // Clear exam state
  clearExamState: () => set({
    activeExam: null,
    session: null,
    questions: [],
    currentQuestionIndex: 0,
    responses: {},
    markedForReview: {},
    timeRemaining: null,
    isSubmitting: false,
    violations: [],
    warningCount: 0
  }),

  // Set submitting state
  setSubmitting: (isSubmitting) => set({ isSubmitting })
}));

export default useExamStore;
