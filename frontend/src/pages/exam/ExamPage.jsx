import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsAPI, questionsAPI, attemptsAPI } from '../../services/api';
import useExamStore from '../../store/examStore';
import useAuthStore from '../../store/authStore';
import { formatTime } from '../../hooks/useExamTimer';
import { useProctoring } from '../../hooks/useProctoring';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ExamPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examStarted, setExamStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Get store state and actions
  const session = useExamStore((state) => state.session);
  const questions = useExamStore((state) => state.questions);
  const currentQuestionIndex = useExamStore((state) => state.currentQuestionIndex);
  const responses = useExamStore((state) => state.responses);
  const markedForReview = useExamStore((state) => state.markedForReview);
  const timeRemaining = useExamStore((state) => state.timeRemaining);
  const setActiveExam = useExamStore((state) => state.setActiveExam);
  const setQuestions = useExamStore((state) => state.setQuestions);
  const saveResponse = useExamStore((state) => state.saveResponse);
  const setCurrentQuestionIndex = useExamStore((state) => state.setCurrentQuestionIndex);
  const setTimeRemaining = useExamStore((state) => state.setTimeRemaining);
  const toggleReview = useExamStore((state) => state.toggleReview);
  const clearExamState = useExamStore((state) => state.clearExamState);

  // Subscribe to store changes to force re-render
  useEffect(() => {
    const unsubscribe = useExamStore.subscribe(
      (state) => ({ responses: state.responses, markedForReview: state.markedForReview }),
      () => setForceUpdate((n) => n + 1)
    );
    return unsubscribe;
  }, []);

  // Handle time up
  const handleTimeUp = async () => {
    if (session) {
      setSubmitting(true);
      try {
        await attemptsAPI.submit(session.id);
        clearExamState();
        navigate('/dashboard', { state: { message: 'Exam auto-submitted due to timeout' } });
      } catch (error) {
        console.error('Auto-submit failed:', error);
      }
    }
  };

  // Proctoring hook
  useProctoring(session?.id, (violationCount) => {
    if (violationCount >= 5) {
      handleTimeUp();
    }
  });

  // Timer effect
  useEffect(() => {
    if (examStarted && exam && !submitting && timeRemaining !== null) {
      const endTime = Date.now() + (timeRemaining * 1000);
      
      const interval = setInterval(() => {
        const remaining = Math.max(0, endTime - Date.now());
        const seconds = Math.floor(remaining / 1000);
        setTimeRemaining(seconds);
        
        if (remaining <= 0) {
          clearInterval(interval);
          handleTimeUp();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [examStarted, exam, submitting]);

  useEffect(() => {
    loadExam();
    return () => clearExamState();
  }, [examId]);

  const loadExam = async () => {
    try {
      setLoading(true);
      setError('');

      // Check for existing active session
      try {
        const activeRes = await attemptsAPI.getActive(examId);
        const existingSession = activeRes.data.data;

        if (existingSession) {
          const questionsRes = await questionsAPI.getByExam(examId, {
            shuffled: 'true',
            shuffledOptions: 'true'
          });

          setExam({ ...existingSession });
          setActiveExam(exam, existingSession);
          setQuestions(questionsRes.data.data || []);
          setCurrentQuestionIndex(existingSession.current_question_index);
          
          // Initialize timer with remaining duration
          const examDuration = existingSession.duration_minutes || exam.duration_minutes;
          const startTime = new Date(existingSession.started_at).getTime();
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          const remainingSeconds = (examDuration * 60) - elapsedSeconds;
          setTimeRemaining(Math.max(0, remainingSeconds));
          
          setExamStarted(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        // Check if the error is "Exam has ended" or similar
        const errorMessage = err.response?.data?.message || err.message;
        if (errorMessage && (errorMessage.includes('ended') || errorMessage.includes('not active'))) {
          setError(errorMessage);
          setLoading(false);
          return;
        }
        // No active session, continue to start new one
      }

      // Load exam details
      const examRes = await examsAPI.getById(examId);
      setExam(examRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const startExam = async () => {
    try {
      setLoading(true);
      setError('');

      // First check if exam is available
      const availabilityRes = await examsAPI.checkAvailability(examId);
      const availability = availabilityRes.data.data;
      if (!availability.available) {
        throw new Error(availability.reason || 'Exam is not available');
      }

      const { data } = await attemptsAPI.start(examId);
      const sessionData = data.data;

      const questionsRes = await questionsAPI.getByExam(examId, {
        shuffled: 'true',
        shuffledOptions: 'true'
      });

      setActiveExam(exam, sessionData);
      setQuestions(questionsRes.data.data || []);
      
      // Initialize timer with exam duration (in seconds)
      const examDuration = sessionData.duration_minutes || exam.duration_minutes;
      setTimeRemaining(examDuration * 60);
      
      setExamStarted(true);
    } catch (err) {
      setError(err.message || 'Failed to start exam');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = async (option) => {
    if (!session || submitting) return;

    const question = questions[currentQuestionIndex];
    const questionId = question?.id;
    
    if (!questionId) {
      console.error('Question ID is undefined!');
      return;
    }
    
    saveResponse(questionId, option);

    try {
      await attemptsAPI.saveResponse(session.id, {
        questionId,
        selectedOption: option
      });
    } catch (error) {
      console.error('Failed to save response:', error);
    }
  };

  const handleNavigate = async (index) => {
    if (!session || submitting) return;
    setCurrentQuestionIndex(index);
    setShowPalette(false);

    try {
      await attemptsAPI.updateQuestion(session.id, index);
    } catch (error) {
      console.error('Failed to update question index:', error);
    }
  };

  const handleSubmit = async () => {
    setShowConfirmSubmit(false);
    setSubmitting(true);
    try {
      await attemptsAPI.submit(session.id);
      clearExamState();
      navigate('/dashboard', { state: { message: 'Exam submitted successfully!' } });
    } catch (err) {
      setError('Failed to submit exam');
      setSubmitting(false);
    }
  };

  const getQuestionStatus = (index) => {
    const question = questions[index];
    if (!question) return 'not-visited';

    // Ensure question.id exists and check response
    const questionId = question.id;
    const hasResponse = questionId && responses[questionId];
    const isReview = questionId && markedForReview[questionId];
    const isCurrent = index === currentQuestionIndex;

    if (isCurrent) return 'current';
    if (isReview && hasResponse) return 'answered-review';
    if (isReview) return 'review';
    if (hasResponse) return 'answered';
    return 'not-answered';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'current': return 'bg-primary-600 text-white ring-2 ring-primary-300';
      case 'answered': return 'bg-green-500 text-white';
      case 'answered-review': return 'bg-purple-500 text-white';
      case 'review': return 'bg-purple-200 text-purple-800 border-2 border-purple-500';
      case 'not-answered': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-600';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'current': return 'Current';
      case 'answered': return 'Answered';
      case 'answered-review': return 'Answered + Review';
      case 'review': return 'Marked for Review';
      case 'not-answered': return 'Not Answered';
      default: return '';
    }
  };

  // Calculate question statuses using useMemo to ensure fresh values
  const { questionStatuses, answeredCount, notAnsweredCount, reviewCount } = useMemo(() => {
    const statuses = questions.map((_, idx) => getQuestionStatus(idx));
    return {
      questionStatuses: statuses,
      answeredCount: statuses.filter(s => s === 'answered' || s === 'answered-review').length,
      notAnsweredCount: statuses.filter(s => s === 'not-answered').length,
      reviewCount: statuses.filter(s => s === 'review' || s === 'answered-review').length
    };
  }, [questions, responses, markedForReview, currentQuestionIndex]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !examStarted) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  // Pre-exam screen
  if (!examStarted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{exam?.title}</h1>
            {exam?.subject && (
              <span className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded inline-block mt-2">
                {exam.subject}
              </span>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">{exam?.duration_minutes} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Marks:</span>
              <span className="font-medium">{exam?.total_marks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Questions:</span>
              <span className="font-medium">{exam?.question_count || questions.length}</span>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important Instructions:</h3>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>Do not switch tabs or minimize the window</li>
              <li>Multiple violations may result in auto-submission</li>
              <li>Exam will auto-submit when time runs out</li>
              <li>Once submitted, you cannot restart the exam</li>
              <li>Use "Mark for Review" to flag questions you want to revisit</li>
            </ul>
          </div>

          <Button onClick={startExam} fullWidth size="lg" disabled={loading}>
            {loading ? 'Starting...' : 'Start Exam'}
          </Button>
        </Card>
      </div>
    );
  }

  // Exam in progress
  const question = questions[currentQuestionIndex];
  const currentResponse = responses[question?.id];
  const isMarked = !!markedForReview[question?.id];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Timer & Header */}
      <div className="sticky top-16 z-30 bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">{exam?.title}</h2>
          <p className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>
        
        <div className={`text-2xl font-bold ${
          timeRemaining < 60 ? 'text-red-600' :
          timeRemaining < 300 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {formatTime(timeRemaining)}
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPalette(!showPalette)}
            className="sm:hidden"
          >
            Palette
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowConfirmSubmit(true)}
            disabled={submitting}
          >
            Submit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Question Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Question */}
          <Card className="min-h-[300px]">
            <div className="space-y-6">
              <div>
                <p className="text-lg text-gray-900 font-medium">
                  {currentQuestionIndex + 1}. {question?.question_text}
                </p>
                {question?.marks > 1 && (
                  <span className="text-sm text-gray-500">({question.marks} marks)</span>
                )}
              </div>

              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map((option) => (
                  <button
                    key={option}
                    onClick={() => handleOptionSelect(option)}
                    disabled={submitting}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all touch-target ${
                      currentResponse === option
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium mr-3">{option}.</span>
                    {question?.[`option_${option.toLowerCase()}`]}
                  </button>
                ))}
              </div>

              {/* Mark for Review */}
              <div className="pt-4 border-t">
                <button
                  onClick={() => toggleReview(question?.id)}
                  disabled={submitting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                    isMarked
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`w-5 h-5 rounded flex items-center justify-center ${
                    isMarked ? 'bg-purple-500 text-white' : 'bg-gray-200'
                  }`}>
                    {isMarked ? '✓' : ''}
                  </span>
                  <span>Mark for Review</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Navigation Buttons */}
          {questions.length > 1 && (
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="secondary"
                onClick={() => handleNavigate(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0 || submitting}
              >
                Previous
              </Button>

              <Button
                onClick={() => handleNavigate(currentQuestionIndex + 1)}
                disabled={currentQuestionIndex === questions.length - 1 || submitting}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Question Palette - Desktop */}
        <div className="hidden lg:block">
          <Card title="Question Palette">
            <div className="space-y-4">
              {/* Legend */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded text-white text-xs flex items-center justify-center">✓</div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-200 rounded text-red-800 text-xs flex items-center justify-center">1</div>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 rounded text-white text-xs flex items-center justify-center">✓</div>
                  <span>Answered + Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-200 rounded border-2 border-purple-500 text-purple-800 text-xs flex items-center justify-center">1</div>
                  <span>Marked for Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary-600 rounded text-white text-xs flex items-center justify-center ring-2 ring-primary-300">1</div>
                  <span>Current</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                <div className="text-center bg-green-50 p-2 rounded">
                  <div className="font-bold text-green-600">{answeredCount}</div>
                  <div className="text-gray-600">Answered</div>
                </div>
                <div className="text-center bg-red-50 p-2 rounded">
                  <div className="font-bold text-red-600">{notAnsweredCount}</div>
                  <div className="text-gray-600">Not Answered</div>
                </div>
                <div className="text-center bg-purple-50 p-2 rounded col-span-2">
                  <div className="font-bold text-purple-600">{reviewCount}</div>
                  <div className="text-gray-600">Marked for Review</div>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, idx) => {
                  const status = getQuestionStatus(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleNavigate(idx)}
                      disabled={submitting}
                      className={`w-10 h-10 rounded text-sm font-medium transition-all ${getStatusColor(status)}`}
                      title={`Question ${idx + 1}: ${getStatusLabel(status)}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Question Palette - Mobile Modal */}
        {showPalette && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4 lg:hidden">
            <Card className="w-full max-w-md max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Question Palette</h3>
                <button onClick={() => setShowPalette(false)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded text-white text-xs flex items-center justify-center">✓</div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-200 rounded text-red-800 text-xs flex items-center justify-center">1</div>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 rounded text-white text-xs flex items-center justify-center">✓</div>
                  <span>+ Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-200 rounded border-2 border-purple-500 text-xs flex items-center justify-center">1</div>
                  <span>Review</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                <div className="text-center bg-green-50 p-2 rounded">
                  <div className="font-bold text-green-600">{answeredCount}</div>
                  <div className="text-gray-600">Answered</div>
                </div>
                <div className="text-center bg-red-50 p-2 rounded">
                  <div className="font-bold text-red-600">{notAnsweredCount}</div>
                  <div className="text-gray-600">Unanswered</div>
                </div>
                <div className="text-center bg-purple-50 p-2 rounded">
                  <div className="font-bold text-purple-600">{reviewCount}</div>
                  <div className="text-gray-600">Review</div>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-8 gap-2">
                {questions.map((_, idx) => {
                  const status = getQuestionStatus(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleNavigate(idx)}
                      className={`w-10 h-10 rounded text-sm font-medium ${getStatusColor(status)}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Submit Exam?</h2>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Answered:</strong> {answeredCount} | 
                  <strong className="ml-3">Unanswered:</strong> {notAnsweredCount} | 
                  <strong className="ml-3">Review:</strong> {reviewCount}
                </p>
              </div>
              <p className="text-gray-700">
                Are you sure you want to submit? You cannot change your answers after submission.
              </p>
              <div className="flex gap-3">
                <Button onClick={handleSubmit} variant="danger" className="flex-1">
                  Yes, Submit
                </Button>
                <Button onClick={() => setShowConfirmSubmit(false)} variant="secondary" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ExamPage;
