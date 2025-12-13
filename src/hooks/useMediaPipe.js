/**
 * FILE PATH: frontend/src/hooks/useMediaPipe.js
 * 
 * Custom React hook for MediaPipe integration
 * Combines webcam with ML models for real-time face/pose detection and analysis
 * 
 * ✅ FIXED: All infinite loop issues resolved
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import mlModels from '../utils/mlModels';
import useWebcam from './useWebcam';

/**
 * Default configuration for MediaPipe processing
 */
const DEFAULT_OPTIONS = {
  enableFaceDetection: true,
  enableFaceMesh: true,
  enablePoseEstimation: true,
  enableObjectDetection: false,
  processingInterval: 100,
  autoStart: false,
  minConfidence: 0.5
};

/**
 * Custom Hook: useMediaPipe
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} MediaPipe state and control methods
 */
const useMediaPipe = (options = {}) => {
  // ✅ FIX 1: Memoize config to prevent recreation
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [
    options.enableFaceDetection,
    options.enableFaceMesh,
    options.enablePoseEstimation,
    options.enableObjectDetection,
    options.processingInterval,
    options.autoStart,
    options.minConfidence
  ]);

  // ✅ FIX 2: Memoize webcam config
  const webcamConfig = useMemo(() => ({
    autoStart: config.autoStart,
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 }
    }
  }), [config.autoStart]);

  // Webcam hook
  const webcam = useWebcam(webcamConfig);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(null);
  const [error, setError] = useState(null);

  // Detection results
  const [faceData, setFaceData] = useState(null);
  const [faceMeshData, setFaceMeshData] = useState(null);
  const [poseData, setPoseData] = useState(null);
  const [objectData, setObjectData] = useState(null);

  // Metrics tracking
  const [metrics, setMetrics] = useState({
    faceDetected: false,
    faceCount: 0,
    lookingAtScreen: false,
    eyeAspectRatio: 0,
    blinkDetected: false,
    headPose: null,
    postureScore: 0,
    postureQuality: 'unknown',
    objectsDetected: [],
    hasPhone: false,
    engagementScore: 0,
    timestamp: Date.now()
  });

  // Refs
  const processingIntervalRef = useRef(null);
  const lastProcessTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const blinkCountRef = useRef(0);
  const lastBlinkTimeRef = useRef(0);
  const attentionHistoryRef = useRef([]);
  const hasAutoStartedRef = useRef(false);

  /**
   * ✅ FIX 3: Load models - stable dependencies
   */
  const loadModels = useCallback(async () => {
    try {
      console.log('🚀 Loading MediaPipe models...');
      setError(null);

      const modelsToLoad = {
        faceDetection: config.enableFaceDetection,
        faceMesh: config.enableFaceMesh,
        pose: config.enablePoseEstimation,
        objectDetection: config.enableObjectDetection
      };

      setLoadingProgress(10);
      await mlModels.loadAllModels(modelsToLoad);
      setLoadingProgress(100);
      setModelsLoaded(true);
      console.log('✅ All models loaded successfully');

    } catch (err) {
      console.error('❌ Failed to load models:', err);
      setError({ message: 'Failed to load AI models', details: err });
      setModelsLoaded(false);
    }
  }, [
    config.enableFaceDetection,
    config.enableFaceMesh,
    config.enablePoseEstimation,
    config.enableObjectDetection
  ]);

  /**
   * ✅ FIX 4: Process frame - stable dependencies
   */
  const processFrame = useCallback(async () => {
    if (!webcam.isActive || !webcam.videoRef.current || !modelsLoaded) {
      return;
    }

    const now = Date.now();
    const videoElement = webcam.videoRef.current;

    if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
      return;
    }

    try {
      frameCountRef.current++;
      const timestamp = performance.now();

      const detectionPromises = [];

      if (config.enableFaceDetection) {
        detectionPromises.push(
          mlModels.detectFaces(videoElement, timestamp)
            .then(result => setFaceData(result))
            .catch(err => console.warn('Face detection error:', err))
        );
      }

      if (config.enableFaceMesh) {
        detectionPromises.push(
          mlModels.getFacialLandmarks(videoElement, timestamp)
            .then(result => {
              setFaceMeshData(result);
              
              if (result?.isBlink && now - lastBlinkTimeRef.current > 200) {
                blinkCountRef.current++;
                lastBlinkTimeRef.current = now;
              }
            })
            .catch(err => console.warn('Face mesh error:', err))
        );
      }

      if (config.enablePoseEstimation) {
        detectionPromises.push(
          mlModels.detectPose(videoElement, timestamp)
            .then(result => setPoseData(result))
            .catch(err => console.warn('Pose detection error:', err))
        );
      }

      if (config.enableObjectDetection) {
        detectionPromises.push(
          mlModels.detectObjects(videoElement)
            .then(result => setObjectData(result))
            .catch(err => console.warn('Object detection error:', err))
        );
      }

      await Promise.allSettled(detectionPromises);
      lastProcessTimeRef.current = now;

    } catch (err) {
      console.error('Frame processing error:', err);
    }
  }, [
    webcam.isActive,
    webcam.videoRef,
    modelsLoaded,
    config.enableFaceDetection,
    config.enableFaceMesh,
    config.enablePoseEstimation,
    config.enableObjectDetection
  ]);

  /**
   * Get blink rate (blinks per minute)
   */
  const getBlinkRate = useCallback(() => {
    const elapsedMinutes = (Date.now() - (webcam.isActive ? Date.now() - 60000 : 0)) / 60000;
    return Math.round(blinkCountRef.current / Math.max(elapsedMinutes, 0.1));
  }, [webcam.isActive]);

  /**
   * Get attention percentage (last 60 seconds)
   */
  const getAttentionRate = useCallback(() => {
    if (attentionHistoryRef.current.length === 0) return 0;

    const attentiveCount = attentionHistoryRef.current.filter(
      item => item.attentive
    ).length;

    return Math.round((attentiveCount / attentionHistoryRef.current.length) * 100);
  }, []);

  /**
   * Get processing FPS
   */
  const getProcessingFPS = useCallback(() => {
    const elapsed = (Date.now() - lastProcessTimeRef.current) / 1000;
    if (elapsed === 0) return 0;
    return Math.round(frameCountRef.current / elapsed);
  }, []);

  /**
   * ✅ FIX 6: Start processing - stable function
   */
  const startProcessing = useCallback(async () => {
    if (isProcessing) {
      console.log('⚠️ Processing already started');
      return;
    }

    try {
      if (!modelsLoaded) {
        await loadModels();
      }

      if (!webcam.isActive) {
        await webcam.startWebcam();
      }

      setIsProcessing(true);

      processingIntervalRef.current = setInterval(() => {
        processFrame();
      }, config.processingInterval);

      console.log('▶️ MediaPipe processing started');

    } catch (err) {
      console.error('Failed to start processing:', err);
      setError({ message: 'Failed to start processing', details: err });
      setIsProcessing(false);
    }
  }, [isProcessing, modelsLoaded, loadModels, webcam, config.processingInterval, processFrame]);

  /**
   * Stop processing
   */
  const stopProcessing = useCallback(() => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }

    setIsProcessing(false);
    console.log('⏹️ MediaPipe processing stopped');
  }, []);

  /**
   * Reset all metrics and counters
   */
  const resetMetrics = useCallback(() => {
    frameCountRef.current = 0;
    blinkCountRef.current = 0;
    lastBlinkTimeRef.current = 0;
    attentionHistoryRef.current = [];
    
    setMetrics({
      faceDetected: false,
      faceCount: 0,
      lookingAtScreen: false,
      eyeAspectRatio: 0,
      blinkDetected: false,
      headPose: null,
      postureScore: 0,
      postureQuality: 'unknown',
      objectsDetected: [],
      hasPhone: false,
      engagementScore: 0,
      timestamp: Date.now()
    });

    console.log('🔄 Metrics reset');
  }, []);

  /**
   * Take annotated snapshot with landmarks
   */
  const takeAnnotatedSnapshot = useCallback(() => {
    if (!webcam.videoRef.current) return null;

    try {
      const video = webcam.videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      if (faceData?.faces) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        faceData.faces.forEach(face => {
          const box = face.boundingBox;
          ctx.strokeRect(box.originX, box.originY, box.width, box.height);
        });
      }

      if (faceMeshData?.landmarks) {
        ctx.fillStyle = '#ff0000';
        faceMeshData.landmarks.forEach(landmark => {
          ctx.beginPath();
          ctx.arc(
            landmark.x * canvas.width,
            landmark.y * canvas.height,
            2, 0, 2 * Math.PI
          );
          ctx.fill();
        });
      }

      if (poseData?.landmarks) {
        ctx.fillStyle = '#0000ff';
        poseData.landmarks.forEach(landmark => {
          if (landmark.visibility > 0.5) {
            ctx.beginPath();
            ctx.arc(
              landmark.x * canvas.width,
              landmark.y * canvas.height,
              4, 0, 2 * Math.PI
            );
            ctx.fill();
          }
        });
      }

      if (objectData?.objects) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.font = '16px Arial';
        ctx.fillStyle = '#ffff00';
        
        objectData.objects.forEach(obj => {
          const [x, y, width, height] = obj.bbox;
          ctx.strokeRect(x, y, width, height);
          ctx.fillText(
            `${obj.class} (${Math.round(obj.confidence * 100)}%)`,
            x, y - 5
          );
        });
      }

      return {
        dataUrl: canvas.toDataURL('image/jpeg', 0.9),
        canvas,
        width: canvas.width,
        height: canvas.height,
        metrics: { ...metrics }
      };

    } catch (err) {
      console.error('Error taking annotated snapshot:', err);
      return null;
    }
  }, [webcam.videoRef, faceData, faceMeshData, poseData, objectData, metrics]);

  /**
   * ✅ FIX 8: Calculate metrics using ref to avoid infinite loop
   * This function is called directly, not through useEffect
   */
  const calculateMetricsRef = useRef((faceData, faceMeshData, poseData, objectData) => {
    const newMetrics = {
      faceDetected: faceData?.faceDetected || false,
      faceCount: faceData?.faceCount || 0,
      lookingAtScreen: faceMeshData?.isLookingAtScreen || false,
      eyeAspectRatio: faceMeshData?.eyeAspectRatio || 0,
      blinkDetected: faceMeshData?.isBlink || false,
      headPose: faceMeshData?.headPose || null,
      gazeDirection: faceMeshData?.gazeDirection || null,
      postureScore: poseData?.posture?.score || 0,
      postureQuality: poseData?.posture?.quality || 'unknown',
      neckAngle: poseData?.posture?.neckAngle || 0,
      backAngle: poseData?.posture?.backAngle || 0,
      shoulderAlignment: poseData?.posture?.shoulderAlignment || 0,
      objectsDetected: objectData?.objectTypes || [],
      hasPhone: objectData?.hasPhone || false,
      hasDistractingObject: objectData?.hasDistractingObject || false,
      engagementScore: 0,
      timestamp: Date.now()
    };

    // Calculate engagement score
    let engagementScore = 0;
    if (newMetrics.faceDetected) engagementScore += 40;
    if (newMetrics.lookingAtScreen) engagementScore += 40;
    if (newMetrics.postureScore > 70) engagementScore += 20;
    if (newMetrics.hasPhone) engagementScore -= 30;
    newMetrics.engagementScore = Math.max(0, Math.min(100, engagementScore));

    // Track attention over time
    attentionHistoryRef.current.push({
      timestamp: newMetrics.timestamp,
      attentive: newMetrics.lookingAtScreen && newMetrics.faceDetected
    });

    const sixtySecondsAgo = Date.now() - 60000;
    attentionHistoryRef.current = attentionHistoryRef.current.filter(
      item => item.timestamp > sixtySecondsAgo
    );

    return newMetrics;
  });

  /**
   * ✅ FIX 9: Update metrics whenever detection results change
   * Use a ref-based comparison to prevent infinite loops
   */
  useEffect(() => {
    if (!isProcessing) return;

    const newMetrics = calculateMetricsRef.current(faceData, faceMeshData, poseData, objectData);
    
    // Only update if metrics actually changed
    setMetrics(prevMetrics => {
      const hasChanged = 
        prevMetrics.faceDetected !== newMetrics.faceDetected ||
        prevMetrics.lookingAtScreen !== newMetrics.lookingAtScreen ||
        prevMetrics.engagementScore !== newMetrics.engagementScore ||
        prevMetrics.postureScore !== newMetrics.postureScore ||
        prevMetrics.hasPhone !== newMetrics.hasPhone;
      
      return hasChanged ? newMetrics : prevMetrics;
    });
  }, [faceData, faceMeshData, poseData, objectData, isProcessing]);

  /**
   * ✅ FIX 10: Auto-start with proper dependency
   */
  useEffect(() => {
    if (config.autoStart && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      startProcessing();
    }
  }, [config.autoStart, startProcessing]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopProcessing();
      if (modelsLoaded) {
        mlModels.unloadModels();
      }
    };
  }, [stopProcessing, modelsLoaded]);

  /**
   * Handle webcam errors
   */
  useEffect(() => {
    if (webcam.error) {
      setError(webcam.error);
      stopProcessing();
    }
  }, [webcam.error, stopProcessing]);

  return {
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
    resetMetrics,
    loadModels,
    takeAnnotatedSnapshot,
    getBlinkRate,
    getAttentionRate,
    getProcessingFPS,
    isReady: modelsLoaded && webcam.isActive && !error
  };
};

export default useMediaPipe;