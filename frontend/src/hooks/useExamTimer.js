import { useEffect, useRef } from 'react';

export const useExamTimer = (durationMinutes, onTimeUp, isPaused = false) => {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    const endTime = Date.now() + (durationMinutes * 60 * 1000);

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      const seconds = Math.floor(remaining / 1000);

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        onTimeUp();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [durationMinutes, onTimeUp, isPaused]);
};

export const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
