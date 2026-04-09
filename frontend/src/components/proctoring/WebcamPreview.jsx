import React from 'react';

/**
 * Webcam Preview Component
 * Shows live webcam feed in a small corner preview box
 */
const WebcamPreview = ({ videoRef, isReady, error, className = '' }) => {
  if (error) {
    return (
      <div className={`fixed bottom-4 right-4 w-48 bg-red-900/90 backdrop-blur-sm border-2 border-red-500 rounded-xl overflow-hidden shadow-2xl z-50 ${className}`}>
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <i className="fas fa-exclamation-triangle text-red-400"></i>
            <span className="text-xs font-bold text-red-200">Camera Error</span>
          </div>
          <p className="text-[10px] text-red-300 leading-tight">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 w-48 bg-black/90 backdrop-blur-sm border-2 border-gray-700 rounded-xl overflow-hidden shadow-2xl z-50 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
          <span className="text-xs font-bold text-white">AI Proctoring</span>
        </div>
        {isReady && (
          <span className="text-[10px] text-blue-100 font-bold">LIVE</span>
        )}
      </div>

      {/* Video */}
      <div className="relative aspect-video bg-gray-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
        />
        
        {/* Overlay indicator */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-2xl text-blue-400 mb-2"></i>
              <p className="text-xs text-gray-400 font-bold">Initializing Camera...</p>
            </div>
          </div>
        )}

        {/* Recording indicator */}
        {isReady && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] text-white font-bold">REC</span>
          </div>
        )}
      </div>

      {/* Status bar */}
      {isReady && (
        <div className="px-3 py-2 bg-gray-900/95">
          <div className="flex items-center justify-between text-[9px] text-gray-400">
            <span>AI Monitoring Active</span>
            <i className="fas fa-shield-alt text-green-400"></i>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebcamPreview;
