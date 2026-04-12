const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const proctoringService = require('../modules/proctoring/proctoring.service');

// Store active connections
const activeConnections = new Map();
const studentSessions = new Map(); // sessionId -> socketId
const adminConnections = new Map(); // adminId -> socketId

let io = null;

/**
 * Initialize Socket.io server
 */
const initializeSocket = (server, app) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      logger.error('WebSocket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`, {
      userId: socket.userId,
      role: socket.userRole,
    });

    if (socket.userRole === 'ADMIN') {
      handleAdminConnection(socket);
    } else {
      handleStudentConnection(socket);
    }

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id}`, { reason });
      handleDisconnection(socket);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error (${socket.id}):`, error);
    });
  });

  logger.info('Socket.io server initialized');
  return io;
};

/**
 * Handle admin connection
 */
const handleAdminConnection = (socket) => {
  adminConnections.set(socket.userId, socket.id);

  // Join admin room
  socket.join('admin_room');

  // Join specific exam rooms when requested
  socket.on('join_exam_room', ({ examId }) => {
    if (!examId) {
      socket.emit('error', { message: 'Exam ID is required' });
      return;
    }

    socket.join(`exam_${examId}`);
    logger.info(`Admin ${socket.userId} joined exam room: exam_${examId}`);

    // Send current active sessions for this exam
    sendActiveSessionsToAdmin(socket, examId);
  });

  socket.on('leave_exam_room', ({ examId }) => {
    socket.leave(`exam_${examId}`);
    logger.info(`Admin ${socket.userId} left exam room: exam_${examId}`);
  });

  // Send warning to specific student
  socket.on('send_student_warning', async ({ sessionId, examId, message }) => {
    try {
      const socketId = studentSessions.get(sessionId);
      if (socketId) {
        io.to(socketId).emit('admin_warning', {
          examId,
          message,
          timestamp: new Date().toISOString(),
        });
        logger.info(`Warning sent to student session ${sessionId}`);
      } else {
        socket.emit('error', { message: 'Student not currently connected' });
      }
    } catch (error) {
      logger.error('Error sending student warning:', error);
      socket.emit('error', { message: 'Failed to send warning' });
    }
  });

  // Pause all students in exam
  socket.on('pause_exam', async ({ examId }) => {
    try {
      io.to(`exam_${examId}`).emit('exam_paused', {
        examId,
        timestamp: new Date().toISOString(),
      });
      logger.info(`Exam ${examId} paused by admin ${socket.userId}`);
    } catch (error) {
      logger.error('Error pausing exam:', error);
      socket.emit('error', { message: 'Failed to pause exam' });
    }
  });

  // Resume all students in exam
  socket.on('resume_exam', async ({ examId }) => {
    try {
      io.to(`exam_${examId}`).emit('exam_resumed', {
        examId,
        timestamp: new Date().toISOString(),
      });
      logger.info(`Exam ${examId} resumed by admin ${socket.userId}`);
    } catch (error) {
      logger.error('Error resuming exam:', error);
      socket.emit('error', { message: 'Failed to resume exam' });
    }
  });
};

/**
 * Handle student connection
 */
const handleStudentConnection = (socket) => {
  // Student joins their session room
  socket.on('join_session', async ({ sessionId, examId }) => {
    try {
      if (!sessionId || !examId) {
        socket.emit('error', { message: 'Session ID and Exam ID are required' });
        return;
      }

      // Verify student owns this session
      const session = await proctoringService.getSessionById(sessionId);
      if (!session || session.user_id !== socket.userId) {
        socket.emit('error', { message: 'Unauthorized access to session' });
        return;
      }

      socket.join(`session_${sessionId}`);
      socket.join(`exam_${examId}`);

      studentSessions.set(sessionId, socket.id);
      activeConnections.set(socket.id, {
        sessionId,
        examId,
        userId: socket.userId,
        connectedAt: new Date().toISOString(),
      });

      logger.info(`Student ${socket.userId} joined session: ${sessionId}, exam: ${examId}`);

      // Notify admin room
      io.to('admin_room').emit('student_joined', {
        sessionId,
        examId,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });

      // Notify exam room admins
      io.to(`exam_${examId}`).emit('student_connected', {
        sessionId,
        examId,
        timestamp: new Date().toISOString(),
      });

      socket.emit('session_joined', {
        sessionId,
        examId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error joining session:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  // Handle violation events from student
  socket.on('violation', async (data) => {
    try {
      const { sessionId, examId, type, severity, metadata, timestamp } = data;

      // Rate limiting: max 1 violation per 2 seconds
      const lastViolation = socket.lastViolationTime || 0;
      const now = Date.now();
      if (now - lastViolation < 2000) {
        logger.warn(`Violation rate limited for session ${sessionId}`);
        return;
      }
      socket.lastViolationTime = now;

      // Broadcast to admins in exam room
      const session = await proctoringService.getSessionById(sessionId);
      const violationData = {
        sessionId,
        examId,
        studentName: session?.user_name || 'Unknown',
        studentEmail: session?.user_email || 'Unknown',
        violation: {
          type,
          severity,
          metadata,
          timestamp,
        },
        currentRiskLevel: calculateRiskLevel(session?.violation_count || 0, severity),
        totalViolations: (session?.violation_count || 0) + 1,
        timestamp: new Date().toISOString(),
      };

      io.to(`exam_${examId}`).emit('violation_alert', violationData);
      io.to('admin_room').emit('violation_alert', violationData);

      logger.info(`Violation broadcast: ${type} (${severity}) for session ${sessionId}`);
    } catch (error) {
      logger.error('Error broadcasting violation:', error);
    }
  });

  // Handle heartbeat
  socket.on('heartbeat', ({ sessionId, examId, status }) => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.lastHeartbeat = new Date().toISOString();
      connection.status = status;
    }

    // Broadcast to admins
    io.to(`exam_${examId}`).emit('student_heartbeat', {
      sessionId,
      examId,
      status,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle exam start
  socket.on('exam_started', async ({ sessionId, examId }) => {
    try {
      io.to(`exam_${examId}`).emit('student_started_exam', {
        sessionId,
        examId,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });

      io.to('admin_room').emit('student_started_exam', {
        sessionId,
        examId,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Student ${socket.userId} started exam: ${examId}`);
    } catch (error) {
      logger.error('Error broadcasting exam start:', error);
    }
  });

  // Handle exam submission
  socket.on('exam_submitted', async ({ sessionId, examId, submissionTime }) => {
    try {
      studentSessions.delete(sessionId);
      activeConnections.delete(socket.id);

      io.to(`exam_${examId}`).emit('student_submitted_exam', {
        sessionId,
        examId,
        userId: socket.userId,
        submissionTime,
        timestamp: new Date().toISOString(),
      });

      io.to('admin_room').emit('student_submitted_exam', {
        sessionId,
        examId,
        userId: socket.userId,
        submissionTime,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Student ${socket.userId} submitted exam: ${examId}`);
    } catch (error) {
      logger.error('Error broadcasting exam submission:', error);
    }
  });

  // Handle auto-submission
  socket.on('auto_submitted', async ({ sessionId, examId, reason }) => {
    try {
      studentSessions.delete(sessionId);
      activeConnections.delete(socket.id);

      io.to(`exam_${examId}`).emit('student_auto_submitted', {
        sessionId,
        examId,
        userId: socket.userId,
        reason,
        timestamp: new Date().toISOString(),
      });

      io.to('admin_room').emit('student_auto_submitted', {
        sessionId,
        examId,
        userId: socket.userId,
        reason,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Student ${socket.userId} auto-submitted exam: ${examId}, reason: ${reason}`);
    } catch (error) {
      logger.error('Error broadcasting auto-submission:', error);
    }
  });
};

/**
 * Handle disconnection
 */
const handleDisconnection = (socket) => {
  const connection = activeConnections.get(socket.id);
  if (connection) {
    studentSessions.delete(connection.sessionId);
    activeConnections.delete(socket.id);

    // Notify admins
    io.to(`exam_${connection.examId}`).emit('student_disconnected', {
      sessionId: connection.sessionId,
      examId: connection.examId,
      userId: connection.userId,
      timestamp: new Date().toISOString(),
    });

    io.to('admin_room').emit('student_disconnected', {
      sessionId: connection.sessionId,
      examId: connection.examId,
      userId: connection.userId,
      timestamp: new Date().toISOString(),
    });
  }

  if (adminConnections.has(socket.userId)) {
    adminConnections.delete(socket.userId);
  }
};

/**
 * Send active sessions to admin when joining exam room
 */
const sendActiveSessionsToAdmin = async (socket, examId) => {
  try {
    const sessions = await proctoringService.getActiveSessionsForExam(examId);
    socket.emit('active_sessions', {
      examId,
      sessions: sessions.map((s) => ({
        sessionId: s.id,
        userId: s.user_id,
        userName: s.user_name,
        status: s.status,
        violationCount: s.violation_count,
        startedAt: s.started_at,
        lastActivityAt: s.last_activity_at,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error sending active sessions:', error);
    socket.emit('error', { message: 'Failed to load active sessions' });
  }
};

/**
 * Calculate risk level based on violation count and severity
 */
const calculateRiskLevel = (currentScore, newSeverity) => {
  const weights = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 5 };
  const newScore = currentScore + (weights[newSeverity] || 0);

  if (newScore >= 15) return 'CRITICAL';
  if (newScore >= 10) return 'HIGH';
  if (newScore >= 5) return 'MEDIUM';
  return 'LOW';
};

/**
 * Broadcast live stats to admins
 */
const broadcastLiveStats = async (examId) => {
  if (!io) return;

  try {
    const stats = await proctoringService.getExamViolationStats(examId);
    io.to(`exam_${examId}`).emit('live_stats', {
      examId,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error broadcasting live stats:', error);
  }
};

/**
 * Get Socket.io instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
};

/**
 * Emit to specific student session
 */
const emitToSession = (sessionId, event, data) => {
  if (!io) return;

  const socketId = studentSessions.get(sessionId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

/**
 * Emit to all students in exam
 */
const emitToExam = (examId, event, data) => {
  if (!io) return;

  io.to(`exam_${examId}`).emit(event, data);
};

/**
 * Get active connections count
 */
const getConnectionStats = () => ({
  totalConnections: activeConnections.size,
  adminConnections: adminConnections.size,
  studentSessions: studentSessions.size,
  activeSessions: Array.from(activeConnections.values()),
});

module.exports = {
  initializeSocket,
  getIO,
  emitToSession,
  emitToExam,
  broadcastLiveStats,
  getConnectionStats,
};
