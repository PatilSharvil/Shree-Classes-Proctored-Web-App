import React, { useState, useRef, useEffect } from 'react';

/**
 * Draggable Webcam Preview Component
 * Shows live webcam feed that can be dragged anywhere on screen
 */
const WebcamPreview = ({ videoRef, isReady, error, className = '' }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 220, y: window.innerHeight - 280 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 192);
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 240);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Touch support for mobile
  const handleTouchStart = (e) => {
    if (!containerRef.current || !e.touches[0]) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  };

  useEffect(() => {
    const handleTouchMove = (e) => {
      if (!isDragging || !e.touches[0]) return;
      e.preventDefault();
      
      const newX = e.touches[0].clientX - dragOffset.current.x;
      const newY = e.touches[0].clientY - dragOffset.current.y;
      
      const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 192);
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 240);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const containerStyle = {
    left: `${position.x}px`,
    top: `${position.y}px`,
    transition: isDragging ? 'none' : 'box-shadow 0.2s'
  };

  if (error) {
    return (
      <div 
        ref={containerRef}
        className="fixed w-48 bg-red-900/90 backdrop-blur-sm border-2 border-red-500 rounded-xl overflow-hidden shadow-2xl z-50"
        style={containerStyle}
      >
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
    <div 
      ref={containerRef}
      className={`fixed w-48 bg-black/90 backdrop-blur-sm border-2 border-gray-700 rounded-xl overflow-hidden shadow-2xl z-50 ${isDragging ? 'shadow-xl ring-2 ring-blue-500' : ''}`}
      style={containerStyle}
    >
      {/* Draggable Header - Cursor indicates drag capability */}
      <div 
        className="bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 flex items-center justify-between cursor-move select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
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
          className="w-full h-full object-cover transform scale-x-[-1]"
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
