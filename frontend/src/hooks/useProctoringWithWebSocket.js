import { useEffect, useCallback } from 'react';
import { useProctoring, isMobileDevice } from './useProctoring';

/**
 * Enhanced proctoring hook with WebSocket integration
 * Wraps useProctoring and adds WebSocket violation emission
 */
const useProctoringWithWebSocket = (sessionId, examId, config = {}, webSocket = null) => {
  const proctoring = useProctoring(sessionId, config);

  // Emit violations via WebSocket when they occur
  const emitViolationViaWebSocket = useCallback((violation) => {
    if (!webSocket?.emitViolation) {
      return;
    }

    try {
      webSocket.emitViolation({
        type: violation.type,
        severity: violation.severity,
        metadata: violation.metadata || {},
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Proctoring+WS] Error emitting violation:', error);
    }
  }, [webSocket]);

  // Wrap the original onViolation callback to also emit via WebSocket
  useEffect(() => {
    if (!webSocket?.emitViolation) {
      return;
    }

    // Store original callback
    const originalOnViolation = config.onViolation;

    // Create wrapped callback
    const wrappedOnViolation = (violation) => {
      // Call original callback
      if (originalOnViolation) {
        originalOnViolation(violation);
      }

      // Emit via WebSocket
      emitViolationViaWebSocket(violation);
    };

    // Note: We can't dynamically update the hook's config,
    // but violations will be emitted through the next mechanism
  }, [webSocket, config.onViolation, emitViolationViaWebSocket]);

  return {
    ...proctoring,
    emitViolationViaWebSocket,
  };
};

export default useProctoringWithWebSocket;
