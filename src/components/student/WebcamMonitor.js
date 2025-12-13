// FILE PATH: frontend/src/components/student/WebcamMonitor.js
// ✅ FIXED: Resolved infinite loop in metrics update

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Camera,
  CameraOff,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  Settings,
  Eye,
  EyeOff,
  Download,
  AlertTriangle,
  CheckCircle,
  User,
  Loader
} from 'lucide-react';
import useMediaPipe from '../../hooks/useMediaPipe';
import { interactionsAPI } from '../../services/api';
import './WebcamMonitor.css';

const WebcamMonitor = ({
  sessionId,
  showOverlay = true,
  showControls = true,
  autoStart = true,
  className = '',
  onMetricsUpdate
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(showOverlay);
  const [showSettings, setShowSettings] = useState(false);
  const [overlayOptions, setOverlayOptions] = useState({
    showFaceBox: true,
    showFaceLandmarks: true,
    showPoseLandmarks: true,
    showObjects: true,
    showMetrics: true
  });

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const lastSendTimeRef = useRef(0);
  const SEND_INTERVAL_MS = 3000;
  const hasAutoStartedRef = useRef(false);

  const {
    webcam,
    isProcessing,
    modelsLoaded,
    loadingProgress,
    error,
    faceData,
    faceMeshData,
    poseData,
    objectData,
    metrics,
    startProcessing,
    stopProcessing,
    takeAnnotatedSnapshot,
    getBlinkRate,
    getAttentionRate
  } = useMediaPipe({
    enableFaceDetection: true,
    enableFaceMesh: true,
    enablePoseEstimation: true,
    enableObjectDetection: true,
    processingInterval: 100,
    autoStart
  });

  // Auto-start webcam
  useEffect(() => {
    if (autoStart && sessionId && !isProcessing && modelsLoaded && !hasAutoStartedRef.current) {
      console.log('🎥 WebcamMonitor: Auto-starting webcam processing...');
      hasAutoStartedRef.current = true;
      startProcessing();
    }
  }, [autoStart, sessionId, isProcessing, modelsLoaded, startProcessing]);

  // ✅ FIX: Send metrics to parent - only when specific values change
  useEffect(() => {
    if (!onMetricsUpdate || !metrics || !isProcessing) return;

    const enrichedMetrics = {
      faceDetected: metrics.faceDetected,
      lookingAtScreen: metrics.lookingAtScreen,
      postureScore: metrics.postureScore,
      neckAngle: metrics.neckAngle,
      backAngle: metrics.backAngle,
      hasPhone: metrics.hasPhone,
      engagementScore: metrics.engagementScore,
      attentionRate: getAttentionRate(),
      blinkRate: getBlinkRate(),
      faceCount: metrics.faceCount || 0
    };
    
    onMetricsUpdate(enrichedMetrics);
  }, [
    // ✅ Only depend on primitive values that actually change
    metrics?.faceDetected,
    metrics?.lookingAtScreen,
    metrics?.postureScore,
    metrics?.neckAngle,
    metrics?.backAngle,
    metrics?.hasPhone,
    metrics?.engagementScore,
    metrics?.faceCount,
    isProcessing
    // ✅ Removed: onMetricsUpdate, getAttentionRate, getBlinkRate
  ]);

  // Send Metrics to Backend
  useEffect(() => {
    if (!sessionId || !isProcessing || !metrics) return;

    const now = Date.now();
    
    if (now - lastSendTimeRef.current >= SEND_INTERVAL_MS) {
      const metricData = {
        engagementScore: metrics.engagementScore,
        postureScore: metrics.postureScore,
        faceDetected: metrics.faceDetected,
        lookingAtScreen: metrics.lookingAtScreen,
        hasPhone: metrics.hasPhone,
        blinkRate: getBlinkRate(),
        attentionRate: getAttentionRate(),
        neckAngle: metrics.neckAngle,
        backAngle: metrics.backAngle,
        objects: objectData?.objects?.map(obj => ({
          class: obj.class,
          confidence: obj.confidence
        })).filter(obj => obj.confidence > 0.6) || [],
      };

      interactionsAPI.saveInteraction(sessionId, 'face_metric', metricData)
        .then(() => {
          lastSendTimeRef.current = now;
        })
        .catch(err => {
          console.error('Failed to send face metric to server:', err);
        });
    }
  }, [
    sessionId,
    isProcessing,
    metrics?.engagementScore,
    metrics?.postureScore,
    metrics?.faceDetected,
    metrics?.lookingAtScreen,
    metrics?.hasPhone,
    metrics?.neckAngle,
    metrics?.backAngle,
    objectData?.objects
  ]);

  // Overlay Drawing Logic
  const drawOverlay = useCallback(() => {
    if (!overlayEnabled || !canvasRef.current || !webcam.videoRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const video = webcam.videoRef.current;
    const ctx = canvas.getContext('2d');

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (overlayOptions.showFaceBox && faceData?.faces) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.font = '16px Arial';
      ctx.fillStyle = '#00ff00';
      faceData.faces.forEach((face, index) => {
        const box = face.boundingBox;
        ctx.strokeRect(box.originX * canvas.width, box.originY * canvas.height, box.width * canvas.width, box.height * canvas.height);
        ctx.fillText(`Face ${index + 1}: ${Math.round(face.confidence * 100)}%`, box.originX * canvas.width, box.originY * canvas.height - 5);
      });
    }

    if (overlayOptions.showFaceLandmarks && faceMeshData?.landmarks) {
      ctx.fillStyle = '#ff0000';
      faceMeshData.landmarks.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
      if (faceMeshData.isBlink) {
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('BLINK', 10, 30);
      }
      if (faceMeshData.isLookingAtScreen) {
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('✓ Looking at Screen', 10, 60);
      } else {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('✗ Looking Away', 10, 60);
      }
    }

    if (overlayOptions.showPoseLandmarks && poseData?.landmarks) {
      ctx.fillStyle = '#0000ff';
      ctx.strokeStyle = '#0000ff';
      ctx.lineWidth = 2;
      poseData.landmarks.forEach(landmark => {
        if (landmark.visibility > 0.5) {
          ctx.beginPath();
          ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
      const connections = [[11, 12], [11, 23], [12, 24], [23, 24]];
      connections.forEach(([start, end]) => {
        const startPoint = poseData.landmarks[start];
        const endPoint = poseData.landmarks[end];
        if (startPoint?.visibility > 0.5 && endPoint?.visibility > 0.5) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
          ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
          ctx.stroke();
        }
      });
      if (poseData.posture) {
        const score = poseData.posture.score;
        ctx.fillStyle = score > 80 ? '#00ff00' : score > 60 ? '#ffaa00' : '#ff0000';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`Posture: ${Math.round(score)}/100`, 10, 90);
      }
    }

    if (overlayOptions.showObjects && objectData?.objects) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.font = '16px Arial';
      objectData.objects.forEach(obj => {
        const [x, y, width, height] = obj.bbox;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = '#ffff00';
        ctx.fillText(`${obj.class} (${Math.round(obj.confidence * 100)}%)`, x, y - 5);
        if (obj.class === 'cell phone') {
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 5;
          ctx.strokeRect(x, y, width, height);
          ctx.fillStyle = '#ff0000';
          ctx.font = 'bold 20px Arial';
          ctx.fillText('⚠ PHONE DETECTED', canvas.width / 2 - 100, 30);
        }
      });
    }

    if (overlayOptions.showMetrics && metrics) {
      const padding = 10;
      const lineHeight = 22;
      let yPos = canvas.height - padding;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, canvas.height - 140, 250, 140);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      const metricsText = [
        `Engagement: ${Math.round(metrics.engagementScore || 0)}%`,
        `Attention: ${getAttentionRate()}%`,
        `Blink Rate: ${getBlinkRate()} bpm`,
        `Posture: ${Math.round(metrics.postureScore || 0)}/100`,
        `Distractions: ${metrics.hasPhone ? 'YES ⚠' : 'None ✓'}`,
        `Face Count: ${metrics.faceCount || 0}`
      ];
      metricsText.reverse().forEach(text => {
        ctx.fillText(text, padding, yPos);
        yPos -= lineHeight;
      });
    }

    animationFrameRef.current = requestAnimationFrame(drawOverlay);
  }, [
    overlayEnabled,
    overlayOptions,
    faceData,
    faceMeshData,
    poseData,
    objectData,
    metrics,
    webcam.videoRef,
    getBlinkRate,
    getAttentionRate
  ]);

  useEffect(() => {
    if (overlayEnabled && isProcessing) {
      drawOverlay();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [overlayEnabled, isProcessing, drawOverlay]);

  const toggleFullscreen = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleDownloadSnapshot = useCallback(() => {
    const snapshot = takeAnnotatedSnapshot();
    if (!snapshot) return;
    const link = document.createElement('a');
    link.href = snapshot.dataUrl;
    link.download = `snapshot_${Date.now()}.jpg`;
    link.click();
  }, [takeAnnotatedSnapshot]);

  const toggleOverlayOption = (option) => {
    setOverlayOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  return (
    <div 
      ref={containerRef}
      className={`webcam-monitor ${isFullscreen ? 'fullscreen' : ''} ${className}`}
    >
      <div className="video-container">
        <video
          ref={webcam.videoRef}
          autoPlay
          playsInline
          muted
          className="webcam-video"
        />

        {overlayEnabled && (
          <canvas
            ref={canvasRef}
            className="webcam-overlay"
          />
        )}

        {!modelsLoaded && (
          <div className="loading-overlay">
            <Loader className="spinner" />
            <p>Loading AI Models...</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <span>{loadingProgress}%</span>
          </div>
        )}

        {error && (
          <div className="error-overlay">
            <AlertTriangle className="error-icon" />
            <p className="error-message">{error.message}</p>
            <button 
              className="btn btn-primary"
              onClick={() => webcam.startWebcam()}
            >
              Retry
            </button>
          </div>
        )}

        <div className="status-indicators">
          {metrics?.faceDetected ? (
            <div className="indicator success">
              <User size={16} />
              <span>Face Detected</span>
            </div>
          ) : (
            <div className="indicator warning">
              <User size={16} />
              <span>No Face</span>
            </div>
          )}

          {metrics?.lookingAtScreen ? (
            <div className="indicator success">
              <Eye size={16} />
              <span>Focused</span>
            </div>
          ) : (
            <div className="indicator warning">
              <EyeOff size={16} />
              <span>Not Focused</span>
            </div>
          )}

          {metrics?.hasPhone && (
            <div className="indicator danger">
              <AlertTriangle size={16} />
              <span>Phone Detected</span>
            </div>
          )}

          {isProcessing && (
            <div className="indicator processing">
              <div className="pulse-dot" />
              <span>Live</span>
            </div>
          )}
        </div>

        {showControls && (
          <div className="webcam-controls">
            {!isProcessing ? (
              <button
                className="control-btn primary"
                onClick={startProcessing}
                title="Start Monitoring"
              >
                <Camera size={20} />
              </button>
            ) : (
              <button
                className="control-btn danger"
                onClick={stopProcessing}
                title="Stop Monitoring"
              >
                <CameraOff size={20} />
              </button>
            )}

            <button
              className={`control-btn ${overlayEnabled ? 'active' : ''}`}
              onClick={() => setOverlayEnabled(!overlayEnabled)}
              title="Toggle Overlay"
            >
              {overlayEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </button>

            <button
              className="control-btn"
              onClick={handleDownloadSnapshot}
              disabled={!isProcessing}
              title="Take Snapshot"
            >
              <Download size={20} />
            </button>

            <button
              className={`control-btn ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <Settings size={20} />
            </button>

            <button
              className="control-btn"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>
        )}

        {showSettings && (
          <div className="settings-panel">
            <h4>Overlay Options</h4>
            <div className="settings-list">
              <label>
                <input
                  type="checkbox"
                  checked={overlayOptions.showFaceBox}
                  onChange={() => toggleOverlayOption('showFaceBox')}
                />
                <span>Face Detection Box</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={overlayOptions.showFaceLandmarks}
                  onChange={() => toggleOverlayOption('showFaceLandmarks')}
                />
                <span>Facial Landmarks</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={overlayOptions.showPoseLandmarks}
                  onChange={() => toggleOverlayOption('showPoseLandmarks')}
                />
                <span>Pose Landmarks</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={overlayOptions.showObjects}
                  onChange={() => toggleOverlayOption('showObjects')}
                />
                <span>Object Detection</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={overlayOptions.showMetrics}
                  onChange={() => toggleOverlayOption('showMetrics')}
                />
                <span>Metrics Overlay</span>
              </label>
            </div>

            {webcam.hasMultipleCameras && (
              <div className="camera-selection">
                <h4>Camera</h4>
                <select
                  value={webcam.selectedDeviceId || ''}
                  onChange={(e) => webcam.switchDevice(e.target.value)}
                >
                  {webcam.devices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="info-footer">
          <div className="info-item">
            <span className="info-label">Engagement:</span>
            <span className="info-value">{Math.round(metrics?.engagementScore || 0)}%</span>
          </div>
          <div className="info-item">
            <span className="info-label">Attention:</span>
            <span className="info-value">{getAttentionRate()}%</span>
          </div>
          <div className="info-item">
            <span className="info-label">Posture:</span>
            <span className="info-value">{Math.round(metrics?.postureScore || 0)}/100</span>
          </div>
          <div className="info-item">
            <span className="info-label">Blinks:</span>
            <span className="info-value">{getBlinkRate()} bpm</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebcamMonitor;