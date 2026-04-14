import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsAPI, questionsAPI, attemptsAPI } from '../../services/api';
import useExamStore from '../../store/examStore';
import useAuthStore from '../../store/authStore';
import { formatTime } from '../../hooks/useExamTimer';
import { useProctoring, isMobileDevice } from '../../hooks/useProctoring';
import useWebSocket from '../../hooks/useWebSocket';
import AIProctoringWrapper from '../../components/proctoring/AIProctoringWrapper';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import RichTextRenderer from '../../components/ui/RichTextRenderer';
import { getImageUrl } from '../../utils/imageHelper';

// Detect mobile device (using the shared utility)
const isMobile = isMobileDevice;

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
  const [autoSubmitError, setAutoSubmitError] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'failed'
  const [totalDuration, setTotalDuration] = useState(null); // For timer progress bar
  const isSubmittingRef = useRef(false); // Guard against concurrent submit calls
  const timerInitialized = useRef(false); // Prevent timer from firing at 0 on stale state

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

  // Proctoring hook with comprehensive monitoring and device-aware thresholds
  const proctoring = useProctoring(session?.id, {
    violationThreshold: 5,
    // Use exam-specific thresholds, with device-specific defaults
    tabSwitchThreshold: exam?.tab_switch_threshold || (isMobile ? 8 : 5),
    lookingAwayThreshold: exam?.looking_away_threshold || (isMobile ? 10 : 5),
    // Device-specific cooldown to prevent rapid-fire violations
    violationCooldownMs: isMobile ? 5000 : 3000,
    // Violation decay window - violations lose weight after this period
    violationDecayMs: 120000, // 2 minutes
    onViolationThreshold: () => {
      console.warn(`[Proctoring] Weighted score threshold reached. Auto-submitting...`);
      handleTimeUp();
    },
    onViolation: (violation) => {
      console.log(`[Proctoring] Violation: ${violation.type} | Severity: ${violation.severity} | Count: ${violation.totalViolations} | Weighted: ${violation.weightedScore} | Device: ${isMobile ? 'mobile' : 'desktop'}`);
    },
    enableFullscreen: !isMobile, // Skip fullscreen enforcement on mobile
    enableTabSwitch: true,
    enableNetworkMonitor: true,
    enableClipboardMonitor: true,
    enableIdleDetect: true,
    idleTimeoutMs: 10 * 60 * 1000  // 10 minutes
  });

  // WebSocket hook for real-time proctoring updates
  const authToken = localStorage.getItem('token');
  const webSocket = useWebSocket({
    sessionId: session?.id,
    examId: exam?.id,
    authToken,
  });

  // Handle time up — idempotent (safe to call multiple times)
  const handleTimeUp = useCallback(async () => {
    // Prevent multiple concurrent submit calls
    if (isSubmittingRef.current || !session) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    setAutoSubmitError(false);

    const isAutoSubmit = proctoring?.weightedScore >= 5;

    try {
      await attemptsAPI.submit(session.id);

      // Emit exam submitted via WebSocket
      if (webSocket?.emitExamSubmitted) {
        webSocket.emitExamSubmitted(new Date().toISOString());
      }

      // Emit auto-submitted if threshold was reached
      if (isAutoSubmit && webSocket?.emitAutoSubmitted) {
        webSocket.emitAutoSubmitted('violation_threshold_exceeded');
      }

      clearExamState();
      localStorage.removeItem('examOfflineQueue');
      navigate('/dashboard', { state: { message: 'Exam auto-submitted due to timeout' } });
    } catch (error) {
      const msg = error.response?.data?.message || '';
      // If already submitted, just redirect to dashboard
      if (msg.includes('not in progress') || msg.includes('already submitted') || msg.includes('Exam is not in progress')) {
        clearExamState();

        // Still emit WebSocket event even if already submitted
        if (webSocket?.emitExamSubmitted) {
          webSocket.emitExamSubmitted(new Date().toISOString());
        }
        if (isAutoSubmit && webSocket?.emitAutoSubmitted) {
          webSocket.emitAutoSubmitted('violation_threshold_exceeded');
        }

        navigate('/dashboard', { state: { message: 'Your exam has already been submitted.' } });
        return;
      }
      console.error('Auto-submit failed:', error);
      setAutoSubmitError(true);
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, navigate, clearExamState]);

  // Emit violations via WebSocket when they occur
  const lastViolationRef = useRef(0);
  useEffect(() => {
    if (!webSocket.emitViolation || proctoring.violationCount <= lastViolationRef.current) {
      return;
    }

    // Emit the latest violation via WebSocket
    lastViolationRef.current = proctoring.violationCount;

    // Get the most recent violation type from warnings
    const latestWarning = proctoring.warnings?.[proctoring.warnings.length - 1];
    if (latestWarning) {
      webSocket.emitViolation({
        type: latestWarning.type || 'UNKNOWN',
        severity: latestWarning.severity || 'MEDIUM',
        metadata: {
          description: latestWarning.message || '',
          violationCount: proctoring.violationCount,
          weightedScore: proctoring.weightedScore,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }, [proctoring.violationCount, proctoring.warnings, webSocket.emitViolation]);

  // Fix #18 — Sync offline queue when back online
  useEffect(() => {
    const syncOfflineQueue = async () => {
      const queue = JSON.parse(localStorage.getItem('examOfflineQueue') || '[]');
      if (queue.length === 0 || !proctoring.isOnline || !session) return;

      const remaining = [];
      for (const item of queue) {
        try {
          await attemptsAPI.saveResponse(item.sessionId, {
            questionId: item.questionId,
            selectedOption: item.selectedOption
          });
        } catch {
          remaining.push(item);
        }
      }
      localStorage.setItem('examOfflineQueue', JSON.stringify(remaining));
    };

    if (proctoring.isOnline) syncOfflineQueue();
  }, [proctoring.isOnline, session]);

  // Auto-submit when proctoring violation threshold is hit
  // Only trigger if exam is actively in progress (not before start)
  useEffect(() => {
    if (proctoring.weightedScore >= 5 && session && examStarted && timerInitialized.current && !isSubmittingRef.current) {
      handleTimeUp();
    }
  }, [proctoring.weightedScore]); // eslint-disable-line

  // Timer effect — only starts if timeRemaining > 0
  useEffect(() => {
    if (!examStarted || !exam || submitting || timeRemaining === null) return;

    // Guard: if time has already expired when exam opens (stale session), handle gracefully
    if (timeRemaining <= 0) {
      if (timerInitialized.current) {
        // Timer ran down naturally — submit
        handleTimeUp();
      } else {
        // timeRemaining was 0 before timer even started (stale store state or expired session)
        // Reset to a safe value and let the component re-evaluate on next render
        console.warn('Timer started at 0 — possible stale state or expired session.');
        // Don't auto-submit; the loadExam function handles expired sessions
      }
      return;
    }

    timerInitialized.current = true;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStarted, exam, submitting]);

  useEffect(() => {
    loadExam();
    return () => clearExamState();
  }, [examId]);

  const loadExam = async () => {
    try {
      setLoading(true);
      setError('');
      timerInitialized.current = false; // Reset timer guard on load
      isSubmittingRef.current = false;  // Reset submit guard on load

      // Check for existing active session
      try {
        const activeRes = await attemptsAPI.getActive(examId);
        const existingSession = activeRes.data.data;

        if (existingSession) {
          // duration_minutes comes from the JOIN in getActiveSession (backend)
          const examDuration = existingSession.duration_minutes;

          // Parse SQLite datetime ("YYYY-MM-DD HH:MM:SS") safely
          const rawStarted = existingSession.started_at || '';
          const startTime = new Date(rawStarted.includes('T') ? rawStarted : rawStarted.replace(' ', 'T')).getTime();
          const elapsedSeconds = isNaN(startTime) ? 0 : Math.floor((Date.now() - startTime) / 1000);
          const totalSeconds = (Number(examDuration) || 60) * 60;
          const remainingSeconds = totalSeconds - elapsedSeconds;

          // If the session has already expired, auto-submit silently and redirect
          if (remainingSeconds <= 0) {
            try {
              await attemptsAPI.submit(existingSession.id);
            } catch { /* Already submitted is OK */ }
            clearExamState();
            localStorage.removeItem('examOfflineQueue');
            navigate('/dashboard', { state: { message: 'Your exam session has expired and was auto-submitted.' } });
            return;
          }

          // Session is valid — load questions and resume
          const questionsRes = await questionsAPI.getByExam(examId, {
            shuffled: 'true',
            shuffledOptions: 'true'
          });

          const examData = { ...existingSession };
          setExam(examData);
          setActiveExam(examData, existingSession); // Use examData (not stale null exam)
          setQuestions(questionsRes.data.data || []);
          setCurrentQuestionIndex(existingSession.current_question_index || 0);
          setTimeRemaining(remainingSeconds);
          setTotalDuration(totalSeconds);

          setExamStarted(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        const errorMessage = err.response?.data?.message || '';
        if (
          errorMessage.includes('ended') ||
          errorMessage.includes('not active') ||
          errorMessage.includes('already submitted')
        ) {
          setError('This exam session has already ended. Please contact your teacher.');
          setLoading(false);
          return;
        }
        // Any other error → fall through to load fresh exam
      }

      const examRes = await examsAPI.getById(examId);
      setExam(examRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startExam = async () => {
    try {
      setLoading(true);
      setError('');

      const availabilityRes = await examsAPI.checkAvailability(examId);
      const availability = availabilityRes.data.data;
      if (!availability.available) {
        throw new Error(availability.reason || 'Exam is not available');
      }

      const { data } = await attemptsAPI.start(examId);
      const sessionData = data.data;

      const questionsRes = await questionsAPI.getByExam(examId, {
        shuffled: 'true',
        shuffledOptions: 'false'
      });

      setActiveExam(exam, sessionData);
      setQuestions(questionsRes.data.data || []);

      const examDuration = sessionData.duration_minutes || exam.duration_minutes;
      setTimeRemaining(examDuration * 60);
      setTotalDuration(examDuration * 60);

      setExamStarted(true);

      // Emit exam started via WebSocket
      if (webSocket.emitExamStarted) {
        webSocket.emitExamStarted();
      }

      // Fix #19 — only request fullscreen on non-mobile devices
      if (!isMobile) {
        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          console.warn('Fullscreen request denied or not supported', err);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to start exam');
    } finally {
      setLoading(false);
    }
  };

  // Fix #17 — Save with retry logic
  const saveWithRetry = async (sessionId, payload, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await attemptsAPI.saveResponse(sessionId, payload);
        return true;
      } catch (e) {
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }
    return false;
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

    // Fix #17 — show saving status
    setSaveStatus('saving');

    if (!proctoring.isOnline) {
      // Fix #18 — queue offline
      const queue = JSON.parse(localStorage.getItem('examOfflineQueue') || '[]');
      queue.push({ sessionId: session.id, questionId, selectedOption: option, ts: Date.now() });
      localStorage.setItem('examOfflineQueue', JSON.stringify(queue));
      setSaveStatus('idle');
      return;
    }

    const ok = await saveWithRetry(session.id, { questionId, selectedOption: option });
    setSaveStatus(ok ? 'idle' : 'failed');
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
    setAutoSubmitError(false);
    setSubmitting(true);
    try {
      proctoring.logExamSubmit();

      const result = await attemptsAPI.submit(session.id);

      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          console.warn('Failed to exit fullscreen:', err);
        }
      }

      // Clear offline queue on successful submit
      localStorage.removeItem('examOfflineQueue');

      clearExamState();
      navigate(`/results/${session.id}`);
    } catch (err) {
      console.error('Submission failed:', err);
      setError(err.response?.data?.message || 'Failed to submit exam. Please check your internet connection and try again.');
      setSubmitting(false);
    }
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

  // Compute question statuses and counts - moved outside useMemo for clarity
  const questionStatuses = useMemo(() => {
    return questions.map((_, idx) => {
      const question = questions[idx];
      if (!question) return 'not-visited';

      const questionId = question.id;
      const hasResponse = questionId && responses[questionId];
      const isReview = questionId && markedForReview[questionId];
      const isCurrent = idx === currentQuestionIndex;

      if (isCurrent && !hasResponse && !isReview) return 'current';
      if (isReview && hasResponse) return 'answered-review';
      if (isReview) return 'review';
      if (hasResponse) return 'answered';
      
      // Fallback for current question if it has a response but we still want to indicate it's current. 
      // Actually, if it hit the rules above, it will be skipped. Wait, the original code had `if (isCurrent) return 'current';` at the top. So we're changing priority. Now, if it's current but NOT answered/review, it returns 'current'. If the current has been answered, it will return 'answered'. This fixes the counters exclusion!
      if (isCurrent) return 'current'; 
      return 'not-answered';
    });
  }, [questions, responses, markedForReview, currentQuestionIndex]);

  const getQuestionStatus = (idx) => questionStatuses[idx] || 'not-visited';

  const answeredCount = useMemo(() => 
    questionStatuses.filter(s => s === 'answered' || s === 'answered-review').length
  , [questionStatuses]);

  const notAnsweredCount = useMemo(() => 
    questionStatuses.filter(s => s === 'not-answered' || s === 'not-visited').length
  , [questionStatuses]);

  const reviewCount = useMemo(() => 
    questionStatuses.filter(s => s === 'review' || s === 'answered-review').length
  , [questionStatuses]);

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
              <li>
                <strong>Tab Switch Limit: {exam?.tab_switch_threshold || 5} switches</strong> - You will be auto-submitted and flagged for cheating if you exceed this limit
              </li>
              <li>
                <strong>Looking Away Limit: {exam?.looking_away_threshold || 5} times</strong> - You will be auto-submitted and flagged for cheating if you look away from screen (any direction) this many times
              </li>
              <li>Multiple violations may result in auto-submission</li>
              <li>Exam will auto-submit when time runs out</li>
              <li>Once submitted, you cannot restart the exam</li>
              <li>Use "Mark for Review" to flag questions you want to revisit</li>
              {isMobile && <li>📱 Stay on this page during the entire exam</li>}
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

  // Timer progress %
  const timerPercent = totalDuration ? Math.max(0, (timeRemaining / totalDuration) * 100) : 100;

  return (
    <div className="max-w-6xl mx-auto space-y-4">

      {/* Fix #9 — Network banner: full-width at very top */}
      {!proctoring.isOnline && (
        <div className="fixed top-16 left-0 right-0 z-50">
          <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg animate-pulse">
            <span>📡</span>
            <span className="font-medium text-sm">You are offline — answers are being queued and will sync when reconnected.</span>
          </div>
        </div>
      )}

      {/* Timer & Header */}
      <div className="sticky top-16 z-30 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-3 sm:p-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{exam?.title}</h2>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              Q {currentQuestionIndex + 1}/{questions.length}
              {/* Fix #17 — save indicator */}
              {saveStatus === 'saving' && <span className="text-blue-500 animate-pulse">● Saving...</span>}
              {saveStatus === 'failed' && <span className="text-red-500">⚠️ Save failed</span>}
            </p>
          </div>

          {/* Fix #3 — Proctoring badges always visible, icon-only on mobile */}
          <div className="flex items-center gap-1 sm:gap-2 text-xs flex-shrink-0">
            <div
              className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 rounded ${proctoring.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              title={proctoring.isOnline ? 'Online' : 'Offline'}
            >
              <span className="text-base">{proctoring.isOnline ? '📶' : '❌'}</span>
              <span className="hidden sm:inline font-medium">{proctoring.isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div
              className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 rounded ${proctoring.isFullscreen ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}
              title={proctoring.isFullscreen ? 'Fullscreen' : 'Windowed'}
            >
              <span className="text-base">{proctoring.isFullscreen ? '🖥️' : '⚠️'}</span>
              <span className="hidden sm:inline font-medium">{proctoring.isFullscreen ? 'Fullscreen' : 'Windowed'}</span>
            </div>
            {proctoring.weightedScore > 0 && (
              <div
                className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 rounded ${proctoring.weightedScore >= 5 ? 'bg-red-100 text-red-700' : proctoring.weightedScore >= 3 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}
                title={`Violations: ${proctoring.weightedScore}`}
              >
                <span className="text-base">⚠️</span>
                <span className="font-medium">{proctoring.weightedScore}</span>
              </div>
            )}
          </div>

          {/* Fix #2 — Timer larger on mobile */}
          <div className={`text-2xl sm:text-3xl font-bold tabular-nums flex-shrink-0 ${
            timeRemaining < 60 ? 'text-red-600' :
            timeRemaining < 300 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {formatTime(timeRemaining)}
          </div>

          <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPalette(!showPalette)}
              className="lg:hidden text-xs px-2 sm:px-3"
            >
              📋
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowConfirmSubmit(true)}
              disabled={submitting}
              className="text-xs px-2 sm:px-3"
            >
              Submit
            </Button>
          </div>
        </div>

        {/* Fix #2 — Timer progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className={`h-full transition-all duration-1000 ${
              timeRemaining < 60 ? 'bg-red-500' :
              timeRemaining < 300 ? 'bg-yellow-400' : 'bg-green-500'
            }`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* Fix #8 — Warnings at top-20 right, not bottom */}
      {proctoring.warnings.length > 0 && (
        <div className="fixed top-20 right-2 sm:right-4 z-50 space-y-2 max-w-[calc(100vw-1rem)] sm:max-w-sm">
          {proctoring.warnings.map((warning) => (
            <div
              key={warning.id}
              className={`p-3 sm:p-4 rounded-lg shadow-lg border-l-4 text-sm ${
                warning.type === 'high' ? 'bg-red-50 border-red-500' :
                warning.type === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                'bg-blue-50 border-blue-500'
              }`}
            >
              {warning.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Question Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Question */}
          <Card className="min-h-[300px]">
            {/* Fix #14 — userSelect none on question content */}
            <div className="space-y-6" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
              <div>
                <div className="text-lg text-gray-900 font-medium flex items-start gap-2">
                  <span>{currentQuestionIndex + 1}.</span>
                  {question?.question_type === 'IMAGE' ? (
                    <div className="w-full flex flex-col items-center gap-2">
                      <img
                        src={getImageUrl(question.image_url)}
                        alt="Question"
                        className="max-w-full h-auto object-contain rounded-lg border-2 border-gray-200 shadow-sm"
                        style={{ maxHeight: '500px' }}
                        loading="lazy"
                        onError={(e) => {
                          console.error('Failed to load image:', {
                            attemptedUrl: getImageUrl(question.image_url),
                            originalPath: question.image_url,
                            baseUrl: window.location.origin
                          });
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div className="hidden p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg text-yellow-800 text-center w-full">
                        <div className="font-semibold mb-2">
                          <i className="fas fa-exclamation-triangle mr-2"></i>
                          Unable to load question image
                        </div>
                        <div className="text-xs text-yellow-700 break-all">
                          URL: {getImageUrl(question.image_url)}
                        </div>
                        <div className="text-xs text-yellow-600 mt-1">
                          Please check: 1) Backend is running 2) Image exists on server 3) Check browser console for details
                        </div>
                      </div>
                    </div>
                  ) : (
                    <RichTextRenderer content={question?.question_text} />
                  )}
                </div>
                {question?.question_type === 'TEXT' && question?.image_url && (
                  <div className="mt-4 mb-4 flex justify-center">
                    <img
                      src={getImageUrl(question.image_url)}
                      alt="Question diagram"
                      className="max-w-full h-auto object-contain rounded-lg border-2 border-gray-200 shadow-sm"
                      style={{ maxHeight: '400px' }}
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {question?.marks > 1 && (
                  <span className="text-sm text-gray-500">({question.marks} marks)</span>
                )}
              </div>

              {/* Fix #4 — Touch targets increased to p-5 min-h-[52px] */}
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map((option) => {
                  const optionText = question?.[`option_${option.toLowerCase()}`];
                  const optionImage = question?.[`option_${option.toLowerCase()}_image_url`];
                  const hasText = optionText && optionText.trim();
                  const hasImage = optionImage;

                  return (
                    <button
                      key={option}
                      onClick={() => handleOptionSelect(option)}
                      disabled={submitting}
                      className={`w-full text-left p-5 min-h-[52px] rounded-lg border-2 transition-all ${
                        currentResponse === option
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-medium mt-0.5 flex-shrink-0">{option}.</span>
                        <div className="flex-1 flex flex-col gap-2">
                          {/* Render text if exists */}
                          {hasText && (
                            <RichTextRenderer content={optionText} />
                          )}
                          {/* Render image if exists */}
                          {hasImage && (
                            <div className="flex justify-center">
                              <img
                                src={getImageUrl(optionImage)}
                                alt={`Option ${option}`}
                                className="max-w-full h-auto object-contain rounded-lg border-2 border-gray-200 shadow-sm"
                                style={{ maxHeight: '250px' }}
                                loading="lazy"
                                onError={(e) => {
                                  console.error(`Failed to load option ${option} image:`, {
                                    attemptedUrl: getImageUrl(optionImage),
                                    originalPath: optionImage
                                  });
                                  e.target.style.display = 'none';
                                  // Show fallback text if image fails
                                  const fallback = document.createElement('div');
                                  fallback.className = 'p-3 bg-yellow-50 border border-yellow-400 rounded text-yellow-800 text-sm text-center';
                                  fallback.innerHTML = `<i class="fas fa-image mr-2"></i>Image not available`;
                                  e.target.parentNode.appendChild(fallback);
                                }}
                              />
                            </div>
                          )}
                          {/* Show placeholder if neither text nor image */}
                          {!hasText && !hasImage && (
                            <div className="text-gray-400 italic">No content</div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Mark for Review */}
              <div className="pt-4 border-t">
                <button
                  onClick={() => toggleReview(question?.id)}
                  disabled={submitting}
                  className={`flex items-center gap-2 px-4 py-3 min-h-[48px] rounded-lg border-2 transition-all ${
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

          {/* Fix #10 — Navigation buttons full-width on mobile */}
          {questions.length > 1 && (
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => handleNavigate(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0 || submitting}
                className="flex-1 py-3"
              >
                ⬅ Previous
              </Button>
              <Button
                onClick={() => handleNavigate(currentQuestionIndex + 1)}
                disabled={currentQuestionIndex === questions.length - 1 || submitting}
                className="flex-1 py-3"
              >
                Next ➡
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
                  <div className="w-6 h-6 bg-red-200 rounded text-red-800 text-xs flex items-center justify-center"></div>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 rounded text-white text-xs flex items-center justify-center">✓</div>
                  <span>Answered + Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-200 rounded border-2 border-purple-500 text-purple-800 text-xs flex items-center justify-center"></div>
                  <span>Marked for Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary-600 rounded text-white text-xs flex items-center justify-center ring-2 ring-primary-300"></div>
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

        {/* Fix #1 — Question Palette: Mobile Bottom-Sheet Modal */}
        {showPalette && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center lg:hidden"
            onClick={(e) => { if (e.target === e.currentTarget) setShowPalette(false); }}
          >
            <div className="w-full bg-white rounded-t-3xl max-h-[88vh] overflow-auto shadow-2xl animate-slide-up">
              {/* Drag handle */}
              <div className="flex flex-col items-center pt-3 pb-1 sticky top-0 bg-white border-b border-gray-100">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-3" />
                <div className="w-full flex items-center justify-between px-5 pb-3">
                  <h3 className="text-lg font-bold text-gray-900">Question Palette</h3>
                  <button
                    onClick={() => setShowPalette(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center bg-green-50 p-3 rounded-xl">
                    <div className="font-bold text-green-600 text-xl">{answeredCount}</div>
                    <div className="text-gray-500 text-xs">Answered</div>
                  </div>
                  <div className="text-center bg-red-50 p-3 rounded-xl">
                    <div className="font-bold text-red-600 text-xl">{notAnsweredCount}</div>
                    <div className="text-gray-500 text-xs">Unanswered</div>
                  </div>
                  <div className="text-center bg-purple-50 p-3 rounded-xl">
                    <div className="font-bold text-purple-600 text-xl">{reviewCount}</div>
                    <div className="text-gray-500 text-xs">Review</div>
                  </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 rounded text-white text-xs flex items-center justify-center flex-shrink-0">✓</div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-200 rounded flex-shrink-0"></div>
                    <span>Not Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-500 rounded text-white text-xs flex items-center justify-center flex-shrink-0">✓</div>
                    <span>Answered + Review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-200 rounded border-2 border-purple-500 flex-shrink-0"></div>
                    <span>Marked for Review</span>
                  </div>
                </div>

                {/* Question grid — larger buttons for touch */}
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {questions.map((_, idx) => {
                    const status = getQuestionStatus(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleNavigate(idx)}
                        className={`w-12 h-12 rounded-xl text-sm font-bold transition-all active:scale-95 ${getStatusColor(status)}`}
                        title={`Question ${idx + 1}: ${getStatusLabel(status)}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="pb-safe">
                  <Button onClick={() => setShowPalette(false)} variant="secondary" fullWidth className="py-3">
                    Close Palette
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fix #16 — Auto-Submit Error Modal */}
      {autoSubmitError && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-4xl mb-4 text-center">⏰</div>
            <h2 className="text-red-600 font-bold text-lg mb-2 text-center">Time's Up — Auto-Submit Failed</h2>
            <p className="text-gray-600 text-sm mb-5 text-center">
              Your time has expired but we couldn't submit automatically. Please tap the button below to submit your exam now.
            </p>
            <Button variant="danger" onClick={handleSubmit} fullWidth className="py-3">
              {submitting ? 'Submitting...' : '✅ Submit Exam Now'}
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Submit Exam?</h2>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Answered:</strong> {answeredCount} |{' '}
                  <strong className="ml-3">Unanswered:</strong> {notAnsweredCount} |{' '}
                  <strong className="ml-3">Review:</strong> {reviewCount}
                </p>
              </div>
              <p className="text-gray-700">
                Are you sure you want to submit? You cannot change your answers after submission.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleSubmit} variant="danger" className="flex-1 py-3">
                  Yes, Submit
                </Button>
                <Button onClick={() => setShowConfirmSubmit(false)} variant="secondary" className="flex-1 py-3">
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* AI Proctoring (Webcam + Face Detection) */}
      {examStarted && session?.id && (
        <AIProctoringWrapper
          sessionId={session.id}
          enabled={true}
          lookingAwayThreshold={exam?.looking_away_threshold || 5}
        />
      )}
    </div>
  );
};

export default ExamPage;
