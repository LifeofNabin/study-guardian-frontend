// FILE: frontend/src/components/student/WebcamMonitor.js
// ✅ COMPLETE WORKING VERSION - REAL WEBCAM + FALLBACK

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, CameraOff, Eye, EyeOff, User, Target, 
  Activity, Brain, AlertTriangle, Zap, CheckCircle
} from 'lucide-react';
import useMediaPipe from '../../hooks/useMediaPipe';

const WebcamMonitor = ({
  sessionId,
  onMetricsUpdate,
  showControls = true,
  autoStart = true,
  className = ''
}) => {
  const containerRef = useRef(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    webcam,
    isProcessing,
    modelsLoaded,
    loadingProgress,
    metrics,
    fallbackActive,
    error,
    startProcessing,
    stopProcessing,
    getBlinkRate,
    getAttentionRate
  } = useMediaPipe({
    enableFaceDetection: true,
    enableFaceMesh: false, // Disabled for speed
    enablePoseEstimation: false, // Disabled for speed
    processingInterval: 333, // 3 FPS
    autoStart: autoStart
  });

  // Send metrics to parent
  useEffect(() => {
    if (!onMetricsUpdate || !metrics) return;
    
    const now = Date.now();
    
    const comprehensiveMetrics = {
      faceDetected: metrics.faceDetected || false,
      lookingAtScreen: metrics.lookingAtScreen || false,
      postureScore: metrics.postureScore || 50,
      blinkRate: getBlinkRate(),
      engagementScore: metrics.engagementScore || 50,
      focusQuality: metrics.focusQuality || 50,
      fatigueLevel: metrics.fatigueLevel || 15,
      stressLevel: metrics.stressLevel || 12,
      emotionalState: metrics.emotionalState || 'neutral',
      hasPhone: metrics.hasPhone || false,
      eyeStrain: metrics.eyeStrain || 8,
      source: metrics.source || 'unknown',
      timestamp: now
    };

    onMetricsUpdate(comprehensiveMetrics);
    
  }, [metrics, onMetricsUpdate, getBlinkRate, getAttentionRate]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleToggleCamera = () => {
    if (isProcessing) {
      stopProcessing();
    } else {
      startProcessing();
    }
  };

  // Render
  return (
    <div 
      ref={containerRef} 
      className={`relative rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-800 ${className} ${isFullscreen ? 'fullscreen' : ''}`}
    >
      {/* Camera Feed */}
      <div className="h-64 relative bg-black">
        {/* REAL Webcam Video */}
        <video
          ref={webcam.videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Loading Overlay */}
        {!modelsLoaded && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
            <Brain className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-white font-medium">Loading AI Models</p>
            <p className="text-slate-400 text-sm mt-1">{loadingProgress}%</p>
          </div>
        )}
        
        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-red-900/20 flex flex-col items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-400 font-medium">{error.message}</p>
            <p className="text-red-300 text-sm mt-1">{error.details}</p>
          </div>
        )}
        
        {/* Status Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-xs text-white font-medium">
              {isProcessing ? 'LIVE' : 'STANDBY'}
            </span>
          </div>
          
          {fallbackActive && (
            <div className="flex items-center gap-2 bg-amber-900/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Zap className="h-3 w-3 text-amber-400" />
              <span className="text-xs text-amber-300 font-medium">SIMULATION</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls & Info Panel */}
      <div className="p-6 bg-slate-900/90 border-t border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isProcessing ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
              {isProcessing ? (
                <div className="relative">
                  <div className="w-5 h-5 bg-emerald-500 rounded-full animate-ping absolute inset-0" />
                  <div className="w-5 h-5 bg-emerald-500 rounded-full relative" />
                </div>
              ) : (
                <CameraOff className="h-5 w-5 text-slate-600" />
              )}
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                AI Study Tracker
              </p>
              <p className="text-[10px] text-slate-600 font-medium">
                {isProcessing ? 'Real-time monitoring' : 'Ready to start'}
                {fallbackActive && ' (Simulation Mode)'}
              </p>
            </div>
          </div>
          
          {showControls && (
            <div className="flex gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                title="Fullscreen"
              >
                {isFullscreen ? '↘' : '↗'}
              </button>
              <button
                onClick={handleToggleCamera}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isProcessing 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isProcessing ? 'Stop' : 'Start'}
              </button>
            </div>
          )}
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              {metrics?.faceDetected ? (
                <>
                  <User className="h-4 w-4 text-emerald-500" />
                  <span className="text-[10px] text-emerald-500 font-bold">PRESENT</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 text-rose-500" />
                  <span className="text-[10px] text-rose-500 font-bold">ABSENT</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {metrics?.faceDetected ? 'Face detected' : 'No face detected'}
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Engagement</span>
              <span className="text-sm font-bold text-white">
                {metrics?.engagementScore || 0}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                style={{ width: `${metrics?.engagementScore || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="p-3 bg-slate-800/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded ${fallbackActive ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                {fallbackActive ? (
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  System Status
                </p>
                <p className={`text-xs font-medium ${fallbackActive ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {fallbackActive ? 'Simulation Active' : 'AI Analysis Active'}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-[10px] text-slate-500">Blink Rate</p>
              <p className="text-sm font-bold text-white">{getBlinkRate()} bpm</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebcamMonitor;