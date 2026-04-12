import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * WebSocket hook for students taking exams
 * Emits real-time events to admin dashboard
 */
const useWebSocket = ({ sessionId, examId, authToken }) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [adminWarning, setAdminWarning] = useState(null);
  const [examPaused, setExamPaused] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize socket connection
  useEffect(() => {
    if (!authToken || !sessionId || !examId) {
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[WebSocket] Connected:', socket.id);
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Join session room
      socket.emit('join_session', { sessionId, examId });
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);
      reconnectAttempts.current += 1;
    });

    socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error.message);
    });

    // Admin events
    socket.on('admin_warning', (data) => {
      console.log('[WebSocket] Admin warning:', data);
      setAdminWarning({
        message: data.message,
        timestamp: data.timestamp,
      });
      // Auto-clear warning after 10 seconds
      setTimeout(() => setAdminWarning(null), 10000);
    });

    socket.on('exam_paused', (data) => {
      console.log('[WebSocket] Exam paused:', data);
      setExamPaused(true);
    });

    socket.on('exam_resumed', (data) => {
      console.log('[WebSocket] Exam resumed:', data);
      setExamPaused(false);
    });

    socket.on('session_joined', (data) => {
      console.log('[WebSocket] Session joined:', data);
    });

    // Cleanup on unmount
    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [authToken, sessionId, examId]);

  // Emit violation event
  const emitViolation = useCallback((violationData) => {
    if (!socketRef.current?.connected) {
      console.warn('[WebSocket] Cannot emit violation: not connected');
      return;
    }

    try {
      socketRef.current.emit('violation', {
        sessionId,
        examId,
        ...violationData,
      });
    } catch (error) {
      console.error('[WebSocket] Error emitting violation:', error);
    }
  }, [sessionId, examId]);

  // Emit heartbeat
  const emitHeartbeat = useCallback((status = 'active') => {
    if (!socketRef.current?.connected) {
      return;
    }

    try {
      socketRef.current.emit('heartbeat', {
        sessionId,
        examId,
        status,
      });
    } catch (error) {
      console.error('[WebSocket] Error emitting heartbeat:', error);
    }
  }, [sessionId, examId]);

  // Emit exam started
  const emitExamStarted = useCallback(() => {
    if (!socketRef.current?.connected) {
      return;
    }

    try {
      socketRef.current.emit('exam_started', {
        sessionId,
        examId,
      });
    } catch (error) {
      console.error('[WebSocket] Error emitting exam started:', error);
    }
  }, [sessionId, examId]);

  // Emit exam submitted
  const emitExamSubmitted = useCallback((submissionTime) => {
    if (!socketRef.current?.connected) {
      return;
    }

    try {
      socketRef.current.emit('exam_submitted', {
        sessionId,
        examId,
        submissionTime,
      });
    } catch (error) {
      console.error('[WebSocket] Error emitting exam submitted:', error);
    }
  }, [sessionId, examId]);

  // Emit auto-submission
  const emitAutoSubmitted = useCallback((reason) => {
    if (!socketRef.current?.connected) {
      return;
    }

    try {
      socketRef.current.emit('auto_submitted', {
        sessionId,
        examId,
        reason,
      });
    } catch (error) {
      console.error('[WebSocket] Error emitting auto-submitted:', error);
    }
  }, [sessionId, examId]);

  // Heartbeat interval
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const interval = setInterval(() => {
      emitHeartbeat('active');
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, emitHeartbeat]);

  return {
    isConnected,
    adminWarning,
    examPaused,
    emitViolation,
    emitHeartbeat,
    emitExamStarted,
    emitExamSubmitted,
    emitAutoSubmitted,
  };
};

export default useWebSocket;
