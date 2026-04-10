import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Webcam management hook for AI proctoring
 * Manages webcam stream, permissions, and snapshot capture
 */
const useWebcam = (options = {}) => {
  const {
    enabled = true,
    width = 320,
    height = 240,
    fps = 30,
    onPermissionDenied = null,
    onStreamReady = null
  } = options;

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const isStartingRef = useRef(false);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsReady(false);
    isStartingRef.current = false;
  }, []);

  const startWebcam = useCallback(async () => {
    if (!enabled || isStartingRef.current || streamRef.current) {
      return;
    }

    isStartingRef.current = true;
    setError(null);
    setPermissionDenied(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: fps }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setIsReady(true);
            isStartingRef.current = false;
            onStreamReady?.(stream);
          }).catch(err => {
            console.error('[Webcam] Play error:', err);
            isStartingRef.current = false;
          });
        };
      } else {
        isStartingRef.current = false;
      }
    } catch (err) {
      console.error('[Webcam] Error starting webcam:', err);
      isStartingRef.current = false;
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Camera permission denied. Please allow camera access.');
        onPermissionDenied?.();
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera device found.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is already in use.');
      } else {
        setError(`Failed to start webcam: ${err.message}`);
      }
    }
  }, [enabled, width, height, fps, onPermissionDenied, onStreamReady]);

  const captureSnapshot = useCallback(() => {
    if (!videoRef.current || !isReady) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (err) {
      console.error('[Webcam] Error capturing snapshot:', err);
      return null;
    }
  }, [isReady]);

  // Start/stop webcam based on enabled flag - ONLY runs when enabled changes
  useEffect(() => {
    if (enabled) {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [enabled]); // Only re-run when 'enabled' changes

  return {
    videoRef,
    isReady,
    error,
    permissionDenied,
    startWebcam,
    stopWebcam,
    captureSnapshot
  };
};

export default useWebcam;
