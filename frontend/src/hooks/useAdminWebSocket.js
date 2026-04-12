import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * WebSocket hook for admin real-time proctoring dashboard
 * Receives live updates from students taking exams
 */
const useAdminWebSocket = (examId, authToken) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [liveStats, setLiveStats] = useState(null);

  // Real-time student tracking
  const [studentUpdates, setStudentUpdates] = useState({});
  const [violations, setViolations] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Initialize socket connection
  useEffect(() => {
    if (!authToken) {
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[Admin WS] Connected:', socket.id);
      setIsConnected(true);

      // Join admin room
      socket.emit('join_admin_room');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Admin WS] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[Admin WS] Connection error:', error.message);
    });

    socket.on('error', (error) => {
      console.error('[Admin WS] Error:', error.message);
      addNotification('error', error.message);
    });

    // Cleanup on unmount
    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [authToken]);

  // Join exam room when examId changes
  useEffect(() => {
    if (!socketRef.current?.connected || !examId) {
      return;
    }

    console.log('[Admin WS] Joining exam room:', examId);
    socketRef.current.emit('join_exam_room', { examId });

    return () => {
      socketRef.current?.emit('leave_exam_room', { examId });
    };
  }, [examId]);

  // Listen to live events
  useEffect(() => {
    if (!socketRef.current) {
      return;
    }

    const socket = socketRef.current;

    // Violation alerts
    socket.on('violation_alert', (data) => {
      console.log('[Admin WS] Violation alert:', data);
      setViolations((prev) => [data, ...prev].slice(0, 100)); // Keep last 100
      addNotification('violation', `${data.studentName}: ${data.violation.type}`, data);
      updateStudent(data.sessionId, data);
    });

    // Student joined
    socket.on('student_joined', (data) => {
      console.log('[Admin WS] Student joined:', data);
      addNotification('info', `Student joined exam`, data);
    });

    socket.on('student_connected', (data) => {
      console.log('[Admin WS] Student connected:', data);
    });

    // Student started exam
    socket.on('student_started_exam', (data) => {
      console.log('[Admin WS] Student started exam:', data);
      addNotification('success', `Student started exam`, data);
      updateStudent(data.sessionId, { ...data, status: 'IN_PROGRESS' });
    });

    // Student submitted exam
    socket.on('student_submitted_exam', (data) => {
      console.log('[Admin WS] Student submitted exam:', data);
      addNotification('success', `Student submitted exam`, data);
      updateStudent(data.sessionId, { ...data, status: 'SUBMITTED' });
    });

    // Student auto-submitted
    socket.on('student_auto_submitted', (data) => {
      console.log('[Admin WS] Student auto-submitted:', data);
      addNotification('warning', `Student auto-submitted: ${data.reason}`, data);
      updateStudent(data.sessionId, { ...data, status: 'AUTO_SUBMITTED', autoSubmitReason: data.reason });
    });

    // Student disconnected
    socket.on('student_disconnected', (data) => {
      console.log('[Admin WS] Student disconnected:', data);
      addNotification('warning', `Student disconnected`, data);
      updateStudent(data.sessionId, { ...data, status: 'DISCONNECTED' });
    });

    // Active sessions update
    socket.on('active_sessions', (data) => {
      console.log('[Admin WS] Active sessions:', data);
      setActiveSessions(data.sessions || []);
    });

    // Live stats
    socket.on('live_stats', (data) => {
      console.log('[Admin WS] Live stats:', data);
      setLiveStats(data.stats);
    });

    // Student heartbeat
    socket.on('student_heartbeat', (data) => {
      updateStudent(data.sessionId, { lastHeartbeat: data.timestamp, status: data.status });
    });

    // Cleanup listeners
    return () => {
      socket.off('violation_alert');
      socket.off('student_joined');
      socket.off('student_connected');
      socket.off('student_started_exam');
      socket.off('student_submitted_exam');
      socket.off('student_auto_submitted');
      socket.off('student_disconnected');
      socket.off('active_sessions');
      socket.off('live_stats');
      socket.off('student_heartbeat');
    };
  }, [examId]);

  // Helper: Add notification
  const addNotification = useCallback((type, message, data = {}) => {
    const notification = {
      id: `notif_${Date.now()}_${Math.random()}`,
      type, // 'violation', 'warning', 'success', 'info', 'error'
      message,
      data,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50
    setLiveEvents((prev) => [notification, ...prev].slice(0, 200)); // Keep last 200
  }, []);

  // Helper: Update student state
  const updateStudent = useCallback((sessionId, updates) => {
    setStudentUpdates((prev) => ({
      ...prev,
      [sessionId]: {
        ...(prev[sessionId] || {}),
        ...updates,
        lastUpdate: new Date().toISOString(),
      },
    }));
  }, []);

  // Send warning to student
  const sendWarningToStudent = useCallback((sessionId, examId, message) => {
    if (!socketRef.current?.connected) {
      console.error('[Admin WS] Cannot send warning: not connected');
      return;
    }

    socketRef.current.emit('send_student_warning', {
      sessionId,
      examId,
      message,
    });

    addNotification('info', `Warning sent to student`, { sessionId, message });
  }, [addNotification]);

  // Pause exam for all students
  const pauseExam = useCallback((examId) => {
    if (!socketRef.current?.connected) {
      console.error('[Admin WS] Cannot pause exam: not connected');
      return;
    }

    socketRef.current.emit('pause_exam', { examId });
    addNotification('warning', `Exam paused`, { examId });
  }, [addNotification]);

  // Resume exam for all students
  const resumeExam = useCallback((examId) => {
    if (!socketRef.current?.connected) {
      console.error('[Admin WS] Cannot resume exam: not connected');
      return;
    }

    socketRef.current.emit('resume_exam', { examId });
    addNotification('success', `Exam resumed`, { examId });
  }, [addNotification]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  return {
    isConnected,
    liveEvents,
    activeSessions,
    liveStats,
    studentUpdates,
    violations,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    sendWarningToStudent,
    pauseExam,
    resumeExam,
    clearNotifications,
    markAsRead,
  };
};

export default useAdminWebSocket;
