import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * AI Detection types for proctoring
 */
export const AI_DETECTION_TYPES = {
  NO_FACE: 'NO_FACE',
  MULTIPLE_FACES: 'MULTIPLE_FACES',
  LOOKING_AWAY: 'LOOKING_AWAY',
  OFF_CENTER: 'OFF_CENTER'
};

/**
 * Default severity levels for AI detections
 */
export const AI_SEVERITY = {
  [AI_DETECTION_TYPES.NO_FACE]: 'HIGH',
  [AI_DETECTION_TYPES.MULTIPLE_FACES]: 'CRITICAL',
  [AI_DETECTION_TYPES.LOOKING_AWAY]: 'MEDIUM',
  [AI_DETECTION_TYPES.OFF_CENTER]: 'LOW'
};

/**
 * MediaPipe-based AI detection hook for proctoring
 * Uses @mediapipe/tasks-vision for stable face detection
 */
const useMediaPipeDetection = (options = {}) => {
  const {
    enabled = true,
    videoRef = null,
    detectionFps = 2,
    faceConfidenceThreshold = 0.5,
    minFaceAbsenceSec = 5,
    minGazeAwaySec = 4, // Changed from 10 to 4 seconds as requested
    onDetection = null,
    onSnapshotCapture = null
  } = options;

  const faceDetectorRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [detections, setDetections] = useState({
    faceCount: 0,
    facePosition: null,
    gazeDirection: 'center'
  });

  const [activeViolations, setActiveViolations] = useState({});
  const faceAbsentSinceRef = useRef(null);
  const gazeAwaySinceRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const detectionIntervalRef = useRef(null);
  const activeViolationsRef = useRef({});

  // Keep ref in sync with state
  useEffect(() => {
    activeViolationsRef.current = activeViolations;
  }, [activeViolations]);

  // Initialize MediaPipe Face Detector
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const initializeDetector = async () => {
      try {
        console.log('[MediaPipe] Initializing face detector...');
        
        const fileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const detector = await FaceDetector.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          minSuppressionThreshold: 0.5
        });

        if (mounted) {
          faceDetectorRef.current = detector;
          setIsReady(true);
          console.log('[MediaPipe] ✅ Face detector ready!');
        }
      } catch (err) {
        console.error('[MediaPipe] Initialization error:', err);
      }
    };

    initializeDetector();

    return () => {
      mounted = false;
      if (faceDetectorRef.current) {
        faceDetectorRef.current.close();
        faceDetectorRef.current = null;
      }
    };
  }, [enabled]);

  // Start detection loop
  useEffect(() => {
    if (!enabled || !isReady || !videoRef?.current) return;

    const intervalMs = 1000 / detectionFps;
    console.log(`[MediaPipe] Starting detection at ${detectionFps} FPS`);

    const detect = async () => {
      if (!faceDetectorRef.current || !videoRef.current) return;
      if (videoRef.current.readyState < 2) return; // Video not ready

      const now = Date.now();
      if (now - lastDetectionTimeRef.current < intervalMs) return;
      lastDetectionTimeRef.current = now;

      try {
        const results = faceDetectorRef.current.detectForVideo(videoRef.current, now);
        processDetections(results.detections || []);
      } catch (err) {
        console.error('[MediaPipe] Detection error:', err);
      }
    };

    detectionIntervalRef.current = setInterval(detect, intervalMs);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [enabled, isReady, detectionFps, videoRef]);

  const processDetections = useCallback((detections) => {
    const faceCount = detections.length;
    const now = Date.now();

    if (faceCount === 0) {
      handleNoFace(now);
    } else if (faceCount === 1) {
      handleSingleFace(detections[0], now);
    } else if (faceCount > 1) {
      handleMultipleFaces(faceCount, now);
    }

    setDetections({
      faceCount,
      facePosition: faceCount === 1 ? {
        x: detections[0].boundingBox.originX,
        y: detections[0].boundingBox.originY
      } : null,
      gazeDirection: faceCount === 1 ? 'center' : 'unknown'
    });
  }, []);

  const handleNoFace = useCallback((now) => {
    if (!faceAbsentSinceRef.current) {
      faceAbsentSinceRef.current = now;
    }

    const absenceDuration = (now - faceAbsentSinceRef.current) / 1000;

    if (absenceDuration >= minFaceAbsenceSec) {
      triggerViolation(
        AI_DETECTION_TYPES.NO_FACE,
        `No face detected for ${Math.round(absenceDuration)}s`,
        absenceDuration / 10,
        true
      );
    }

    gazeAwaySinceRef.current = null;
  }, [minFaceAbsenceSec]);

  const handleSingleFace = useCallback((detection, now) => {
    faceAbsentSinceRef.current = null;
    clearViolation(AI_DETECTION_TYPES.NO_FACE);

    const box = detection.boundingBox;
    const videoWidth = videoRef.current?.videoWidth || 640;
    const videoHeight = videoRef.current?.videoHeight || 480;

    const centerX = (box.originX + box.width / 2) / videoWidth;
    const centerY = (box.originY + box.height / 2) / videoHeight;

    // Determine gaze direction based on face position
    // Center Zone: 35%-65% width (looking at screen)
    // Left Zone: <35% (looking left)
    // Right Zone: >65% (looking right)
    // Away: <30% or >70% vertical (looking up/down)
    let gazeDirection = 'center';
    let isLookingAway = false;
    let directionLabel = '';

    if (centerX < 0.35) {
      gazeDirection = 'left';
      isLookingAway = true;
      directionLabel = `Looking LEFT (${Math.round(centerX * 100)}% from center)`;
    } else if (centerX > 0.65) {
      gazeDirection = 'right';
      isLookingAway = true;
      directionLabel = `Looking RIGHT (${Math.round(centerX * 100)}% from center)`;
    } else if (centerY < 0.3 || centerY > 0.7) {
      gazeDirection = 'away';
      isLookingAway = true;
      directionLabel = `Looking AWAY (vertical: ${Math.round(centerY * 100)}%)`;
    } else {
      gazeDirection = 'center';
      isLookingAway = false;
      directionLabel = 'Looking at SCREEN';
    }

    // Track looking away duration
    if (isLookingAway) {
      if (!gazeAwaySinceRef.current) {
        gazeAwaySinceRef.current = now;
      }

      const gazeDuration = (now - gazeAwaySinceRef.current) / 1000;
      
      // Only trigger violation after 4+ seconds of looking away
      if (gazeDuration >= minGazeAwaySec) {
        triggerViolation(
          AI_DETECTION_TYPES.LOOKING_AWAY,
          `${directionLabel} for ${Math.round(gazeDuration)}s`,
          Math.min(gazeDuration / 10, 0.95),
          false // No snapshot for free tier
        );
        
        // Log every 2 seconds while looking away
        if (Math.round(gazeDuration) % 2 === 0) {
          console.log(`[Gaze Detection] ⚠️ ${directionLabel} - Duration: ${gazeDuration.toFixed(1)}s`);
        }
      }
    } else {
      // Reset when looking back at screen
      if (gazeAwaySinceRef.current) {
        const totalAwayTime = (now - gazeAwaySinceRef.current) / 1000;
        console.log(`[Gaze Detection] ✅ Returned to screen after ${totalAwayTime.toFixed(1)}s`);
        clearViolation(AI_DETECTION_TYPES.LOOKING_AWAY);
        gazeAwaySinceRef.current = null;
      }
    }

    setDetections(prev => ({
      ...prev,
      faceCount: 1,
      facePosition: { x: centerX, y: centerY },
      gazeDirection
    }));
  }, [minGazeAwaySec, videoRef]);

  const handleMultipleFaces = useCallback((count, now) => {
    faceAbsentSinceRef.current = null;
    gazeAwaySinceRef.current = null;

    triggerViolation(
      AI_DETECTION_TYPES.MULTIPLE_FACES,
      `${count} faces detected`,
      0.9,
      true
    );
  }, []);

  const triggerViolation = useCallback((type, description, confidence, shouldSnapshot) => {
    if (activeViolationsRef.current[type]?.triggered) return;

    const now = Date.now();
    setActiveViolations(prev => ({
      ...prev,
      [type]: {
        type,
        description,
        confidence,
        severity: AI_SEVERITY[type],
        timestamp: now,
        triggered: true
      }
    }));

    if (shouldSnapshot && onSnapshotCapture) {
      onSnapshotCapture(type, confidence);
    }

    onDetection?.({
      type,
      description,
      confidence,
      severity: AI_SEVERITY[type],
      timestamp: now
    });
  }, [onDetection, onSnapshotCapture]);

  const clearViolation = useCallback((type) => {
    setActiveViolations(prev => {
      if (!prev[type]) return prev;
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    setActiveViolations({});
    activeViolationsRef.current = {};
    faceAbsentSinceRef.current = null;
    gazeAwaySinceRef.current = null;
    setDetections({
      faceCount: 0,
      facePosition: null,
      gazeDirection: 'center'
    });
  }, []);

  return {
    isReady,
    detections,
    activeViolations,
    reset
  };
};

export default useMediaPipeDetection;
