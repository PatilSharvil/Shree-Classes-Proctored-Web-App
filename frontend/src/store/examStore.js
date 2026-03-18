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
  
  // Save response
  saveResponse: (questionId, selectedOption) => {
    const responses = { ...get().responses, [questionId]: selectedOption };
    set({ responses });
  },
  
  // Toggle review mark
  toggleReview: (questionId) => {
    const marked = { ...get().markedForReview };
    if (marked[questionId]) {
      delete marked[questionId];
    } else {
      marked[questionId] = true;
    }
    set({ markedForReview: marked });
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
