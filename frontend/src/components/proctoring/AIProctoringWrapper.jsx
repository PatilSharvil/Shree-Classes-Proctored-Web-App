import React, { useState, useEffect, useRef } from 'react';
import useWebcam from '../../hooks/useWebcam';
import useMediaPipeDetection, { AI_DETECTION_TYPES, AI_SEVERITY } from '../../hooks/useMediaPipeDetection';
import WebcamPreview from '../proctoring/WebcamPreview';
import { proctoringAPI } from '../../services/api';

/**
 * AI Proctoring Wrapper Component
 * Simplified for free-tier deployment - text-only violations, no image storage
 */
const AIProctoringWrapper = ({ sessionId, enabled = true }) => {
  const [showStatus, setShowStatus] = useState(false);
  const [aiStatus, setAiStatus] = useState('Initializing...');
  const [lastViolation, setLastViolation] = useState(null);
  const violationCooldownRef = useRef({});

  // Initialize webcam
  const webcam = useWebcam({
    enabled,
    width: 320,
    height: 240,
    fps: 30
  });

  // Initialize AI detection
  const aiDetection = useMediaPipeDetection({
    enabled: enabled && webcam.isReady,
    videoRef: webcam.videoRef,
    detectionFps: 2,
    faceConfidenceThreshold: 0.5,
    minFaceAbsenceSec: 5,
    minGazeAwaySec: 4, // 4 seconds threshold as requested
    onDetection: handleAIDetection
  });

  // Handle AI detection events - TEXT ONLY, no snapshots
  async function handleAIDetection(detection) {
    if (!sessionId) return;

    // Cooldown: only record same violation type once per 60 seconds
    const now = Date.now();
    const cooldownMs = 60000;
    if (violationCooldownRef.current[detection.type] && 
        now - violationCooldownRef.current[detection.type] < cooldownMs) {
      return;
    }

    violationCooldownRef.current[detection.type] = now;

    setLastViolation({
      type: detection.type,
      description: detection.description,
      severity: detection.severity,
      confidence: detection.confidence,
      timestamp: new Date().toLocaleTimeString()
    });

    setAiStatus(`⚠️ ${detection.type}`);

    try {
      // Record violation as TEXT ONLY - no image data
      await proctoringAPI.recordViolation({
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
    } catch (error) {
      console.error('[AI Proctoring] Failed to record violation:', error);
    }
  }

  // Update status display
  useEffect(() => {
    if (!enabled) {
      setAiStatus('Disabled');
      return;
    }

    if (!webcam.isReady) {
      setAiStatus(webcam.error ? '❌ Camera Error' : '📷 Starting Camera...');
      return;
    }

    if (!aiDetection.isReady) {
      setAiStatus('🤖 Loading AI Model...');
      return;
    }

    const { faceCount } = aiDetection.detections;
    if (faceCount === 0) {
      setAiStatus('⚠️ No Face Detected');
    } else if (faceCount === 1) {
      setAiStatus('✅ Face Detected - Monitoring Active');
    } else {
      setAiStatus(`⚠️ ${faceCount} Faces Detected`);
    }
  }, [enabled, webcam.isReady, webcam.error, aiDetection.isReady, aiDetection.detections]);

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
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-robot text-purple-600"></i>
              <span className="text-xs font-bold text-gray-700">AI Proctoring Status</span>
            </div>

            {/* Current Status */}
            <div className="bg-gray-50 rounded p-2 mb-2">
              <p className="text-xs font-bold text-gray-700">{aiStatus}</p>
            </div>

            {/* Face Detection Info */}
            <div className="space-y-1 text-[10px] text-gray-600 mb-2">
              <p>👤 Faces: {aiDetection.detections.faceCount}</p>
              <p>🎯 Detection Rate: 2 FPS</p>
              <p>⏱️ Cooldown: 60s per violation type</p>
            </div>

            {/* Last Violation */}
            {lastViolation && (
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <p className="text-[10px] font-bold text-red-700 mb-1">⚠️ Last Violation:</p>
                <p className="text-[9px] text-red-600">{lastViolation.type}</p>
                <p className="text-[8px] text-red-500">{lastViolation.description}</p>
                <p className="text-[8px] text-gray-400">{lastViolation.timestamp}</p>
              </div>
            )}

            {/* Privacy Notice */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-[8px] text-gray-500 text-center">
                🔒 All processing happens locally. No images are stored.
              </p>
            </div>
          </div>
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
                This exam requires webcam access for AI proctoring. Please allow camera access and refresh.
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
