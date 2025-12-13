/**
 * FILE PATH: frontend/src/hooks/useWebcam.js
 * 
 * Custom React hook for webcam access, stream management, and permission handling
 * Provides easy-to-use interface for video capture with error handling
 * 
 * FIXED: Resolved infinite re-render loops
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Webcam Configuration
 */
const DEFAULT_CONFIG = {
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30, max: 60 },
    facingMode: 'user'
  },
  audio: false
};

/**
 * Custom Hook: useWebcam
 * 
 * @param {Object} config - Webcam configuration options
 * @returns {Object} Webcam state and control methods
 */
const useWebcam = (config = {}) => {
  const [stream, setStream] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt');
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const hasAutoStartedRef = useRef(false); // Prevent multiple auto-starts

  // ✅ FIX 1: Memoize config to prevent recreating object every render
  const mediaConfig = useMemo(() => {
    return { ...DEFAULT_CONFIG, ...config };
  }, [JSON.stringify(config)]); // Deep comparison of config

  /**
   * Check camera permission status
   */
  const checkPermission = useCallback(async () => {
    try {
      if (!navigator.permissions) {
        return 'prompt';
      }

      const result = await navigator.permissions.query({ name: 'camera' });
      setPermissionState(result.state);
      
      result.addEventListener('change', () => {
        setPermissionState(result.state);
      });

      return result.state;
    } catch (err) {
      console.warn('Permission API not supported:', err);
      return 'prompt';
    }
  }, []);

  /**
   * Get list of available video devices
   * ✅ FIX 2: Removed selectedDeviceId from dependencies to prevent loop
   */
  const getVideoDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
      
      setDevices(videoDevices);
      
      // Auto-select first device if none selected
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }

      return videoDevices;
    } catch (err) {
      console.error('Error enumerating devices:', err);
      return [];
    }
  }, []); // ✅ Empty deps - selectedDeviceId only used for conditional check

  /**
   * Start webcam stream
   * ✅ FIX 3: Stabilized dependencies
   */
  const startWebcam = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam not supported in this browser');
      }

      const constraints = {
        ...mediaConfig,
        video: {
          ...mediaConfig.video,
          ...(selectedDeviceId && { deviceId: { exact: selectedDeviceId } })
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsActive(true);
      setPermissionState('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              resolve();
            };
          }
        });
      }

      await getVideoDevices();

      console.log('✅ Webcam started successfully');
      return mediaStream;

    } catch (err) {
      console.error('❌ Webcam error:', err);
      
      let errorMessage = 'Failed to access webcam';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.';
        setPermissionState('denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera device found.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support the requested constraints.';
      } else if (err.name === 'TypeError') {
        errorMessage = 'Webcam not supported in this browser.';
      }

      setError({ message: errorMessage, name: err.name, original: err });
      setIsActive(false);
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mediaConfig, selectedDeviceId, getVideoDevices]);

  /**
   * Stop webcam stream
   */
  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      streamRef.current = null;
      setStream(null);
      setIsActive(false);
      
      console.log('⏹️ Webcam stopped');
    }
  }, []);

  /**
   * Restart webcam
   */
  const restartWebcam = useCallback(async () => {
    stopWebcam();
    await new Promise(resolve => setTimeout(resolve, 100));
    return startWebcam();
  }, [stopWebcam, startWebcam]);

  /**
   * Switch to different camera device
   */
  const switchDevice = useCallback(async (deviceId) => {
    setSelectedDeviceId(deviceId);
    if (isActive) {
      await restartWebcam();
    }
  }, [isActive, restartWebcam]);

  /**
   * Take a snapshot from current video
   */
  const takeSnapshot = useCallback(() => {
    if (!videoRef.current || !isActive) {
      console.warn('Video not active');
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      return {
        dataUrl: canvas.toDataURL('image/jpeg', 0.9),
        blob: null,
        canvas,
        width: canvas.width,
        height: canvas.height
      };
    } catch (err) {
      console.error('Error taking snapshot:', err);
      return null;
    }
  }, [isActive]);

  /**
   * Get video dimensions
   */
  const getVideoDimensions = useCallback(() => {
    if (!videoRef.current) return null;

    return {
      width: videoRef.current.videoWidth,
      height: videoRef.current.videoHeight
    };
  }, []);

  /**
   * Check if webcam is supported
   */
  const isWebcamSupported = useCallback(() => {
    return !!(
      navigator.mediaDevices && 
      navigator.mediaDevices.getUserMedia
    );
  }, []);

  /**
   * Get current stream settings
   */
  const getStreamSettings = useCallback(() => {
    if (!streamRef.current) return null;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return null;

    return videoTrack.getSettings();
  }, []);

  /**
   * Adjust video constraints
   */
  const updateConstraints = useCallback(async (constraints) => {
    if (!streamRef.current) {
      console.warn('No active stream');
      return;
    }

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      await videoTrack.applyConstraints(constraints);
      console.log('✅ Constraints updated');
    } catch (err) {
      console.error('Failed to update constraints:', err);
      throw err;
    }
  }, []);

  /**
   * Request higher quality
   */
  const setHighQuality = useCallback(async () => {
    return updateConstraints({
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    });
  }, [updateConstraints]);

  /**
   * Request lower quality
   */
  const setLowQuality = useCallback(async () => {
    return updateConstraints({
      width: { ideal: 320 },
      height: { ideal: 240 },
      frameRate: { ideal: 15 }
    });
  }, [updateConstraints]);

  /**
   * Retry connection with exponential backoff
   */
  const retryConnection = useCallback((attempt = 1, maxAttempts = 3) => {
    if (attempt > maxAttempts) {
      setError({ message: 'Failed to connect after multiple attempts' });
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
    console.log(`Retrying connection (attempt ${attempt}/${maxAttempts}) in ${delay}ms...`);

    retryTimeoutRef.current = setTimeout(() => {
      startWebcam().catch(() => {
        retryConnection(attempt + 1, maxAttempts);
      });
    }, delay);
  }, [startWebcam]);

  /**
   * Handle visibility change
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        console.log('⏸️ Tab hidden, pausing webcam');
        if (videoRef.current) {
          videoRef.current.pause();
        }
      } else if (!document.hidden && isActive) {
        console.log('▶️ Tab visible, resuming webcam');
        if (videoRef.current) {
          videoRef.current.play();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopWebcam();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [stopWebcam]);

  /**
   * ✅ FIX 4: Auto-start only once, prevent infinite loop
   */
  useEffect(() => {
    if (config.autoStart && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      startWebcam().catch(err => {
        console.error('Auto-start failed:', err);
      });
    }
  }, []); // ✅ Run only once on mount

  /**
   * Check permission on mount
   */
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  /**
   * Handle stream errors
   */
  useEffect(() => {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    const handleTrackEnded = () => {
      console.warn('⚠️ Video track ended unexpectedly');
      setIsActive(false);
      setError({ message: 'Camera connection lost' });
    };

    videoTrack.addEventListener('ended', handleTrackEnded);
    return () => videoTrack.removeEventListener('ended', handleTrackEnded);
  }, [stream]);

  return {
    // State
    stream,
    isActive,
    isLoading,
    error,
    permissionState,
    devices,
    selectedDeviceId,
    
    // Video ref
    videoRef,
    
    // Control methods
    startWebcam,
    stopWebcam,
    restartWebcam,
    switchDevice,
    takeSnapshot,
    retryConnection,
    
    // Utility methods
    getVideoDimensions,
    getStreamSettings,
    isWebcamSupported,
    checkPermission,
    getVideoDevices,
    updateConstraints,
    setHighQuality,
    setLowQuality,
    
    // Helper getters
    hasMultipleCameras: devices.length > 1,
    isSupported: isWebcamSupported()
  };
};

export default useWebcam;