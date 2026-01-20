/**
 * FILE: frontend/src/hooks/useWebcam.js
 * ✅ FINAL: High-res (1280×720), stable, no loops, production-ready
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const DEFAULT_CONFIG = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 60 },
    facingMode: 'user'
  },
  audio: false
};

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
  const hasAutoStartedRef = useRef(false);

  const mediaConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config,
    video: { ...DEFAULT_CONFIG.video, ...config.video }
  }), [JSON.stringify(config)]);

  const checkPermission = useCallback(async () => {
    try {
      if (!navigator.permissions) return 'prompt';
      const result = await navigator.permissions.query({ name: 'camera' });
      setPermissionState(result.state);
      return result.state;
    } catch {
      return 'prompt';
    }
  }, []);

  const getVideoDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
      return videoDevices;
    } catch (err) {
      console.error('Device enumeration error:', err);
      return [];
    }
  }, [selectedDeviceId]);

  const startWebcam = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Webcam not supported');
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
        await new Promise(resolve => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(resolve);
          };
        });
      }

      await getVideoDevices();
      console.log('✅ Webcam started - Resolution:', 
        videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);

      return mediaStream;
    } catch (err) {
      console.error('❌ Webcam error:', err);
      setError(err);
      setIsActive(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mediaConfig, selectedDeviceId, getVideoDevices]);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setStream(null);
      setIsActive(false);
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, []);

  const restartWebcam = useCallback(async () => {
    stopWebcam();
    await new Promise(r => setTimeout(r, 100));
    return startWebcam();
  }, [stopWebcam, startWebcam]);

  const switchDevice = useCallback(async (deviceId) => {
    setSelectedDeviceId(deviceId);
    if (isActive) await restartWebcam();
  }, [isActive, restartWebcam]);

  useEffect(() => {
    if (!hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      startWebcam().catch(() => {
        setTimeout(() => startWebcam(), 2000);
      });
    }

    return () => stopWebcam();
  }, [startWebcam, stopWebcam]);

  useEffect(() => {
    checkPermission();
    getVideoDevices();
  }, [checkPermission, getVideoDevices]);

  return {
    videoRef,
    stream,
    isActive,
    isLoading,
    error,
    permissionState,
    devices,
    selectedDeviceId,
    startWebcam,
    stopWebcam,
    restartWebcam,
    switchDevice
  };
};

export default useWebcam;