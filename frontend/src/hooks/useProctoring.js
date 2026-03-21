import { useEffect, useRef, useCallback } from 'react';
import useExamStore from '../store/examStore';
import { proctoringAPI } from '../services/api';

export const useProctoring = (sessionId, onViolationThreshold) => {
  const warningCountRef = useRef(0);
  const { addViolation } = useExamStore();

  const handleVisibilityChange = useCallback(async () => {
    if (document.hidden) {
      warningCountRef.current += 1;
      
      // Record violation
      try {
        await proctoringAPI.recordViolation({
          sessionId,
          type: 'TAB_SWITCH',
          description: 'User switched tabs or minimized window'
        });
      } catch (error) {
        console.error('Failed to record violation:', error);
      }

      addViolation({
        type: 'TAB_SWITCH',
        timestamp: new Date().toISOString()
      });

      // Show warning
      alert(`⚠️ Warning ${warningCountRef.current}: Please stay on this page during the exam.\n\nAdditional violations may result in automatic submission.`);

      // Check threshold
      if (onViolationThreshold && warningCountRef.current >= onViolationThreshold) {
        onViolationThreshold(warningCountRef.current);
      }
    }
  }, [sessionId, addViolation, onViolationThreshold]);

  const handleBeforeUnload = useCallback((e) => {
    e.preventDefault();
    e.returnValue = 'Are you sure you want to leave? Your exam will be auto-submitted.';
    return e.returnValue;
  }, []);

  useEffect(() => {
    // Handle fullscreen change
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // Record violation if they exit fullscreen
        try {
          proctoringAPI.recordViolation({
            sessionId,
            type: 'FULLSCREEN_EXIT',
            description: 'User exited full-screen mode'
          });
        } catch (error) {}

        addViolation({
          type: 'FULLSCREEN_EXIT',
          timestamp: new Date().toISOString()
        });
        
        // Re-prompt for fullscreen if possible
        alert('⚠️ Warning: Full-screen mode is required for this exam. Please stay in full-screen mode.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [handleVisibilityChange, handleBeforeUnload, sessionId, addViolation]);

  return {
    warningCount: warningCountRef.current
  };
};
