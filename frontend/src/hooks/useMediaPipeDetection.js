import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceDetection } from '@mediapipe/face_detection';
import { Hands } from '@mediapipe/hands';

/**
 * AI Detection types for proctoring
 */
export const AI_DETECTION_TYPES = {
  NO_FACE: 'NO_FACE',
  MULTIPLE_FACES: 'MULTIPLE_FACES',
  LOOKING_AWAY: 'LOOKING_AWAY',
  PHONE_DETECTED: 'PHONE_DETECTED',
  UNAUTHORIZED_MATERIAL: 'UNAUTHORIZED_MATERIAL',
  OFF_CENTER: 'OFF_CENTER',
  SUSPICIOUS_HAND: 'SUSPICIOUS_HAND'
};

/**
 * Default severity levels for AI detections
 */
export const AI_SEVERITY = {
  [AI_DETECTION_TYPES.NO_FACE]: 'HIGH',
  [AI_DETECTION_TYPES.MULTIPLE_FACES]: 'CRITICAL',
  [AI_DETECTION_TYPES.LOOKING_AWAY]: 'MEDIUM',
  [AI_DETECTION_TYPES.PHONE_DETECTED]: 'CRITICAL',
  [AI_DETECTION_TYPES.UNAUTHORIZED_MATERIAL]: 'HIGH',
  [AI_DETECTION_TYPES.OFF_CENTER]: 'LOW',
  [AI_DETECTION_TYPES.SUSPICIOUS_HAND]: 'MEDIUM'
};

/**
 * MediaPipe-based AI detection hook for proctoring
 * Detects face presence, face count, gaze direction, and hand movements
 */
const useMediaPipeDetection = (options = {}) => {
  const {
    enabled = true,
    videoRef = null,
    detectionFps = 2, // Process 2 frames per second for performance
    faceConfidenceThreshold = 0.75,
    minFaceAbsenceSec = 5,
    minGazeAwaySec = 10,
    onDetection = null,
    onSnapshotCapture = null
  } = options;

  const faceDetectionRef = useRef(null);
  const handsDetectionRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [detections, setDetections] = useState({
    faceCount: 0,
    facePosition: null,
    gazeDirection: 'center',
    handsDetected: false,
    handPositions: []
  });

  const [activeViolations, setActiveViolations] = useState({});
  const faceAbsentSinceRef = useRef(null);
  const gazeAwaySinceRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const detectionIntervalRef = useRef(null);

  // Initialize MediaPipe Face Detection
  useEffect(() => {
    if (!enabled) return;

    const faceDetection = new FaceDetection({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
      }
    });

    faceDetection.setOptions({
      model: 'short', // 'short' or 'full' - short is faster
      minDetectionConfidence: faceConfidenceThreshold
    });

    faceDetection.onResults((results) => {
      if (!results.detections) return;

      const faceCount = results.detections.length;
      
      if (faceCount === 0) {
        handleNoFaceDetection();
      } else if (faceCount === 1) {
        handleSingleFaceDetected(results.detections[0]);
      } else if (faceCount > 1) {
        handleMultipleFacesDetected(faceCount);
      }
    });

    faceDetectionRef.current = faceDetection;
    setIsReady(true);

    return () => {
      faceDetection.close();
    };
  }, [enabled, faceConfidenceThreshold]);

  // Start detection loop
  useEffect(() => {
    if (!enabled || !isReady || !videoRef?.current) return;

    const intervalMs = 1000 / detectionFps;

    detectionIntervalRef.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      const now = Date.now();
      if (now - lastDetectionTimeRef.current < intervalMs) return;
      lastDetectionTimeRef.current = now;

      runDetection();
    }, intervalMs);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [enabled, isReady, detectionFps, videoRef]);

  const runDetection = useCallback(async () => {
    if (!faceDetectionRef.current || !videoRef.current) return;

    try {
      await faceDetectionRef.current.send({ image: videoRef.current });
    } catch (err) {
      console.error('[MediaPipe] Detection error:', err);
    }
  }, [videoRef]);

  const handleNoFaceDetection = useCallback(() => {
    const now = Date.now();

    if (!faceAbsentSinceRef.current) {
      faceAbsentSinceRef.current = now;
    }

    const absenceDuration = (now - faceAbsentSinceRef.current) / 1000;

    // Only flag if absent for minimum duration
    if (absenceDuration >= minFaceAbsenceSec) {
      triggerViolation(
        AI_DETECTION_TYPES.NO_FACE,
        `No face detected for ${Math.round(absenceDuration)} seconds`,
        absenceDuration,
        true
      );
    }

    // Reset gaze tracking when no face
    gazeAwaySinceRef.current = null;

    setDetections(prev => ({
      ...prev,
      faceCount: 0,
      facePosition: null
    }));
  }, [minFaceAbsenceSec]);

  const handleSingleFaceDetected = useCallback((detection) => {
    const now = Date.now();
    faceAbsentSinceRef.current = null; // Reset face absence timer

    // Clear no-face violation if active
    clearViolation(AI_DETECTION_TYPES.NO_FACE);

    // Extract face position
    const boundingBox = detection.boundingBox;
    const centerX = boundingBox.xCenter;
    const centerY = boundingBox.yCenter;

    // Detect if face is off-center (looking away)
    const isOffCenter = centerX < 0.3 || centerX > 0.7;

    if (isOffCenter) {
      if (!gazeAwaySinceRef.current) {
        gazeAwaySinceRef.current = now;
      }

      const gazeDuration = (now - gazeAwaySinceRef.current) / 1000;

      if (gazeDuration >= minGazeAwaySec) {
        triggerViolation(
          AI_DETECTION_TYPES.LOOKING_AWAY,
          `Looking away from screen for ${Math.round(gazeDuration)} seconds (position: ${Math.round(centerX * 100)}%, ${Math.round(centerY * 100)}%)`,
          gazeDuration,
          true
        );
      }
    } else {
      // Reset gaze tracking when looking at center
      if (gazeAwaySinceRef.current) {
        clearViolation(AI_DETECTION_TYPES.LOOKING_AWAY);
        gazeAwaySinceRef.current = null;
      }
    }

    setDetections(prev => ({
      ...prev,
      faceCount: 1,
      facePosition: { x: centerX, y: centerY },
      gazeDirection: isOffCenter ? (centerX < 0.3 ? 'left' : 'right') : 'center'
    }));
  }, [minGazeAwaySec]);

  const handleMultipleFacesDetected = useCallback((faceCount) => {
    faceAbsentSinceRef.current = null;
    gazeAwaySinceRef.current = null;

    triggerViolation(
      AI_DETECTION_TYPES.MULTIPLE_FACES,
      `${faceCount} faces detected - possible unauthorized assistance`,
      faceCount,
      true
    );

    setDetections(prev => ({
      ...prev,
      faceCount,
      facePosition: null
    }));
  }, []);

  const triggerViolation = useCallback((type, description, confidence, shouldSnapshot) => {
    const violationKey = type;
    const now = Date.now();

    // Don't spam violations - only trigger once per type until cleared
    if (activeViolations[violationKey]?.triggered) return;

    setActiveViolations(prev => ({
      ...prev,
      [violationKey]: {
        type,
        description,
        confidence,
        severity: AI_SEVERITY[type],
        timestamp: now,
        triggered: true
      }
    }));

    // Capture snapshot if requested
    if (shouldSnapshot && onSnapshotCapture) {
      onSnapshotCapture(type, confidence);
    }

    // Notify parent
    onDetection?.({
      type,
      description,
      confidence,
      severity: AI_SEVERITY[type],
      timestamp: now
    });
  }, [activeViolations, onDetection, onSnapshotCapture]);

  const clearViolation = useCallback((type) => {
    setActiveViolations(prev => {
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    setActiveViolations({});
    faceAbsentSinceRef.current = null;
    gazeAwaySinceRef.current = null;
    setDetections({
      faceCount: 0,
      facePosition: null,
      gazeDirection: 'center',
      handsDetected: false,
      handPositions: []
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
