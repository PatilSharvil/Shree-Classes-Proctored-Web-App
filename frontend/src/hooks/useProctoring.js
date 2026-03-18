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
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Request fullscreen (best effort)
    const requestFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.log('Fullscreen not supported or denied');
      }
    };
    requestFullscreen();

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [handleVisibilityChange, handleBeforeUnload]);

  return {
    warningCount: warningCountRef.current
  };
};
