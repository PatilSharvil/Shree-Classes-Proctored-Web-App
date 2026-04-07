import { useEffect, useRef, useCallback, useState } from 'react';
import { proctoringAPI } from '../services/api';

// Violation severity levels
const SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Violation types
const VIOLATION_TYPES = {
  TAB_SWITCH: 'TAB_SWITCH',
  WINDOW_BLUR: 'WINDOW_BLUR',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  VISIBILITY_CHANGE: 'VISIBILITY_CHANGE',
  NETWORK_LOST: 'NETWORK_LOST',
  NETWORK_RESTORED: 'NETWORK_RESTORED',
  COPY_ATTEMPT: 'COPY_ATTEMPT',
  PASTE_ATTEMPT: 'PASTE_ATTEMPT',
  PRINT_ATTEMPT: 'PRINT_ATTEMPT',
  DEVTOOLS_OPEN: 'DEVTOOLS_OPEN',
  SCREEN_SHARE: 'SCREEN_SHARE',
  MULTIPLE_TABS: 'MULTIPLE_TABS',
  IDLE_TIMEOUT: 'IDLE_TIMEOUT',
  RAPID_TAB_SWITCH: 'RAPID_TAB_SWITCH',
  MOBILE_APP_SWITCH: 'MOBILE_APP_SWITCH',
  SCREEN_OFF: 'SCREEN_OFF',
  BROWSER_MINIMIZED: 'BROWSER_MINIMIZED'
};

// Event types for activity logging
const EVENT_TYPES = {
  EXAM_START: 'EXAM_START',
  EXAM_SUBMIT: 'EXAM_SUBMIT',
  QUESTION_NAVIGATE: 'QUESTION_NAVIGATE',
  ANSWER_SAVE: 'ANSWER_SAVE',
  FLAG_QUESTION: 'FLAG_QUESTION',
  TIMER_WARNING: 'TIMER_WARNING',
  WARNING_DISPLAYED: 'WARNING_DISPLAYED',
  CONNECTION_CHANGE: 'CONNECTION_CHANGE',
  FOCUS_LOST: 'FOCUS_LOST',
  FOCUS_GAINED: 'FOCUS_GAINED'
};

export const useProctoring = (sessionId, config = {}) => {
  const {
    onViolationThreshold,
    onViolation,
    enableFullscreen = true,
    enableTabSwitch = true,
    enableNetworkMonitor = true,
    enableClipboardMonitor = true,
    enableIdleDetect = true,
    idleTimeoutMs = 10 * 60 * 1000, // Fix #15 — increased to 10 minutes
    violationThreshold = 5
  } = config;

  // State
  const [violationCount, setViolationCount] = useState(0);
  const [weightedScore, setWeightedScore] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isIdle, setIsIdle] = useState(false);
  const [warnings, setWarnings] = useState([]);

  // Refs
  const violationCountRef = useRef(0);
  const weightedScoreRef = useRef(0);
  const tabSwitchTimesRef = useRef([]);
  const idleTimerRef = useRef(null);
  const sessionIdRef = useRef(sessionId);
  const activityQueueRef = useRef([]);
  const isSendingRef = useRef(false);
  const violationSeverityWeights = useRef({
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 5
  });

  // Update session ID ref
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Add warning to local state with auto-dismiss
  const addWarning = useCallback((message, type) => {
    const id = Date.now() + Math.random();
    const warning = {
      id,
      message,
      type,
      timestamp: new Date().toISOString()
    };
    setWarnings(prev => [...prev.slice(-4), warning]); // Keep last 5 warnings

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setWarnings(prev => prev.filter(w => w.id !== id));
    }, 5000);

    return warning;
  }, []);

  // Remove warning after timeout
  const removeWarning = useCallback((id) => {
    setWarnings(prev => prev.filter(w => w.id !== id));
  }, []);

  // Send queued activity logs
  const flushActivityQueue = useCallback(async () => {
    if (isSendingRef.current || activityQueueRef.current.length === 0) return;
    
    isSendingRef.current = true;
    const queue = [...activityQueueRef.current];
    activityQueueRef.current = [];

    try {
      await Promise.all(queue.map(log => 
        proctoringAPI.logActivity(log).catch(err => console.error('Failed to log activity:', err))
      ));
    } finally {
      isSendingRef.current = false;
    }
  }, []);

  // Queue activity log
  const queueActivityLog = useCallback((eventType, eventData = {}, isViolation = false) => {
    activityQueueRef.current.push({
      sessionId: sessionIdRef.current,
      eventType,
      eventData,
      isViolation
    });

    // Flush queue every 5 logs or after 10 seconds
    if (activityQueueRef.current.length >= 5) {
      flushActivityQueue();
    }
  }, [flushActivityQueue]);

  // Record violation
  const recordViolation = useCallback(async (type, description, severity = SEVERITY.MEDIUM, metadata = {}) => {
    try {
      const result = await proctoringAPI.recordViolation({
        sessionId: sessionIdRef.current,
        type,
        description,
        severity,
        metadata
      });

      const data = result.data.data;
      
      // Backend returns weighted score in violation_count field
      // Track violation count separately (increment by 1 for each violation)
      const newViolationCount = violationCountRef.current + 1;
      const newWeightedScore = data.totalViolations || weightedScoreRef.current;
      
      violationCountRef.current = newViolationCount;
      weightedScoreRef.current = newWeightedScore;
      setViolationCount(newViolationCount);
      setWeightedScore(newWeightedScore);

      console.log(`[Proctoring] Violation recorded: ${type} | Severity: ${severity} | Count: ${newViolationCount} | Weighted Score: ${newWeightedScore}`);

      // Log the violation as activity
      queueActivityLog(`VIOLATION_${type}`, { description, severity, metadata }, true);

      // Call onViolation callback
      if (onViolation) {
        onViolation({ type, description, severity, totalViolations: newViolationCount, weightedScore: newWeightedScore });
      }

      // Check threshold - use weighted score for auto-submit decision
      if (onViolationThreshold && newWeightedScore >= violationThreshold) {
        onViolationThreshold(newWeightedScore);
      }

      return data;
    } catch (error) {
      console.error('Failed to record violation:', error);
      return null;
    }
  }, [onViolation, onViolationThreshold, violationThreshold, queueActivityLog]);

  // Handle visibility change (tab switch)
  const handleVisibilityChange = useCallback(async () => {
    if (!enableTabSwitch) return;

    const now = Date.now();
    
    if (document.hidden) {
      // Track tab switch times for rapid switching detection
      tabSwitchTimesRef.current.push(now);
      tabSwitchTimesRef.current = tabSwitchTimesRef.current.filter(
        t => now - t < 60000 // Keep switches within last minute
      );

      // Detect rapid tab switching (3+ times in a minute = HIGH severity)
      if (tabSwitchTimesRef.current.length >= 3) {
        await recordViolation(
          VIOLATION_TYPES.RAPID_TAB_SWITCH,
          'Rapid tab switching detected (3+ times in 1 minute)',
          SEVERITY.HIGH,
          { switchCount: tabSwitchTimesRef.current.length }
        );
        addWarning('⚠️ Rapid tab switching detected! This is a serious violation.', 'high');
      } else {
        await recordViolation(
          VIOLATION_TYPES.TAB_SWITCH,
          'User switched tabs or minimized window',
          SEVERITY.MEDIUM,
          { switchCount: tabSwitchTimesRef.current.length }
        );
        addWarning(`⚠️ Warning ${violationCountRef.current + 1}: Please stay on this page during the exam.`, 'medium');
      }

      // Log focus lost
      queueActivityLog(EVENT_TYPES.FOCUS_LOST, { reason: 'visibility_change' });
    } else {
      // Page is visible again
      queueActivityLog(EVENT_TYPES.FOCUS_GAINED, { timestamp: new Date().toISOString() });
    }
  }, [enableTabSwitch, recordViolation, addWarning, queueActivityLog]);

  // Handle window blur
  const handleWindowBlur = useCallback(async () => {
    if (!enableTabSwitch) return;
    
    queueActivityLog(EVENT_TYPES.FOCUS_LOST, { reason: 'window_blur' });
    
    // Only record as violation if not already hidden (avoid double counting)
    if (!document.hidden) {
      await recordViolation(
        VIOLATION_TYPES.WINDOW_BLUR,
        'Exam window lost focus',
        SEVERITY.LOW,
        { timestamp: new Date().toISOString() }
      );
    }
  }, [enableTabSwitch, recordViolation, queueActivityLog]);

  // Handle fullscreen change
  const handleFullscreenChange = useCallback(async () => {
    if (!enableFullscreen) return;

    const isCurrentlyFullscreen = !!document.fullscreenElement;
    setIsFullscreen(isCurrentlyFullscreen);

    if (!isCurrentlyFullscreen && document.visibilityState === 'visible') {
      await recordViolation(
        VIOLATION_TYPES.FULLSCREEN_EXIT,
        'User exited full-screen mode',
        SEVERITY.MEDIUM,
        { timestamp: new Date().toISOString() }
      );
      addWarning('⚠️ Full-screen mode is required for this exam.', 'medium');
    }
  }, [enableFullscreen, recordViolation, addWarning]);

  // Handle network status change
  const handleNetworkChange = useCallback(async () => {
    if (!enableNetworkMonitor) return;

    const online = navigator.onLine;
    setIsOnline(online);

    if (online) {
      await recordViolation(
        VIOLATION_TYPES.NETWORK_RESTORED,
        'Network connection restored',
        SEVERITY.LOW,
        { timestamp: new Date().toISOString() }
      );
      queueActivityLog(EVENT_TYPES.CONNECTION_CHANGE, { status: 'online' });
    } else {
      await recordViolation(
        VIOLATION_TYPES.NETWORK_LOST,
        'Network connection lost',
        SEVERITY.MEDIUM,
        { timestamp: new Date().toISOString() }
      );
      queueActivityLog(EVENT_TYPES.CONNECTION_CHANGE, { status: 'offline' });
      addWarning('⚠️ Network connection lost. Your answers may not be saved.', 'high');
    }
  }, [enableNetworkMonitor, recordViolation, queueActivityLog, addWarning]);

  // Handle clipboard events (copy/paste)
  const handleClipboardEvent = useCallback(async (e) => {
    if (!enableClipboardMonitor) return;

    const type = e.type === 'copy' || e.type === 'cut' ? 'copy' : 'paste';
    const violationType = type === 'copy' ? VIOLATION_TYPES.COPY_ATTEMPT : VIOLATION_TYPES.PASTE_ATTEMPT;
    const description = type === 'copy' 
      ? 'Copy attempt detected during exam' 
      : 'Paste attempt detected during exam';

    await recordViolation(
      violationType,
      description,
      SEVERITY.HIGH,
      { timestamp: new Date().toISOString() }
    );
    addWarning('⚠️ Copy/Paste is not allowed during the exam!', 'high');
  }, [enableClipboardMonitor, recordViolation, addWarning]);

  // Handle print attempt
  const handlePrintAttempt = useCallback(async () => {
    await recordViolation(
      VIOLATION_TYPES.PRINT_ATTEMPT,
      'Print attempt detected during exam',
      SEVERITY.HIGH,
      { timestamp: new Date().toISOString() }
    );
    addWarning('⚠️ Printing is not allowed during the exam!', 'high');
  }, [recordViolation, addWarning]);

  // Handle idle detection
  const resetIdleTimer = useCallback(() => {
    if (!enableIdleDetect) return;

    setLastActivity(Date.now());
    setIsIdle(false);

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(async () => {
      setIsIdle(true);
      await recordViolation(
        VIOLATION_TYPES.IDLE_TIMEOUT,
        `No activity detected for ${idleTimeoutMs / 1000 / 60} minutes`,
        SEVERITY.MEDIUM,
        { idleDurationMs: idleTimeoutMs }
      );
      addWarning('⚠️ No activity detected. Are you still there?', 'medium');
    }, idleTimeoutMs);
  }, [enableIdleDetect, idleTimeoutMs, recordViolation, addWarning]);

  // Handle before unload
  const handleBeforeUnload = useCallback((e) => {
    e.preventDefault();
    e.returnValue = 'Are you sure you want to leave? Your exam will be auto-submitted.';
    return e.returnValue;
  }, []);

  // Request fullscreen
  const requestFullscreen = useCallback(async () => {
    if (!enableFullscreen) return false;

    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
        setIsFullscreen(true);
        return true;
      }
    } catch (err) {
      console.warn('Fullscreen request denied:', err);
      setIsFullscreen(false);
      return false;
    }
  }, [enableFullscreen]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.warn('Exit fullscreen failed:', err);
      }
    }
  }, []);

  // Clear warnings
  const clearWarnings = useCallback(() => {
    setWarnings([]);
  }, []);

  // Initialize proctoring
  useEffect(() => {
    if (!sessionId) return;

    // Log exam start
    queueActivityLog(EVENT_TYPES.EXAM_START, {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      isOnline: navigator.onLine
    });

    // Fix #14 — Prevent right-click / long-press context menu on mobile
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // Event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', resetIdleTimer);
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);
    window.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('copy', handleClipboardEvent);
    window.addEventListener('cut', handleClipboardEvent);
    window.addEventListener('paste', handleClipboardEvent);
    window.addEventListener('print', handlePrintAttempt);

    // Initial idle timer setup
    resetIdleTimer();

    // Periodic activity queue flush
    const flushInterval = setInterval(flushActivityQueue, 10000); // Every 10 seconds

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', resetIdleTimer);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
      window.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('copy', handleClipboardEvent);
      window.removeEventListener('cut', handleClipboardEvent);
      window.removeEventListener('paste', handleClipboardEvent);
      window.removeEventListener('print', handlePrintAttempt);

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      clearInterval(flushInterval);
      flushActivityQueue(); // Flush remaining logs

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [
    sessionId,
    handleVisibilityChange,
    handleWindowBlur,
    handleFullscreenChange,
    handleNetworkChange,
    handleClipboardEvent,
    handlePrintAttempt,
    handleBeforeUnload,
    resetIdleTimer,
    queueActivityLog,
    flushActivityQueue
  ]);

  // Log exam submission
  const logExamSubmit = useCallback(() => {
    queueActivityLog(EVENT_TYPES.EXAM_SUBMIT, {
      timestamp: new Date().toISOString(),
      finalViolationCount: violationCountRef.current,
      finalWeightedScore: weightedScoreRef.current
    });
    flushActivityQueue();
  }, [queueActivityLog, flushActivityQueue]);

  return {
    // State
    violationCount,
    weightedScore,
    isOnline,
    isFullscreen,
    isIdle,
    warnings,
    lastActivity,

    // Actions
    recordViolation,
    requestFullscreen,
    exitFullscreen,
    logExamSubmit,
    clearWarnings,
    queueActivityLog,

    // Event types and violation types for external use
    EVENT_TYPES,
    VIOLATION_TYPES,
    SEVERITY
  };
};

export { EVENT_TYPES, VIOLATION_TYPES, SEVERITY };
