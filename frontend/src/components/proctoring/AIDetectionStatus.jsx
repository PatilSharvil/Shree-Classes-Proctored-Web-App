import React from 'react';

/**
 * AI Detection Status Component
 * Shows real-time AI detection status to student
 */
const AIDetectionStatus = ({ detections, activeViolations, className = '' }) => {
  const getFaceStatusIcon = () => {
    if (detections.faceCount === 0) return '❌';
    if (detections.faceCount === 1) return '✅';
    return '⚠️';
  };

  const getFaceStatusText = () => {
    if (detections.faceCount === 0) return 'No Face Detected';
    if (detections.faceCount === 1) return 'Face Detected';
    return `${detections.faceCount} Faces Detected`;
  };

  const getGazeStatus = () => {
    if (detections.gazeDirection === 'center') {
      return { icon: '👁️', text: 'Looking at Screen', color: 'text-green-600' };
    }
    return { icon: '⚠️', text: `Looking ${detections.gazeDirection}`, color: 'text-yellow-600' };
  };

  const gazeStatus = getGazeStatus();

  return (
    <div className={`bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <i className="fas fa-robot text-purple-600"></i>
        <span className="text-xs font-bold text-gray-700">AI Proctoring Status</span>
      </div>

      {/* Detection Status */}
      <div className="space-y-2">
        {/* Face Detection */}
        <div className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getFaceStatusIcon()}</span>
            <span className="text-xs font-bold text-gray-700">{getFaceStatusText()}</span>
          </div>
          {detections.faceCount === 1 && (
            <span className="text-[10px] text-green-600 font-bold">✓</span>
          )}
        </div>

        {/* Gaze Tracking */}
        {detections.faceCount === 1 && (
          <div className={`flex items-center justify-between px-2 py-1 bg-gray-50 rounded ${gazeStatus.color}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{gazeStatus.icon}</span>
              <span className="text-xs font-bold">{gazeStatus.text}</span>
            </div>
            {detections.gazeDirection === 'center' && (
              <span className="text-[10px] text-green-600 font-bold">✓</span>
            )}
          </div>
        )}
      </div>

      {/* Active Violations */}
      {Object.keys(activeViolations).length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-[10px] font-bold text-red-600 mb-1">⚠️ Active Violations:</div>
          {Object.values(activeViolations).map((violation, idx) => (
            <div key={idx} className="bg-red-50 border border-red-200 rounded px-2 py-1 mb-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-red-700">{violation.type}</span>
                <span className="text-[9px] text-red-500">{Math.round(violation.confidence * 100)}%</span>
              </div>
              <p className="text-[9px] text-red-600 mt-0.5">{violation.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <p className="text-[8px] text-gray-500 text-center">
          🔒 AI processing happens locally. Video never leaves your device.
        </p>
      </div>
    </div>
  );
};

export default AIDetectionStatus;
