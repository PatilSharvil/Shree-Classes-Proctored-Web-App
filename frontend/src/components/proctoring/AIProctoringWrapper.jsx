import React, { useState, useEffect } from 'react';
import useWebcam from '../../hooks/useWebcam';
import useMediaPipeDetection, { AI_DETECTION_TYPES, AI_SEVERITY } from '../../hooks/useMediaPipeDetection';
import WebcamPreview from '../proctoring/WebcamPreview';
import AIDetectionStatus from '../proctoring/AIDetectionStatus';
import { proctoringAPI } from '../../services/api';

/**
 * AI Proctoring Wrapper Component
 * Integrates webcam and AI detection into exam pages
 * Works alongside existing text-based proctoring
 */
const AIProctoringWrapper = ({ sessionId, enabled = true, className = '' }) => {
  const [showStatus, setShowStatus] = useState(false);
  const [aiViolations, setAiViolations] = useState({});
  const [snapshotQueue, setSnapshotQueue] = useState([]);

  // Initialize webcam
  const webcam = useWebcam({
    enabled,
    width: 320,
    height: 240,
    fps: 30,
    onPermissionDenied: () => {
      console.warn('[AI Proctoring] Webcam permission denied');
    }
  });

  // Initialize AI detection
  const aiDetection = useMediaPipeDetection({
    enabled: enabled && webcam.isReady,
    videoRef: webcam.videoRef,
    detectionFps: 2,
    faceConfidenceThreshold: 0.75,
    minFaceAbsenceSec: 5,
    minGazeAwaySec: 10,
    onDetection: handleAIDetection,
    onSnapshotCapture: handleSnapshotCapture
  });

  // Handle AI detection events
  async function handleAIDetection(detection) {
    console.log('[AI Proctoring] Detection:', detection);

    if (!sessionId) return;

    try {
      // Record violation with existing proctoring system
      const response = await proctoringAPI.recordViolation({
        sessionId,
        type: detection.type,
        description: detection.description,
        severity: detection.severity,
        metadata: {
          ai_detection: true,
          confidence: detection.confidence,
          timestamp: detection.timestamp
        }
      });

      // Track active violations
      setAiViolations(prev => ({
        ...prev,
        [detection.type]: {
          ...detection,
          violationId: response.data?.data?.violationId
        }
      }));

      // Queue snapshot for upload if we have one
      if (snapshotQueue.length > 0) {
        uploadQueuedSnapshots(response.data?.data?.violationId);
      }
    } catch (error) {
      console.error('[AI Proctoring] Failed to record violation:', error);
    }
  }

  // Handle snapshot capture from AI detection
  function handleSnapshotCapture(detectionType, confidence) {
    const snapshot = webcam.captureSnapshot();
    if (snapshot) {
      setSnapshotQueue(prev => [...prev, { snapshot, detectionType, confidence }]);
    }
  }

  // Upload queued snapshots
  async function uploadQueuedSnapshots(violationId) {
    for (const item of snapshotQueue) {
      try {
        await proctoringAPI.saveSnapshot({
          sessionId,
          imageData: item.snapshot,
          detectionType: item.detectionType,
          confidence: item.confidence,
          violationId,
          retentionDays: 30
        });
      } catch (error) {
        console.error('[AI Proctoring] Failed to upload snapshot:', error);
      }
    }
    setSnapshotQueue([]);
  }

  // Clear violation from active list
  const clearViolation = (type) => {
    setAiViolations(prev => {
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      webcam.stopWebcam();
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* Webcam Preview (always shown) */}
      <WebcamPreview
        videoRef={webcam.videoRef}
        isReady={webcam.isReady}
        error={webcam.error}
      />

      {/* AI Status Toggle Button */}
      <button
        onClick={() => setShowStatus(!showStatus)}
        className="fixed bottom-4 left-4 w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all z-50 flex items-center justify-center"
        title="AI Proctoring Status"
      >
        <i className="fas fa-robot text-xl"></i>
      </button>

      {/* AI Detection Status Panel */}
      {showStatus && (
        <div className="fixed bottom-20 left-4 w-72 z-50">
          <AIDetectionStatus
            detections={aiDetection.detections}
            activeViolations={aiViolations}
          />
          <button
            onClick={() => setShowStatus(false)}
            className="mt-2 w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-all"
          >
            Close
          </button>
        </div>
      )}

      {/* Camera Permission Warning */}
      {webcam.permissionDenied && (
        <div className="fixed top-4 right-4 max-w-sm bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 shadow-lg z-50">
          <div className="flex items-start gap-3">
            <i className="fas fa-exclamation-triangle text-yellow-600 text-2xl mt-0.5"></i>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-yellow-900 mb-1">Camera Access Required</h4>
              <p className="text-xs text-yellow-800 mb-2">
                This exam requires webcam access for AI proctoring. Please allow camera access and refresh the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-xs font-bold hover:bg-yellow-700 transition-all"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIProctoringWrapper;
